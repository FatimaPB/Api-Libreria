const express = require("express");
const bcryptjs = require('bcryptjs');
const transporter = require('../config/nodemailer');
const UsuarioSchema = require("../models/usuarios");
const { manejarIntentosFallidos, obtenerUsuariosBloqueados, bloquearUsuario } = require("../controllers/usuarioController");
const crypto = require('crypto'); // Para generar el código de verificación
const jwt = require('jsonwebtoken');
const Actividad = require('../models/actividad.model');
const db = require('../config/db'); // Importar la conexión a MySQL
const router = express.Router();

const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno

const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token:'APP_USR-7584885571117241-060904-2f06d22a868edbbcbb66f51af2a2ac20-2483950487'
});



// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const token = req.cookies.authToken; // Obtener el token de la cookie

  if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
  }

  // Verificar el token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
          return res.status(403).json({ message: 'Token inválido' });
      }
      
      req.usuario = decoded; // Agregar el usuario decodificado a la solicitud
      next(); // Continuar con la siguiente ruta
  });
}

// Endpoint para verificar la autenticación
router.get('/check-auth', verifyToken, (req, res) => {
  // Si llega aquí, significa que el token es válido y req.usuario está disponible
  res.json({
    authenticated: true,
    rol: req.usuario.rol,
    usuario: req.usuario // opcional, según la información que quieras devolver
  });
});


// Obtener carrito del usuario autenticado
router.get('/carrito', verifyToken, (req, res) => {
  db.query(
          `SELECT 
  ac.id,
  ac.producto_id,
  ac.variante_id,
  p.nombre,
  COALESCE(v.precio_venta, p.precio_venta) AS precio_venta,
  ac.cantidad,
  (
    SELECT GROUP_CONCAT(url)
    FROM imagenes_variante
    WHERE variante_id = ac.variante_id
  ) AS imagenes_variante,
  (
    SELECT GROUP_CONCAT(url)
    FROM imagenes
    WHERE producto_id = p.id AND variante_id IS NULL
  ) AS imagenes_producto
FROM productos_carrito ac
JOIN productos p ON ac.producto_id = p.id
LEFT JOIN variantes v ON ac.variante_id = v.id
WHERE ac.usuario_id = ?
GROUP BY ac.id;
`,  // Agrupar por artículo en el carrito
    [req.usuario.id],
    (error, results) => {
      if (error) {
        console.error('Error al obtener el carrito:', error);
        return res.status(500).json({ message: 'Error al obtener el carrito' });
      }

      // Transformar la cadena de imágenes en un array
      results = results.map(item => ({
        ...item,
        imagenes: item.imagenes ? item.imagenes.split(',') : []  // Convierte la cadena en array
      }));

      res.json(results);
    }
  );
});

// Agregar producto al carrito
router.post('/carrito/agregar', verifyToken, (req, res) => {
  const { producto_id, variante_id, cantidad } = req.body;
  const usuario_id = req.usuario.id;

  if (!producto_id || cantidad <= 0) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  // Verificar si el producto (con o sin variante) ya está en el carrito
  const queryBuscar = `SELECT cantidad FROM productos_carrito WHERE usuario_id = ? AND producto_id = ? AND ${variante_id ? 'variante_id = ?' : 'variante_id IS NULL'}`;
  const paramsBuscar = variante_id ? [usuario_id, producto_id, variante_id] : [usuario_id, producto_id];

  db.query(queryBuscar, paramsBuscar, (error, results) => {
    if (error) {
      console.error('Error al buscar producto en el carrito:', error);
      return res.status(500).json({ message: 'Error al buscar producto' });
    }

    if (results.length > 0) {
      const nuevaCantidad = results[0].cantidad + cantidad;

      // Actualizar cantidad
      const queryUpdate = `UPDATE productos_carrito SET cantidad = ? WHERE usuario_id = ? AND producto_id = ? AND ${variante_id ? 'variante_id = ?' : 'variante_id IS NULL'}`;
      const paramsUpdate = variante_id ? [nuevaCantidad, usuario_id, producto_id, variante_id] : [nuevaCantidad, usuario_id, producto_id];

      db.query(queryUpdate, paramsUpdate, (updateError) => {
        if (updateError) {
          console.error('Error al actualizar cantidad:', updateError);
          return res.status(500).json({ message: 'Error al actualizar cantidad' });
        }
        res.json({ message: 'Cantidad actualizada en el carrito' });
      });

    } else {
      // Insertar nuevo producto
      db.query(
        'INSERT INTO productos_carrito (usuario_id, producto_id, variante_id, cantidad) VALUES (?, ?, ?, ?)',
        [usuario_id, producto_id, variante_id || null, cantidad],
        (insertError) => {
          if (insertError) {
            console.error('Error al agregar producto al carrito:', insertError);
            return res.status(500).json({ message: 'Error al agregar producto' });
          }
          res.json({ message: 'Producto agregado al carrito' });
        }
      );
    }
  });
});


