// models/banner.js
const db = require("../config/db");

const Banner = {
  // 🔹 Agregar un nuevo banner
  crear: async (titulo, descripcion, imagen) => {
    const query = "INSERT INTO banner (titulo, descripcion, imagen) VALUES (?, ?, ?)";
    const [result] = await db.execute(query, [titulo, descripcion, imagen]);
    return result;
  },

  // 🔹 Obtener todos los banners
  obtenerTodos: async () => {
    const query = "SELECT * FROM banner";
    const [rows] = await db.execute(query);
    return rows;
  },

  // 🔹 Obtener un banner por ID
  obtenerPorId: async (id) => {
    const query = "SELECT * FROM banner WHERE id = ?";
    const [rows] = await db.execute(query, [id]);
    return rows;
  },

  // 🔹 Editar un banner
  actualizar: async (id, titulo, descripcion, imagen) => {
    const query = "UPDATE banner SET titulo = ?, descripcion = ?, imagen = ? WHERE id = ?";
    const [result] = await db.execute(query, [titulo, descripcion, imagen, id]);
    return result;
  },

  // 🔹 Eliminar un banner
  eliminar: async (id) => {
    const query = "DELETE FROM banner WHERE id = ?";
    const [result] = await db.execute(query, [id]);
    return result;
  },
};

module.exports = Banner;
