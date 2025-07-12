const express = require("express");
const Color = require("../models/Color");
const router = express.Router();

// 🔹 Agregar un nuevo color
router.post("/colores", (req, res) => {
    const { nombre_color, codigo_color } = req.body;

    if (!nombre_color || !codigo_color) {
        return res.status(400).json({ message: "El nombre y el código del color son obligatorios." });
    }

    Color.crear(nombre_color, codigo_color, (err, result) => {
        if (err) {
            console.error("Error al agregar el color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.status(201).json({ message: "Color agregado exitosamente", id: result.insertId });
    });
});

// 🔹 Obtener todos los colores
router.get("/colores", (req, res) => {
    Color.obtenerTodas((err, results) => {
        if (err) {
            console.error("Error al obtener colores:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.json(results);
    });
});

// 🔹 Obtener un color por ID
router.get("/colores/:id", (req, res) => {
    const { id } = req.params;

    Color.obtenerPorId(id, (err, results) => {
        if (err) {
            console.error("Error al obtener el color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Color no encontrado." });
        }
        res.json(results[0]);
    });
});

// 🔹 Editar un color
router.put("/colores/:id", (req, res) => {
    const { id } = req.params;
    const { nombre_color, codigo_color } = req.body;

    if (!nombre_color || !codigo_color) {
        return res.status(400).json({ message: "El nombre y el código del color son obligatorios." });
    }

    Color.actualizar(id, nombre_color, codigo_color, (err, result) => {
        if (err) {
            console.error("Error al actualizar el color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Color no encontrado." });
        }
        res.json({ message: "Color actualizado exitosamente." });
    });
});

// 🔹 Eliminar un color
router.delete("/colores/:id", (req, res) => {
    const { id } = req.params;

    Color.eliminar(id, (err, result) => {
        if (err) {
            console.error("Error al eliminar el color:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Color no encontrado." });
        }
        res.json({ message: "Color eliminado exitosamente." });
    });
});

module.exports = router;