// Vaciar carrito
router.post('/carrito/limpiar', verifyToken, (req, res) => {
  db.query(
    'DELETE FROM productos_carrito WHERE usuario_id = ?',
    [req.usuario.id],
    (error) => {
      if (error) {
        console.error('Error al limpiar el carrito:', error);
        return res.status(500).json({ message: 'Error al limpiar el carrito' });
      }
      res.json({ message: 'Carrito vaciado' });
    }
  );
});





//simulacion de copras
router.post('/comprar', verifyToken, (req, res) => {
  const { productos, total, metodoPago, direccionEnvio } = req.body;
  const usuario_id = req.usuario.id;

  if (!productos || productos.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío' });
  }

   // Determinar el estado de la venta según el método de pago:
  // Ejemplo: si el método de pago es 'efectivo' (supongamos que su id es 3), queda pendiente, de lo contrario, pagado.
  const estadoVenta = (metodoPago == 3) ? 'pendiente' : 'pagado';

  // Obtener una conexión del pool
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error al obtener conexión:', err);
      return res.status(500).json({ message: 'Error en la compra' });
    }

    // Iniciar transacción
    connection.beginTransaction((err) => {
      if (err) {
        console.error('Error al iniciar transacción:', err);
        connection.release();
        return res.status(500).json({ message: 'Error en la compra' });
      }

      // Insertar la venta (incluyendo el estado)
      connection.query(
        `INSERT INTO ventas (usuario_id, total, metodo_pago_id, direccion_envio, estado) VALUES (?, ?, ?, ?, ?)`,
        [usuario_id, total, metodoPago, direccionEnvio || null, estadoVenta],
        (error, result) => {
          if (error) {
            console.error('Error al registrar la venta:', error);
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ message: 'Error al registrar la venta' });
            });
          }

          const venta_id = result.insertId;

       // Insertar productos en detalle_ventas
       const valoresProductos = productos.map(p => [ 
        venta_id,
        p.producto_id || null,     // si es sin variante
        p.variante_id || null,     // si es con variante
        p.cantidad,
        p.precio_venta]);

       connection.query(
         `INSERT INTO detalle_ventas (venta_id, producto_id, variante_id, cantidad, precio_unitario) VALUES ?`,
         [valoresProductos],
         (errorDetalle) => {
           if (errorDetalle) {
             console.error('Error al registrar productos:', errorDetalle);
             return connection.rollback(() => {
               connection.release();
               res.status(500).json({ message: 'Error al registrar productos' });
             });
           }
      // Eliminar carrito del usuario
      connection.query(
        `DELETE FROM productos_carrito WHERE usuario_id = ?`,
        [usuario_id],
        (errorCarrito) => {
          if (errorCarrito) {
            console.error('Error al limpiar el carrito:', errorCarrito);
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ message: 'Error al limpiar el carrito' });
            });
          }
 // Registrar en el historial de ventas (estado inicial: 'N/A' -> estadoVenta)
 connection.query(
  `INSERT INTO ventas_historial (venta_id, estado_anterior, estado_nuevo, cambio_por) VALUES (?, ?, ?, ?)`,
  [venta_id, 'N/A', estadoVenta, 'Sistema'],
  (errorHistorial) => {
    if (errorHistorial) {
      console.error('Error al registrar historial de ventas:', errorHistorial);
      return connection.rollback(() => {
        connection.release();

        res.status(500).json({ message: 'Error al registrar historial de ventas' });
      });
    }

  // Confirmar transacción
  connection.commit((commitErr) => {
    if (commitErr) {
      console.error('Error al confirmar la compra:', commitErr);
      return connection.rollback(() => {
        connection.release();
        res.status(500).json({ message: 'Error al confirmar la compra' });
      });
    }
  // cuando metodoPago == 4 (Mercado Pago)
  if (metodoPago == 4) {
   const preference = {
  items: productos.map(p => ({
    title: p.nombre || 'Producto',
    quantity: p.cantidad,
    unit_price:p.precio_venta,
    currency_id: 'MXN'
  })),
  back_urls: {
    success: 'https://tulibreria.com/pago-exitoso',
    failure: 'https://tulibreria.com/pago-fallido',
    pending: 'https://tulibreria.com/pago-pendiente'
  },
  auto_return: 'approved',
  external_reference: venta_id.toString()
};

mercadopago.preferences.create(preference)
  .then(response => {
    connection.release();
    res.json({
      message: 'Compra registrada, redirige a Mercado Pago',
       init_point: response.body.init_point 
    });
  })
  .catch(error => {
    console.error('Error creando preferencia Mercado Pago:', error);
    return connection.rollback(() => {
      connection.release();
      res.status(500).json({ message: 'Error creando preferencia de pago' });
    });
  });

    return; // para evitar que siga el flujo y envíe otro res.json
  }
    connection.release();
    res.json({ message: 'Compra realizada con éxito'});
  });
}
);
}
);
}
);
}
);
});
});
});


