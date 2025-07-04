// routes/productos.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const Producto = require("../models/Producto");
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno

const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require('../config/cloudinaryConfig');

// Configurar Multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Endpoint para crear un producto junto con sus imágenes.
 * Se espera que el cliente envíe:
 * - En el body (JSON): Los datos del producto.
 * - En el campo 'images' (multipart/form-data): Los archivos de imagen.
 * 
 * 
 */

router.get('/productos/buscar', (req, res) => {
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

  db.query(query, valores, (error, resultados) => {
    if (error) {
      console.error('Error en la búsqueda de productos:', error);
      return res.status(500).json({ error: 'Error al buscar productos' });
    }
    res.json(resultados);
  });
});






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

const cpUpload = upload.fields([
  { name: 'images', maxCount: 10 },  // Para imágenes del producto
  { name: 'imagenes_variantes', maxCount: 10 }  // Para imágenes de variantes
]);

// Endpoint para crear un producto con imágenes (ahora protegido por el middleware)
// Endpoint para crear un producto con variantes e imágenes
router.post("/productos", verifyToken, cpUpload, async (req, res) => {
  try {
    // Extraer datos del producto del body
    const {
      nombre,
      descripcion,
      sku,
      calificacion_promedio,
      precio_compra,
      precio_venta,
      cantidad_stock,
      total_resenas,
      categoria_id,
      color_id,
      tamano_id,
      variantes, // Variantes es un array de objetos { color_id, tamano_id, cantidad_stock }
    } = req.body;

    // Convertir variantes a objeto si es string
    let variantesArray = [];
    if (variantes) {
      if (typeof variantes === "string") {
        variantesArray = JSON.parse(variantes);
      } else {
        variantesArray = variantes;
      }
    }

    // Usar el ID del usuario extraído del token
    const usuario_id = req.id;

    // Verificar si el producto tiene variantes
    const tiene_variantes = variantesArray && variantesArray.length > 0;

    // Insertar el producto en la tabla productos
    const productoId = await new Promise((resolve, reject) => {
      const query = `
      INSERT INTO productos 
        (nombre, descripcion, sku, calificacion_promedio, total_resenas, categoria_id, usuario_id, color_id, tamano_id, tiene_variantes, precio_compra, precio_venta, cantidad_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ? , ? , ? , ? , ? , ?)
    `;
      db.query(
        query,
        [
          nombre,
          descripcion,
          sku,
          calificacion_promedio,
          total_resenas,
          categoria_id,
          usuario_id,
          color_id,
          tamano_id,
          precio_compra,
          precio_venta,
          cantidad_stock,
          tiene_variantes ? 1 : 0, // Si tiene variantes, poner 1
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.insertId);
        }
      );
    });

    // Crear las variantes para el producto
    let varianteIds = [];
    if (variantesArray && variantesArray.length > 0) {
      for (const variante of variantesArray) {
        const { precio_compra, precio_venta, color_id, tamano_id, cantidad_stock } = variante;
        // Verificar que los valores no sean null o undefined
        if (color_id != null && tamano_id != null && cantidad_stock != null) {
          const varianteId = await new Promise((resolve, reject) => {
            const query = `
              INSERT INTO variantes (precio_compra, precio_venta, producto_id, color_id, tamano_id, cantidad_stock)
              VALUES (?, ?, ?, ?, ?, ?)
            `;
            db.query(
              query,
              [precio_compra, precio_venta, productoId, color_id, tamano_id, cantidad_stock],
              (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
              }
            );
          });
          varianteIds.push(varianteId);
        } else {
          return res.status(400).json({
            message: "Faltan datos para alguna variante: color_id, tamano_id o cantidad_stock"
          });
        }
      }
    }

    // Procesar imágenes del producto si se enviaron archivos
    if (req.files['images'] && req.files['images'].length > 0) {
      for (const file of req.files['images']) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "productos" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        await new Promise((resolve, reject) => {
          const query = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
          db.query(query, [productoId, uploadResult.secure_url], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    }

    // Procesar imágenes de variantes si se enviaron archivos
    if (req.files['imagenes_variantes'] && req.files['imagenes_variantes'].length > 0) {
      for (let i = 0; i < req.files['imagenes_variantes'].length; i++) {
        const file = req.files['imagenes_variantes'][i];

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "variantes" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        // Guardar la imagen asociada a la variante
        await new Promise((resolve, reject) => {
          const query = `
        INSERT INTO imagenes_variante (variante_id, url)
        VALUES (?, ?)
      `;
          db.query(query, [varianteIds[i], uploadResult.secure_url], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    }


    res.status(201).json({ message: "Producto, variantes e imágenes creados exitosamente", productoId });
  } catch (error) {
    console.error("Error al crear producto, variantes e imágenes:", error);
    res.status(500).json({ message: "Error al crear producto" });
  }
});



// Endpoint para editar un producto y sus variantes e imágenes
router.put("/productos/:id", verifyToken, cpUpload, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      descripcion,
      sku,
      precio_compra,
      precio_venta,
      cantidad_stock,
      categoria_id,
      color_id,
      tamano_id,
      variantes
    } = req.body;

    // Convertir variantes si vienen como string
    let variantesArray = [];
    if (variantes) {
      if (typeof variantes === "string") {
        variantesArray = JSON.parse(variantes);
      } else {
        variantesArray = variantes;
      }
    }

    const tiene_variantes = variantesArray.length > 0;

    // Verificar si el producto existe
    const producto = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM productos WHERE id = ?", [id], (err, result) => {
        if (err) return reject(err);
        if (result.length === 0) return reject(new Error("Producto no encontrado"));
        resolve(result[0]);
      });
    });

    // Actualizar datos del producto
    await new Promise((resolve, reject) => {
      const query = `
        UPDATE productos 
        SET nombre = ?, descripcion = ?, sku = ?, precio_compra = ?, precio_venta = ?, cantidad_stock = ?, categoria_id = ?, color_id = ?, tamano_id = ?, tiene_variantes = ?
        WHERE id = ?
      `;
      db.query(
        query,
        [
          nombre,
          descripcion,
          sku,
          precio_compra,
          precio_venta,
          cantidad_stock,
          categoria_id,
          color_id,
          tamano_id,
          tiene_variantes ? 1 : 0,
          id
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    // 👉 Eliminar variantes anteriores y sus imágenes
    const variantesAnteriores = await new Promise((resolve, reject) => {
      db.query("SELECT id FROM variantes WHERE producto_id = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    for (const variante of variantesAnteriores) {
      await new Promise((resolve, reject) => {
        db.query("DELETE FROM imagenes_variante WHERE variante_id = ?", [variante.id], (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
    }

    await new Promise((resolve, reject) => {
      db.query("DELETE FROM variantes WHERE producto_id = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // 👉 Insertar nuevas variantes y sus imágenes (si existen)
    let nuevaListaVarianteIds = [];
    for (let i = 0; i < variantesArray.length; i++) {
      const { precio_compra, precio_venta, color_id, tamano_id, cantidad_stock } = variantesArray[i];

      const varianteId = await new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO variantes (precio_compra, precio_venta, producto_id, color_id, tamano_id, cantidad_stock) VALUES (?, ?, ?, ?, ?, ?)`,
          [precio_compra, precio_venta, id, color_id, tamano_id, cantidad_stock],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
          }
        );
      });

      nuevaListaVarianteIds.push(varianteId);

      // Subir imagen de variante si se envió
      if (req.files['imagenes_variantes'] && req.files['imagenes_variantes'][i]) {
        const file = req.files['imagenes_variantes'][i];

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "variantes" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        await new Promise((resolve, reject) => {
          const query = "INSERT INTO imagenes_variante (variante_id, url) VALUES (?, ?)";
          db.query(query, [varianteId, uploadResult.secure_url], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    }

    // 👉 Reemplazar imágenes del producto si hay nuevas
    if (req.files['images'] && req.files['images'].length > 0) {
      await new Promise((resolve, reject) => {
        db.query("DELETE FROM imagenes WHERE producto_id = ?", [id], (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });

      for (const file of req.files['images']) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "productos" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        await new Promise((resolve, reject) => {
          const query = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
          db.query(query, [id, uploadResult.secure_url], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    }

    res.status(200).json({ message: "Producto, variantes e imágenes actualizados exitosamente" });
  } catch (error) {
    console.error("Error al editar producto:", error);
    res.status(500).json({ message: "Error al editar producto" });
  }
});




// Endpoint para eliminar un producto
router.delete("/productos/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params; // ID del producto a eliminar

    // Verificar si el producto existe
    const producto = await new Promise((resolve, reject) => {
      const query = "SELECT * FROM productos WHERE id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        if (result.length === 0) return reject(new Error("Producto no encontrado"));
        resolve(result[0]);
      });
    });

    // Eliminar registros en otras tablas (productos_carrito, etc.)
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM productos_carrito WHERE producto_id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Eliminar imágenes asociadas al producto
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM imagenes WHERE producto_id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Eliminar el producto
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM productos WHERE id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    res.status(200).json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error al eliminar producto" });
  }
});



// Endpoint para obtener todos los productos con sus variantes e imágenes
router.get("/productos", verifyToken, async (req, res) => {
  try {
    // Consulta para obtener todos los productos, su categoría y usuario
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

    db.query(query, async (err, productos) => {
      if (err) {
        console.error('Error al obtener productos:', err);
        return res.status(500).json({ message: 'Error al obtener productos' });
      }

      // Para cada producto, obtener las imágenes y las variantes
      const productosConDetalles = await Promise.all(productos.map(async (producto) => {
        return new Promise((resolve, reject) => {
          // Obtener imágenes asociadas al producto
          const queryImagenes = "SELECT url FROM imagenes WHERE producto_id = ?";
          db.query(queryImagenes, [producto.id], (err, imagenes) => {
            if (err) {
              console.error("Error al obtener imágenes:", err);
              return reject(err);
            }
            producto.imagenes = imagenes.map(img => img.url);

            // Obtener variantes (color, tamaño, stock) para el producto
            const queryVariantes = `
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

            db.query(queryVariantes, [producto.id], async (err, variantes) => {
              if (err) return reject(err);

              // Obtener imágenes para cada variante
              const variantesConImagenes = await Promise.all(variantes.map(async (variante) => {
                return new Promise((resolveVar, rejectVar) => {
                  const queryImagenesVariante = `
                    SELECT url FROM imagenes_variante WHERE variante_id = ?
                  `;
                  db.query(queryImagenesVariante, [variante.id], (err, imagenesVar) => {
                    if (err) return rejectVar(err);
                    variante.imagenes = imagenesVar.map(img => img.url);
                    resolveVar(variante);
                  });
                });
              }));

              producto.variantes = variantesConImagenes; // Agregar variantes al producto
              resolve(producto);
            });
          });
        });
      }));

      res.json(productosConDetalles); // Devolver los productos con sus variantes e imágenes
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});


// Endpoint para obtener todas las variantes con el nombre del producto
router.get('/variantes', (req, res) => {
  const query = `
    SELECT v.id, 
           CONCAT(p.nombre, ' - ', co.nombre_color, ' - ', t.nombre_tamano) AS nombre, 
           v.producto_id
    FROM variantes v
    JOIN productos p ON v.producto_id = p.id
    JOIN colores co ON v.color_id = co.id
    JOIN tamaños t ON v.tamano_id = t.id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener variantes:', err);
      return res.status(500).json({ message: 'Error al obtener variantes' });
    }
    res.json(results);
  });
});

router.get('/productos-simples', (req, res) => {
  const query = `
    SELECT p.id, 
           CONCAT(p.nombre, ' - ', co.nombre_color, ' - ', t.nombre_tamano) AS nombre
    FROM productos p
    LEFT JOIN colores co ON p.color_id = co.id
    LEFT JOIN tamaños t ON p.tamano_id = t.id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener productos simples:', err);
      return res.status(500).json({ message: 'Error al obtener productos simples' });
    }
    res.json(results);
  });
});





// Ruta para obtener todos los productos con sus imágenes
router.get("/productos-publico", async (req, res) => {
  try {
    // Obtener los productos con sus categorías y usuarios
    const query = `
        SELECT p.*, c.nombre_categoria AS nombre_categoria, u.nombre AS usuario_nombre
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN usuarios u ON p.usuario_id = u.id
      `;
    db.query(query, (err, productos) => {
      if (err) {
        console.error("Error al obtener productos:", err);
        return res.status(500).json({ message: "Error al obtener productos" });
      }

      // Obtener las imágenes de cada producto
      const productosConImagenes = [];
      productos.forEach((producto, index) => {
        const queryImagenes = "SELECT * FROM imagenes WHERE producto_id = ?";
        db.query(queryImagenes, [producto.id], (err, imagenes) => {
          if (err) {
            console.error("Error al obtener imágenes:", err);
            return res.status(500).json({ message: "Error al obtener imágenes" });
          }

          productos[index].imagenes = imagenes.map(imagen => imagen.url);

          // Si ya hemos procesado todos los productos, los enviamos
          if (productos.every(p => p.imagenes !== undefined)) {
            return res.json(productos);
          }
        });
      });
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
});


// Ruta para obtener un producto o una variante específica
router.get("/productos/:id/:varianteId?", async (req, res) => {
  const { id, varianteId } = req.params;

  try {
    // Obtener el producto por ID
    const queryProducto = `
      SELECT p.*, 
             c.nombre_categoria AS nombre_categoria, 
             u.nombre AS usuario_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `;

    db.query(queryProducto, [id], (err, resultadoProducto) => {
      if (err) {
        console.error("Error al obtener el producto:", err);
        return res.status(500).json({ message: "Error al obtener el producto" });
      }

      if (resultadoProducto.length === 0) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }

      const producto = resultadoProducto[0];

      // Obtener imágenes del producto
      const queryImagenes = "SELECT url FROM imagenes WHERE producto_id = ?";
      db.query(queryImagenes, [id], (err, imagenes) => {
        if (err) {
          console.error("Error al obtener las imágenes del producto:", err);
          return res.status(500).json({ message: "Error al obtener las imágenes" });
        }

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
                 co.nombre_color, 
                 t.nombre_tamano
          FROM variantes v
          JOIN colores co ON v.color_id = co.id
          JOIN tamaños t ON v.tamano_id = t.id
          WHERE v.producto_id = ?
        `;

        db.query(queryVariantes, [id], async (err, variantes) => {
          if (err) {
            console.error("Error al obtener las variantes:", err);
            return res.status(500).json({ message: "Error al obtener variantes" });
          }

          // Si hay un id de variante, filtrar para esa variante
          if (varianteId) {
            const varianteSeleccionada = variantes.find(v => v.id === parseInt(varianteId));
            if (varianteSeleccionada) {
              // Obtener imágenes de la variante
              const queryImagenesVariante = "SELECT url FROM imagenes_variante WHERE variante_id = ?";
              db.query(queryImagenesVariante, [varianteSeleccionada.id], (err, imagenesVariante) => {
                if (err) {
                  console.error("Error al obtener imágenes de la variante:", err);
                  return res.status(500).json({ message: "Error al obtener imágenes de la variante" });
                }
                varianteSeleccionada.imagenes = imagenesVariante.map(img => img.url);
                return res.status(200).json(varianteSeleccionada);
              });
            } else {
              return res.status(404).json({ message: "Variante no encontrada" });
            }
          } else {
            // Si no se especificó una variante, devuelve el producto completo
            // Obtener imágenes para cada variante
            const variantesConImagenes = await Promise.all(variantes.map((variante) => {
              return new Promise((resolveVar, rejectVar) => {
                const queryImagenesVariante = "SELECT url FROM imagenes_variante WHERE variante_id = ?";
                db.query(queryImagenesVariante, [variante.id], (err, imagenesVariante) => {
                  if (err) return rejectVar(err);
                  variante.imagenes = imagenesVariante.map(img => img.url);
                  resolveVar(variante);
                });
              });
            }));

            producto.variantes = variantesConImagenes;
            res.status(200).json(producto);
          }
        });
      });
    });
  } catch (error) {
    console.error("Error general:", error);
    res.status(500).json({ message: "Error al obtener el producto o la variante" });
  }
});








// Ruta para agregar producto al catálogo
router.post('/catalogo', async (req, res) => {
  const { producto_id } = req.body;

  if (!producto_id) {
    return res.status(400).json({ message: "El ID del producto es requerido" });
  }

  try {
    // Insertar el producto en la tabla catalogo
    db.query('INSERT INTO catalogo_productos (producto_id) VALUES (?)', [producto_id]);
    res.status(201).json({ message: "Producto agregado al catálogo exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar el producto al catálogo", error });
  }
});

// Ruta para obtener los productos del catálogo
router.get('/catalogo', async (req, res) => {
  try {
    // Consulta para obtener los productos del catálogo
    const query = `
      SELECT p.id, p.nombre, p.descripcion, p.precio_calculado
      FROM catalogo_productos cp
      INNER JOIN productos p ON cp.producto_id = p.id;
    `;
    const [productos] = await db.promise().query(query);

    if (productos.length === 0) {
      return res.status(404).json({ message: "No hay productos en el catálogo" });
    }

    // Para cada producto, obtener las imágenes
    const productosConImagenes = await Promise.all(productos.map(async (producto) => {
      return new Promise((resolve, reject) => {
        const queryImagenes = "SELECT url FROM imagenes WHERE producto_id = ?";
        db.query(queryImagenes, [producto.id], (err, imagenes) => {
          if (err) {
            console.error("Error al obtener imágenes:", err);
            return reject(err);
          }
          producto.imagenes = imagenes.map(img => img.url); // Guardar solo las URLs
          resolve(producto);
        });
      });
    }));

    // Devolver los productos con imágenes
    res.status(200).json({ productos: productosConImagenes });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los productos del catálogo", error });
  }
});


// Ruta para eliminar producto del catálogo
router.delete('/catalogo/:producto_id', async (req, res) => {
  const { producto_id } = req.params;

  if (!producto_id) {
    return res.status(400).json({ message: "El ID del producto es requerido" });
  }

  try {
    // Eliminar el producto del catálogo en la tabla catalogo_productos
    const result = await db.promise().query('DELETE FROM catalogo_productos WHERE producto_id = ?', [producto_id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado en el catálogo" });
    }

    res.status(200).json({ message: "Producto eliminado del catálogo exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el producto del catálogo", error });
  }
});



// Endpoint para obtener productos por categoría
router.get('/catalogo/categoria/:categoriaId', (req, res) => {
  const categoriaId = req.params.categoriaId;

  // Consulta a la base de datos para obtener productos por categoría
  const query = `
    SELECT * FROM productos
    WHERE categoria_id = ? AND id IN (SELECT producto_id FROM catalogo_productos)
  `;

  db.query(query, [categoriaId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.json(results);
  });
});

router.get('/productos/categoria/nombre/:nombreCategoria', async (req, res) => {
  const nombreCategoria = req.params.nombreCategoria;

  try {
    // Obtener productos de la categoría
    const queryProductos = `
      SELECT p.*, c.nombre_categoria, co.nombre_color, t.nombre_tamano
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN colores co ON p.color_id = co.id
      LEFT JOIN tamaños t ON p.tamano_id = t.id
      WHERE c.nombre_categoria = ?
      AND p.id IN (SELECT producto_id FROM catalogo_productos)
    `;

    db.query(queryProductos, [nombreCategoria], async (err, productos) => {
      if (err) {
        console.error("Error al obtener productos:", err);
        return res.status(500).json({ message: "Error al obtener productos" });
      }

      // Obtener imágenes y variantes por producto
      const productosConDetalles = await Promise.all(productos.map(async (producto) => {
        return new Promise((resolve, reject) => {
          // Obtener imágenes del producto
          db.query("SELECT url FROM imagenes WHERE producto_id = ?", [producto.id], (err, imagenes) => {
            if (err) return reject(err);
            producto.imagenes = imagenes.map(img => img.url);

            // Obtener variantes del producto
            const queryVariantes = `
              SELECT v.id, v.producto_id, v.color_id, v.tamano_id, v.cantidad_stock,
                     v.precio_compra, v.precio_venta, co.nombre_color, t.nombre_tamano
              FROM variantes v
              JOIN colores co ON v.color_id = co.id
              JOIN tamaños t ON v.tamano_id = t.id
              WHERE v.producto_id = ?
            `;

            db.query(queryVariantes, [producto.id], async (err, variantes) => {
              if (err) return reject(err);

              // Obtener imágenes por variante
              const variantesConImagenes = await Promise.all(variantes.map(async (variante) => {
                return new Promise((resolveVar, rejectVar) => {
                  db.query("SELECT url FROM imagenes_variante WHERE variante_id = ?", [variante.id], (err, imagenesVar) => {
                    if (err) return rejectVar(err);
                    variante.imagenes = imagenesVar.map(img => img.url);
                    resolveVar(variante);
                  });
                });
              }));

              producto.variantes = variantesConImagenes;
              resolve(producto);
            });
          });
        });
      }));

      res.json(productosConDetalles);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});


router.get('/relacionados/:productoId', async (req, res) => {
  const productoId = parseInt(req.params.productoId, 10);
  console.log('Entrando a ruta relacionados. ID:', productoId);

  const queryCategoria = 'SELECT categoria_id FROM productos WHERE id = ?';

  db.query(queryCategoria, [productoId], (err, results) => {
    if (err) {
      console.error('Error al obtener categoría:', err);
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }

    if (!results.length) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const categoriaId = results[0].categoria_id;

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

    db.query(queryRelacionados, [categoriaId, productoId], async (err, relacionados) => {
      if (err) {
        console.error('Error al obtener relacionados:', err);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
      }

      try {
        const productosConDetalles = await Promise.all(relacionados.map(async (producto) => {
          return new Promise((resolve, reject) => {
            const queryImagenes = 'SELECT url FROM imagenes WHERE producto_id = ?';
            db.query(queryImagenes, [producto.id], (err, imagenes) => {
              if (err) return reject(err);
              producto.imagenes = imagenes.map(img => img.url);

              const queryVariantes = `
                SELECT v.id, v.color_id, v.tamano_id, v.cantidad_stock,
                       v.precio_compra, v.precio_venta,
                       co.nombre_color, t.nombre_tamano
                FROM variantes v
                JOIN colores co ON v.color_id = co.id
                JOIN tamaños t ON v.tamano_id = t.id
                WHERE v.producto_id = ?
              `;

              db.query(queryVariantes, [producto.id], async (err, variantes) => {
                if (err) return reject(err);

                const variantesConImagenes = await Promise.all(variantes.map(variante => {
                  return new Promise((resolveVar, rejectVar) => {
                    const queryImagenesVar = 'SELECT url FROM imagenes_variante WHERE variante_id = ?';
                    db.query(queryImagenesVar, [variante.id], (err, imgsVar) => {
                      if (err) return rejectVar(err);
                      variante.imagenes = imgsVar.map(img => img.url);
                      resolveVar(variante);
                    });
                  });
                }));

                producto.variantes = variantesConImagenes;
                resolve(producto);
              });
            });
          });
        }));

        res.json(productosConDetalles);
      } catch (error) {
        console.error('Error al procesar detalles:', error);
        res.status(500).json({ mensaje: 'Error al procesar productos relacionados' });
      }
    });
  });
});


router.get('/test/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log('ID recibido:', id);

  db.query('SELECT * FROM productos WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error en la consulta' });
    }

    console.log('Resultado:', result);
    res.json(result);
  });
});




module.exports = router;
