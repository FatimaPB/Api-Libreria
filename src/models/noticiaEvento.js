const db = require("../config/db");

const NoticiaEvento = {
  crear: async (titulo, descripcion, imagen, tipo, fecha_evento) => {
    const sql = `INSERT INTO noticias_eventos (titulo, descripcion, imagen, tipo, fecha_evento) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await db.execute(sql, [titulo, descripcion, imagen, tipo, fecha_evento]);
    return result;
  },

  obtenerTodos: async () => {
    const sql = `SELECT * FROM noticias_eventos ORDER BY fecha_publicacion DESC`;
    const [results] = await db.execute(sql);
    return results;
  },

  obtenerPorId: async (id) => {
    const sql = `SELECT * FROM noticias_eventos WHERE id = ?`;
    const [results] = await db.execute(sql, [id]);
    return results;
  },

  actualizar: async (id, titulo, descripcion, imagen, tipo, fecha_evento) => {
    const sql = `UPDATE noticias_eventos SET titulo = ?, descripcion = ?, imagen = ?, tipo = ?, fecha_evento = ? WHERE id = ?`;
    const [result] = await db.execute(sql, [titulo, descripcion, imagen, tipo, fecha_evento, id]);
    return result;
  },

  eliminar: async (id) => {
    const sql = `DELETE FROM noticias_eventos WHERE id = ?`;
    const [result] = await db.execute(sql, [id]);
    return result;
  }
};

module.exports = NoticiaEvento;
