const LimiteIntentos = require('../models/LimiteIntentos');

// Obtener el límite de intentos actual
exports.obtenerLimite = async (req, res) => {
    try {
        const limite = await LimiteIntentos.findOne();
        if (!limite) {
            return res.status(404).json({ mensaje: 'Límite de intentos no configurado' });
        }
        res.json(limite);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener el límite de intentos' });
    }
};

// Actualizar el límite de intentos
exports.actualizarLimite = async (req, res) => {
    const { maxFailedAttempts } = req.body;

    try {
        let limite = await LimiteIntentos.findOne();
        if (!limite) {
            limite = new LimiteIntentos({ maxFailedAttempts });
        } else {
            limite.maxFailedAttempts = maxFailedAttempts;
        }
        await limite.save();
        res.json({ mensaje: 'Límite de intentos actualizado con éxito', limite });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar el límite de intentos' });
    }
};
