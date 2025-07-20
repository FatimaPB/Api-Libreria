
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require('jsonwebtoken');
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require('../config/cloudinaryConfig');
const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno

// Configurar Multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const token = req.cookies.authToken; // Obtener el token de la cookie

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    // Decodifica el token y extrae el ID del usuario
    const decoded = jwt.verify(token, JWT_SECRET);
    req.id = decoded.id; // Verifica que "id" exista en el token
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error); // Ver detalle del error
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

router.get('/productos/buscar', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Se requiere un término de búsqueda' });
  }

  const query = `
    SELECT p.*, c.nombre_categoria
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.nombre LIKE ? OR p.descripcion LIKE ?
    ORDER BY p.nombre ASC
  `;
  const valores = [`%${q}%`, `%${q}%`];

  try {
    const [resultados] = await db.query(query, valores);
    res.json(resultados);
  } catch (error) {
    console.error('Error en la búsqueda de productos:', error);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
});

const camposVariantes = [];
for (let i = 0; i < 20; i++) {
  camposVariantes.push({ name: `imagenes_variantes_${i}`, maxCount: 10 });
}

const cpUpload = upload.fields([
  { name: 'images', maxCount: 10 },
  ...camposVariantes
]);

// Endpoint para crear productos y variantes con imágenes
router.post("/productos", verifyToken, cpUpload, async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      sku,
      calificacion_promedio,
      total_resenas,
      categoria_id,
      color_id,
      tamano_id,
      variantes, // puede venir string o array
    } = req.body;

    let variantesArray = [];
    if (variantes) {
      variantesArray = typeof variantes === "string" ? JSON.parse(variantes) : variantes;
    }

    // Aquí corregí solo la obtención del id del usuario desde el token (supongo que está en req.usuario.id)
    const usuario_id = req.usuario?.id;

    const tiene_variantes = variantesArray && variantesArray.length > 0;

    // Insertar producto con async/await y pool
    const queryProducto = `
      INSERT INTO productos 
        (nombre, descripcion, sku, calificacion_promedio, total_resenas, categoria_id, usuario_id, color_id, tamano_id, tiene_variantes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [resultProducto] = await db.query(queryProducto, [
      nombre,
      descripcion,
      sku,
      calificacion_promedio,
      total_resenas,
      categoria_id,
      usuario_id,
      color_id,
      tamano_id,
      tiene_variantes ? 1 : 0,
    ]);
    const productoId = resultProducto.insertId;

    // Insertar variantes
    let varianteIds = [];
    if (variantesArray && variantesArray.length > 0) {
      for (const variante of variantesArray) {
        const { color_id, tamano_id } = variante;
        if (color_id != null && tamano_id != null) {
          const queryVariante = `
            INSERT INTO variantes (producto_id, color_id, tamano_id)
            VALUES (?, ?, ?)
          `;
          const [resultVariante] = await db.query(queryVariante, [productoId, color_id, tamano_id]);
          varianteIds.push(resultVariante.insertId);
        } else {
          return res.status(400).json({
            message: "Faltan datos para alguna variante: color_id, tamano_id"
          });
        }
      }
    }

    // Subir imágenes del producto
    if (req.files['images'] && req.files['images'].length > 0) {
      for (const file of req.files['images']) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "productos" },
            (error, result) => error ? reject(error) : resolve(result)
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        const queryImg = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
        await db.query(queryImg, [productoId, uploadResult.secure_url]);
      }
    }

    // Subir imágenes variantes dinámicamente
    for (let i = 0; i < varianteIds.length; i++) {
      const key = `imagenes_variantes_${i}`;
      if (req.files[key] && req.files[key].length > 0) {
        for (const file of req.files[key]) {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "variantes" },
              (error, result) => error ? reject(error) : resolve(result)
            );
            streamifier.createReadStream(file.buffer).pipe(stream);
          });

          const queryImgVariante = `
            INSERT INTO imagenes_variante (variante_id, url)
            VALUES (?, ?)
          `;
          await db.query(queryImgVariante, [varianteIds[i], uploadResult.secure_url]);
        }
      }
    }

    res.status(201).json({ message: "Producto, variantes e imágenes creados exitosamente", productoId });
  } catch (error) {
    console.error("Error al crear producto, variantes e imágenes:", error);
    res.status(500).json({ message: "Error al crear producto" });
  }
});


router.put("/productos/:id", verifyToken, cpUpload, async (req, res) => {
  const productoId = req.params.id;

  try {
    const {
      nombre,
      descripcion,
      sku,
      calificacion_promedio,
      total_resenas,
      categoria_id,
      color_id,
      tamano_id,
      variantes, // array con { id, precio_compra, precio_venta, color_id, tamano_id, cantidad_stock }
    } = req.body;

    let variantesArray = [];
    if (variantes) {
      variantesArray = typeof variantes === "string" ? JSON.parse(variantes) : variantes;
    }

    // Actualizar producto
    const queryActualizarProducto = `
      UPDATE productos SET
        nombre = ?, descripcion = ?, sku = ?, calificacion_promedio = ?, total_resenas = ?,
        categoria_id = ?, color_id = ?, tamano_id = ?
      WHERE id = ?
    `;

    await db.query(queryActualizarProducto, [
      nombre,
      descripcion,
      sku,
      calificacion_promedio,
      total_resenas,
      categoria_id,
      color_id,
      tamano_id,
      productoId
    ]);

    // Actualizar imágenes del producto (si se envían nuevas)
    if (req.files['images'] && req.files['images'].length > 0) {
      // Eliminar imágenes anteriores
      await db.query("DELETE FROM imagenes WHERE producto_id = ?", [productoId]);

      for (const file of req.files['images']) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "productos" },
            (error, result) => error ? reject(error) : resolve(result)
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        await db.query("INSERT INTO imagenes (producto_id, url) VALUES (?, ?)", [productoId, uploadResult.secure_url]);
      }
    }

    // Actualizar cada variante
    for (let i = 0; i < variantesArray.length; i++) {
      const variante = variantesArray[i];
      const { id, color_id, tamano_id } = variante;

      const queryActualizarVariante = `
        UPDATE variantes SET
        color_id = ?, tamano_id = ?
        WHERE id = ? AND producto_id = ?
      `;

      await db.query(queryActualizarVariante, [color_id, tamano_id, id, productoId]);

      // Procesar imágenes de la variante
      const key = `imagenes_variantes_${i}`;
      if (req.files[key] && req.files[key].length > 0) {
        // Eliminar imágenes anteriores
        await db.query("DELETE FROM imagenes_variante WHERE variante_id = ?", [id]);

        for (const file of req.files[key]) {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "variantes" },
              (error, result) => error ? reject(error) : resolve(result)
            );
            streamifier.createReadStream(file.buffer).pipe(stream);
          });

          const queryInsertImgVariante = `
            INSERT INTO imagenes_variante (variante_id, url)
            VALUES (?, ?)
          `;

          await db.query(queryInsertImgVariante, [id, uploadResult.secure_url]);
        }
      }
    }

    res.json({ message: "Producto y variantes actualizados correctamente." });

  } catch (error) {
    console.error("Error al actualizar producto y variantes:", error);
    res.status(500).json({ message: "Error al actualizar el producto" });
  }
});


// Obtener variantes de un producto específico
router.get("/productos/:id/variantes", verifyToken, async (req, res) => {
  const productoId = req.params.id;

  try {
    const [results] = await db.query(
      "SELECT * FROM variantes WHERE producto_id = ?",
      [productoId]
    );
    res.json(results);
  } catch (error) {
    console.error("Error en servidor al obtener variantes:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});


// Endpoint para eliminar un producto
router.delete("/productos/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params; // ID del producto a eliminar

    // Verificar si el producto existe
    const [producto] = await db.query("SELECT * FROM productos WHERE id = ?", [id]);
    if (producto.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Eliminar registros en otras tablas (productos_carrito, etc.)
    await db.query("DELETE FROM productos_carrito WHERE producto_id = ?", [id]);

    // Eliminar imágenes asociadas al producto
    await db.query("DELETE FROM imagenes WHERE producto_id = ?", [id]);

    // Eliminar el producto
    await db.query("DELETE FROM productos WHERE id = ?", [id]);

    res.status(200).json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error al eliminar producto" });
  }
});


// Endpoint para obtener todos los productos con sus variantes e imágenes
router.get("/productos", verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT p.id,
             p.color_id, 
             p.tamano_id, 
             p.nombre,
             p.descripcion,
             p.precio_compra,
             p.precio_venta,
             p.cantidad_stock,
             p.creado_en,
             p.actualizado_en,
             p.sku,
             co.nombre_color, 
             t.nombre_tamano,
             c.nombre_categoria AS nombre_categoria,
             u.nombre AS usuario_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN colores co ON p.color_id = co.id
      LEFT JOIN tamaños t ON p.tamano_id = t.id;
    `;

    const [productos] = await db.query(query);

    // Por cada producto, obtener imágenes y variantes con sus imágenes
    const productosConDetalles = await Promise.all(productos.map(async (producto) => {
      // Obtener imágenes del producto
      const [imagenes] = await db.query("SELECT url FROM imagenes WHERE producto_id = ?", [producto.id]);
      producto.imagenes = imagenes.map(img => img.url);

      // Obtener variantes con color y tamaño
      const variantesQuery = `
        SELECT v.id, 
               v.producto_id, 
               v.color_id, 
               v.tamano_id, 
               v.cantidad_stock, 
               v.precio_compra, 
               v.precio_venta,
               co.nombre_color, 
               t.nombre_tamano
        FROM variantes v
        JOIN colores co ON v.color_id = co.id
        JOIN tamaños t ON v.tamano_id = t.id
        WHERE v.producto_id = ?
      `;

      const [variantes] = await db.query(variantesQuery, [producto.id]);

      // Para cada variante, obtener sus imágenes
      const variantesConImagenes = await Promise.all(variantes.map(async (variante) => {
        const [imagenesVar] = await db.query("SELECT url FROM imagenes_variante WHERE variante_id = ?", [variante.id]);
        variante.imagenes = imagenesVar.map(img => img.url);
        return variante;
      }));

      producto.variantes = variantesConImagenes;

      return producto;
    }));

    res.json(productosConDetalles);

  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});


