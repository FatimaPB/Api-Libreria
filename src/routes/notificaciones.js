const express = require('express');
const router = express.Router();
const admin = require('../../firebase'); // este es el que exportaste
const db = require('../config/db');

router.post('/notificar', async (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Faltan campos: token, title o body' });
  }

  const message = {
    notification: {
      title,
      body
    },
    token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notificación enviada:', response);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    res.status(500).json({ success: false, error });
  }
});

// Guardar el token FCM del usuario
router.post('/guardar-token', (req, res) => {
    const { usuario_id, token_fcm } = req.body;

    if (!usuario_id || !token_fcm) {
        return res.status(400).json({ success: false, message: 'Faltan datos.' });
    }

    const query = `UPDATE usuarios SET token_fcm = ? WHERE id = ?`;
    db.query(query, [token_fcm, usuario_id], (err, result) => {
        if (err) {
            console.error('❌ Error al guardar el token:', err);
            return res.status(500).json({ success: false, message: 'Error en el servidor' });
        }

        return res.status(200).json({ success: true, message: 'Token guardado correctamente' });
    });
});

module.exports = router;
