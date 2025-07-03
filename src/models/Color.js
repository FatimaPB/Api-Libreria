const db = require("../config/db");

const Color = {
    // 🔹 Agregar una nueva categoría
    crear: (nombre_color, callback) => {
        const query = "INSERT INTO colores (nombre_color) VALUES (?)";
        db.query(query, [nombre_color], callback);
    },

    // 🔹 Obtener todas las categorías
    obtenerTodas: (callback) => {
        const query = "SELECT * FROM colores";
        db.query(query, callback);
    },

    // 🔹 Obtener una categoría por ID
    obtenerPorId: (id, callback) => {
        const query = "SELECT * FROM colores WHERE id = ?";
        db.query(query, [id], callback);
    },

    // 🔹 Editar una categoría
    actualizar: (id, nombre_color, callback) => {
        const query = "UPDATE colores SET nombre_color = ? WHERE id = ?";
        db.query(query, [nombre_color, id], callback);
    },

    // 🔹 Eliminar una categoría
    eliminar: (id, callback) => {
        const query = "DELETE FROM colores WHERE id = ?";
        db.query(query, [id], callback);
    },
};

module.exports = Color;
