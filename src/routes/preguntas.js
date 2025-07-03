const express = require('express');
const router = express.Router();
const db = require('../config/db');


// Obtener todas las preguntas activas
router.get('/preguntas', (req, res) => {
  const query = 'SELECT * FROM preguntas_frecuentes WHERE activo = 1 ORDER BY creado_en DESC';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener preguntas' });
    res.json(results);
  });
});

// Crear una nueva pregunta
router.post('/preguntas', (req, res) => {
  const { pregunta, respuesta } = req.body;
  const query = 'INSERT INTO preguntas_frecuentes (pregunta, respuesta, creado_en, actualizado_en, activo) VALUES (?, ?, NOW(), NOW(), 1)';
  db.query(query, [pregunta, respuesta], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al insertar pregunta' });
    res.json({ message: 'Pregunta creada', id: result.insertId });
  });
});

// Actualizar una pregunta
router.put('/preguntas/:id', (req, res) => {
  const { id } = req.params;
  const { pregunta, respuesta } = req.body;
  const query = 'UPDATE preguntas_frecuentes SET pregunta = ?, respuesta = ?, actualizado_en = NOW() WHERE id = ?';
  db.query(query, [pregunta, respuesta, id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar pregunta' });
    res.json({ message: 'Pregunta actualizada' });
  });
});

// Eliminar (soft delete)
router.delete('/preguntas/:id', (req, res) => {
  const { id } = req.params;
  const query = 'UPDATE preguntas_frecuentes SET activo = 0, actualizado_en = NOW() WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar pregunta' });
    res.json({ message: 'Pregunta eliminada' });
  });
});

module.exports = router;
