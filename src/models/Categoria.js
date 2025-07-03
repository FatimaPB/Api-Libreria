const db = require("../config/db");

const Categoria = {
    // 🔹 Agregar una nueva categoría
    crear: (nombre_categoria, callback) => {
        const query = "INSERT INTO categorias (nombre_categoria) VALUES (?)";
        db.query(query, [nombre_categoria], callback);
    },

    // 🔹 Obtener todas las categorías
    obtenerTodas: (callback) => {
        const query = "SELECT * FROM categorias";
        db.query(query, callback);
    },

    // 🔹 Obtener una categoría por ID
    obtenerPorId: (id, callback) => {
        const query = "SELECT * FROM categorias WHERE id = ?";
        db.query(query, [id], callback);
    },

    // 🔹 Editar una categoría
    actualizar: (id, nombre_categoria, callback) => {
        const query = "UPDATE categorias SET nombre_categoria = ? WHERE id = ?";
        db.query(query, [nombre_categoria, id], callback);
    },

    // 🔹 Eliminar una categoría
    eliminar: (id, callback) => {
        const query = "DELETE FROM categorias WHERE id = ?";
        db.query(query, [id], callback);
    },
};

module.exports = Categoria;
