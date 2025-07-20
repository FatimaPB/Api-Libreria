const express = require("express");
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const router = express.Router();
const JWT_SECRET = 'tu_clave_secreta';

// 🔐 Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }

    req.usuario = decoded;
    next();
  });
}

// ✅ Verificar autenticación
router.get('/check-auth', verifyToken, (req, res) => {
  res.json({
    authenticated: true,
    rol: req.usuario.rol,
    usuario: req.usuario
  });
});


// GET carrito
router.get('/carrito', verifyToken, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const [results] = await conn.execute(`
      SELECT 
        ac.id,
        ac.producto_id,
        ac.variante_id,
        p.nombre,
        COALESCE(v.precio_venta, p.precio_venta) AS precio_venta,
        ac.cantidad,
        CASE 
          WHEN ac.variante_id IS NOT NULL THEN (
            SELECT GROUP_CONCAT(url)
            FROM imagenes_variante
            WHERE variante_id = ac.variante_id
          )
          ELSE (
            SELECT GROUP_CONCAT(url)
            FROM imagenes
            WHERE producto_id = p.id AND variante_id IS NULL
          )
        END AS imagenes
      FROM productos_carrito ac
      JOIN productos p ON ac.producto_id = p.id
      LEFT JOIN variantes v ON ac.variante_id = v.id
      WHERE ac.usuario_id = ?
      GROUP BY ac.id;
    `, [req.usuario.id]);

    const formateado = results.map(item => ({
      ...item,
      imagenes: item.imagenes ? item.imagenes.split(',') : []
    }));

    res.json(formateado);
  } catch (error) {
    console.error('Error al obtener el carrito:', error);
    res.status(500).json({ message: 'Error al obtener el carrito' });
  } finally {
    if (conn) conn.release();
  }
});

// POST agregar producto al carrito
router.post('/carrito/agregar', verifyToken, async (req, res) => {
  const { producto_id, variante_id, cantidad } = req.body;
  const usuario_id = req.usuario.id;

  if (!producto_id || cantidad <= 0) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  let conn;
  try {
    conn = await db.getConnection();

    const queryBuscar = `SELECT cantidad FROM productos_carrito WHERE usuario_id = ? AND producto_id = ? AND ${variante_id ? 'variante_id = ?' : 'variante_id IS NULL'}`;
    const paramsBuscar = variante_id ? [usuario_id, producto_id, variante_id] : [usuario_id, producto_id];
    const [rows] = await conn.execute(queryBuscar, paramsBuscar);

    if (rows.length > 0) {
      const nuevaCantidad = rows[0].cantidad + cantidad;
      const queryUpdate = `UPDATE productos_carrito SET cantidad = ? WHERE usuario_id = ? AND producto_id = ? AND ${variante_id ? 'variante_id = ?' : 'variante_id IS NULL'}`;
      const paramsUpdate = variante_id ? [nuevaCantidad, usuario_id, producto_id, variante_id] : [nuevaCantidad, usuario_id, producto_id];
      await conn.execute(queryUpdate, paramsUpdate);
      return res.json({ message: 'Cantidad actualizada en el carrito' });
    }

    // Insertar nuevo producto
    await conn.execute(
      'INSERT INTO productos_carrito (usuario_id, producto_id, variante_id, cantidad) VALUES (?, ?, ?, ?)',
      [usuario_id, producto_id, variante_id || null, cantidad]
    );

    res.json({ message: 'Producto agregado al carrito' });
  } catch (error) {
    console.error('Error al agregar producto al carrito:', error);
    res.status(500).json({ message: 'Error al agregar producto' });
  } finally {
    if (conn) conn.release();
  }
});

// POST vaciar carrito
router.post('/carrito/limpiar', verifyToken, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute('DELETE FROM productos_carrito WHERE usuario_id = ?', [req.usuario.id]);
    res.json({ message: 'Carrito vaciado' });
  } catch (error) {
    console.error('Error al limpiar el carrito:', error);
    res.status(500).json({ message: 'Error al limpiar el carrito' });
  } finally {
    if (conn) conn.release();
  }
});


module.exports = router;
