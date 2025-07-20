const express = require('express');
const router = express.Router();
const db = require('../config/db');


// Ruta para obtener todas las oraciones (como array plano para Angular)
router.get('/oracion', async (req, res) => {
  try {
    const query = 'SELECT id, titulo, contenido, fecha_creacion FROM oraciones ORDER BY fecha_creacion DESC';
    const [results] = await db.query(query);

    if (results.length === 0) {
      return res.status(200).json([]); // devolver un array vacío si no hay resultados
    }

    res.status(200).json(results); // ✅ devolver solo el array
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener las oraciones' });
  }
});

// Ruta para crear una nueva oración
router.post('/oracion', async (req, res) => {
  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ message: 'Título y contenido son obligatorios' });
  }

  try {
    const query = 'INSERT INTO oraciones (titulo, contenido, fecha_creacion) VALUES (?, ?, NOW())';
    const [result] = await db.query(query, [titulo, contenido]);

    res.status(201).json({ message: 'Oración creada', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear la oración' });
  }
});

// Ruta para actualizar una oración existente
router.put('/oracion/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ message: 'Título y contenido son obligatorios' });
  }

  try {
    const query = 'UPDATE oraciones SET titulo = ?, contenido = ? WHERE id = ?';
    const [result] = await db.query(query, [titulo, contenido, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Oración no encontrada' });
    }

    res.status(200).json({ message: 'Oración actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la oración' });
  }
});

// Ruta para eliminar una oración
router.delete('/oracion/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM oraciones WHERE id = ?';
    const [result] = await db.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Oración no encontrada' });
    }

    res.status(200).json({ message: 'Oración eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar la oración' });
  }
});

module.exports = router;
