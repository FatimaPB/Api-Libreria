const express = require("express");
const Color = require("../models/Color");
const router = express.Router();

// 🔹 Agregar una nueva color
router.post("/colores", (req, res) => {
    const { nombre_color } = req.body;

    if (!nombre_color) {
        return res.status(400).json({ message: "El nombre de la color es obligatorio." });
    }

    Color.crear(nombre_color, (err, result) => {
        if (err) {
            console.error("Error al agregar la color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.status(201).json({ message: "color agregada exitosamente", id: result.insertId });
    });
});

// 🔹 Obtener todas las colores 
router.get("/colores", (req, res) => {
    Color.obtenerTodas((err, results) => {
        if (err) {
            console.error("Error al obtener colores:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.json(results);
    });
});

// 🔹 Obtener una color por ID 
router.get("/colores/:id", (req, res) => {
    const { id } = req.params;

    Color.obtenerPorId(id, (err, results) => {
        if (err) {
            console.error("Error al obtener la color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "color no encontrada." });
        }
        res.json(results[0]);
    });
});

// 🔹 Editar una color
router.put("/colores/:id", (req, res) => {
    const { id } = req.params;
    const { nombre_color } = req.body;

    if (!nombre_color) {
        return res.status(400).json({ message: "El nombre del color es obligatorio." });
    }

    Color.actualizar(id, nombre_color, (err, result) => {
        if (err) {
            console.error("Error al actualizar la color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "color no encontrada." });
        }
        res.json({ message: "color actualizada exitosamente." });
    });
});

// 🔹 Eliminar una color
router.delete("/colores/:id", (req, res) => {
    const { id } = req.params;

    Color.eliminar(id, (err, result) => {
        if (err) {
            console.error("Error al eliminar la color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "color no encontrada." });
        }
        res.json({ message: "color eliminada exitosamente." });
    });
});


module.exports = router;