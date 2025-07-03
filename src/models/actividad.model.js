// Modelo de MongoDB (actividad.model.js)
const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tipo: { type: String, required: true }, // Ej.: "Inicio de sesión", "Cambio de contraseña"
  fecha: { type: Date, default: Date.now },
  ip: { type: String }, // Opcional: registra la IP del usuario
  detalles: { type: String } // Opcional: detalles adicionales
});

module.exports = mongoose.model('Actividad', actividadSchema);
