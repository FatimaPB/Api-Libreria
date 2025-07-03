const Usuario = require('../models/usuarios');
const { bloquearPorNVecesEnNDias } = require('../services/usuarioService');

// Controlador para manejar intentos fallidos
const manejarIntentosFallidos = async (req, res) => {
    const { userId, nVeces, nDias } = req.body;

    try {
        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        const resultado = await bloquearPorNVecesEnNDias(usuario, nVeces, nDias);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error });
    }
};

// Controlador para obtener usuarios bloqueados
const obtenerUsuariosBloqueados = async (req, res) => {
    const { periodo } = req.query; // Puede ser 'dia', 'semana', 'mes'

    let fechaLimite;

    switch (periodo) {
        case 'dia':
            fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 1);
            break;
        case 'semana':
            fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 7);
            break;
        case 'mes':
            fechaLimite = new Date();
            fechaLimite.setMonth(fechaLimite.getMonth() - 1);
            break;
        default:
            return res.status(400).json({ mensaje: 'Período no válido' });
    }

    try {
        const usuariosBloqueados = await Usuario.find({
            isBlocked: true,
            blockedUntil: { $gte: fechaLimite },
        });

        res.json(usuariosBloqueados);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error });
    }
};


// Controlador para bloquear un usuario
const bloquearUsuario = async (req, res) => {
    const { userId } = req.params; // Obtén el ID del usuario desde los parámetros de la solicitud

    try {
        // Busca al usuario por ID
        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        // Actualiza el estado de bloqueo del usuario
        usuario.isBlocked = true;
        usuario.blockedUntil = new Date(new Date().getTime() + 2 * 60 * 60 * 1000); // Bloqueo de 24 horas
        await usuario.save(); // Guarda los cambios en la base de datos

        res.json({ mensaje: `Usuario ${usuario.nombre} bloqueado.` });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error });
    }
};


module.exports = { manejarIntentosFallidos, obtenerUsuariosBloqueados, bloquearUsuario };
