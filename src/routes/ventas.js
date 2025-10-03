const express = require("express");
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Importar la conexión a MySQL
const mercadopago = require('mercadopago');
const router = express.Router();
const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno

mercadopago.configure({
  access_token: 'APP_USR-7584885571117241-060904-2f06d22a868edbbcbb66f51af2a2ac20-2483950487'
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


router.post('/comprar', verifyToken, async (req, res) => {
  const { productos, total, metodoPago, direccionEnvio } = req.body;
  const usuario_id = req.usuario.id;

  if (!productos || productos.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío' });
  }

  const estadoVenta = (metodoPago == 4 || metodoPago == 3) ? 'pendiente' : 'pagado';

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Insertar la venta
    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (usuario_id, total, metodo_pago_id, direccion_envio, estado) VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, total, metodoPago, direccionEnvio || null, estadoVenta]
    );
    const venta_id = ventaResult.insertId;

    // Insertar productos en detalle_ventas
    const valoresProductos = productos.map(p => [
      venta_id,
      p.producto_id || null,
      p.variante_id || null,
      p.cantidad,
      p.precio_venta
    ]);
    await connection.query(
      `INSERT INTO detalle_ventas (venta_id, producto_id, variante_id, cantidad, precio_unitario) VALUES ?`,
      [valoresProductos]
    );

    // Eliminar carrito del usuario
    await connection.query(
      `DELETE FROM productos_carrito WHERE usuario_id = ?`,
      [usuario_id]
    );

    // Registrar historial de ventas
    await connection.query(
      `INSERT INTO ventas_historial (venta_id, estado_anterior, estado_nuevo, cambio_por) VALUES (?, ?, ?, ?)`,
      [venta_id, 'N/A', estadoVenta, 'Sistema']
    );

    // Confirmar transacción
    await connection.commit();

    // Si es Mercado Pago, crear preferencia y responder con init_point
    if (metodoPago == 4) {
      const preference = {
        items: productos.map(p => ({
          title: p.nombre || 'Producto',
          quantity: p.cantidad,
          unit_price: p.precio_venta,
          currency_id: 'MXN'
        })),
        back_urls: {
          success: 'https://api-libreria.vercel.app/api/verificar-pago',
          failure: 'https://api-libreria.vercel.app/api/verificar-pago',
          pending: 'https://api-libreria.vercel.app/api/verificar-pago'
        },
        auto_return: 'approved',
        external_reference: venta_id.toString()
      };

      try {
        const response = await mercadopago.preferences.create(preference);
        connection.release();
        return res.json({
          message: 'Compra registrada, redirige a Mercado Pago',
          init_point: response.body.init_point
        });
      } catch (error) {
        console.error('Error creando preferencia Mercado Pago:', error);
        await connection.rollback();
        connection.release();
        return res.status(500).json({ message: 'Error creando preferencia de pago' });
      }
    }

    // Si es pago en efectivo (3)
    if (metodoPago == 3) {
      connection.release();
      return res.json({
        message: 'Compra registrada con pago en efectivo, pendiente por confirmar',
        redirect: '/pago-pendiente'
      });
    }

    // Para otros métodos de pago
    connection.release();
    return res.json({ message: 'Compra realizada con éxito' });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (rollbackError) {
        console.error('Error al hacer rollback:', rollbackError);
      }
    }
    console.error('Error en la compra:', error);
    return res.status(500).json({ message: 'Error al procesar la compra' });
  }
});


router.get('/verificar-pago', async (req, res) => {
  const { collection_status, external_reference } = req.query;
  const venta_id = parseInt(external_reference);

  if (!venta_id || !collection_status) {
    return res.redirect('https://tienda-lib-cr.vercel.app/pago-fallido');
  }

  try {
    if (collection_status === 'approved') {
      // Actualizar estado a 'pagado'
      await db.query(
        `UPDATE ventas SET estado = 'pagado' WHERE id = ?`,
        [venta_id]
      );

      // Insertar registro en historial
      await db.query(
        `INSERT INTO ventas_historial (venta_id, estado_anterior, estado_nuevo, cambio_por) VALUES (?, ?, ?, ?)`,
        [venta_id, 'pendiente', 'pagado', 'MercadoPago']
      );

      return res.redirect('https://tienda-lib-cr.vercel.app/pago-exitoso');

    } else if (collection_status === 'in_process') {
      return res.redirect('https://tienda-lib-cr.vercel.app/pago-pendiente');
    } else {
      return res.redirect('https://tienda-lib-cr.vercel.app/pago-fallido');
    }
  } catch (error) {
    console.error('❌ Error en /verificar-pago:', error);
    return res.redirect('https://tienda-lib-cr.vercel.app/pago-fallido');
  }
});


