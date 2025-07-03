const db = require("../config/db");

const nosotros = {
    // 🔹 Agregar un nuevo banner
    crear: (mision, vision, valores, callback) => {
        const query = "INSERT INTO nosotros (mision, vision, valores) VALUES (?, ?, ?)";
        db.query(query, [mision, vision, valores], callback);
    },

    // 🔹 Obtener todos los banners
    obtenerTodos: (callback) => {
        const query = "SELECT * FROM nosotros LIMIT 1";
        db.query(query, callback);
    },

    // 🔹 Obtener un banner por ID
    obtenerPorId: (id, callback) => {
        const query = "SELECT * FROM nosotros WHERE id = ?";
        db.query(query, [id], callback);
    },

    // 🔹 Editar un banner
    actualizar: (id, mision, vision, valores, callback) => {
        const query = "UPDATE nosotros SET mision = ?, vision = ?, valores = ? WHERE id = ?";
        db.query(query, [mision, vision, valores, id], callback);
    },

    // 🔹 Eliminar un banner
    eliminar: (id, callback) => {
        const query = "DELETE FROM nosotros WHERE id = ?";
        db.query(query, [id], callback);
    },
};

module.exports = nosotros;

