// tests/envios.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../src/config/db');

jest.mock('../src/config/db');

describe('Rutas de Envíos del Repartidor', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------
  // GET /api/envios/pendientes
  // ------------------------------------------------------------
  it('GET /api/envios/pendientes -> devuelve lista de envíos pendientes', async () => {
    const mockPedidos = [
      { id: 1, fecha: '2024-10-01', direccion_envio: 'Calle 123', cliente: 'Juan', estado_envio: 'pendiente', estado: 'pagado' },
      { id: 2, fecha: '2024-10-02', direccion_envio: 'Av. Principal', cliente: 'Ana', estado_envio: 'en camino', estado: 'pagado' }
    ];
    db.query.mockResolvedValue([mockPedidos]);

    const res = await request(app).get('/api/envios/pendientes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pedidos');
    expect(res.body.pedidos).toEqual(mockPedidos);
  });

  it('GET /api/envios/pendientes -> devuelve 500 si falla la DB', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));

    const res = await request(app).get('/api/envios/pendientes');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error al obtener pedidos');
  });

  // ------------------------------------------------------------
  // GET /api/envios/:id
  // ------------------------------------------------------------
  it('GET /api/envios/:id -> devuelve detalle del pedido', async () => {
    const mockVenta = [{
      id: 1,
      fecha: '2024-10-01',
      total: 150.50,
      estado: 'pagado',
      estado_envio: 'pendiente',
      direccion_envio: 'Calle 123',
      metodo_pago: 'Tarjeta',
      cliente: 'Juan',
      telefono: '1234567890'
    }];

    const mockProductos = [
      { nombre: 'Biblia', cantidad: 1, precio_unitario: 100, imagen: 'url1' },
      { nombre: 'Rosario', cantidad: 2, precio_unitario: 25.25, imagen: 'url2' }
    ];

    // Primera consulta: venta
    db.query
      .mockResolvedValueOnce([mockVenta])
      .mockResolvedValueOnce([mockProductos]);

    const res = await request(app).get('/api/envios/1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      total: 150.50,
      productos: mockProductos
    });
  });

  it('GET /api/envios/:id -> devuelve 404 si no se encuentra el pedido', async () => {
    db.query.mockResolvedValueOnce([[]]); // Venta vacía

    const res = await request(app).get('/api/envios/999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Pedido no encontrado');
  });

  it('GET /api/envios/:id -> devuelve 500 si ocurre un error', async () => {
    db.query.mockRejectedValue(new Error('DB Error'));

    const res = await request(app).get('/api/envios/1');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Error al obtener detalle de pedido');
  });
});
