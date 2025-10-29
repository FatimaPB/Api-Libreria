// tests/insignias.test.js
const request = require('supertest');
const app = require('../app'); // Importamos tu app sin levantar el servidor
const Insignia = require('../src/models/Insignia');
jest.mock('../src/config/__Mocks__/db.js');


// Mock del modelo para no tocar la base de datos
jest.mock('../src/models/Insignia');

describe('Rutas de Insignias', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Limpiar mocks después de cada test
  });

  it('GET /api/insignias -> devuelve todas las insignias', async () => {
    const mockInsignias = [
      { id: 1, nombre: 'Insignia1', tipo: 'tipo1', regla: 'regla1', icono_url: '' }
    ];
    Insignia.obtenerTodas.mockResolvedValue(mockInsignias);

    const res = await request(app).get('/api/insignias');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockInsignias);
  });

  it('GET /api/insignias/:id -> devuelve insignia por id', async () => {
    const mockInsignia = { id: 1, nombre: 'Insignia1', tipo: 'tipo1', regla: 'regla1', icono_url: '' };
    Insignia.obtenerPorId.mockResolvedValue(mockInsignia);

    const res = await request(app).get('/api/insignias/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockInsignia);
  });

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

  it('DELETE /api/insignias/:id -> elimina insignia', async () => {
    Insignia.eliminar.mockResolvedValue({ affectedRows: 1 });

    const res = await request(app).delete('/api/insignias/1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Insignia eliminada exitosamente');
  });
});
