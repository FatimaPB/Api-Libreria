// tests/usuarios.integration.test.js
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../app');
const pool = require('../src/config/db');
const jwt = require('jsonwebtoken');

// 🔐 Usamos un token válido generado con un usuario de prueba
const mockUsuario = { id: 1, nombre: 'Gabriel', rol: 'admin' };
const token = jwt.sign(mockUsuario, process.env.JWT_SECRET || 'tu_clave_secreta', { expiresIn: '1h' });

beforeAll(async () => {
  // Limpiar tablas relacionadas
  await pool.query('DELETE FROM usuarios_insignias');
  await pool.query('DELETE FROM insignias');
  await pool.query('DELETE FROM usuarios');

  // Insertar usuario base
  await pool.query(`
    INSERT INTO usuarios (id, nombre, correo, contrasena, rol)
    VALUES (1, 'Gabriel', 'gabriel@test.com', '$2a$10$y2I8oEfyLUAFGZ/.mFG1guS2UOJlS0GbwKJI7pvBBy8DgKQTtXbgK', 'empleado')
  `);

  // Insertar una insignia base y su relación
  const [insignia] = await pool.query(`
    INSERT INTO insignias (nombre, tipo, regla, icono_url)
    VALUES ('InsigniaUsuario', 'tipo1', 'regla test', 'http://mocked.cloudinary/icon.png')
  `);

  await pool.query(`
    INSERT INTO usuarios_insignias (usuario_id, insignia_id)
    VALUES (1, ${insignia.insertId})
  `);
});

afterAll(async () => {
  await pool.end();
});

describe('🔗 Pruebas de integración reales de Usuarios', () => {
  it('GET /api/user-insignias -> devuelve insignias del usuario', async () => {
    const res = await request(app)
      .get('/api/user-insignias')
      .set('Cookie', [`authToken=${token}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.insignias)).toBe(true);
    expect(res.body.insignias.length).toBeGreaterThan(0);
    expect(res.body.insignias[0]).toHaveProperty('nombre');
  });

  it('GET /api/perfil -> devuelve datos del usuario', async () => {
    const res = await request(app)
      .get('/api/perfil')
      .set('Cookie', [`authToken=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nombre', 'Gabriel');
  });

  it('GET /api/perfil -> devuelve 401 si no hay token', async () => {
    const res = await request(app).get('/api/perfil');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Token no proporcionado');
  });

  it('GET /api/check-auth -> verifica autenticación correcta', async () => {
    const res = await request(app)
      .get('/api/check-auth')
      .set('Cookie', [`authToken=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.usuario.nombre).toBe('Gabriel');
  });

  it('GET /api/check-auth -> token inválido devuelve 403', async () => {
    const res = await request(app)
      .get('/api/check-auth')
      .set('Cookie', ['authToken=invalidtoken']);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Token inválido');
  });
});
