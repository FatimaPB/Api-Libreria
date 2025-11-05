// tests/usuarios.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../src/config/db');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');
jest.mock('jsonwebtoken');
jest.mock('../firebase', () => ({}));

describe('Rutas protegidas de Usuarios', () => {
  const mockUsuario = { id: 1, nombre: 'Gabriel', rol: 'admin' };

  beforeEach(() => {
    jwt.verify.mockImplementation((token, secret, cb) => cb(null, mockUsuario));
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  it('GET /api/user-insignias -> devuelve insignias del usuario', async () => {
    const insigniasMock = [{ id: 1, nombre: 'Insignia 1', descripcion: 'Desc', icono_url: 'url' }];
    db.query.mockResolvedValue([insigniasMock]);

    const res = await request(app)
      .get('/api/user-insignias')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(200);
    expect(res.body.insignias).toEqual(insigniasMock);
  });

  it('GET /api/user-insignias -> devuelve 500 si falla la DB', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));

    const res = await request(app)
      .get('/api/user-insignias')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error al obtener insignias');
  });

  it('GET /api/user-insignias -> devuelve 401 si no hay token', async () => {
    const res = await request(app).get('/api/user-insignias');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Token no proporcionado');
  });

  it('GET /api/perfil -> devuelve perfil del usuario', async () => {
    const perfilMock = [{ id: 1, nombre: 'Gabriel', correo: 'gabriel@mail.com' }];
    db.query.mockResolvedValue([perfilMock]);

    const res = await request(app)
      .get('/api/perfil')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(perfilMock[0]);
  });

  it('GET /api/perfil -> devuelve 500 si falla la DB', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));

    const res = await request(app)
      .get('/api/perfil')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error al obtener el perfil del usuario');
  });

  it('GET /api/check-auth -> verifica autenticación', async () => {
    const res = await request(app)
      .get('/api/check-auth')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.usuario).toEqual(mockUsuario);
  });

  it('GET /api/check-auth -> devuelve 403 si JWT inválido', async () => {
    jwt.verify.mockImplementation((token, secret, cb) => cb(new Error('invalid'), null));

    const res = await request(app)
      .get('/api/check-auth')
      .set('Cookie', ['authToken=badtoken']);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Token inválido');
  });
});
