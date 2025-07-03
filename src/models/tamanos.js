const db = require("../config/db");

const tamano = {
    // 🔹 Agregar una nueva categoría
    crear: (nombre_tamano, callback) => {
        const query = "INSERT INTO tamaños (nombre_tamano) VALUES (?)";
        db.query(query, [nombre_tamano], callback);
    },

    // 🔹 Obtener todas las categorías
    obtenerTodas: (callback) => {
        const query = "SELECT * FROM tamaños";
        db.query(query, callback);
    },

    // 🔹 Obtener una categoría por ID
    obtenerPorId: (id, callback) => {
        const query = "SELECT * FROM tamaños WHERE id = ?";
        db.query(query, [id], callback);
    },

    // 🔹 Editar una categoría
    actualizar: (id, nombre_tamano, callback) => {
        const query = "UPDATE tamaños SET nombre_tamano = ? WHERE id = ?";
        db.query(query, [nombre_tamano, id], callback);
    },

    // 🔹 Eliminar una categoría
    eliminar: (id, callback) => {
        const query = "DELETE FROM tamaños WHERE id = ?";
        db.query(query, [id], callback);
    },
};

module.exports = tamano;
