const express = require('express');
const bcryptjs = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const UsuarioSchema = require('../models/usuarios'); // Asegúrate de importar tu modelo de usuario
const LimiteIntentos = require('../models/LimiteIntentos')
const Actividad = require('../models/actividad.model');
const db = require('../config/db'); // Asegúrate de importar tu conexión MySQL
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno

router.post('/activar-mfa', async (req, res) => {
    const { usuarioId } = req.body;

    const secreto = speakeasy.generateSecret({ length: 20 });

    // Guardar el secreto en la base de datos
    db.query('UPDATE usuarios SET mfa_secreto = ?, mfa_activado = ? WHERE id = ?', 
        [secreto.base32, true, usuarioId], 
        (error) => {
            if (error) return res.status(500).json({ message: 'Error al activar MFA' });

            // Generar la URL de Google Authenticator
            const otpAuthUrl = `otpauth://totp/TiendaOnline:${usuarioId}?secret=${secreto.base32}&issuer=TiendaOnline`;

            // Convertir la URL en un QR para que el usuario la escanee
            qrcode.toDataURL(otpAuthUrl, (err, qr) => {
                if (err) return res.status(500).json({ message: 'Error al generar QR' });
                res.json({ message: 'MFA activado', qr, secreto: secreto.base32 });
            });
        });
});


router.post('/desactivar-mfa', async (req, res) => {
    const { usuarioId } = req.body;

    // Desactivar MFA eliminando el secreto y actualizando el estado en la base de datos
    db.query('UPDATE usuarios SET mfa_secreto = NULL, mfa_activado = ? WHERE id = ?', 
        [false, usuarioId], 
        (error) => {
            if (error) return res.status(500).json({ message: 'Error al desactivar MFA' });

            res.json({ message: 'MFA desactivado correctamente' });
        });
});
// Ruta para verificar MFA
router.post('/verificar-mfa', async (req, res) => {
    const { usuarioId, tokenMFA } = req.body;

    db.query('SELECT mfa_secreto, rol, correo FROM usuarios WHERE id = ?', [usuarioId], (error, results) => {
        if (error || results.length === 0) {
            return res.status(500).json({ message: 'Error al obtener MFA' });
        }

        // Verificación del código MFA
        const verificado = speakeasy.totp.verify({
            secret: results[0].mfa_secreto,
            encoding: 'base32',
            token: tokenMFA,
            window: 1
        });

        if (!verificado) {
            return res.status(400).json({ message: 'Código MFA incorrecto' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: usuarioId, 
                correo: results[0].correo, 
                rol: results[0].rol 
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Establecer el token en la cookie
        res.cookie('authToken', token, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'None',  
            maxAge: 3600000  
        });

        // Enviar el token también en la respuesta JSON
        res.json({ message: 'MFA verificado', token, rol: results[0].rol });
    });
});



// Función para registrar actividad
async function registrarActividad(usuarioId, tipo, ip, detalles = '') {
    try {
        const sql = 'INSERT INTO actividad (usuarioId, tipo, ip, detalles, creado_en) VALUES (?, ?, ?, ?, NOW())';
        db.query(sql, [usuarioId, tipo, ip, detalles]);
        console.log(`Actividad registrada: ${tipo}`);
    } catch (error) {
        console.error('Error al registrar la actividad:', error);
    }
}
// Ruta para iniciar sesión
router.post('/login', async (req, res) => {
    try {
        const { correo, contrasena, recaptcha } = req.body;

        // ✅ Verificación del reCAPTCHA
        const secretKey = '6LeiqGsqAAAAAN0c3iRx89cvzYXh4lvdejJmZIS1'; // Reemplaza con tu clave secreta
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: secretKey,
                response: recaptcha
            }
        });
        console.log(response.data); // Añadir esto para ver la respuesta completa de Google
        const { success } = response.data;
        if (!response.data.success) {
            return res.status(400).json({ message: 'Verificación reCAPTCHA fallida' });
        }

        // ✅ Buscar al usuario en MySQL
        db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).json({ message: 'Error en el servidor' });
            }

            if (results.length === 0) {
                return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
            }

            const usuario = results[0];

            // ✅ Verificar si la cuenta está bloqueada
            const now = new Date();
            if (usuario.bloqueado && usuario.fecha_bloqueo && new Date(usuario.fecha_bloqueo) > now) {
                return res.status(403).json({ message: 'Cuenta bloqueada. Intenta más tarde.' });
            }

            // ✅ Verificar la contraseña
            const isPasswordValid = await bcryptjs.compare(contrasena, usuario.contrasena);
            if (!isPasswordValid) {
                // Aumentar intentos fallidos
                const nuevosIntentos = usuario.intentos_fallidos + 1;

                // Consultar el límite de intentos (puedes configurarlo en base de datos)
                const maxIntentos = 5; // Puedes hacerlo dinámico desde una tabla de configuración

                if (nuevosIntentos >= maxIntentos) {
                    // Bloquear usuario por 15 minutos
                    const fechaBloqueo = new Date(Date.now() + 15 * 60 * 1000);
                    db.query('UPDATE usuarios SET intentos_fallidos = ?, bloqueado = ?, fecha_bloqueo = ? WHERE correo = ?',
                        [nuevosIntentos, true, fechaBloqueo, correo]);
                    return res.status(403).json({ message: 'Cuenta bloqueada por múltiples intentos fallidos' });
                } else {
                    db.query('UPDATE usuarios SET intentos_fallidos = ? WHERE correo = ?', [nuevosIntentos, correo]);
                }

                return res.status(400).json({ message: 'Credenciales inválidas' });
            }

            // ✅ Reiniciar intentos fallidos si la contraseña es válida
            db.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado = 0, fecha_bloqueo = NULL WHERE correo = ?', [correo]);
            
            // ✅ Si el usuario tiene MFA activado, requerir código MFA antes de generar el token
            if (usuario.mfa_activado) {
                return res.json({ message: 'MFA requerido', usuarioId: usuario.id, requiereMFA: true });
            }
            
            // ✅ Generar token JWT
            const token = jwt.sign(
                { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            // ✅ Registrar actividad
           await registrarActividad(usuario.id, 'Inicio de sesión', req.ip, 'Inicio de sesión exitoso');

            // ✅ Configurar la cookie con el token
            res.cookie('authToken', token, {
               httpOnly: true,          // No accesible desde JavaScript en el navegador
                secure: true,             // Solo se envía en conexiones HTTPS
                sameSite: 'None',       // Solo se envía en solicitudes del mismo sitio
                maxAge: 60 * 60 * 1000    // Expira en 1 hora
            });

            res.json({ message: 'Inicio de sesión exitoso', token, rol: usuario.rol });
        });

    } catch (error) {
        console.error("Error en el inicio de sesión:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

router.post('/logout', async (req, res) => {

    const { usuarioId, ip} = req.body;
    try {
        // Eliminar la cookie de sesión
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
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
