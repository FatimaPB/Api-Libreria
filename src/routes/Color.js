const express = require("express");
const Color = require("../models/Color");
const router = express.Router();

// 🔹 Crear un nuevo color
router.post("/colores", async (req, res) => {
  const { nombre_color, codigo_color } = req.body;

  if (!nombre_color || !codigo_color) {
    return res.status(400).json({ message: "El nombre y el código del color son obligatorios." });
  }

  try {
    const result = await Color.crear(nombre_color, codigo_color);
    res.status(201).json({ message: "Color agregado exitosamente", id: result.insertId });
  } catch (err) {
    console.error("Error al agregar el color:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener todos los colores
router.get("/colores", async (req, res) => {
  try {
    const colores = await Color.obtenerTodas();
    res.json(colores);
  } catch (err) {
    console.error("Error al obtener colores:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener un color por ID
router.get("/colores/:id", async (req, res) => {
  try {
    const color = await Color.obtenerPorId(req.params.id);
    if (!color) {
      return res.status(404).json({ message: "Color no encontrado." });
    }
    res.json(color);
  } catch (err) {
    console.error("Error al obtener el color:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Editar un color
router.put("/colores/:id", async (req, res) => {
  const { nombre_color, codigo_color } = req.body;
  const { id } = req.params;

  if (!nombre_color || !codigo_color) {
    return res.status(400).json({ message: "El nombre y el código del color son obligatorios." });
  }

  try {
    const result = await Color.actualizar(id, nombre_color, codigo_color);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Color no encontrado." });
    }
    res.json({ message: "Color actualizado exitosamente." });
  } catch (err) {
    console.error("Error al actualizar el color:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Eliminar un color
router.delete("/colores/:id", async (req, res) => {
  try {
    const result = await Color.eliminar(req.params.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Color no encontrado." });
    }
    res.json({ message: "Color eliminado exitosamente." });
  } catch (err) {
    console.error("Error al eliminar el color:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
