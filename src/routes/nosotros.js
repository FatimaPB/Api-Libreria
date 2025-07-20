const express = require("express");
const Nosotros = require("../models/nosotros");
const router = express.Router();

router.post("/nosotros", async (req, res) => {
  try {
    const { mision, vision, valores } = req.body;

    if (!mision || !vision || !valores) {
      return res.status(400).json({ message: "Misión, visión y valores son obligatorios." });
    }

    const result = await Nosotros.crear(mision, vision, valores);
    res.status(201).json({ message: "Misión, visión y valores agregados exitosamente", id: result.insertId });
  } catch (err) {
    console.error("Error al agregar:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.get("/nosotros", async (req, res) => {
  try {
    const results = await Nosotros.obtenerTodos();
    if (results.length === 0) {
      return res.status(404).json({ message: "No encontrado." });
    }
    res.json(results[0]);
  } catch (err) {
    console.error("Error al obtener:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.get("/nosotros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const results = await Nosotros.obtenerPorId(id);
    if (results.length === 0) {
      return res.status(404).json({ message: "No encontrado." });
    }
    res.json(results[0]);
  } catch (err) {
    console.error("Error al obtener:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put("/nosotros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { mision, vision, valores } = req.body;

    if (!mision || !vision || !valores) {
      return res.status(400).json({ message: "Misión, visión y valores son obligatorios." });
    }

    const result = await Nosotros.actualizar(id, mision, vision, valores);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No encontrado." });
    }

    res.json({ message: "Actualizado exitosamente." });
  } catch (err) {
    console.error("Error al actualizar:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.delete("/nosotros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Nosotros.eliminar(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No encontrado." });
    }

    res.json({ message: "Eliminado exitosamente." });
  } catch (err) {
    console.error("Error al eliminar:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
