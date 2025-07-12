const db = require("../config/db");

const Color = {
    // 🔹 Agregar un nuevo color
    crear: (nombre_color, codigo_color, callback) => {
        const query = "INSERT INTO colores (nombre_color, codigo_color) VALUES (?, ?)";
        db.query(query, [nombre_color, codigo_color], callback);
    },

    // 🔹 Obtener todos los colores
    obtenerTodas: (callback) => {
        const query = "SELECT * FROM colores";
        db.query(query, callback);
    },

    // 🔹 Obtener un color por ID
    obtenerPorId: (id, callback) => {
        const query = "SELECT * FROM colores WHERE id = ?";
        db.query(query, [id], callback);
    },

    // 🔹 Editar un color
    actualizar: (id, nombre_color, codigo_color, callback) => {
        const query = "UPDATE colores SET nombre_color = ?, codigo_color = ? WHERE id = ?";
        db.query(query, [nombre_color, codigo_color, id], callback);
    },

    // 🔹 Eliminar un color
    eliminar: (id, callback) => {
        const query = "DELETE FROM colores WHERE id = ?";
        db.query(query, [id], callback);
    },
};

module.exports = Color;
