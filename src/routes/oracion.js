const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Ruta para obtener todas las oraciones
router.get('/oracion', (req, res) => {
  const query = 'SELECT id, titulo, contenido, fecha_creacion FROM oraciones';

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error, hubo un fallo al obtener las oraciones' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No se encontraron oraciones' });
    }

    res.status(200).json(results);
  });
});


router.post('/oracion', (req, res) => {
  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ message: 'Título y contenido son obligatorios' });
  }

  const query = 'INSERT INTO oraciones (titulo, contenido, fecha_creacion) VALUES (?, ?, NOW())';

  db.query(query, [titulo, contenido], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al crear la oración' });

    res.status(201).json({ message: 'Oración creada', id: result.insertId });
  });
});


router.put('/oracion/:id', (req, res) => {
  const { id } = req.params;
  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ message: 'Título y contenido son obligatorios' });
  }

  const query = 'UPDATE oraciones SET titulo = ?, contenido = ? WHERE id = ?';

  db.query(query, [titulo, contenido, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al actualizar la oración' });

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Oración no encontrada' });

    res.status(200).json({ message: 'Oración actualizada correctamente' });
  });
});


router.delete('/oracion/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM oraciones WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al eliminar la oración' });

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Oración no encontrada' });

    res.status(200).json({ message: 'Oración eliminada correctamente' });
  });
});



module.exports = router;
