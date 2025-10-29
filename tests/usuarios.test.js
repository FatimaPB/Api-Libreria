// tests/usuarios.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../src/config/db'); // Apunta al archivo real, pero se mockea
const jwt = require('jsonwebtoken');

// Jest reemplaza automáticamente db por src/config/__mocks__/db.js
jest.mock('../src/config/db');
jest.mock('jsonwebtoken');
jest.mock('../firebase', () => ({}));


describe('Rutas protegidas de Usuarios', () => {
  const mockUsuario = { id: 1, nombre: 'Gabriel', rol: 'admin' };

  beforeEach(() => {
    // Mock JWT
    jwt.verify.mockImplementation((token, secret, cb) => cb(null, mockUsuario));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/user-insignias -> devuelve insignias del usuario', async () => {
    const insigniasMock = [
      { id: 1, nombre: 'Insignia 1', descripcion: 'Desc', icono_url: 'url' },
    ];

    db.query.mockResolvedValue([insigniasMock]); // Mock DB

    const res = await request(app)
      .get('/api/user-insignias')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(200);
    expect(res.body.insignias).toEqual(insigniasMock);
  });

  it('GET /api/perfil -> devuelve perfil del usuario', async () => {
    const perfilMock = [{ id: 1, nombre: 'Gabriel', correo: 'gabriel@mail.com' }];

    db.query.mockResolvedValue([perfilMock]); // Mock DB

    const res = await request(app)
      .get('/api/perfil')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(perfilMock[0]);
  });

  it('GET /api/check-auth -> verifica autenticación', async () => {
    const res = await request(app)
      .get('/api/check-auth')
      .set('Cookie', ['authToken=faketoken']);

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.usuario).toEqual(mockUsuario);
  });
});
