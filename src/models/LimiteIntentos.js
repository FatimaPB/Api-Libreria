const mongoose = require('mongoose');

const LimiteIntentosSchema = new mongoose.Schema({
    maxFailedAttempts: {
        type: Number,
        default: 5, // Valor predeterminado para el límite de intentos fallidos
    },
});

module.exports = mongoose.model('LimiteIntentos', LimiteIntentosSchema);
