// controllers/authController.js
const bcryptjs = require('bcryptjs');
const Usuario = require('../models/usuarios');
const transporter = require('../config/nodemailer');
const Actividad = require('../models/actividad.model');
const db = require('../config/db');

// Almacenar temporalmente los códigos de verificación
let verificationCodes = {}; // { correo: { codigo: '123456', fecha: Date } }

exports.recuperarContrasena = async (req, res) => {
    const { correo } = req.body;
    try {
         // Verificar si el usuario existe en MySQL
         db.query('SELECT id FROM usuarios WHERE correo = ?', [correo], async (error, results) => {
            if (error) return res.status(500).json({ message: 'Error en la base de datos' });
            if (results.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const codigo = Math.floor(100000 + Math.random() * 900000).toString();
            verificationCodes[correo] = { codigo, fecha: new Date() };


        const mailOptions = {
            to: correo,
            subject: 'Código de verificación para recuperación de contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f9; border-radius: 8px; max-width: 600px; margin: auto;">
                    <h2 style="color: #4a90e2; text-align: center;">Recuperación de tu contraseña</h2>
                    <p style="font-size: 16px; line-height: 1.6;">
                        ¡Hola!<br><br>
                        Hemos recibido una solicitud para recuperar la contraseña de tu cuenta. Para completar el proceso, por favor ingresa el siguiente código de verificación en nuestra plataforma.
                    </p>
                    <div style="text-align: center; margin: 20px 0;">
                        <p style="font-size: 18px; font-weight: bold;">Tu código de verificación es:</p>
                        <p style="font-size: 24px; font-weight: bold; color: #4a90e2; background-color: #e6f0fb; padding: 10px 20px; border-radius: 8px; display: inline-block;">
                           ${codigo}
                        </p>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Este código es válido solo durante los próximos 10 minutos. Ingresa este código en la plataforma para recuperar tu contraseña.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #999;">
                        Si no solicitaste esta recuperación de contraseña, ignora este mensaje.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        ¡Gracias!<br>
                        <strong>El equipo de soporte de LibreriaCR</strong>
                    </p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Se ha enviado un código de verificación a tu correo' });
    });
    } catch (error) {
        console.error("Error al enviar el correo de recuperación:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

exports.verificarCodigo = (req, res) => {
    const { correo, codigo } = req.body;

    if (verificationCodes[correo] && verificationCodes[correo].codigo === codigo) {
        const tiempoExpiracion = 10 * 60 * 1000; 
        const tiempoDesdeGeneracion = new Date() - verificationCodes[correo].fecha;

        if (tiempoDesdeGeneracion < tiempoExpiracion) {
            return res.json({ message: 'Código verificado con éxito. Puedes restablecer tu contraseña.' });
        } else {
            delete verificationCodes[correo];
            return res.status(400).json({ message: 'El código ha expirado. Solicita uno nuevo.' });
        }
    }

    return res.status(400).json({ message: 'Código de verificación incorrecto' });
};

// Función para registrar la actividad
async function registrarActividad(usuarioId, tipo, ip, detalles = '') {
    try {
        // Registrar la actividad en la base de datos
        const actividad = new Actividad({
            usuarioId,
            ip,
            detalles,
        });

        // Guardar la actividad
        await actividad.save();
        console.log(`Actividad registrada: ${tipo}`);
    } catch (error) {
        console.error('Error al registrar la actividad:', error);
    }
}

exports.restablecerContrasena = async (req, res) => {
    const { correo, nuevaContrasena } = req.body;

    try {
        if (!correo || !nuevaContrasena) {
            return res.status(400).json({ message: 'Faltan datos' });
        }

        const hashedPassword = await bcryptjs.hash(nuevaContrasena, 10);

        db.query('UPDATE usuarios SET contrasena = ? WHERE correo = ?', 
        [hashedPassword, correo], 
        (error, results) => {
            if (error) {
                console.error('Error al actualizar la contraseña:', error);
                return res.status(500).json({ message: 'Error al actualizar la contraseña' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            delete verificationCodes[correo];

            res.json({ message: 'Contraseña restablecida exitosamente' });
        });
    } catch (error) {
        console.error("Error al restablecer la contraseña:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
