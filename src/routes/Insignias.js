const express = require("express");
const Insignia = require("../models/Insignia");
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const router = express.Router();

// Multer almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Subida a Cloudinary
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

// 🔹 Crear insignia
router.post("/insignias", upload.fields([{ name: "icono" }]), async (req, res) => {
  const { nombre, descripcion, tipo, regla } = req.body;

  if (!nombre || !tipo || !regla) {
    return res.status(400).json({ message: "Nombre, tipo y regla son obligatorios." });
  }

  try {
    const icono_url = req.files?.icono
      ? await uploadToCloudinary(req.files.icono[0].buffer, "insignias")
      : "";

    const result = await Insignia.crear(nombre, descripcion, icono_url, tipo, regla);
    res.status(201).json({ message: "Insignia creada exitosamente", id: result.insertId });

  } catch (err) {
    console.error("Error al crear insignia:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener todas
router.get("/insignias", async (req, res) => {
  try {
    const insignias = await Insignia.obtenerTodas();
    res.json(insignias);
  } catch (err) {
    console.error("Error al obtener insignias:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener por ID
router.get("/insignias/:id", async (req, res) => {
  try {
    const insignia = await Insignia.obtenerPorId(req.params.id);
    if (!insignia) {
      return res.status(404).json({ message: "Insignia no encontrada." });
    }
    res.json(insignia);
  } catch (err) {
    console.error("Error al obtener insignia:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Actualizar
router.put("/insignias/:id", upload.fields([{ name: "icono" }]), async (req, res) => {
  const { nombre, descripcion, tipo, regla} = req.body;
  const { id } = req.params;

  if (!nombre || !tipo || !regla) {
    return res.status(400).json({ message: "Nombre, tipo y regla son obligatorios." });
  }

  try {
    let icono_url;

    if (req.files?.icono) {
      icono_url = await uploadToCloudinary(req.files.icono[0].buffer, "insignias");
    } else {
      const insigniaActual = await Insignia.obtenerPorId(id);
      if (!insigniaActual) {
        return res.status(404).json({ message: "Insignia no encontrada." });
      }
      icono_url = insigniaActual.icono_url || "";
    }

    const result = await Insignia.actualizar(id, nombre, descripcion, icono_url, tipo, regla);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Insignia no encontrada." });
    }

    res.json({ message: "Insignia actualizada exitosamente" });
  } catch (err) {
    console.error("Error al actualizar insignia:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Eliminar
router.delete("/insignias/:id", async (req, res) => {
  try {
    const result = await Insignia.eliminar(req.params.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Insignia no encontrada." });
    }
    res.json({ message: "Insignia eliminada exitosamente" });
  } catch (err) {
    console.error("Error al eliminar insignia:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
