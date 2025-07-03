// utils/notificaciones.js
const admin = require('../../firebase'); // Asegúrate de que la ruta sea correcta

function generarMensajeEstado(estado) {
  const estadoLower = estado.toLowerCase();

  if (estadoLower === 'en reparto') {
    return {
      title: '🚚 Tu pedido va en camino',
      body: 'Nuestro repartidor está en ruta para entregártelo. ¡Espéralo pronto!',
    };
  }

  if (estadoLower === 'entregado') {
    return {
      title: '📦 Tu pedido fue entregado',
      body: 'Gracias por tu compra. Esperamos que lo disfrutes. 💙',
    };
  }

  // Mensaje genérico si se recibe un estado no contemplado
  return {
    title: '📢 Actualización de tu pedido',
    body: `Tu pedido ahora está en estado: ${estado}`,
  };
}

function enviarNotificacionCambioEstado(token, estado) {
  const mensajeNotif = generarMensajeEstado(estado);

  const mensaje = {
    notification: {
      title: mensajeNotif.title,
      body: mensajeNotif.body,
    },
    token,
  };

  return admin.messaging().send(mensaje)
    .then(response => {
      console.log('✅ Notificación enviada:', response);
    })
    .catch(error => {
      console.error('❌ Error al enviar notificación:', error);
    });
}

module.exports = { enviarNotificacionCambioEstado };
