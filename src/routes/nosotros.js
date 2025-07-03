const express = require("express");
const Nosotros = require("../models/nosotros");
const router = express.Router();

// 🔹 Agregar una nueva categoría
router.post("/nosotros", (req, res) => {
    const { mision, vision, valores} = req.body;

    Nosotros.crear(mision, vision, valores, (err, result) => {
        if (err) {
            console.error("Error al agregar:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.status(201).json({ message: "mision, ision y valores agregada exitosamente", id: result.insertId });
    });
});

// 🔹 Obtener todas las categorías
router.get("/nosotros", (req, res) => {
    Nosotros.obtenerTodos((err, results) => {
        if (err) {
            console.error("Error al obtener:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.json(results[0]);
    });
});

// 🔹 Obtener una categoría por ID
router.get("/nosotros/:id", (req, res) => {
    const { id } = req.params;

    Nosotros.obtenerPorId(id, (err, results) => {
        if (err) {
            console.error("Error al obtener:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "no encontrada." });
        }
        res.json(results[0]);
    });
});

// 🔹 Editar una categoría
router.put("/nosotros/:id", (req, res) => {
    const { id } = req.params;
    const { mision, vision, valores } = req.body;

    if (!mision, vision, valores) {
        return res.status(400).json({ message: "es obligatorio." });
    }

    Nosotros.actualizar(id, mision, vision, valores, (err, result) => {
        if (err) {
            console.error("Error al actualizar:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No encontrada." });
        }
        res.json({ message: "Actualizada exitosamente." });
    });
});

// 🔹 Eliminar una categoría
router.delete("/nosotros/:id", (req, res) => {
    const { id } = req.params;

    Nosotros.eliminar(id, (err, result) => {
        if (err) {
            console.error("Error al eliminar:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "no encontrada." });
        }
        res.json({ message: "eliminada exitosamente." });
    });
});

module.exports = router;
