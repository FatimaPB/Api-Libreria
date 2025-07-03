const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Asegúrate de importar tu conexión correcta


// 🚀 Obtener todos los métodos de pago
router.get('/metodos-pago', async (req, res) => {
    try {
      const [rows] = await db.promise().query('SELECT * FROM metodos_pago WHERE activo = TRUE');
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'No se encontraron métodos de pago activos' });
      }
  
      res.json(rows); // Devuelve los métodos de pago activos
    } catch (error) {
      console.error('Error al obtener métodos de pago:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });
  

// 🚀 Agregar método de pago
router.post('/metodos-pago', async (req, res) => {
  try {
    const { nombre, descripcion, tipo, detalles_adicionales, activo } = req.body;

    if (!nombre || !tipo) {
      return res.status(400).json({ message: 'Nombre y tipo son obligatorios' });
    }

    await db.promise().query(
      'INSERT INTO metodos_pago (nombre, descripcion, tipo, detalles_adicionales, activo) VALUES (?, ?, ?, ?, ?)',
      [nombre, descripcion, tipo, detalles_adicionales, activo ?? true]
    );

    res.json({ message: 'Método de pago agregado' });
  } catch (error) {
    console.error('Error al agregar método de pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ✏️ Editar método de pago
router.put('/metodos-pago/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, tipo, detalles_adicionales, activo } = req.body;

    const [result] = await db.promise().query(
      'UPDATE metodos_pago SET nombre = ?, descripcion = ?, tipo = ?, detalles_adicionales = ?, activo = ? WHERE id = ?',
      [nombre, descripcion, tipo, detalles_adicionales, activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Método de pago no encontrado' });
    }

    res.json({ message: 'Método de pago actualizado' });
  } catch (error) {
    console.error('Error al actualizar método de pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ❌ Eliminar método de pago
router.delete('/metodos-pago/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.promise().query('DELETE FROM metodos_pago WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Método de pago no encontrado' });
    }

    res.json({ message: 'Método de pago eliminado' });
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
