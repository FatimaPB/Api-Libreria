// tests/insignias.integration.test.js
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../app');
const pool = require('../src/config/db'); // conexión real a MySQL

// Antes de correr las pruebas, limpiamos las tablas en orden correcto
beforeAll(async () => {
  // Primero limpiamos la tabla dependiente
  await pool.query('DELETE FROM usuarios_insignias');
  // Luego la principal
  await pool.query('DELETE FROM insignias');

  // Insertamos una base inicial
  await pool.query(`
    INSERT INTO insignias (nombre, tipo, regla, icono_url)
    VALUES ('InsigniaBase', 'tipo1', 'regla1', 'http://mocked.cloudinary/icono.png')
  `);
});

// Limpiamos después de cada prueba (opcional pero útil)
afterEach(async () => {
  await pool.query('DELETE FROM usuarios_insignias');
  await pool.query('DELETE FROM insignias WHERE nombre LIKE "Test%"');
});

// Cerramos la conexión al final
afterAll(async () => {
  await pool.end();
});

describe('🔗 Pruebas de integración reales de Insignias', () => {
  it('GET /api/insignias -> devuelve lista de insignias', async () => {
    const res = await request(app).get('/api/insignias');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('nombre');
  });

  it('POST /api/insignias -> crea una nueva insignia', async () => {
    const nueva = {
      nombre: 'TestInsignia1',
      descripcion: 'desc test',
      tipo: 'tipo2',
      regla: 'regla test',
      icono_url: 'http://mocked.cloudinary/test.png'
    };

    const res = await request(app)
      .post('/api/insignias')
      .send(nueva);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message', 'Insignia creada exitosamente');
  });

  it('DELETE /api/insignias/:id -> elimina una insignia existente', async () => {
    // Creamos una para eliminarla
    const [insert] = await pool.query(`
      INSERT INTO insignias (nombre, tipo, regla, icono_url)
      VALUES ('TestDelete', 'tipoX', 'reglaX', 'http://mocked.cloudinary/x.png')
    `);

    const id = insert.insertId;

    const res = await request(app).delete(`/api/insignias/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Insignia eliminada exitosamente');
  });

  it('DELETE /api/insignias/:id -> devuelve 404 si no existe', async () => {
    const res = await request(app).delete('/api/insignias/999999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Insignia no encontrada.');
  });
});
