// routes/productos.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Agregar producto al catálogo
router.post('/catalogo', async (req, res) => {
  const { producto_id } = req.body;
  if (!producto_id) return res.status(400).json({ message: "El ID del producto es requerido" });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('INSERT INTO catalogo_productos (producto_id) VALUES (?)', [producto_id]);
    res.status(201).json({ message: "Producto agregado al catálogo exitosamente" });
  } catch (error) {
    console.error('Error al agregar producto:', error);
    res.status(500).json({ message: "Error al agregar el producto al catálogo" });
  } finally {
    if (conn) conn.release();
  }
});

// Obtener todos los productos del catálogo
router.get('/catalogo', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const [productos] = await conn.query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio_calculado
      FROM catalogo_productos cp
      INNER JOIN productos p ON cp.producto_id = p.id
    `);

    if (productos.length === 0) {
      return res.status(404).json({ message: "No hay productos en el catálogo" });
    }

    for (const producto of productos) {
      const [imagenes] = await conn.query(
        "SELECT url FROM imagenes WHERE producto_id = ?",
        [producto.id]
      );
      producto.imagenes = imagenes.map(img => img.url);
    }

    res.status(200).json({ productos });
  } catch (error) {
    console.error("Error al obtener los productos del catálogo:", error);
    res.status(500).json({ message: "Error al obtener los productos del catálogo" });
  } finally {
    if (conn) conn.release();
  }
});

// Eliminar producto del catálogo
router.delete('/catalogo/:producto_id', async (req, res) => {
  const { producto_id } = req.params;
  if (!producto_id) return res.status(400).json({ message: "El ID del producto es requerido" });

  let conn;
  try {
    conn = await db.getConnection();
    const [result] = await conn.query(
      'DELETE FROM catalogo_productos WHERE producto_id = ?',
      [producto_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado en el catálogo" });
    }

    res.status(200).json({ message: "Producto eliminado del catálogo exitosamente" });
  } catch (error) {
    console.error('Error al eliminar producto del catálogo:', error);
    res.status(500).json({ message: "Error al eliminar el producto del catálogo" });
  } finally {
    if (conn) conn.release();
  }
});

// Obtener productos por categoría (solo los del catálogo)
router.get('/catalogo/categoria/:categoriaId', async (req, res) => {
  const categoriaId = req.params.categoriaId;

  let conn;
  try {
    conn = await db.getConnection();
    const [results] = await conn.query(
      `SELECT * FROM productos WHERE categoria_id = ? AND id IN (SELECT producto_id FROM catalogo_productos)`,
      [categoriaId]
    );

    res.json(results);
  } catch (error) {
    console.error("Error al obtener productos por categoría:", error);
    res.status(500).json({ error: 'Error al obtener productos' });
  } finally {
    if (conn) conn.release();
  }
});

// Obtener productos por nombre de categoría (con variantes e imágenes)
router.get('/productos/categoria/nombre/:nombreCategoria', async (req, res) => {
  const nombreCategoria = req.params.nombreCategoria;
  let conn;
  try {
    conn = await db.getConnection();

    const [productos] = await conn.query(`
      SELECT p.*, c.nombre_categoria, co.nombre_color, t.nombre_tamano
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN colores co ON p.color_id = co.id
      LEFT JOIN tamaños t ON p.tamano_id = t.id
      WHERE c.nombre_categoria = ?
      AND p.id IN (SELECT producto_id FROM catalogo_productos)
    `, [nombreCategoria]);

    for (const producto of productos) {
      const [imagenes] = await conn.query("SELECT url FROM imagenes WHERE producto_id = ?", [producto.id]);
      producto.imagenes = imagenes.map(i => i.url);

      const [variantes] = await conn.query(`
        SELECT v.*, co.nombre_color, t.nombre_tamano
        FROM variantes v
        JOIN colores co ON v.color_id = co.id
        JOIN tamaños t ON v.tamano_id = t.id
        WHERE v.producto_id = ?
      `, [producto.id]);

      for (const variante of variantes) {
        const [imagenesVar] = await conn.query("SELECT url FROM imagenes_variante WHERE variante_id = ?", [variante.id]);
        variante.imagenes = imagenesVar.map(i => i.url);
      }

      producto.variantes = variantes;
    }

    res.json(productos);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  } finally {
    if (conn) conn.release();
  }
});

// Productos públicos (para catálogo general)
router.get("/productos-publico", async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const [productos] = await conn.query(`
      SELECT p.*, c.nombre_categoria, u.nombre AS usuario_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      JOIN usuarios u ON p.usuario_id = u.id
    `);

    for (const producto of productos) {
      const [imagenes] = await conn.query("SELECT url FROM imagenes WHERE producto_id = ?", [producto.id]);
      producto.imagenes = imagenes.map(i => i.url);
    }

    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos públicos:", error);
    res.status(500).json({ message: "Error al obtener productos" });
  } finally {
    if (conn) conn.release();
  }
});



router.post('/productos/recomendados-detalle', async (req, res) => {
  const nombres = req.body.nombres;
  if (!Array.isArray(nombres) || nombres.length === 0) {
    return res.status(400).json({ error: 'Lista de nombres inválida o vacía' });
  }

  const placeholders = nombres.map(() => '?').join(',');

  const sql = `
    SELECT
      p.id AS producto_id,
      p.nombre,
      p.descripcion,
      p.sku,
      p.calificacion_promedio,
      p.total_resenas,
      p.categoria_id,
      p.tiene_variantes,
      p.precio_compra AS producto_precio_compra,
      p.precio_venta AS producto_precio_venta,
      p.precio_anterior AS producto_precio_anterior,
      p.cantidad_stock AS producto_stock,
      v.id AS variante_id,
      v.precio_compra AS variante_precio_compra,
      v.precio_venta AS variante_precio_venta,
      v.precio_anterior AS variante_precio_anterior,
      v.color_id AS variante_color_id,
      v.tamano_id AS variante_tamano_id,
      v.cantidad_stock AS variante_stock,
      img_producto.url AS imagen_producto_url,
      img_variante.url AS imagen_variante_url
    FROM productos p
    LEFT JOIN variantes v ON v.producto_id = p.id
    LEFT JOIN imagenes img_producto ON img_producto.producto_id = p.id
    LEFT JOIN imagenes_variante img_variante ON img_variante.variante_id = v.id
    WHERE p.nombre IN (${placeholders});
  `;

  try {
    const [rows] = await pool.execute(sql, nombres);
    res.json(rows);
  } catch (error) {
    console.error('Error en /productos/recomendados-detalle:', error);
    res.status(500).json({ error: 'Error al obtener detalles de productos recomendados' });
  }
});

module.exports = router;
