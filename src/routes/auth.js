// routes/auth.js
const express = require('express');
const { 
    recuperarContrasena, 
    verificarCodigo, 
    restablecerContrasena 
} = require('../controllers/authController');

const router = express.Router();

router.post('/recuperar-contrasena', recuperarContrasena);
router.post('/verificar-codigo', verificarCodigo);
router.post('/restablecer-contrasena', restablecerContrasena);

module.exports = router;
