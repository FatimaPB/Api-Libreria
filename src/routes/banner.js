const express = require("express");
const router = express.Router();
const Banner = require("../models/banner");
const multer = require("multer");
const cloudinary = require('../config/cloudinaryConfig'); 

// Configurar Multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🔹 Subir imágenes a Cloudinary
const uploadToCloudinary = async (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { folder: folder, resource_type: "image" },
            (error, result) => {
                if (error) {
                    console.error("Error al subir imagen a Cloudinary:", error);
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        ).end(fileBuffer);
    });
};

// 🔹 Agregar un nuevo banner
router.post("/banners", upload.fields([{ name: 'imagen' }]), async (req, res) => {
    const { titulo, descripcion } = req.body;

    if (!titulo || !descripcion) {
        return res.status(400).json({ message: "El título y la descripción son obligatorios." });
    }

    try {
        // Subir imágenes a Cloudinary
        const imagen = req.files['imagen'] ? await uploadToCloudinary(req.files['imagen'][0].buffer, 'banners') : '';

        // Guardar banner en la base de datos
        Banner.crear(titulo, descripcion, imagen, (err, result) => {
            if (err) {
                console.error("Error al agregar el banner:", err);
                return res.status(500).json({ message: "Error interno del servidor" });
            }
            res.status(201).json({ message: "Banner agregado exitosamente", id: result.insertId });
        });
    } catch (err) {
        console.error("Error al procesar las imágenes:", err);
        res.status(500).json({ message: "Error al subir las imágenes" });
    }
});

// 🔹 Obtener todos los banners
router.get("/banners", (req, res) => {
    Banner.obtenerTodos((err, results) => {
        if (err) {
            console.error("Error al obtener los banners:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.json(results);
    });
});

// 🔹 Obtener un banner por ID
router.get("/banners/:id", (req, res) => {
    const { id } = req.params;

    Banner.obtenerPorId(id, (err, results) => {
        if (err) {
            console.error("Error al obtener el banner:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Banner no encontrado" });
        }
        res.json(results[0]);
    });
});

// 🔹 Editar un banner
router.put("/banners/:id", upload.fields([{ name: 'imagen'}]), async (req, res) => {
    const { id } = req.params;
    const { titulo, descripcion } = req.body;

    if (!titulo || !descripcion) {
        return res.status(400).json({ message: "El título y la descripción son obligatorios." });
    }

    try {
        // Subir imágenes a Cloudinary
        const imagen = req.files['imagen'] ? await uploadToCloudinary(req.files['imagen'][0].buffer, 'banners') : '';


        // Actualizar banner en la base de datos
        Banner.actualizar(id, titulo, descripcion, imagen, (err, result) => {
            if (err) {
                console.error("Error al actualizar el banner:", err);
                return res.status(500).json({ message: "Error interno del servidor" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Banner no encontrado" });
            }
            res.json({ message: "Banner actualizado exitosamente" });
        });
    } catch (err) {
        console.error("Error al procesar las imágenes:", err);
        res.status(500).json({ message: "Error al subir las imágenes" });
    }
});

// 🔹 Eliminar un banner
router.delete("/banners/:id", (req, res) => {
    const { id } = req.params;

    Banner.eliminar(id, (err, result) => {
        if (err) {
            console.error("Error al eliminar el banner:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Banner no encontrado" });
        }
        res.json({ message: "Banner eliminado exitosamente" });
    });
});

module.exports = router;
