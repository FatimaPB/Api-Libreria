const db = require("../config/db");

const NoticiaEvento = {
  crear: (titulo, descripcion, imagen, tipo, fecha_evento, callback) => {
    const sql = `INSERT INTO noticias_eventos (titulo, descripcion, imagen, tipo, fecha_evento) VALUES (?, ?, ?, ?, ?)`;
    db.execute(sql, [titulo, descripcion, imagen, tipo, fecha_evento], callback);
  },

  obtenerTodos: (callback) => {
    db.execute(`SELECT * FROM noticias_eventos ORDER BY fecha_publicacion DESC`, [], callback);
  },

  obtenerPorId: (id, callback) => {
    db.execute(`SELECT * FROM noticias_eventos WHERE id = ?`, [id], callback);
  },

  actualizar: (id, titulo, descripcion, imagen, tipo, fecha_evento, callback) => {
    const sql = `UPDATE noticias_eventos SET titulo = ?, descripcion = ?, imagen = ?, tipo = ?, fecha_evento = ? WHERE id = ?`;
    db.execute(sql, [titulo, descripcion, imagen, tipo, fecha_evento, id], callback);
  },

  eliminar: (id, callback) => {
    db.execute(`DELETE FROM noticias_eventos WHERE id = ?`, [id], callback);
  }
};

module.exports = NoticiaEvento;
