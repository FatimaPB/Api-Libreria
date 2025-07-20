const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // pool de conexiones
const router = express.Router();

const JWT_SECRET = 'tu_clave_secreta';

// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token inválido" });
    req.usuario = decoded;
    next();
  });
}

// ✅ Verificar autenticación
router.get("/check-auth", verifyToken, (req, res) => {
  res.json({
    authenticated: true,
    rol: req.usuario.rol,
    usuario: req.usuario
  });
});

// ✅ Obtener comentarios de un producto o variante
router.get("/comentarios", async (req, res) => {
  const { producto_id, variante_id } = req.query;

  if (!producto_id) {
    return res.status(400).json({ message: "Falta el producto_id" });
  }

  let sql = `
    SELECT c.comentario, c.calificacion, c.fecha, u.nombre AS nombre_usuario
    FROM comentarios c
    JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.producto_id = ?`;
  const params = [producto_id];

  if (variante_id) {
    sql += ` AND c.variante_id = ?`;
    params.push(variante_id);
  } else {
    sql += ` AND c.variante_id IS NULL`;
  }

  sql += ` ORDER BY c.fecha DESC`;

  try {
    const [results] = await db.query(sql, params);
    res.json(results);
  } catch (err) {
    console.error("Error al obtener comentarios:", err);
    res.status(500).json({ message: "Error al obtener comentarios" });
  }
});

// ✅ Verificar si un usuario puede comentar
router.get("/puede-comentar", verifyToken, async (req, res) => {
  const usuario_id = req.usuario.id;
  const { producto_id, variante_id } = req.query;

  const sql = `
    SELECT COUNT(*) AS total FROM detalle_ventas dv
    JOIN ventas v ON dv.venta_id = v.id
    WHERE v.usuario_id = ? AND (dv.producto_id = ? OR dv.variante_id = ?)`;

  try {
    const [results] = await db.query(sql, [
      usuario_id,
      producto_id,
      variante_id || null,
    ]);
    const comprado = results[0].total > 0;
    res.json({ permitido: comprado });
  } catch (err) {
    console.error("Error al verificar permiso:", err);
    res.status(500).json({ message: "Error al verificar permiso" });
  }
});

// ✅ Crear nuevo comentario
router.post("/comentario", verifyToken, async (req, res) => {
  const { producto_id, variante_id, comentario, calificacion } = req.body;
  const usuario_id = req.usuario.id;

  const sql = `
    INSERT INTO comentarios (usuario_id, producto_id, variante_id, comentario, calificacion, fecha)
    VALUES (?, ?, ?, ?, ?, NOW())`;

  try {
    await db.query(sql, [
      usuario_id,
      producto_id,
      variante_id || null,
      comentario,
      calificacion,
    ]);
    res.json({ message: "Comentario guardado" });
  } catch (err) {
    console.error("Error al guardar comentario:", err);
    res.status(500).json({ message: "Error al guardar comentario" });
  }
});

module.exports = router;
