// rutas/compras.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 🔹 Registrar una compra
router.post('/compras', async (req, res) => {
  const { proveedorId, detallesCompra } = req.body;
  let totalCompra = 0;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [compraResult] = await conn.execute(
      'INSERT INTO compras (proveedor_id, total) VALUES (?, ?)',
      [proveedorId, 0]
    );

    const compraId = compraResult.insertId;

    for (const detalle of detallesCompra) {
      const { varianteId, productoId, cantidad, precioCompra, precioVenta } = detalle;

      await conn.execute(
        `INSERT INTO detalle_compras (compra_id, variante_id, producto_id, cantidad, precio_compra)
         VALUES (?, ?, ?, ?, ?)`,
        [compraId, varianteId || null, productoId || null, cantidad, precioCompra]
      );

      totalCompra += cantidad * precioCompra;

      if (varianteId) {
        await conn.execute(
          `UPDATE variantes 
           SET cantidad_stock = IFNULL(cantidad_stock, 0) + ?, 
               precio_compra = ?, 
               precio_venta = ?
           WHERE id = ?`,
          [cantidad, precioCompra, precioVenta, varianteId]
        );
      } else if (productoId) {
        await conn.execute(
          `UPDATE productos 
           SET cantidad_stock = IFNULL(cantidad_stock, 0) + ?, 
               precio_compra = ?, 
               precio_venta = ?
           WHERE id = ?`,
          [cantidad, precioCompra, precioVenta, productoId]
        );
      } else {
        throw new Error('Debe proporcionar varianteId o productoId');
      }
    }

    await conn.execute(
      'UPDATE compras SET total = ? WHERE id = ?',
      [totalCompra, compraId]
    );

    await conn.commit();
    res.status(201).json({ message: 'Compra registrada correctamente', compraId });

  } catch (err) {
    await conn.rollback();
    console.error('Error en la transacción de compra:', err);
    res.status(500).json({ message: 'Error al registrar la compra', error: err.message });
  } finally {
    conn.release();
  }
});

// 🔹 Obtener todas las compras
router.get('/compras', async (req, res) => {
  const query = `
    SELECT 
      c.id,
      c.fecha_compra,
      c.total,
      p.nombre AS proveedor,
      COALESCE(pr.nombre, pr2.nombre) AS producto,
      COALESCE(col_p.nombre_color, col_v.nombre_color) AS color,
      COALESCE(t_p.nombre_tamano, t_v.nombre_tamano) AS tamano,
      dc.cantidad,
      dc.precio_compra
    FROM compras c
    JOIN proveedores p ON c.proveedor_id = p.id
    JOIN detalle_compras dc ON dc.compra_id = c.id
    LEFT JOIN productos pr ON dc.producto_id = pr.id
    LEFT JOIN variantes v ON dc.variante_id = v.id
    LEFT JOIN productos pr2 ON v.producto_id = pr2.id
    LEFT JOIN colores col_p ON pr.color_id = col_p.id
    LEFT JOIN colores col_v ON v.color_id = col_v.id
    LEFT JOIN tamaños t_p ON pr.tamano_id = t_p.id
    LEFT JOIN tamaños t_v ON v.tamano_id = t_v.id
  `;

  try {
    const [results] = await db.execute(query);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener compras:', err);
    res.status(500).json({ message: 'Error al obtener las compras' });
  }
});

// 🔹 Eliminar una compra y sus detalles
router.delete('/compras/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await conn.execute('DELETE FROM detalle_compras WHERE compra_id = ?', [id]);
    await conn.execute('DELETE FROM compras WHERE id = ?', [id]);

    await conn.commit();
    res.status(200).json({ message: 'Compra eliminada correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('Error al eliminar la compra:', err);
    res.status(500).json({ message: 'Error al eliminar la compra' });
  } finally {
    conn.release();
  }
});

module.exports = router;
