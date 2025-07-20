const express = require("express");
const tamano = require("../models/tamanos");
const router = express.Router();

router.post("/tamanos", async (req, res) => {
    const { nombre_tamano } = req.body;

    if (!nombre_tamano) {
        return res.status(400).json({ message: "El tamaño es obligatorio." });
    }

    try {
        const result = await tamano.crear(nombre_tamano);
        res.status(201).json({ message: "Tamaño agregado exitosamente", id: result.insertId });
    } catch (err) {
        console.error("Error al agregar tamaño:", err);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

router.get("/tamanos", async (req, res) => {
    try {
        const resultados = await tamano.obtenerTodas();
        res.json(resultados);
    } catch (err) {
        console.error("Error al obtener tamaños:", err);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

router.get("/tamanos/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const resultados = await tamano.obtenerPorId(id);
        if (resultados.length === 0) {
            return res.status(404).json({ message: "Tamaño no encontrado." });
        }
        res.json(resultados[0]);
    } catch (err) {
        console.error("Error al obtener tamaño:", err);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

router.put("/tamanos/:id", async (req, res) => {
    const { id } = req.params;
    const { nombre_tamano } = req.body;

    if (!nombre_tamano) {
        return res.status(400).json({ message: "El nombre del tamaño es obligatorio." });
    }

    try {
        const result = await tamano.actualizar(id, nombre_tamano);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tamaño no encontrado." });
        }
        res.json({ message: "Tamaño actualizado exitosamente." });
    } catch (err) {
        console.error("Error al actualizar tamaño:", err);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

router.delete("/tamanos/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await tamano.eliminar(id);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tamaño no encontrado." });
        }
        res.json({ message: "Tamaño eliminado exitosamente." });
    } catch (err) {
        console.error("Error al eliminar tamaño:", err);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

module.exports = router;
