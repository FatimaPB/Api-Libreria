// models/Color.js
const db = require("../config/db");

const Color = {
  crear: async (nombre_color, codigo_color) => {
    const [result] = await db.execute(
      "INSERT INTO colores (nombre_color, codigo_color) VALUES (?, ?)",
      [nombre_color, codigo_color]
    );
    return result;
  },

  obtenerTodas: async () => {
    const [rows] = await db.execute("SELECT * FROM colores");
    return rows;
  },

  obtenerPorId: async (id) => {
    const [rows] = await db.execute("SELECT * FROM colores WHERE id = ?", [id]);
    return rows[0]; // retorna solo un color
  },

  actualizar: async (id, nombre_color, codigo_color) => {
    const [result] = await db.execute(
      "UPDATE colores SET nombre_color = ?, codigo_color = ? WHERE id = ?",
      [nombre_color, codigo_color, id]
    );
    return result;
  },

  eliminar: async (id) => {
    const [result] = await db.execute("DELETE FROM colores WHERE id = ?", [id]);
    return result;
  },
};

module.exports = Color;
