// tests/insignias.test.js
const request = require('supertest');
const app = require('../app');
const Insignia = require('../src/models/Insignia');

jest.mock('../src/config/db.js');
jest.mock('../src/models/Insignia');
jest.mock('../firebase', () => ({}));

beforeAll(() => {
  // Guardamos el console.error original
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restauramos el console.error original
  console.error.mockRestore();
});


describe('Rutas de Insignias', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ✅ GET todas las insignias
  it('GET /api/insignias -> devuelve todas las insignias', async () => {
    const mockInsignias = [
      { id: 1, nombre: 'Insignia1', tipo: 'tipo1', regla: 'regla1', icono_url: '' },
    ];
    Insignia.obtenerTodas.mockResolvedValue(mockInsignias);

    const res = await request(app).get('/api/insignias');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockInsignias);
  });

  it('GET /api/insignias -> responde 500 si ocurre un error en el modelo', async () => {
    Insignia.obtenerTodas.mockRejectedValue(new Error('Error DB'));

    const res = await request(app).get('/api/insignias');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error interno del servidor');
  });

  // ✅ GET insignia por ID
  it('GET /api/insignias/:id -> devuelve insignia por id', async () => {
    const mockInsignia = { id: 1, nombre: 'Insignia1', tipo: 'tipo1', regla: 'regla1', icono_url: '' };
    Insignia.obtenerPorId.mockResolvedValue(mockInsignia);

    const res = await request(app).get('/api/insignias/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockInsignia);
  });

  it('GET /api/insignias/:id -> responde 404 si no existe la insignia', async () => {
    Insignia.obtenerPorId.mockResolvedValue(null);

    const res = await request(app).get('/api/insignias/99');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Insignia no encontrada.');
  });

  it('GET /api/insignias/:id -> responde 500 si falla la base de datos', async () => {
    Insignia.obtenerPorId.mockRejectedValue(new Error('Error DB'));

    const res = await request(app).get('/api/insignias/1');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error interno del servidor');
  });

  // ✅ POST crea una insignia correctamente
  it('POST /api/insignias -> crea una insignia', async () => {
    Insignia.crear.mockResolvedValue({ insertId: 123 });

    const res = await request(app)
      .post('/api/insignias')
      .field('nombre', 'Nueva Insignia')
      .field('tipo', 'tipo1')
      .field('regla', 'regla1');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 123);
  });

  it('POST /api/insignias -> devuelve 400 si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/insignias')
      .field('nombre', '')
      .field('tipo', '')
      .field('regla', '');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Nombre, tipo y regla son obligatorios.');
  });

  it('POST /api/insignias -> responde 500 si falla la creación', async () => {
    Insignia.crear.mockRejectedValue(new Error('Error DB'));

    const res = await request(app)
      .post('/api/insignias')
      .field('nombre', 'Test')
      .field('tipo', 't1')
      .field('regla', 'r1');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error interno del servidor');
  });

  // ✅ PUT actualiza insignia correctamente
  it('PUT /api/insignias/:id -> actualiza insignia', async () => {
    Insignia.obtenerPorId.mockResolvedValue({ id: 1, icono_url: '' });
    Insignia.actualizar.mockResolvedValue({ affectedRows: 1 });

    const res = await request(app)
      .put('/api/insignias/1')
      .field('nombre', 'Modificada')
      .field('tipo', 'tipo1')
      .field('regla', 'regla1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Insignia actualizada exitosamente');
  });


  // ✅ DELETE elimina insignia correctamente
  it('DELETE /api/insignias/:id -> elimina insignia', async () => {
    Insignia.eliminar.mockResolvedValue({ affectedRows: 1 });

    const res = await request(app).delete('/api/insignias/1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Insignia eliminada exitosamente');
  });

  it('DELETE /api/insignias/:id -> responde 404 si la insignia no existe', async () => {
    Insignia.eliminar.mockResolvedValue({ affectedRows: 0 });

    const res = await request(app).delete('/api/insignias/99');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Insignia no encontrada.');
  });

  it('DELETE /api/insignias/:id -> responde 500 si ocurre un error al eliminar', async () => {
    Insignia.eliminar.mockRejectedValue(new Error('Error DB'));

    const res = await request(app).delete('/api/insignias/1');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error interno del servidor');
  });
});
