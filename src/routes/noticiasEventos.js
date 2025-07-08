const express = require("express");
const router = express.Router();
const NoticiaEvento = require("../models/noticiaEvento");
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig"); // Asegúrate de que la configuración de Cloudinary esté correcta

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔹 Subir a Cloudinary
const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
};

// 🔸 Crear noticia o evento
router.post("/noticias-eventos", upload.fields([{ name: "imagen" }]), async (req, res) => {
  const { titulo, descripcion, tipo, fecha_evento } = req.body;

  if (!titulo || !descripcion || !tipo) {
    return res.status(400).json({ message: "Faltan campos obligatorios." });
  }

  try {
    const imagen = req.files["imagen"]
      ? await uploadToCloudinary(req.files["imagen"][0].buffer, "noticias_eventos")
      : "";

    NoticiaEvento.crear(titulo, descripcion, imagen, tipo, fecha_evento || null, (err, result) => {
      if (err) return res.status(500).json({ message: "Error al guardar" });
      res.status(201).json({ message: "Noticia o evento creado", id: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ message: "Error al subir imagen" });
  }
});

// 🔸 Obtener todos
router.get("/noticias-eventos", (req, res) => {
  NoticiaEvento.obtenerTodos((err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener registros" });
    res.json(results);
  });
});

// 🔸 Obtener uno por ID
router.get("/noticias-eventos/:id", (req, res) => {
  const { id } = req.params;
  NoticiaEvento.obtenerPorId(id, (err, results) => {
    if (err) return res.status(500).json({ message: "Error" });
    if (results.length === 0) return res.status(404).json({ message: "No encontrado" });
    res.json(results[0]);
  });
});

// 🔸 Editar
router.put("/noticias-eventos/:id", upload.fields([{ name: "imagen" }]), async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, tipo, fecha_evento } = req.body;

  if (!titulo || !descripcion || !tipo) {
    return res.status(400).json({ message: "Faltan campos obligatorios." });
  }

  try {
    const imagen = req.files["imagen"]
      ? await uploadToCloudinary(req.files["imagen"][0].buffer, "noticias_eventos")
      : "";

    NoticiaEvento.actualizar(id, titulo, descripcion, imagen, tipo, fecha_evento || null, (err, result) => {
      if (err) return res.status(500).json({ message: "Error al actualizar" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "No encontrado" });
      res.json({ message: "Actualizado correctamente" });
    });
  } catch (error) {
    res.status(500).json({ message: "Error al subir imagen" });
  }
});

// 🔸 Eliminar
router.delete("/noticias-eventos/:id", (req, res) => {
  const { id } = req.params;
  NoticiaEvento.eliminar(id, (err, result) => {
    if (err) return res.status(500).json({ message: "Error al eliminar" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "No encontrado" });
    res.json({ message: "Eliminado correctamente" });
  });
});

module.exports = router;
