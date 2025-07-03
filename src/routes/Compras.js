// rutas/compras.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');  // Asegúrate de que la conexión esté configurada en db.js

// Ruta para registrar una compra
router.post('/compras', (req, res) => {
  const { proveedorId, detallesCompra } = req.body;
  let totalCompra = 0;

  const queryCompra = 'INSERT INTO compras (proveedor_id, total) VALUES (?, ?)';
  db.query(queryCompra, [proveedorId, 0], (err, compraResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al registrar la compra' });
    }

    const compraId = compraResult.insertId;
    let detallesCompletados = 0;

    for (let detalle of detallesCompra) {
      const { varianteId, productoId, cantidad, precioCompra, margenGanancia } = detalle;

      const queryDetalle = `
        INSERT INTO detalle_compras (compra_id, variante_id, producto_id, cantidad, precio_compra) 
        VALUES (?, ?, ?, ?, ?)`;

      db.query(
        queryDetalle,
        [compraId, varianteId || null, productoId || null, cantidad, precioCompra],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al registrar el detalle de la compra' });
          }

          const nuevoPrecioVenta = precioCompra + (precioCompra * margenGanancia);

          // Actualizar stock y precio para variante
          if (varianteId) {
            const queryStock = 'UPDATE variantes SET cantidad_stock = cantidad_stock + ? WHERE id = ?';
            db.query(queryStock, [cantidad, varianteId], (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error al actualizar el stock de la variante' });
              }

              const queryPrecio = `
                UPDATE variantes 
                SET margen_ganancia = ?, precio_venta = ?
                WHERE id = ?`;
              db.query(queryPrecio, [margenGanancia, nuevoPrecioVenta, varianteId], (err) => {
                if (err) {
                  console.error(err);
                  return res.status(500).json({ message: 'Error al actualizar el precio de la variante' });
                }
                continuar();
              });
            });

          // Actualizar stock y precio para producto
          } else if (productoId) {
            const queryStock = 'UPDATE productos SET cantidad_stock = cantidad_stock + ? WHERE id = ?';
            db.query(queryStock, [cantidad, productoId], (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error al actualizar el stock del producto' });
              }

              const queryPrecio = `
                UPDATE productos 
                SET margen_ganancia = ?, precio_venta = ?
                WHERE id = ?`;
              db.query(queryPrecio, [margenGanancia, nuevoPrecioVenta, productoId], (err) => {
                if (err) {
                  console.error(err);
                  return res.status(500).json({ message: 'Error al actualizar el precio del producto' });
                }
                continuar();
              });
            });

          } else {
            return res.status(400).json({ message: 'Debe proporcionar varianteId o productoId' });
          }

          function continuar() {
            totalCompra += cantidad * precioCompra;
            detallesCompletados++;
            if (detallesCompletados === detallesCompra.length) {
              const queryTotal = 'UPDATE compras SET total = ? WHERE id = ?';
              db.query(queryTotal, [totalCompra, compraId], (err) => {
                if (err) {
                  console.error(err);
                  return res.status(500).json({ message: 'Error al actualizar el total de la compra' });
                }
                res.status(201).json({ message: 'Compra registrada correctamente', compraId });
              });
            }
          }
        }
      );
    }
  });
});



// Ruta para obtener todas las compras
router.get('/compras', (req, res) => {
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
  `;;
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al obtener las compras' });
    }
    res.status(200).json(results);
  });
});

// Ruta para eliminar una compra
router.delete('/compras/:id', (req, res) => {
  const { id } = req.params;

  const queryEliminarCompra = 'DELETE FROM compras WHERE id = ?';
  db.query(queryEliminarCompra, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al eliminar la compra' });
    }

    const queryEliminarDetalleCompra = 'DELETE FROM detalle_compras WHERE compra_id = ?';
    db.query(queryEliminarDetalleCompra, [id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error al eliminar los detalles de la compra' });
      }

      res.status(200).json({ message: 'Compra eliminada correctamente' });
    });
  });
});

module.exports = router;
