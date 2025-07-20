const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Función para convertir el contenido a SSML
function generarSSML(contenido) {
  const lineas = contenido.split(/\r?\n/).filter(linea => linea.trim() !== '');
  let ssml = '<speak>';
  lineas.forEach((linea, i) => {
    ssml += `<mark name="linea${i}"/>${linea}<break time="500ms"/>`;
  });
  ssml += '</speak>';
  return ssml;
}

// Ruta para obtener todas las oraciones
router.get('/oracion', async (req, res) => {
  try {
    const query = 'SELECT id, titulo, contenido, fecha_creacion FROM oraciones';
    const [results] = await db.query(query);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No se encontraron oraciones' });
    }

    // Agrega contenido_array y contenido_ssml a cada oración
    const oracionesProcesadas = results.map(oracion => ({
      ...oracion,
      contenido_array: oracion.contenido.split(/\r?\n/).filter(linea => linea.trim() !== ''),
      contenido_ssml: generarSSML(oracion.contenido)
    }));

    res.status(200).json(oracionesProcesadas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error, hubo un fallo al obtener las oraciones' });
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
