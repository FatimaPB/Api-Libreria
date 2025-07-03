const Usuario = require('../models/usuarios');

const bloquearPorNVecesEnNDias = async (usuario, nVeces, nDias) => {
    const ahora = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - nDias);

    // Si el usuario tiene más intentos fallidos que nVeces y no está bloqueado, bloquearlo
    if (usuario.failedAttempts >= nVeces && usuario.blockedUntil === null) {
        usuario.isBlocked = true;
        usuario.blockedUntil = new Date(ahora.getTime() + 24 * 60 * 60 * 1000); // Bloqueo de 24 horas
        await usuario.save();
        return { mensaje: `Usuario bloqueado por haber fallado ${nVeces} veces en los últimos ${nDias} días.` };
    }
    
    return { mensaje: 'El usuario no excede los límites de bloqueo.' };
};

module.exports = { bloquearPorNVecesEnNDias };
