const db = require("../config/db");

const Categoria = {
    crear: (nombre_categoria, imagen_url, callback) => {
        const query = "INSERT INTO categorias (nombre_categoria, imagen_url) VALUES (?, ?)";
        db.query(query, [nombre_categoria, imagen_url], callback);
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
    actualizar: (id, nombre_categoria, imagen_url, callback) => {
        const query = "UPDATE categorias SET nombre_categoria = ?, imagen_url = ? WHERE id = ?";
        db.query(query, [nombre_categoria, imagen_url, id], callback);
    },

    // 🔹 Eliminar una categoría
    eliminar: (id, callback) => {
        const query = "DELETE FROM categorias WHERE id = ?";
        db.query(query, [id], callback);
    },
};

module.exports = Categoria;