router.put('/ventas/:ventaId/estado', verifyToken, async (req, res) => {
  const { ventaId } = req.params;
  const { nuevoEstado, cambioPor } = req.body; // nuevoEstado: 'pendiente', 'pagado' o 'cancelado'

  try {
    // Obtener el estado actual de la venta
    const [results] = await db.query('SELECT estado FROM ventas WHERE id = ?', [ventaId]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const estadoAnterior = results[0].estado;

    // Actualizar el estado en la tabla ventas
    await db.query('UPDATE ventas SET estado = ? WHERE id = ?', [nuevoEstado, ventaId]);

    // Insertar el cambio en el historial de ventas
    await db.query(
      'INSERT INTO ventas_historial (venta_id, estado_anterior, estado_nuevo, cambio_por) VALUES (?, ?, ?, ?)',
      [ventaId, estadoAnterior, nuevoEstado, cambioPor || 'Sistema']
    );

    res.json({ message: 'Estado de la venta actualizado correctamente', ventaId });

  } catch (error) {
    console.error('Error al actualizar el estado de la venta:', error);
    res.status(500).json({ message: 'Error al actualizar el estado de la venta' });
  }
});


router.put('/ventas/:ventaId/envio', verifyToken, async (req, res) => {
  const { ventaId } = req.params;
  const { nuevoEstado, cambioPor } = req.body; // 'pendiente', 'enviado', 'entregado'

  try {
    // Obtener el estado actual de envío
    const [results] = await db.query('SELECT estado_envio FROM ventas WHERE id = ?', [ventaId]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const estadoAnterior = results[0].estado_envio;

    // Actualizar el estado de envío
    await db.query('UPDATE ventas SET estado_envio = ? WHERE id = ?', [nuevoEstado, ventaId]);

    // Registrar el cambio en el historial de envíos
    await db.query(
      'INSERT INTO envios_historial (venta_id, estado_anterior, estado_nuevo, cambio_por) VALUES (?, ?, ?, ?)',
      [ventaId, estadoAnterior, nuevoEstado, cambioPor || 'Sistema']
    );

    res.json({ message: 'Estado de envío actualizado correctamente', ventaId });

  } catch (error) {
    console.error('Error al actualizar el estado de envío:', error);
    res.status(500).json({ message: 'Error al actualizar el estado de envío' });
  }
});




//este es el bueno de compras de usuario
router.get('/ventas/historial/:usuario_id', verifyToken, async (req, res) => {
  const usuario_id = req.params.usuario_id;

  try {
    const [results] = await db.query(
      `SELECT v.id, v.fecha, v.total, v.estado, v.estado_envio, v.direccion_envio,
              mp.nombre AS metodo_pago
       FROM ventas v
       JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
       WHERE v.usuario_id = ?
       ORDER BY v.fecha DESC`,
      [usuario_id]
    );

    res.json({ ventas: results });

  } catch (error) {
    console.error('Error al obtener historial de ventas:', error);
    res.status(500).json({ message: 'Error al obtener historial de ventas' });
  }
});


// Obtener nombres de productos comprados por un usuario (para recomendaciones)
router.get('/ventas/productos-comprados/:usuario_id', verifyToken, async (req, res) => {
  const usuario_id = req.params.usuario_id;

  try {
    const [results] = await db.query(`
      SELECT DISTINCT p.nombre
      FROM ventas v
      JOIN detalle_ventas dv ON dv.venta_id = v.id
      JOIN productos p ON dv.producto_id = p.id
      WHERE v.usuario_id = ?
    `, [usuario_id]);

    const nombresComprados = results.map(row => row.nombre);
    res.json({ productosComprados: nombresComprados });

  } catch (error) {
    console.error('Error al obtener productos comprados:', error);
    res.status(500).json({ message: 'Error al obtener productos comprados' });
  }
});





//ruta de detalle de la compra del usuario
router.get('/pedidos/:id', async (req, res) => {
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

  try {
    const [ventaResult] = await db.query(ventaQuery, [venta_id, usuario_id]);

    if (ventaResult.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const [productos] = await db.query(productosQuery, [venta_id]);

    res.json({ ...ventaResult[0], productos });

  } catch (error) {
    console.error('Error en obtener detalle de pedido:', error);
    res.status(500).json({ message: 'Error al obtener detalle de pedido' });
  }
});



//ruta del repartidor

router.get('/envios/pendientes', async (req, res) => {
  const query = `
    SELECT v.id, v.fecha, v.direccion_envio, u.nombre AS cliente, v.estado_envio
    FROM ventas v
    JOIN usuarios u ON v.usuario_id = u.id
    WHERE v.estado_envio != 'entregado'
    ORDER BY v.fecha DESC
  `;

  try {
    const [results] = await db.query(query);
    res.json({ pedidos: results });
  } catch (error) {
    console.error('Error al obtener envíos pendientes:', error);
    res.status(500).json({ message: 'Error al obtener pedidos' });
  }
});




//ruta actualizar el envio por parte del repartidor
router.post('/envio/actualizar', async (req, res) => {
  const { venta_id, nuevoEstado, descripcion } = req.body;
  const repartidor_id = req.usuario.id;

  try {
    // 1. Actualizar el estado de envío en la tabla ventas
    await db.query(
      'UPDATE ventas SET estado_envio = ? WHERE id = ?',
      [nuevoEstado, venta_id]
    );

    // 2. Insertar el cambio en la tabla seguimiento_envio
    await db.query(
      `INSERT INTO seguimiento_envio (venta_id, estado, descripcion, cambio_por)
       VALUES (?, ?, ?, ?)`,
      [venta_id, nuevoEstado, descripcion || '', repartidor_id]
    );

    res.json({ message: 'Seguimiento actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando seguimiento de envío:', error);
    res.status(500).json({ message: 'Error al actualizar el seguimiento' });
  }
});




// ruta para consuktar elk seguimiento del envioo por parte del usuario

router.get('/envio/seguimiento/:venta_id', verifyToken, async (req, res) => {
  const venta_id = req.params.venta_id;
  const usuario_id = req.usuario.id;

  try {
    // Validar que la venta pertenece al usuario
    const [validacion] = await db.query(
      `SELECT id FROM ventas WHERE id = ? AND usuario_id = ?`,
      [venta_id, usuario_id]
    );

    if (validacion.length === 0) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Obtener historial de seguimiento
    const [historial] = await db.query(
      `
      SELECT estado AS estado_nuevo, descripcion, fecha, u.nombre AS cambio_por
      FROM seguimiento_envio se
      LEFT JOIN usuarios u ON se.cambio_por = u.id
      WHERE se.venta_id = ?
      ORDER BY se.fecha DESC
      `,
      [venta_id]
    );

    res.json({ historial });
  } catch (error) {
    console.error('Error al obtener seguimiento:', error);
    res.status(500).json({ message: 'Error al obtener seguimiento' });
  }
});


router.get('/ventas/:ventaId/detalle', verifyToken, async (req, res) => {
  const { ventaId } = req.params;

  try {
    // Obtener detalle de productos
    const [detalleResults] = await db.query(
      `SELECT d.producto_id, p.nombre, d.cantidad, d.precio_unitario
       FROM detalle_ventas d
       JOIN productos p ON d.producto_id = p.id
       WHERE d.venta_id = ?`,
      [ventaId]
    );

    // Obtener historial de cambios de estado
    const [historialResults] = await db.query(
      `SELECT estado_anterior, estado_nuevo, cambio_por, fecha
       FROM ventas_historial
       WHERE venta_id = ?
       ORDER BY fecha ASC`,
      [ventaId]
    );

    res.json({
      detalle: detalleResults,
      historial: historialResults
    });

  } catch (error) {
    console.error('Error al obtener detalle o historial de la venta:', error);
    res.status(500).json({ message: 'Error al obtener detalle o historial de la venta' });
  }
});


router.get('/ventas/historial-todos', verifyToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'empleado') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const consultaVentas = `
      SELECT v.id, u.nombre AS cliente, v.total, v.metodo_pago_id, v.estado, v.estado_envio, v.direccion_envio, v.fecha,
             mp.nombre AS metodo_pago
      FROM ventas v
      JOIN usuarios u ON v.usuario_id = u.id
      JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
      ORDER BY v.fecha DESC
    `;

    const [ventas] = await db.query(consultaVentas);

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
      WHERE dv.venta_id IN (?)
    `;

    const [detalles] = await db.query(consultaDetalles, [ventasIds]);

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

  } catch (error) {
    console.error('Error en historial de todas las ventas:', error);
    res.status(500).json({ message: 'Error al obtener el historial de ventas' });
  }
});


module.exports = router;