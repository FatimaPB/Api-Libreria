const express = require('express');
const router = express.Router();
const limiteIntentosController = require('../controllers/limiteIntentosController');

// Rutas para límite de intentos
router.get('/limite-intentos', limiteIntentosController.obtenerLimite);
router.put('/limite-intentos', limiteIntentosController.actualizarLimite);

module.exports = router;
