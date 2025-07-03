const mongoose = require('mongoose');

// Crear un esquema para el Documento Regulatorio
const DocumentoRegulatorioSchema = new mongoose.Schema({
    titulo: {
      type: String,
      required: true,
      trim: true
    },
    contenido: {
      type: String,
      required: true
    },
    fecha_vigencia: {
      type: Date,
      required: true
    },
    fechaCreacion: {
      type: Date,
      default: Date.now
    },
    version: {
      type: String,
      default: '1.0' // Inicializa con 1.0
    },
    eliminado: {
      type: Boolean,
      default: false
    },
    vigente: {
      type: Boolean,
      default: true // Por defecto, un documento nuevo es vigente
    }
  });
  
  

const DocumentoRegulatorio = mongoose.model('DocumentoRegulatorio', DocumentoRegulatorioSchema);
module.exports = DocumentoRegulatorio;
