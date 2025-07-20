const express = require("express");
const router = express.Router();
const NoticiaEvento = require("../models/noticiaEvento");
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Función para subir a Cloudinary
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

// Crear noticia o evento
router.post("/noticias-eventos", upload.single("imagen"), async (req, res) => {
  try {
    const { titulo, descripcion, tipo, fecha_evento } = req.body;

    if (!titulo || !descripcion || !tipo) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    let imagenUrl = "";
    if (req.file) {
      imagenUrl = await uploadToCloudinary(req.file.buffer, "noticias_eventos");
    }

    const result = await NoticiaEvento.crear(titulo, descripcion, imagenUrl, tipo, fecha_evento || null);
    res.status(201).json({ message: "Noticia o evento creado", id: result.insertId });
  } catch (error) {
    console.error("Error al crear noticia o evento:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Obtener todos
router.get("/noticias-eventos", async (req, res) => {
  try {
    const results = await NoticiaEvento.obtenerTodos();
    res.json(results);
  } catch (error) {
    console.error("Error al obtener noticias o eventos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Obtener uno por ID
router.get("/noticias-eventos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const results = await NoticiaEvento.obtenerPorId(id);
    if (results.length === 0) return res.status(404).json({ message: "No encontrado" });
    res.json(results[0]);
  } catch (error) {
    console.error("Error al obtener noticia o evento:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Editar noticia o evento
router.put("/noticias-eventos/:id", upload.single("imagen"), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, tipo, fecha_evento } = req.body;

    if (!titulo || !descripcion || !tipo) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    let imagenUrl = "";
    if (req.file) {
      imagenUrl = await uploadToCloudinary(req.file.buffer, "noticias_eventos");
    } else {
      // Si no se envía nueva imagen, mantenemos la actual (puedes modificar esta lógica si quieres)
      const noticiaActual = await NoticiaEvento.obtenerPorId(id);
      if (noticiaActual.length === 0) return res.status(404).json({ message: "No encontrado" });
      imagenUrl = noticiaActual[0].imagen;
    }

    const result = await NoticiaEvento.actualizar(id, titulo, descripcion, imagenUrl, tipo, fecha_evento || null);
    if (result.affectedRows === 0) return res.status(404).json({ message: "No encontrado" });

    res.json({ message: "Actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar noticia o evento:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Eliminar noticia o evento
router.delete("/noticias-eventos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NoticiaEvento.eliminar(id);
    if (result.affectedRows === 0) return res.status(404).json({ message: "No encontrado" });
    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar noticia o evento:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
