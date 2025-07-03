const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig'); // Importa la configuración de Cloudinary
const Empresa = require('../models/Empresa');
const db = require('../config/db'); // Importar la conexión a MySQL

const router = express.Router();

// Configuración de almacenamiento de Multer en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Función para subir imágenes a Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream((error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result.secure_url);
    }).end(fileBuffer);
  });
};

// Ruta para crear perfil de empresa con logo
router.post('/perfil', upload.single('logo'), async (req, res) => {
    try {
        console.log('Archivo recibido:', req.file); // Verificar el archivo recibido

        // Manejar la subida del logo si se proporciona
        let logoUrl = null;
        if (req.file) {
            logoUrl = await uploadToCloudinary(req.file.buffer);
            console.log('URL del logo:', logoUrl); // Verificar la URL del logo
        }

        const { 
            nombre,
            slogan, 
            redesSociales, // Asegúrate de que esto venga como un objeto JSON
            contacto 
        } = req.body;

        // Parsear las redes sociales y el contacto si son JSON
        const redesSocialesParsed = JSON.parse(redesSociales);
        const contactoParsed = JSON.parse(contacto);

        // Crear nueva empresa en la base de datos
        const empresa = new Empresa({
            nombre,
            slogan, 
            redesSociales: redesSocialesParsed, // Asegúrate de que esto esté bien estructurado
            contacto: contactoParsed,
            logo: logoUrl, // Agregar el logo URL si existe
        });

        await empresa.save();
        res.status(201).json({
            message: 'Perfil de empresa creado exitosamente', 
            empresa: empresa
        });
    } catch (err) {
        console.error('Error creando la empresa:', err);
        res.status(500).json({ message: 'Error al crear el perfil de la empresa', error: err.message });
    }
});
// Modificar perfil de empresa
router.put('/perfil', upload.single('logo'), async (req, res) => {
    const { nombre, slogan, redesSociales, contacto } = req.body;

    try {
        console.log('Archivo recibido:', req.file); // Verificar el archivo recibido

        // Manejar la subida del logo si se proporciona
        let logoUrl = null;
        if (req.file) {
            logoUrl = await uploadToCloudinary(req.file.buffer);
        }

        let empresa = await Empresa.findOne();

        if (!empresa) {
            return res.status(404).json({ message: 'Empresa no encontrada.' });
        }

        // Actualizar la empresa existente
        empresa.nombre = nombre;
        empresa.slogan = slogan;
        empresa.redesSociales = JSON.parse(redesSociales); // Asegúrate de que esto esté bien estructurado
        empresa.contacto = JSON.parse(contacto); // Asegúrate de que esto esté bien estructurado
        if (logoUrl) {
            empresa.logo = logoUrl; // Solo actualiza el logo si se proporciona uno nuevo
        }

        const empresaGuardada = await empresa.save();
        res.status(200).json({ message: 'Perfil de empresa actualizado exitosamente', empresa: empresaGuardada });
    } catch (err) {
        console.error('Error actualizando la empresa:', err); // Log de error
        res.status(500).json({ message: 'Error al actualizar el perfil de la empresa', error: err.message });
    }
});

// Obtener perfil de empresa
router.get('/datos', (req, res) => {
    // Realizamos la consulta a la base de datos para obtener el perfil de la empresa
    db.query('SELECT * FROM perfil_empresa LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.status(500).json({ message: 'Error al obtener el perfil de la empresa', error: err.message });
        }
        
        // Verificamos si existen resultados
        if (results.length === 0) {
            return res.status(404).json({ message: 'Empresa no encontrada.' });
        }

        // Retornamos los resultados
        res.json(results[0]); // Suponiendo que solo hay una empresa
    });
});
// Registro de auditoría
const registrarAuditoria = async (accion, admin) => {
    const empresa = await Empresa.findOne();
    if (empresa) {
        empresa.auditoria.push({ administrador: admin, accion });
        await empresa.save();
    }
};

// Middleware para auditar cambios
router.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const admin = req.user?.username || 'Sistema'; // Cambiar según tu implementación de usuarios
        registrarAuditoria('Actualización del perfil de la empresa', admin)
            .catch((error) => console.error('Error al registrar auditoría:', error));
    }
    next();
});

module.exports = router;
