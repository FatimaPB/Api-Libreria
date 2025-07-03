const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Conexión MySQL

router.post('/proveedor', (req, res) => {
  const { nombre, contacto, telefono, email, direccion } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio.' });

  db.query(
    `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)`,
    [nombre, contacto, telefono, email, direccion],
    (error, resultado) => {
      if (error) {
        console.error('Error al agregar proveedor:', error);
        return res.status(500).json({ mensaje: 'Error al agregar proveedor.' });
      }
      res.status(201).json({ mensaje: 'Proveedor agregado.', id: resultado.insertId });
    }
  );
});

router.get('/proveedor', (req, res) => {
  db.query('SELECT * FROM proveedores ORDER BY id DESC', (error, proveedores) => {
    if (error) {
      console.error('Error al listar proveedores:', error);
      return res.status(500).json({ mensaje: 'Error al obtener proveedores.' });
    }
    res.json(proveedores);
  });
});

router.put('/editar/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, contacto, telefono, email, direccion } = req.body;

  db.query(
    `UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?`,
    [nombre, contacto, telefono, email, direccion, id],
    (error, resultado) => {
      if (error) {
        console.error('Error al editar proveedor:', error);
        return res.status(500).json({ mensaje: 'Error al editar proveedor.' });
      }
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Proveedor no encontrado.' });
      }
      res.json({ mensaje: 'Proveedor actualizado.' });
    }
  );
});

router.delete('/eliminar/:id', (req, res) => {
  const { id } = req.params;

  db.query(`DELETE FROM proveedores WHERE id = ?`, [id], (error, resultado) => {
    if (error) {
      console.error('Error al eliminar proveedor:', error);
      return res.status(500).json({ mensaje: 'Error al eliminar proveedor.' });
    }
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado.' });
    }
    res.json({ mensaje: 'Proveedor eliminado.' });
  });
});

module.exports = router;
