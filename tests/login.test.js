// tests/login.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../src/config/db');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

jest.mock('../src/config/db');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('axios');
jest.mock('speakeasy');
jest.mock('qrcode');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});


describe('Rutas de Login y MFA', () => {
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterAll(() => {
        console.error.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ------------------------------------------------------------
    // LOGIN
    // ------------------------------------------------------------
    it('POST /api/login -> login exitoso', async () => {
        axios.post.mockResolvedValue({ data: { success: true } });
        db.execute.mockResolvedValue([
            [{ id: 1, correo: 'test@mail.com', contrasena: 'hashed', rol: 'admin', bloqueado: 0, intentos_fallidos: 0 }],
        ]);
        bcryptjs.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('faketoken');

        const res = await request(app)
            .post('/api/login')
            .send({ correo: 'test@mail.com', contrasena: '123', recaptcha: 'ok' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Inicio de sesión exitoso');
        expect(res.body).toHaveProperty('token', 'faketoken');
    });

    it('POST /api/login -> reCAPTCHA inválido devuelve 400', async () => {
        axios.post.mockResolvedValue({ data: { success: false } });

        const res = await request(app)
            .post('/api/login')
            .send({ correo: 'a@mail.com', contrasena: '123', recaptcha: 'fail' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Verificación reCAPTCHA fallida');
    });

    it('POST /api/login -> correo no existe devuelve 400', async () => {
        axios.post.mockResolvedValue({ data: { success: true } });
        db.execute.mockResolvedValue([[]]);

        const res = await request(app)
            .post('/api/login')
            .send({ correo: 'noexiste@mail.com', contrasena: '123', recaptcha: 'ok' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Correo o contraseña incorrectos');
    });

    it('POST /api/login -> contraseña incorrecta aumenta intentos', async () => {
        axios.post.mockResolvedValue({ data: { success: true } });
        db.execute
            .mockResolvedValueOnce([
                [{ correo: 'test@mail.com', contrasena: 'hash', intentos_fallidos: 1, bloqueado: 0 }],
            ])
            .mockResolvedValueOnce([]); // update
        bcryptjs.compare.mockResolvedValue(false);

        const res = await request(app)
            .post('/api/login')
            .send({ correo: 'test@mail.com', contrasena: 'mal', recaptcha: 'ok' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Credenciales inválidas');
    });

    it('POST /api/login -> bloquea cuenta tras varios intentos', async () => {
        axios.post.mockResolvedValue({ data: { success: true } });
        db.execute
            .mockResolvedValueOnce([
                [{ correo: 'test@mail.com', contrasena: 'hash', intentos_fallidos: 5, bloqueado: 0 }],
            ])
            .mockResolvedValueOnce([]); // update bloqueo
        bcryptjs.compare.mockResolvedValue(false);

        const res = await request(app)
            .post('/api/login')
            .send({ correo: 'test@mail.com', contrasena: 'mal', recaptcha: 'ok' });

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('message', 'Cuenta bloqueada por múltiples intentos fallidos');
    });

    it('POST /api/login -> cuenta bloqueada devuelve 403', async () => {
        const future = new Date(Date.now() + 5 * 60 * 1000);
        axios.post.mockResolvedValue({ data: { success: true } });
        db.execute.mockResolvedValue([
            [{ correo: 'test@mail.com', contrasena: 'hash', bloqueado: 1, fecha_bloqueo: future }],
        ]);

        const res = await request(app)
            .post('/api/login')
            .send({ correo: 'test@mail.com', contrasena: '123', recaptcha: 'ok' });

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('message', 'Cuenta bloqueada. Intenta más tarde.');
    });

    it('POST /api/login -> error en el servidor devuelve 500', async () => {
        db.execute.mockRejectedValue(new Error('DB Error'));
        axios.post.mockResolvedValue({ data: { success: true } });

        const res = await request(app)
            .post('/api/login')
            .send({ correo: 'test@mail.com', contrasena: '123', recaptcha: 'ok' });

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('message', 'Error en el servidor');
    });

    // ------------------------------------------------------------
    // MFA
    // ------------------------------------------------------------
    it('POST /api/activar-mfa -> activa MFA correctamente', async () => {
        const fakeSecret = { base32: 'ABC123' };
        speakeasy.generateSecret.mockReturnValue(fakeSecret);
        qrcode.toDataURL.mockImplementation((url, cb) => cb(null, 'fakeqr'));
        db.execute.mockResolvedValue([]);

        const res = await request(app)
            .post('/api/activar-mfa')
            .send({ usuarioId: 1 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'MFA activado');
        expect(res.body).toHaveProperty('qr', 'fakeqr');
    });

    it('POST /api/desactivar-mfa -> desactiva MFA', async () => {
        db.execute.mockResolvedValue([]);

        const res = await request(app)
            .post('/api/desactivar-mfa')
            .send({ usuarioId: 1 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'MFA desactivado correctamente');
    });

    it('POST /api/verificar-mfa -> verifica MFA correctamente', async () => {
        db.execute.mockResolvedValue([
            [{ mfa_secreto: 'SECRET', rol: 'admin', correo: 'user@mail.com' }],
        ]);
        speakeasy.totp.verify.mockReturnValue(true);
        jwt.sign.mockReturnValue('faketoken');

        const res = await request(app)
            .post('/api/verificar-mfa')
            .send({ usuarioId: 1, tokenMFA: '123456' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'MFA verificado');
        expect(res.body).toHaveProperty('token', 'faketoken');
    });

    it('POST /api/verificar-mfa -> código MFA incorrecto', async () => {
        db.execute.mockResolvedValue([
            [{ mfa_secreto: 'SECRET', rol: 'admin', correo: 'user@mail.com' }],
        ]);
        speakeasy.totp.verify.mockReturnValue(false);

        const res = await request(app)
            .post('/api/verificar-mfa')
            .send({ usuarioId: 1, tokenMFA: '000000' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Código MFA incorrecto');
    });

    it('POST /api/verificar-mfa -> usuario no encontrado', async () => {
        db.execute.mockResolvedValue([[]]);

        const res = await request(app)
            .post('/api/verificar-mfa')
            .send({ usuarioId: 99, tokenMFA: '123456' });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message', 'Usuario no encontrado');
    });

    // ------------------------------------------------------------
    // LOGOUT
    // ------------------------------------------------------------
    it('POST /api/logout -> maneja error en registrarActividad sin fallar', async () => {
        db.execute.mockRejectedValue(new Error('DB Error'));

        const res = await request(app)
            .post('/api/logout')
            .send({ usuarioId: 1 });

        // El logout debe seguir funcionando aunque falle el registro de actividad
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Sesión cerrada exitosamente');
    });

});
