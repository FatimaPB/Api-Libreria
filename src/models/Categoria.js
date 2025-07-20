// models/Categoria.js
const db = require("../config/db");

const Categoria = {
  crear: async (nombre_categoria, imagen_url) => {
    const [result] = await db.execute(
      "INSERT INTO categorias (nombre_categoria, imagen_url) VALUES (?, ?)",
      [nombre_categoria, imagen_url]
    );
    return result;
  },

  obtenerTodas: async () => {
    const [rows] = await db.execute("SELECT * FROM categorias");
    return rows;
  },

  obtenerPorId: async (id) => {
    const [rows] = await db.execute("SELECT * FROM categorias WHERE id = ?", [id]);
    return rows[0]; // devolver solo un objeto
  },

  actualizar: async (id, nombre_categoria, imagen_url) => {
    const [result] = await db.execute(
      "UPDATE categorias SET nombre_categoria = ?, imagen_url = ? WHERE id = ?",
      [nombre_categoria, imagen_url, id]
    );
    return result;
  },

  eliminar: async (id) => {
    const [result] = await db.execute("DELETE FROM categorias WHERE id = ?", [id]);
    return result;
  },
};

module.exports = Categoria;
