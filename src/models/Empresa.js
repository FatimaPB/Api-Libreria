const mongoose = require('mongoose');

const EmpresaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    slogan: {
        type: String,
        maxlength: 200 // Límite de caracteres para el eslogan
    },
    logo: {
        type: String,
    },
    redesSociales: {
        facebook: { type: String, validate: { validator: (v) => /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.me)\/.*/.test(v), message: 'URL de Facebook inválida' } },
        instagram: { type: String, validate: { validator: (v) => /^(https?:\/\/)?(www\.)?instagram\.com\/.*/.test(v), message: 'URL de Instagram inválida' } }
    },
    contacto: {
        direccion: { type: String },
        correoElectronico: { type: String, validate: { validator: (v) => /^\S+@\S+\.\S+$/.test(v), message: 'Correo electrónico inválido' } },
        telefono: { type: String }
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('Empresa', EmpresaSchema);
