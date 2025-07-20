const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ✅ PUT /api/productos/:id/precio - Actualizar precio de un producto
router.put('/productos/:id/precio', async (req, res) => {
  const { id } = req.params;
  const { nuevoPrecio } = req.body;

  if (!nuevoPrecio || isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
    return res.status(400).json({ error: 'Precio inválido' });
  }

  try {
    const [result] = await db.query('SELECT precio_venta FROM productos WHERE id = ?', [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const precioActual = result[0].precio_venta;

    if (parseFloat(nuevoPrecio) === parseFloat(precioActual)) {
      return res.json({ success: true, mensaje: 'El precio es igual al actual, no se modificó' });
    }

    await db.query(
      'UPDATE productos SET precio_venta = ?, precio_anterior = ? WHERE id = ?',
      [nuevoPrecio, precioActual, id]
    );

    res.json({ success: true, mensaje: 'Precio actualizado correctamente' });

  } catch (err) {
    console.error('Error al actualizar precio del producto:', err);
    res.status(500).json({ error: 'Error al actualizar precio del producto' });
  }
});

// ✅ PUT /api/variantes/:id/precio - Actualizar precio de una variante
router.put('/variantes/:id/precio', async (req, res) => {
  const { id } = req.params;
  const { nuevoPrecio } = req.body;

  if (!nuevoPrecio || isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
    return res.status(400).json({ error: 'Precio inválido' });
  }

  try {
    const [result] = await db.query('SELECT precio_venta FROM variantes WHERE id = ?', [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }

    const precioActual = result[0].precio_venta;

    if (parseFloat(nuevoPrecio) === parseFloat(precioActual)) {
      return res.json({ success: true, mensaje: 'El precio es igual al actual, no se modificó' });
    }

    await db.query(
      'UPDATE variantes SET precio_venta = ?, precio_anterior = ? WHERE id = ?',
      [nuevoPrecio, precioActual, id]
    );

    res.json({ success: true, mensaje: 'Precio de variante actualizado correctamente' });

  } catch (err) {
    console.error('Error al actualizar precio de la variante:', err);
    res.status(500).json({ error: 'Error al actualizar precio de la variante' });
  }
});

module.exports = router;
