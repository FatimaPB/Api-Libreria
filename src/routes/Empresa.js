const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const db = require('../config/db'); // Pool MySQL con promise

const router = express.Router();

// Multer con almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Función para subir imagen a Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream((error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url);
    }).end(fileBuffer);
  });
};

// Crear perfil de empresa con logo
router.post('/perfil', upload.single('logo'), async (req, res) => {
  try {
    let logoUrl = null;
    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file.buffer);
    }

    // Esperamos que los campos vengan directos (no como JSON)
    const {
      nombre,
      slogan,
      facebook,
      instagram,
      direccion,
      correo_electronico,
      telefono
    } = req.body;

    // Insertamos en MySQL
    const query = `
      INSERT INTO perfil_empresa
      (nombre, slogan, facebook, instagram, direccion, correo_electronico, telefono, logo_url, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await db.execute(query, [
      nombre,
      slogan,
      facebook,
      instagram,
      direccion,
      correo_electronico,
      telefono,
      logoUrl
    ]);

    res.status(201).json({
      message: 'Perfil de empresa creado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creando perfil de empresa:', error);
    res.status(500).json({ message: 'Error al crear el perfil de la empresa', error: error.message });
  }
});

// Actualizar perfil de empresa
router.put('/perfil/:id', upload.single('logo'), async (req, res) => {
  const { id } = req.params;

  try {
    let logoUrl = null;
    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file.buffer);
    }

    const {
      nombre,
      slogan,
      facebook,
      instagram,
      direccion,
      correo_electronico,
      telefono
    } = req.body;

    // Si no se envía logo, conservamos el actual
    let query;
    let params;

    if (logoUrl) {
      query = `
        UPDATE perfil_empresa SET
          nombre = ?,
          slogan = ?,
          facebook = ?,
          instagram = ?,
          direccion = ?,
          correo_electronico = ?,
          telefono = ?,
          logo_url = ?
        WHERE id = ?
      `;
      params = [nombre, slogan, facebook, instagram, direccion, correo_electronico, telefono, logoUrl, id];
    } else {
      query = `
        UPDATE perfil_empresa SET
          nombre = ?,
          slogan = ?,
          facebook = ?,
          instagram = ?,
          direccion = ?,
          correo_electronico = ?,
          telefono = ?
        WHERE id = ?
      `;
      params = [nombre, slogan, facebook, instagram, direccion, correo_electronico, telefono, id];
    }

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Perfil de empresa no encontrado.' });
    }

    res.json({ message: 'Perfil de empresa actualizado correctamente.' });
  } catch (error) {
    console.error('Error actualizando perfil de empresa:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil de la empresa', error: error.message });
  }
});

// Obtener perfil de empresa
router.get('/perfil', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM perfil_empresa LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Perfil de empresa no encontrado.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil de empresa:', error);
    res.status(500).json({ message: 'Error al obtener el perfil de la empresa', error: error.message });
  }
});

module.exports = router;
