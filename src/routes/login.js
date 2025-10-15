const express = require('express');
const bcryptjs = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // mysql2/promise pool
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';

// Registrar actividad asíncrona
async function registrarActividad(usuarioId, tipo, ip, detalles = '') {
  try {
    const sql = 'INSERT INTO actividad (usuarioId, tipo, ip, detalles, creado_en) VALUES (?, ?, ?, ?, NOW())';
    await db.execute(sql, [usuarioId, tipo, ip, detalles]);
    console.log(`Actividad registrada: ${tipo}`);
  } catch (error) {
    console.error('Error al registrar la actividad:', error);
  }
}

// Activar MFA
router.post('/activar-mfa', async (req, res) => {
  const { usuarioId } = req.body;
  try {
    const secreto = speakeasy.generateSecret({ length: 20 });
    await db.execute('UPDATE usuarios SET mfa_secreto = ?, mfa_activado = ? WHERE id = ?', [secreto.base32, true, usuarioId]);

    const otpAuthUrl = `otpauth://totp/TiendaOnline:${usuarioId}?secret=${secreto.base32}&issuer=TiendaOnline`;

    qrcode.toDataURL(otpAuthUrl, (err, qr) => {
      if (err) return res.status(500).json({ message: 'Error al generar QR' });
      res.json({ message: 'MFA activado', qr, secreto: secreto.base32 });
    });
  } catch (error) {
    console.error('Error al activar MFA:', error);
    res.status(500).json({ message: 'Error al activar MFA' });
  }
});

// Desactivar MFA
router.post('/desactivar-mfa', async (req, res) => {
  const { usuarioId } = req.body;
  try {
    await db.execute('UPDATE usuarios SET mfa_secreto = NULL, mfa_activado = ? WHERE id = ?', [false, usuarioId]);
    res.json({ message: 'MFA desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar MFA:', error);
    res.status(500).json({ message: 'Error al desactivar MFA' });
  }
});

// Verificar MFA
router.post('/verificar-mfa', async (req, res) => {
  const { usuarioId, tokenMFA } = req.body;
  try {
    const [results] = await db.execute('SELECT mfa_secreto, rol, correo FROM usuarios WHERE id = ?', [usuarioId]);
    if (results.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const usuario = results[0];

    const verificado = speakeasy.totp.verify({
      secret: usuario.mfa_secreto,
      encoding: 'base32',
      token: tokenMFA,
      window: 1
    });

    if (!verificado) {
      return res.status(400).json({ message: 'Código MFA incorrecto' });
    }

    const token = jwt.sign({ id: usuarioId, correo: usuario.correo, rol: usuario.rol }, JWT_SECRET, { expiresIn: '1h' });

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 3600000
    });

    res.json({ message: 'MFA verificado', token, rol: usuario.rol });
  } catch (error) {
    console.error('Error al verificar MFA:', error);
    res.status(500).json({ message: 'Error al verificar MFA' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { correo, contrasena, recaptcha, origen } = req.body;

    // Verificar reCAPTCHA
    if (origen !== 'mobile') {
      const secretKey = process.env.RECAPTCHA_SECRET || '6LeiqGsqAAAAAN0c3iRx89cvzYXh4lvdejJmZIS1';
      const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: { secret: secretKey, response: recaptcha }
      });

      if (!response.data.success) {
        return res.status(400).json({ message: 'Verificación reCAPTCHA fallida' });
      }
    }

    // Buscar usuario
    const [results] = await db.execute('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (results.length === 0) {
      return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
    }

    const usuario = results[0];
    const now = new Date();

    // Revisar bloqueo
    if (usuario.bloqueado && usuario.fecha_bloqueo && new Date(usuario.fecha_bloqueo) > now) {
      return res.status(403).json({ message: 'Cuenta bloqueada. Intenta más tarde.' });
    }

    // Verificar contraseña
    const isPasswordValid = await bcryptjs.compare(contrasena, usuario.contrasena);
    if (!isPasswordValid) {
      const nuevosIntentos = usuario.intentos_fallidos + 1;
      const maxIntentos = 5;

      if (nuevosIntentos >= maxIntentos) {
        const fechaBloqueo = new Date(Date.now() + 15 * 60 * 1000);
        await db.execute('UPDATE usuarios SET intentos_fallidos = ?, bloqueado = ?, fecha_bloqueo = ? WHERE correo = ?', [nuevosIntentos, true, fechaBloqueo, correo]);
        return res.status(403).json({ message: 'Cuenta bloqueada por múltiples intentos fallidos' });
      } else {
        await db.execute('UPDATE usuarios SET intentos_fallidos = ? WHERE correo = ?', [nuevosIntentos, correo]);
      }

      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    //Validar rol para acceso móvil
    if (origen === 'mobile' && usuario.rol !== 'empleado') {
      return res.status(403).json({ message: 'Acceso denegado: solo empleados pueden usar la app móvil' });
    }


    // Reiniciar intentos si contraseña válida
    await db.execute('UPDATE usuarios SET intentos_fallidos = 0, bloqueado = 0, fecha_bloqueo = NULL WHERE correo = ?', [correo]);

    // Si MFA activado, pedir MFA
    if (usuario.mfa_activado) {
      return res.json({ message: 'MFA requerido', usuarioId: usuario.id, requiereMFA: true });
    }

    // Generar token JWT
    const token = jwt.sign({ id: usuario.id, correo: usuario.correo, rol: usuario.rol }, JWT_SECRET, { expiresIn: '1h' });

    // Registrar actividad (no esperar)
    registrarActividad(usuario.id, 'Inicio de sesión', req.ip, 'Inicio de sesión exitoso').catch(console.error);

    // Configurar cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 3600000
    });

    res.json({ message: 'Inicio de sesión exitoso', token, rol: usuario.rol });
  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { usuarioId, ip } = req.body;

    res.clearCookie('authToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None'
    });

    if (usuarioId) {
      await registrarActividad(usuarioId, 'Cierre de sesión', ip, 'Cierre de sesión exitoso');
    }

    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
});

module.exports = router;
