const express = require("express");
const bcryptjs = require('bcryptjs');
const transporter = require('../config/nodemailer');
const { manejarIntentosFallidos, obtenerUsuariosBloqueados, bloquearUsuario } = require("../controllers/usuarioController");
const crypto = require('crypto'); // Para generar el código de verificación
const jwt = require('jsonwebtoken');
const Actividad = require('../models/actividad.model');
const db = require('../config/db'); // Importar la conexión a MySQL
const router = express.Router();

const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno



// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const token = req.cookies.authToken; // Obtener el token de la cookie

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  // Verificar el token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }

    req.usuario = decoded; // Agregar el usuario decodificado a la solicitud
    next(); // Continuar con la siguiente ruta
  });
}

// Endpoint para verificar la autenticación
router.get('/check-auth', verifyToken, (req, res) => {
  // Si llega aquí, significa que el token es válido y req.usuario está disponible
  res.json({
    authenticated: true,
    rol: req.usuario.rol,
    usuario: req.usuario // opcional, según la información que quieras devolver
  });
});

// Ruta para obtener el perfil del usuario usando async/await
router.get('/perfil', verifyToken, async (req, res) => {
  try {
    const { id } = req.usuario; // ID del usuario del token
    const query = 'SELECT id, nombre, correo, telefono, rol, verificado, creado_en, mfa_activado FROM usuarios WHERE id = ?';

    // Usamos await con pool
    const [results] = await db.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const perfil = results[0];
    res.json(perfil);
  } catch (error) {
    console.error("Error al obtener el perfil:", error);
    res.status(500).json({ message: 'Error al obtener el perfil del usuario' });
  }
});


// Crear usuario con async/await y pool
router.post("/usuarios", async (req, res) => {
  try {
    const { nombre, correo, contrasena, telefono } = req.body;

    // Verificar si el correo ya está registrado
    const [existingUsers] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    // Hashear la contraseña
    const hashedPassword = await bcryptjs.hash(contrasena, 10);

    // Generar un código de verificación de 6 dígitos
    const codigo_verificacion = crypto.randomInt(100000, 999999).toString();

    // Hashear el código de verificación
    const hashedCodigo_verificacion = await bcryptjs.hash(codigo_verificacion, 10);

    // Insertar usuario en la base de datos
    await db.query('INSERT INTO usuarios SET ?', {
      nombre,
      correo,
      contrasena: hashedPassword,
      telefono,
      rol: 'Cliente',
      verificado: false,
      codigo_verificacion: hashedCodigo_verificacion,
      intentos_fallidos: 0,
      bloqueado: false,
      creado_en: new Date()
    });

    // Configurar correo de verificación
    const mailOptions = {
      from: `"LibreriaCR" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: 'Verificación de tu cuenta',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f9; border-radius: 8px; max-width: 600px; margin: auto;">
          <h2 style="color: #4a90e2; text-align: center;">Verificación de tu cuenta</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            ¡Hola!<br><br>
            Gracias por registrarte en nuestra plataforma. Para completar tu registro, por favor verifica tu dirección de correo electrónico.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <p style="font-size: 18px; font-weight: bold;">Tu código de verificación es:</p>
            <p style="font-size: 24px; font-weight: bold; color: #4a90e2; background-color: #e6f0fb; padding: 10px 20px; border-radius: 8px; display: inline-block;">
              ${codigo_verificacion}
            </p>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">
            Este código es válido solo durante los próximos 10 minutos. Ingresa este código en la plataforma para activar tu cuenta.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #999;">
            Si no solicitaste esta verificación, ignora este mensaje.
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            ¡Gracias!<br>
            <strong>El equipo de soporte de LibreriaCR</strong>
          </p>
        </div>
      `
    };

    // Enviar correo de verificación
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error al enviar el correo:", error);
        return res.status(500).json({ message: "Error al enviar el correo de verificación", error: error.message });
      }
      console.log("Correo enviado:", info.response);
      res.status(201).json({ message: "Usuario creado. Por favor verifica tu correo electrónico." });
    });

  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});


// Obtener todos los usuarios con async/await
router.get("/usuarios", async (req, res) => {
  try {
    const query = 'SELECT id, nombre, correo, telefono, rol, verificado, bloqueado, creado_en FROM usuarios';
    const [results] = await db.query(query);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: "Error al obtener los usuarios" });
  }
});


