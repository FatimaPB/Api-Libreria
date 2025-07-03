
const express = require("express");
const tamano = require("../models/tamanos");
const router = express.Router();

// 🔹 Agregar una nueva color
router.post("/tamanos", (req, res) => {
    const { nombre_tamano } = req.body;

    if (!nombre_tamano) {
        return res.status(400).json({ message: "El tamaño de la color es obligatorio." });
    }

    tamano.crear(nombre_tamano, (err, result) => {
        if (err) {
            console.error("Error al agregar la tamaño:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.status(201).json({ message: "tamaño agregada exitosamente", id: result.insertId });
    });
});

// 🔹 Obtener todas las colores
router.get("/tamanos", (req, res) => {
    tamano.obtenerTodas((err, results) => {
        if (err) {
            console.error("Error al obtener tamaños:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.json(results);
    });
});

// 🔹 Obtener una color por ID
router.get("/tamanos/:id", (req, res) => {
    const { id } = req.params;

    tamano.obtenerPorId(id, (err, results) => {
        if (err) {
            console.error("Error al obtener la tamaño:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "tamaño no encontrada." });
        }
        res.json(results[0]);
    });
});

// 🔹 Editar una color
router.put("/tamanos/:id", (req, res) => {
    const { id } = req.params;
    const { nombre_tamano } = req.body;

    if (!nombre_tamano) {
        return res.status(400).json({ message: "El nombre del tamaño es obligatorio." });
    }

    tamano.actualizar(id, nombre_tamano, (err, result) => {
        if (err) {
            console.error("Error al actualizar la tamaño:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "tamaño no encontrada." });
        }
        res.json({ message: "tamaño actualizada exitosamente." });
    });
});

// 🔹 Eliminar una color
router.delete("/tamanos/:id", (req, res) => {
    const { id } = req.params;

    tamano.eliminar(id, (err, result) => {
        if (err) {
            console.error("Error al eliminar la tamaño:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "tamaño no encontrada." });
        }
        res.json({ message: "tamaño eliminada exitosamente." });
    });
});


module.exports = router;