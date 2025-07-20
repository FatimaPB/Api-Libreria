const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Pool MySQL con promise

// Crear nuevo proveedor
router.post('/proveedor', async (req, res) => {
  const { nombre, contacto, telefono, email, direccion } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio.' });

  try {
    const [resultado] = await db.execute(
      `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)`,
      [nombre, contacto, telefono, email, direccion]
    );
    res.status(201).json({ mensaje: 'Proveedor agregado.', id: resultado.insertId });
  } catch (error) {
    console.error('Error al agregar proveedor:', error);
    res.status(500).json({ mensaje: 'Error al agregar proveedor.' });
  }
});

// Obtener todos los proveedores
router.get('/proveedor', async (req, res) => {
  try {
    const [proveedores] = await db.execute('SELECT * FROM proveedores ORDER BY id DESC');
    res.json(proveedores);
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({ mensaje: 'Error al obtener proveedores.' });
  }
});

// Editar proveedor
router.put('/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, contacto, telefono, email, direccion } = req.body;

  try {
    const [resultado] = await db.execute(
      `UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?`,
      [nombre, contacto, telefono, email, direccion, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado.' });
    }

    res.json({ mensaje: 'Proveedor actualizado.' });
  } catch (error) {
    console.error('Error al editar proveedor:', error);
    res.status(500).json({ mensaje: 'Error al editar proveedor.' });
  }
});

// Eliminar proveedor
router.delete('/eliminar/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [resultado] = await db.execute(`DELETE FROM proveedores WHERE id = ?`, [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado.' });
    }

    res.json({ mensaje: 'Proveedor eliminado.' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ mensaje: 'Error al eliminar proveedor.' });
  }
});

module.exports = router;
