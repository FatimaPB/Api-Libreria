const db = require("../config/db");

const Banner = {
    // 🔹 Agregar un nuevo banner
    crear: (titulo, descripcion, imagen, callback) => {
        const query = "INSERT INTO banner (titulo, descripcion, imagen) VALUES (?, ?, ?)";
        db.query(query, [titulo, descripcion, imagen], callback);
    },

    // 🔹 Obtener todos los banners
    obtenerTodos: (callback) => {
        const query = "SELECT * FROM banner";
        db.query(query, callback);
    },

    // 🔹 Obtener un banner por ID
    obtenerPorId: (id, callback) => {
        const query = "SELECT * FROM banner WHERE id = ?";
        db.query(query, [id], callback);
    },

    // 🔹 Editar un banner
    actualizar: (id, titulo, descripcion, imagen, callback) => {
        const query = "UPDATE banner SET titulo = ?, descripcion = ?, imagen = ? WHERE id = ?";
        db.query(query, [titulo, descripcion, imagen, id], callback);
    },

    // 🔹 Eliminar un banner
    eliminar: (id, callback) => {
        const query = "DELETE FROM banner WHERE id = ?";
        db.query(query, [id], callback);
    },
};

module.exports = Banner;
