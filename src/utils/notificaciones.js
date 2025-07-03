// utils/notificaciones.js
const admin = require('../../firebase'); // Asume que firebase.js está en la raíz

function enviarNotificacionCambioEstado(token, estado) {
  const mensaje = {
    notification: {
      title: 'Actualización de tu pedido',
      body: `Tu pedido ahora está en estado: ${estado}`,
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
