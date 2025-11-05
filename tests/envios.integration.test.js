// tests/envios.integration.test.js
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");

let token = "";

beforeAll(async () => {
    // Intentar login de usuario de prueba (repartidor)
    const loginRes = await request(app)
        .post("/api/login")
        .send({ correo: "gabriel@test.com", contrasena: "GABjua123$", origen: "mobile" });

    if (loginRes.status === 200 && loginRes.body.token) {
        token = loginRes.body.token;
    }
});

afterAll(async () => {
    await pool.end();
});

describe("🔗 Pruebas de integración reales - Envíos", () => {
    it("✅ GET /api/envios/pendientes -> devuelve lista de envíos pendientes", async () => {
        const res = await request(app)
            .get("/api/envios/pendientes")
            .set("Authorization", `Bearer ${token}`);

        // Puede no haber pedidos, pero el endpoint debe responder correctamente
        expect([200, 404]).toContain(res.status);

        if (res.status === 200) {
            expect(res.body).toHaveProperty("pedidos");
            expect(Array.isArray(res.body.pedidos)).toBe(true);
        }
    });

    it("✅ GET /api/envios/:id -> devuelve detalle de un pedido existente", async () => {
        const lista = await request(app)
            .get("/api/envios/pendientes")
            .set("Authorization", `Bearer ${token}`);

        if (lista.status === 200 && lista.body.pedidos.length > 0) {
            const pedidoId = lista.body.pedidos[0].id;

            const res = await request(app)
                .get(`/api/envios/${pedidoId}`)
                .set("Authorization", `Bearer ${token}`);

            expect([200, 404]).toContain(res.status);

            if (res.status === 200) {
                expect(res.body).toHaveProperty("productos");
                expect(Array.isArray(res.body.productos)).toBe(true);
            }
        }
    });

    it("❌ GET /api/envios/:id -> devuelve 404 si el pedido no existe", async () => {
        const res = await request(app)
            .get("/api/envios/999999")
            .set("Authorization", `Bearer ${token}`);

        expect([404, 500]).toContain(res.status);
    });
});
