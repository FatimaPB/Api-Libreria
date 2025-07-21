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

  let conn;
  try {
    conn = await db.getConnection();

    // 1. Traer productos base filtrados por nombres
    const placeholders = nombres.map(() => '?').join(',');
    const [productos] = await conn.query(`
      SELECT p.*, c.nombre_categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.nombre IN (${placeholders})
    `, nombres);

    // 2. Por cada producto, buscar imágenes y variantes
    for (const producto of productos) {
      // Imágenes del producto
      const [imagenes] = await conn.query(
        "SELECT url FROM imagenes WHERE producto_id = ?", [producto.id]
      );
      producto.imagenes_producto = imagenes.map(i => i.url);

      // Variantes del producto (si tiene variantes)
      if (producto.tiene_variantes) {
        const [variantes] = await conn.query(`
          SELECT v.*, co.nombre_color, t.nombre_tamano
          FROM variantes v
          LEFT JOIN colores co ON v.color_id = co.id
          LEFT JOIN tamaños t ON v.tamano_id = t.id
          WHERE v.producto_id = ?
        `, [producto.id]);

        // Por cada variante, buscar sus imágenes
        for (const variante of variantes) {
          const [imagenesVariante] = await conn.query(
            "SELECT url FROM imagenes_variante WHERE variante_id = ?", [variante.id]
          );
          variante.imagenes_variante = imagenesVariante.map(i => i.url);
        }

        producto.variantes = variantes;
      } else {
        producto.variantes = [];
      }
    }

    res.json(productos);
  } catch (error) {
    console.error('Error en /productos/recomendados-detalle:', error);
    res.status(500).json({ error: 'Error al obtener detalles de productos recomendados' });
  } finally {
    if (conn) conn.release();
  }
});


module.exports = router;