// Endpoint para obtener todas las variantes con el nombre del producto
router.get('/variantes', async (req, res) => {
  try {
    const query = `
      SELECT v.id, 
             CONCAT(p.nombre, ' - ', co.nombre_color, ' - ', t.nombre_tamano) AS nombre, 
             v.producto_id
      FROM variantes v
      JOIN productos p ON v.producto_id = p.id
      JOIN colores co ON v.color_id = co.id
      JOIN tamaños t ON v.tamano_id = t.id
    `;

    const [results] = await db.query(query);
    res.json(results);

  } catch (err) {
    console.error('Error al obtener variantes:', err);
    res.status(500).json({ message: 'Error al obtener variantes' });
  }
});


router.get('/productos-simples', async (req, res) => {
  try {
    const query = `
      SELECT p.id, 
             CONCAT(p.nombre, ' - ', co.nombre_color, ' - ', t.nombre_tamano) AS nombre
      FROM productos p
      LEFT JOIN colores co ON p.color_id = co.id
      LEFT JOIN tamaños t ON p.tamano_id = t.id
    `;

    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error al obtener productos simples:', err);
    res.status(500).json({ message: 'Error al obtener productos simples' });
  }
});


router.get("/productos/:id/:varianteId?", async (req, res) => {
  const { id, varianteId } = req.params;

  try {
    // Obtener producto
    const queryProducto = `
      SELECT p.*, 
             c.nombre_categoria AS nombre_categoria, 
             u.nombre AS usuario_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `;
    const [resultadoProducto] = await db.query(queryProducto, [id]);

    if (resultadoProducto.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    const producto = resultadoProducto[0];

    // Obtener imágenes del producto
    const queryImagenes = "SELECT url FROM imagenes WHERE producto_id = ?";
    const [imagenes] = await db.query(queryImagenes, [id]);
    producto.imagenes = imagenes.map(img => img.url);

    // Obtener variantes del producto
    const queryVariantes = `
      SELECT v.id, 
             v.producto_id, 
             v.color_id, 
             v.tamano_id, 
             v.cantidad_stock, 
             v.precio_compra, 
             v.precio_venta,
             v.precio_anterior,
             co.nombre_color,
             co.codigo_color,
             t.nombre_tamano
      FROM variantes v
      JOIN colores co ON v.color_id = co.id
      JOIN tamaños t ON v.tamano_id = t.id
      WHERE v.producto_id = ?
    `;
    const [variantes] = await db.query(queryVariantes, [id]);

    if (varianteId) {
      // Filtrar variante específica
      const varianteSeleccionada = variantes.find(v => v.id === parseInt(varianteId));
      if (!varianteSeleccionada) {
        return res.status(404).json({ message: "Variante no encontrada" });
      }

      // Obtener imágenes de la variante específica
      const queryImagenesVariante = "SELECT url FROM imagenes_variante WHERE variante_id = ?";
      const [imagenesVariante] = await db.query(queryImagenesVariante, [varianteSeleccionada.id]);
      varianteSeleccionada.imagenes = imagenesVariante.map(img => img.url);

      return res.status(200).json(varianteSeleccionada);
    } else {
      // Obtener imágenes para cada variante
      const variantesConImagenes = await Promise.all(
        variantes.map(async (variante) => {
          const queryImagenesVariante = "SELECT url FROM imagenes_variante WHERE variante_id = ?";
          const [imagenesVariante] = await db.query(queryImagenesVariante, [variante.id]);
          variante.imagenes = imagenesVariante.map(img => img.url);
          return variante;
        })
      );
      producto.variantes = variantesConImagenes;
      return res.status(200).json(producto);
    }

  } catch (error) {
    console.error("Error general:", error);
    res.status(500).json({ message: "Error al obtener el producto o la variante" });
  }
});


router.get('/relacionados/:productoId', async (req, res) => {
  const productoId = parseInt(req.params.productoId, 10);
  console.log('Entrando a ruta relacionados. ID:', productoId);

  try {
    // Obtener la categoría del producto
    const queryCategoria = 'SELECT categoria_id FROM productos WHERE id = ?';
    const [results] = await db.query(queryCategoria, [productoId]);

    if (!results.length) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const categoriaId = results[0].categoria_id;

    // Obtener productos relacionados por categoría excluyendo el producto actual
    const queryRelacionados = `
      SELECT 
        p.id, p.nombre, p.descripcion, p.precio_venta, p.cantidad_stock, 
        p.color_id, p.tamano_id,
        co.nombre_color, t.nombre_tamano
      FROM productos p
      LEFT JOIN colores co ON p.color_id = co.id
      LEFT JOIN tamaños t ON p.tamano_id = t.id
      WHERE p.categoria_id = ? AND p.id != ?
      LIMIT 5;
    `;
    const [relacionados] = await db.query(queryRelacionados, [categoriaId, productoId]);

    // Obtener imágenes y variantes con imágenes para cada producto relacionado
    const productosConDetalles = await Promise.all(
      relacionados.map(async (producto) => {
        // Obtener imágenes del producto
        const queryImagenes = 'SELECT url FROM imagenes WHERE producto_id = ?';
        const [imagenes] = await db.query(queryImagenes, [producto.id]);
        producto.imagenes = imagenes.map(img => img.url);

        // Obtener variantes del producto
        const queryVariantes = `
          SELECT v.id, v.color_id, v.tamano_id, v.cantidad_stock,
                 v.precio_compra, v.precio_venta,
                 co.nombre_color, t.nombre_tamano
          FROM variantes v
          JOIN colores co ON v.color_id = co.id
          JOIN tamaños t ON v.tamano_id = t.id
          WHERE v.producto_id = ?
        `;
        const [variantes] = await db.query(queryVariantes, [producto.id]);

        // Obtener imágenes para cada variante
        const variantesConImagenes = await Promise.all(
          variantes.map(async (variante) => {
            const queryImagenesVar = 'SELECT url FROM imagenes_variante WHERE variante_id = ?';
            const [imgsVar] = await db.query(queryImagenesVar, [variante.id]);
            variante.imagenes = imgsVar.map(img => img.url);
            return variante;
          })
        );

        producto.variantes = variantesConImagenes;
        return producto;
      })
    );

    res.json(productosConDetalles);

  } catch (error) {
    console.error('Error al obtener productos relacionados:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});


router.get('/test/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  console.log('ID recibido:', id);

  try {
    const [result] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    console.log('Resultado:', result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la consulta' });
  }
});


module.exports = router;