router.put('/ventas/:ventaId/estado', verifyToken, (req, res) => {
  const { ventaId } = req.params;
  const { nuevoEstado, cambioPor } = req.body; // nuevoEstado: 'pendiente', 'pagado' o 'cancelado'

  // Primero, obtener la venta actual para conocer el estado anterior
  db.query('SELECT estado FROM ventas WHERE id = ?', [ventaId], (err, results) => {
    if (err) {
      console.error('Error al obtener la venta:', err);
      return res.status(500).json({ message: 'Error al obtener la venta' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const estadoAnterior = results[0].estado;

    // Actualizar el estado en la tabla ventas
    db.query('UPDATE ventas SET estado = ? WHERE id = ?', [nuevoEstado, ventaId], (updateErr) => {
      if (updateErr) {
        console.error('Error al actualizar el estado de la venta:', updateErr);
        return res.status(500).json({ message: 'Error al actualizar el estado de la venta' });
      }

      // Insertar el cambio en el historial de ventas
      db.query(
        'INSERT INTO ventas_historial (venta_id, estado_anterior, estado_nuevo, cambio_por) VALUES (?, ?, ?, ?)',
        [ventaId, estadoAnterior, nuevoEstado, cambioPor || 'Sistema'],
        (historialErr) => {
          if (historialErr) {
            console.error('Error al registrar historial de ventas:', historialErr);
            return res.status(500).json({ message: 'Error al registrar historial de ventas' });
          }

          res.json({ message: 'Estado de la venta actualizado correctamente', ventaId });
        }
      );
    });
  });
});

router.put('/ventas/:ventaId/envio', verifyToken, (req, res) => {
  const { ventaId } = req.params;
  const { nuevoEstado, cambioPor } = req.body; // 'pendiente', 'enviado', 'entregado'

  db.query('SELECT estado_envio FROM ventas WHERE id = ?', [ventaId], (err, results) => {
    if (err) {
      console.error('Error al obtener el estado de envío:', err);
      return res.status(500).json({ message: 'Error al obtener el estado de envío' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const estadoAnterior = results[0].estado_envio;

    db.query('UPDATE ventas SET estado_envio = ? WHERE id = ?', [nuevoEstado, ventaId], (updateErr) => {
      if (updateErr) {
        console.error('Error al actualizar el estado de envío:', updateErr);
        return res.status(500).json({ message: 'Error al actualizar el estado de envío' });
      }

      db.query(
        'INSERT INTO envios_historial (venta_id, estado_anterior, estado_nuevo, cambio_por) VALUES (?, ?, ?, ?)',
        [ventaId, estadoAnterior, nuevoEstado, cambioPor || 'Sistema'],
        (historialErr) => {
          if (historialErr) {
            console.error('Error al registrar historial de envío:', historialErr);
            return res.status(500).json({ message: 'Error al registrar historial de envío' });
          }

          res.json({ message: 'Estado de envío actualizado correctamente', ventaId });
        }
      );
    });
  });
});


//este es el bueno de compras de usuario


router.get('/ventas/historial/:usuario_id', verifyToken, (req, res) => {
  const usuario_id = req.params.usuario_id;
  db.query(
    `SELECT v.id, v.fecha, v.total, v.estado, v.estado_envio, v.direccion_envio,
            mp.nombre AS metodo_pago
     FROM ventas v
     JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
     WHERE v.usuario_id = ?
     ORDER BY v.fecha DESC`,
    [usuario_id],
    (err, results) => {
      if (err) {
        console.error('Error al obtener historial de ventas:', err);
        return res.status(500).json({ message: 'Error al obtener historial de ventas' });
      }
      res.json({ ventas: results });
    }
  );
});

//ruta de detalle de la compra del usuario

router.get('/pedidos/:id', verifyToken, (req, res) => {
  const venta_id = req.params.id;
  const usuario_id = req.usuario.id;

  const ventaQuery = `
 SELECT v.id, v.fecha, v.total, v.estado, v.estado_envio, v.direccion_envio,
           mp.nombre AS metodo_pago
    FROM ventas v
    JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
    WHERE v.id = ? AND v.usuario_id = ?
  `;

  const productosQuery = `
   SELECT p.nombre, dv.cantidad, dv.precio_unitario,
           COALESCE(iv.url, ip.url) AS imagen
    FROM detalle_ventas dv
    LEFT JOIN productos p ON dv.producto_id = p.id
    LEFT JOIN imagenes_variante iv ON dv.variante_id = iv.variante_id
    LEFT JOIN imagenes ip ON dv.producto_id = ip.producto_id
    WHERE dv.venta_id = ?
    GROUP BY dv.id
  `;

  db.query(ventaQuery, [venta_id, usuario_id], (err, ventaResult) => {
    if (err || ventaResult.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    db.query(productosQuery, [venta_id], (err2, productos) => {
      if (err2) {
        return res.status(500).json({ message: 'Error al obtener productos' });
      }

      res.json({ ...ventaResult[0], productos });
    });
  });
});


//ruta del repartidor

router.get('/envios/pendientes', verifyToken, (req, res) => {
  db.query(
    `SELECT v.id, v.fecha, v.direccion_envio, u.nombre AS cliente, v.estado_envio
     FROM ventas v
     JOIN usuarios u ON v.usuario_id = u.id
     WHERE v.estado_envio != 'entregado'
     ORDER BY v.fecha DESC`,
    (err, results) => {
      if (err) {
        console.error('Error al obtener envíos pendientes:', err);
        return res.status(500).json({ message: 'Error al obtener pedidos' });
      }
      res.json({ pedidos: results });
    }
  );
});

//ruta actualizar el envio por parte del repartidor

router.post('/envio/actualizar', verifyToken, (req, res) => {
  const { venta_id, nuevoEstado, descripcion } = req.body;
  const repartidor_id = req.usuario.id;

  // 1. Actualizar el estado de envío en la tabla ventas
  db.query(
    'UPDATE ventas SET estado_envio = ? WHERE id = ?',
    [nuevoEstado, venta_id],
    (err) => {
      if (err) {
        console.error('Error actualizando estado_envio:', err);
        return res.status(500).json({ message: 'Error al actualizar estado de envío' });
      }

      // 2. Insertar el cambio en la tabla seguimiento_envio
      db.query(
        `INSERT INTO seguimiento_envio (venta_id, estado, descripcion, cambio_por)
         VALUES (?, ?, ?, ?)`,
        [venta_id, nuevoEstado, descripcion || '', repartidor_id],
        (err2) => {
          if (err2) {
            console.error('Error al registrar seguimiento:', err2);
            return res.status(500).json({ message: 'Error al registrar seguimiento' });
          }

          res.json({ message: 'Seguimiento actualizado correctamente' });
        }
      );
    }
  );
});

// ruta para consuktar elk seguimiento del envioo por parte del usuario

router.get('/envio/seguimiento/:venta_id', verifyToken, (req, res) => {
  const venta_id = req.params.venta_id;
  const usuario_id = req.usuario.id;

  // Validar que la venta pertenece al usuario
  const validarQuery = `SELECT id FROM ventas WHERE id = ? AND usuario_id = ?`;

  db.query(validarQuery, [venta_id, usuario_id], (err, result) => {
    if (err || result.length === 0) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Obtener historial
    const seguimientoQuery = `
      SELECT estado AS estado_nuevo, descripcion, fecha, u.nombre AS cambio_por
      FROM seguimiento_envio se
      LEFT JOIN usuarios u ON se.cambio_por = u.id
      WHERE se.venta_id = ?
      ORDER BY se.fecha DESC
    `;

    db.query(seguimientoQuery, [venta_id], (err2, historial) => {
      if (err2) {
        console.error('Error al obtener seguimiento:', err2);
        return res.status(500).json({ message: 'Error al obtener seguimiento' });
      }

      res.json({ historial });
    });
  });
});


router.get('/ventas/:ventaId/detalle', verifyToken, (req, res) => {
  const { ventaId } = req.params;

  // Obtener detalle de productos
  db.query(
    `SELECT d.producto_id, p.nombre, d.cantidad, d.precio_unitario
     FROM detalle_ventas d
     JOIN productos p ON d.producto_id = p.id
     WHERE d.venta_id = ?`,
    [ventaId],
    (errDetalle, detalleResults) => {
      if (errDetalle) {
        console.error('Error al obtener detalle de la venta:', errDetalle);
        return res.status(500).json({ message: 'Error al obtener detalle de la venta' });
      }

      // Obtener historial de cambios de estado
      db.query(
        `SELECT estado_anterior, estado_nuevo, cambio_por, fecha
         FROM ventas_historial
         WHERE venta_id = ?
         ORDER BY fecha ASC`,
        [ventaId],
        (errHistorial, historialResults) => {
          if (errHistorial) {
            console.error('Error al obtener historial de la venta:', errHistorial);
            return res.status(500).json({ message: 'Error al obtener historial de la venta' });
          }
          res.json({
            detalle: detalleResults,
            historial: historialResults
          });
        }
      );
    }
  );
});


router.get('/ventas/historial-todos', verifyToken, (req, res) => {
  if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'empleado') {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const consultaVentas = `
    SELECT v.id, u.nombre AS cliente, v.total, v.metodo_pago_id, v.estado, v.estado_envio, v.direccion_envio, v.fecha,
           mp.nombre AS metodo_pago
    FROM ventas v
    JOIN usuarios u ON v.usuario_id = u.id
    JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
    ORDER BY v.fecha DESC`;

  db.query(consultaVentas, (error, ventas) => {
    if (error) {
      console.error('Error al obtener historial de ventas:', error);
      return res.status(500).json({ message: 'Error al obtener el historial de ventas' });
    }

    if (ventas.length === 0) {
      return res.json({ ventas: [] });
    }

    const ventasIds = ventas.map(v => v.id);

    const consultaDetalles = `
      SELECT 
        dv.venta_id,
        COALESCE(pv.nombre, ps.nombre) AS producto,
        dv.cantidad,
        dv.precio_unitario,
        (SELECT iv.url FROM imagenes_variante iv WHERE iv.variante_id = dv.variante_id LIMIT 1) AS imagen_variante,
        (SELECT ip.url FROM imagenes ip WHERE ip.producto_id = dv.producto_id LIMIT 1) AS imagen_producto
      FROM detalle_ventas dv
      LEFT JOIN variantes v ON dv.variante_id = v.id
      LEFT JOIN productos pv ON v.producto_id = pv.id
      LEFT JOIN productos ps ON dv.producto_id = ps.id
      WHERE dv.venta_id IN (?)`;

    db.query(consultaDetalles, [ventasIds], (errorDetalles, detalles) => {
      if (errorDetalles) {
        console.error('Error al obtener detalles de ventas:', errorDetalles);
        return res.status(500).json({ message: 'Error al obtener detalles de ventas' });
      }

      const ventasConDetalles = ventas.map(venta => ({
        ...venta,
        productos: detalles
          .filter(d => d.venta_id === venta.id)
          .map(d => ({
            nombre: d.producto,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            imagen: d.imagen_variante || d.imagen_producto || null
          }))
      }));

      res.json({ ventas: ventasConDetalles });
    });
  });
});

// Ruta para obtener el perfil del usuario
router.get('/perfil', verifyToken, async (req, res) => {
  try {
    // Usamos el id del usuario del token para buscar en la base de datos
    const { id } = req.usuario; // Extraemos el id correctamente
    const query = 'SELECT id, nombre, correo, telefono, rol, verificado, creado_en, mfa_activado FROM usuarios WHERE id = ?';

    db.query(query, [id], (error, results) => {
      if (error) {
        console.error("Error al obtener el perfil del usuario:", error);
        return res.status(500).json({ message: 'Error interno al obtener el perfil' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const perfil = results[0]; // Devolver solo los datos del perfil sin la contraseña ni información sensible
      res.json(perfil);
    });
  } catch (error) {
    console.error("Error al obtener el perfil:", error);
    res.status(500).json({ message: 'Error al obtener el perfil del usuario' });
  }
});


// Crear usuario
router.post("/usuarios", async (req, res) => {
  try {
      const { nombre, correo, contrasena, telefono } = req.body;

      // Verificar si el correo ya está registrado
      db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (error, results) => {
          if (error) {
              console.error('Error al verificar usuario existente:', error);
              return res.status(500).json({ message: "Error interno del servidor" });
          }

          if (results.length > 0) {
              return res.status(400).json({ message: "El correo ya está registrado" });
          }

          // Hashear la contraseña
          const hashedPassword = await bcryptjs.hash(contrasena, 10);

          // Generar un código de verificación
          const codigo_verificacion = crypto.randomInt(100000, 999999).toString(); // Código de 6 dígitos
          
          const hashedCodigo_verificacion = await bcryptjs.hash(codigo_verificacion, 10);

          // Guardar el usuario en MySQL
          db.query('INSERT INTO usuarios SET ?', {
              nombre,
              correo,
              contrasena: hashedPassword,
              telefono,
              rol: 'Cliente',
              verificado: false,
              codigo_verificacion: hashedCodigo_verificacion,
              intentos_fallidos: 0,
              bloqueado: false,
              creado_en: new Date()
          }, (error, results) => {
              if (error) {
                  console.error('Error al crear usuario en MySQL:', error);
                  return res.status(500).json({ message: "Error interno del servidor" });
              }
              });

              const mailOptions = {
                  from: '"LibreriaCR" <' + process.env.EMAIL_USER + '>',
                  to: correo,
                  subject: 'Verificación de tu cuenta',
                  html: `
                      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f9; border-radius: 8px; max-width: 600px; margin: auto;">
                          <h2 style="color: #4a90e2; text-align: center;">Verificación de tu cuenta</h2>
                          <p style="font-size: 16px; line-height: 1.6;">
                              ¡Hola!<br><br>
                              Gracias por registrarte en nuestra plataforma. Para completar tu registro, por favor verifica tu dirección de correo electrónico.
                          </p>
                          <div style="text-align: center; margin: 20px 0;">
                              <p style="font-size: 18px; font-weight: bold;">Tu código de verificación es:</p>
                              <p style="font-size: 24px; font-weight: bold; color: #4a90e2; background-color: #e6f0fb; padding: 10px 20px; border-radius: 8px; display: inline-block;">
                                  ${codigo_verificacion}
                              </p>
                          </div>
                          <p style="font-size: 16px; line-height: 1.6;">
                              Este código es válido solo durante los próximos 10 minutos. Ingresa este código en la plataforma para activar tu cuenta.
                          </p>
                          <p style="font-size: 16px; line-height: 1.6; color: #999;">
                              Si no solicitaste esta verificación, ignora este mensaje.
                          </p>
                          <p style="font-size: 16px; line-height: 1.6;">
                              ¡Gracias!<br>
                              <strong>El equipo de soporte de LibreriaCR</strong>
                          </p>
                      </div>
                  `
              };

              transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                      console.error("Error al enviar el correo:", error);
                      return res.status(500).json({ message: "Error al enviar el correo de verificación", error: error.message });
                  }
                  console.log("Correo enviado:", info.response);
                  res.status(201).json({ message: "Usuario creado. Por favor verifica tu correo electrónico." });
              });
          });

  } catch (error) {
      console.error("Error al registrar usuario:", error);
      res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Endpoint para verificar el código de verificación
router.post("/usuarios/verico", async (req, res) => {
  const { correo, codigoVerificacion } = req.body;

  try {
      // Buscar usuario por correo
      db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (error, results) => {
          if (error) {
              console.error('Error al buscar usuario:', error);
              return res.status(500).json({ message: "Error interno del servidor" });
          }

          if (results.length === 0) {
              return res.status(404).json({ message: "Usuario no encontrado" });
          }

          const usuario = results[0];

          // Verificar si ya está verificado
          if (usuario.verificado) {
              return res.status(400).json({ message: "El usuario ya está verificado" });
          }

          // 🔹 Comparar código ingresado con código hasheado
          const isCodeValid = await bcryptjs.compare(codigoVerificacion, usuario.codigo_verificacion);

          if (isCodeValid) {
              // Marcar al usuario como verificado en MySQL
              db.query('UPDATE usuarios SET verificado = TRUE, codigo_verificacion = NULL WHERE correo = ?', [correo], (error, updateResults) => {
                  if (error) {
                      console.error('Error al actualizar usuario:', error);
                      return res.status(500).json({ message: "Error interno del servidor" });
                  }

                  return res.status(200).json({ message: "Correo verificado con éxito" });
              });
          } else {
              return res.status(400).json({ message: "Código de verificación incorrecto" });
          }
      });

  } catch (error) {
      console.error("Error al verificar el código:", error);
      res.status(500).json({ message: "Error interno del servidor" });
  }
});




// Ruta para actualizar el perfil del usuario
router.put('/edit', verifyToken, async (req, res) => {
  try {
      const { id } = req.usuario; // Extraer el ID del usuario del token
      const { nombre, correo, telefono } = req.body;

      if (!id) {
          return res.status(400).json({ message: 'ID de usuario no proporcionado' });
      }

      // Actualizar el usuario en MySQL
      db.query(
          'UPDATE usuarios SET nombre = ?, correo = ?, telefono = ? WHERE id = ?',
          [nombre, correo, telefono, id],
          (error, results) => {
              if (error) {
                  console.error('Error al actualizar usuario:', error);
                  return res.status(500).json({ message: 'Error al actualizar usuario' });
              }

              if (results.affectedRows === 0) {
                  return res.status(404).json({ message: 'Usuario no encontrado' });
              }

              // Devolver los datos actualizados (sin la contraseña)
              res.json({ id, nombre, correo, telefono });
          }
      );
  } catch (error) {
      console.error('Error en el servidor:', error);
      res.status(500).json({ message: 'Error en el servidor' });
  }
});




  // Función para registrar la actividad
async function registrarActividad(usuarioId, tipo, ip, detalles = '') {
  try {
      // Registrar la actividad en la base de datos
      const actividad = new Actividad({
          usuarioId,
          tipo,
          ip,
          detalles,
      });

      // Guardar la actividad
      await actividad.save();
      console.log(`Actividad registrada: ${tipo}`);
  } catch (error) {
      console.error('Error al registrar la actividad:', error);
  }
}


// Ruta para cambiar la contraseña
router.put('/cambiar-contrasena', verifyToken, async (req, res) => {
  try {
      const { id } = req.usuario; // Obtener el ID del usuario desde el token
      const { currentPassword, newPassword } = req.body;

      if (!id) {
          return res.status(400).json({ message: 'ID de usuario no proporcionado' });
      }

      // Buscar la contraseña actual y el historial en la base de datos
      db.query('SELECT contrasena, historial_contrasenas FROM usuarios WHERE id = ?', [id], async (error, results) => {
          if (error) {
              console.error('Error al buscar la contraseña del usuario:', error);
              return res.status(500).json({ message: 'Error interno del servidor' });
          }

          if (results.length === 0) {
              return res.status(404).json({ message: 'Usuario no encontrado' });
          }

          const storedPassword = results[0].contrasena;
          const historial = results[0].historial_contrasenas ? JSON.parse(results[0].historial_contrasenas) : [];

          // Verificar si la contraseña actual ingresada es correcta
          const isMatch = await bcryptjs.compare(currentPassword, storedPassword);
          if (!isMatch) {
              return res.status(400).json({ message: 'Contraseña actual incorrecta' });
          }

          // Verificar que la nueva contraseña no sea igual a la actual ni a las anteriores
          const isSamePassword = await bcryptjs.compare(newPassword, storedPassword);
          if (isSamePassword) {
              return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual' });
          }

          for (const oldPassword of historial) {
              const coincide = await bcryptjs.compare(newPassword, oldPassword);
              if (coincide) {
                  return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a una anterior' });
              }
          }

          // Encriptar la nueva contraseña
          const nuevaContrasenaHash = await bcryptjs.hash(newPassword, 10);

          // Guardar la nueva contraseña en el historial
          historial.push(nuevaContrasenaHash);

          // Limitar el historial a las últimas 5 contraseñas
          if (historial.length > 5) {
              historial.shift(); // Eliminar la más antigua
          }

          // Actualizar la contraseña y el historial en la base de datos
          db.query(
              'UPDATE usuarios SET contrasena = ?, historial_contrasenas = ? WHERE id = ?',
              [nuevaContrasenaHash, JSON.stringify(historial), id],
              async (updateError, updateResults) => {
                  if (updateError) {
                      console.error('Error al actualizar la contraseña:', updateError);
                      return res.status(500).json({ message: 'Error al actualizar la contraseña' });
                  }

                  // Registrar la actividad del usuario
                 // const ip = req.ip;
                 // await registrarActividad(id, 'Cambio de contraseña', ip, 'Cambio de contraseña exitoso');

                  //res.json({ message: 'Contraseña actualizada con éxito' });
              }
          );
      });
  } catch (error) {
      console.error('Error en el servidor:', error);
      res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener
router.get("/usuarios", async (req, res) => {
    try {
        const usuarios = await UsuarioSchema.find();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Editar
router.put('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const updatedUsuario = req.body;

    try {
        const result = await USuarioSchema.updateOne({ _id: id }, { $set: updatedUsuario });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error updating client', error });
    }
});

// Eliminar
router.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const data = await USuarioSchema.deleteOne({ _id: id });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ruta para guardar la configuración de intentos límites
router.post('/configurar-intentos', async (req, res) => {
    const { userId, intentosLimite } = req.body;

    try {
        // Busca el usuario en la base de datos
        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Actualiza el número de intentos límite
        usuario.intentosLimite = intentosLimite;
        await usuario.save();

        res.status(200).json({ message: 'Configuración guardada con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar la configuración' });
    }
});


// Ruta para obtener todas las actividades sin hacer populate
router.get('/actividad', async (req, res) => {
  try {
      // Obtener todas las actividades de la base de datos sin el populate
      const actividades = await Actividad.find(). populate('usuarioId','correo');  // Solo recuperamos los datos de la colección 'Actividad'

      if (actividades.length === 0) {
          return res.status(404).json({ message: 'No se encontraron actividades.' });
      }

      // Devolver las actividades
      res.json({ actividades });
  } catch (error) {
      console.error('Error al obtener las actividades:', error);
      res.status(500).json({ message: 'Error al obtener las actividades.' });
  }
});

// Ruta para manejar intentos fallidos
router.post('/bloquear-por-intentos', manejarIntentosFallidos);

// Ruta para obtener usuarios bloqueados
router.get('/usuarios-bloqueados', obtenerUsuariosBloqueados);

// Ruta para bloquear un usuario
router.put('/usuarios/bloquear/:userId', bloquearUsuario); // Cambia según tu estructura de rutas





//rutas de que el usuario puede comentar y ver los comentarios de un producto


// Obtener comentarios de un producto o variante
router.get('/comentarios', (req, res) => {
  const { producto_id, variante_id } = req.query;

  if (!producto_id) {
    return res.status(400).json({ message: 'Falta el producto_id' });
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

  db.execute(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error al obtener comentarios' });
    res.json(results);
  });
});



// Verificar si puede comentar
router.get('/puede-comentar', verifyToken, (req, res) => {
  const usuario_id = req.usuario.id;
  const { producto_id, variante_id } = req.query;

  db.execute(
    `SELECT COUNT(*) AS total FROM detalle_ventas dv
     JOIN ventas v ON dv.venta_id = v.id
     WHERE v.usuario_id = ? AND (dv.producto_id = ? OR dv.variante_id = ?)`,
    [usuario_id, producto_id, variante_id || null],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Error al verificar permiso' });

      const comprado = results[0].total > 0;
      res.json({ permitido: comprado });
    }
  );
});

// Crear nuevo comentario
router.post('/comentario', verifyToken, (req, res) => {
  const { producto_id, variante_id, comentario, calificacion } = req.body;
  const usuario_id = req.usuario.id;

  db.execute(
    `INSERT INTO comentarios (usuario_id, producto_id, variante_id, comentario, calificacion, fecha)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [usuario_id, producto_id, variante_id || null, comentario, calificacion],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Error al guardar comentario' });
      res.json({ message: 'Comentario guardado' });
    }
  );
});



module.exports = router;
