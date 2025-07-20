const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener todas las preguntas activas
router.get('/preguntas', async (req, res) => {
  try {
    const [results] = await db.execute(
      'SELECT * FROM preguntas_frecuentes WHERE activo = 1 ORDER BY creado_en DESC'
    );
    res.json(results);
  } catch (err) {
    console.error('Error al obtener preguntas:', err);
    res.status(500).json({ error: 'Error al obtener preguntas' });
  }
});

// Crear una nueva pregunta
router.post('/preguntas', async (req, res) => {
  const { pregunta, respuesta } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO preguntas_frecuentes (pregunta, respuesta, creado_en, actualizado_en, activo) VALUES (?, ?, NOW(), NOW(), 1)',
      [pregunta, respuesta]
    );
    res.json({ message: 'Pregunta creada', id: result.insertId });
  } catch (err) {
    console.error('Error al insertar pregunta:', err);
    res.status(500).json({ error: 'Error al insertar pregunta' });
  }
});

// Actualizar una pregunta
router.put('/preguntas/:id', async (req, res) => {
  const { id } = req.params;
  const { pregunta, respuesta } = req.body;
  try {
    await db.execute(
      'UPDATE preguntas_frecuentes SET pregunta = ?, respuesta = ?, actualizado_en = NOW() WHERE id = ?',
      [pregunta, respuesta, id]
    );
    res.json({ message: 'Pregunta actualizada' });
  } catch (err) {
    console.error('Error al actualizar pregunta:', err);
    res.status(500).json({ error: 'Error al actualizar pregunta' });
  }
});

// Eliminar (soft delete)
router.delete('/preguntas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute(
      'UPDATE preguntas_frecuentes SET activo = 0, actualizado_en = NOW() WHERE id = ?',
      [id]
    );
    res.json({ message: 'Pregunta eliminada' });
  } catch (err) {
    console.error('Error al eliminar pregunta:', err);
    res.status(500).json({ error: 'Error al eliminar pregunta' });
  }
});

module.exports = router;