router.post("/usuarios/verico", async (req, res) => {
  const { correo, codigoVerificacion } = req.body;

  try {
    // Buscar usuario por correo
    const [results] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuario = results[0];

    // Verificar si ya está verificado
    if (usuario.verificado) {
      return res.status(400).json({ message: "El usuario ya está verificado" });
    }

    // Comparar código ingresado con código hasheado
    const isCodeValid = await bcryptjs.compare(codigoVerificacion, usuario.codigo_verificacion);

    if (isCodeValid) {
      // Marcar al usuario como verificado en MySQL
      await db.query('UPDATE usuarios SET verificado = TRUE, codigo_verificacion = NULL WHERE correo = ?', [correo]);
      return res.status(200).json({ message: "Correo verificado con éxito" });
    } else {
      return res.status(400).json({ message: "Código de verificación incorrecto" });
    }
  } catch (error) {
    console.error("Error al verificar el código:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put('/edit', verifyToken, async (req, res) => {
  try {
    const { id } = req.usuario; // Extraer el ID del usuario del token
    const { nombre, correo, telefono } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID de usuario no proporcionado' });
    }

    // Actualizar el usuario en MySQL
    const [results] = await db.query(
      'UPDATE usuarios SET nombre = ?, correo = ?, telefono = ? WHERE id = ?',
      [nombre, correo, telefono, id]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Devolver los datos actualizados (sin la contraseña)
    res.json({ id, nombre, correo, telefono });

  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});




// Función para registrar la actividad
async function registrarActividad(usuarioId, tipo, ip, detalles = '') {
  try {
    // Registrar la actividad en la base de datos
    const actividad = new Actividad({
      usuarioId,
      tipo,
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

router.put('/cambiar-contrasena', verifyToken, async (req, res) => {
  try {
    const { id } = req.usuario; // Obtener el ID del usuario desde el token
    const { currentPassword, newPassword } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID de usuario no proporcionado' });
    }

    // Buscar la contraseña actual y el historial en la base de datos
    const [results] = await db.query('SELECT contrasena, historial_contrasenas FROM usuarios WHERE id = ?', [id]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const storedPassword = results[0].contrasena;
    const historial = results[0].historial_contrasenas ? JSON.parse(results[0].historial_contrasenas) : [];

    // Verificar si la contraseña actual ingresada es correcta
    const isMatch = await bcryptjs.compare(currentPassword, storedPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    // Verificar que la nueva contraseña no sea igual a la actual ni a las anteriores
    const isSamePassword = await bcryptjs.compare(newPassword, storedPassword);
    if (isSamePassword) {
      return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual' });
    }

    for (const oldPassword of historial) {
      const coincide = await bcryptjs.compare(newPassword, oldPassword);
      if (coincide) {
        return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a una anterior' });
      }
    }

    // Encriptar la nueva contraseña
    const nuevaContrasenaHash = await bcryptjs.hash(newPassword, 10);

    // Guardar la nueva contraseña en el historial
    historial.push(nuevaContrasenaHash);

    // Limitar el historial a las últimas 5 contraseñas
    if (historial.length > 5) {
      historial.shift(); // Eliminar la más antigua
    }

    // Actualizar la contraseña y el historial en la base de datos
    await db.query(
      'UPDATE usuarios SET contrasena = ?, historial_contrasenas = ? WHERE id = ?',
      [nuevaContrasenaHash, JSON.stringify(historial), id]
    );

    // Aquí podrías registrar actividad, ejemplo comentado
    // const ip = req.ip;
    // await registrarActividad(id, 'Cambio de contraseña', ip, 'Cambio de contraseña exitoso');

    res.json({ message: 'Contraseña actualizada con éxito' });

  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});


// Obtener insignias de un usuario
router.get('/insignias', verifyToken, async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const [insignias] = await db.query(
      `SELECT i.id, i.nombre, i.descripcion, i.icono_url
       FROM usuarios_insignias ui
       JOIN insignias i ON ui.insignia_id = i.id
       WHERE ui.usuario_id = ?`,
      [usuario_id]
    );

    res.json({ insignias });
  } catch (error) {
    console.error('Error obteniendo insignias:', error);
    res.status(500).json({ message: 'Error al obtener insignias' });
  }
});



// Ruta para manejar intentos fallidos
router.post('/bloquear-por-intentos', manejarIntentosFallidos);

// Ruta para obtener usuarios bloqueados
router.get('/usuarios-bloqueados', obtenerUsuariosBloqueados);

// Ruta para bloquear un usuario
router.put('/usuarios/bloquear/:userId', bloquearUsuario); // Cambia según tu estructura de rutas


module.exports = router;