const express = require("express");
const router = express.Router();
const Banner = require("../models/banner");
const multer = require("multer");
const cloudinary = require('../config/cloudinaryConfig');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
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
    const imagen = req.files['imagen']
      ? await uploadToCloudinary(req.files['imagen'][0].buffer, 'banners')
      : '';

    const result = await Banner.crear(titulo, descripcion, imagen);
    res.status(201).json({ message: "Banner agregado exitosamente", id: result.insertId });
  } catch (err) {
    console.error("Error al agregar el banner:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener todos los banners
router.get("/banners", async (req, res) => {
  try {
    const banners = await Banner.obtenerTodos();
    res.json(banners);
  } catch (err) {
    console.error("Error al obtener los banners:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener un banner por ID
router.get("/banners/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const results = await Banner.obtenerPorId(id);
    if (results.length === 0) {
      return res.status(404).json({ message: "Banner no encontrado" });
    }
    res.json(results[0]);
  } catch (err) {
    console.error("Error al obtener el banner:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Editar un banner
router.put("/banners/:id", upload.fields([{ name: 'imagen' }]), async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion } = req.body;

  if (!titulo || !descripcion) {
    return res.status(400).json({ message: "El título y la descripción son obligatorios." });
  }

  try {
    const imagen = req.files['imagen']
      ? await uploadToCloudinary(req.files['imagen'][0].buffer, 'banners')
      : '';

    const result = await Banner.actualizar(id, titulo, descripcion, imagen);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Banner no encontrado" });
    }
    res.json({ message: "Banner actualizado exitosamente" });
  } catch (err) {
    console.error("Error al actualizar el banner:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Eliminar un banner
router.delete("/banners/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Banner.eliminar(id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Banner no encontrado" });
    }
    res.json({ message: "Banner eliminado exitosamente" });
  } catch (err) {
    console.error("Error al eliminar el banner:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
