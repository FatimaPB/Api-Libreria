const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        require: true 
    },
    correo: {
        type: String,
        require: true
    },
    contrasena: {
        type: String,
        require: true
    },
    telefono: {
        type: String,
        require: true
    },
    tipoUsuario: {
        type: String,
        default: 'empleado'
    },
    isVerified: {
        type: Boolean,
        default: false
    }, //propiedad para verificar el correo
    verificationCode: {
        type: String, // Cambiar a String
        required: true,
    },
    failedAttempts: {
        type: Number,
        default: 0 // Inicializa el contador de intentos fallidos
    },
    isBlocked: {
        type: Boolean,
        default: false // Inicializa el estado de bloqueo
    },
    blockedUntil: { 
        type: Date,
        default: null 
    } ,

    contrasenasAnteriores: [{ type: String }], // Historial de contraseñas
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
