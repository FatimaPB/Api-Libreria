const db = require("../config/db");

const Insignia = {
  crear: async (nombre, descripcion, icono_url, tipo, regla) => {
    const [result] = await db.execute(
      "INSERT INTO insignias (nombre, descripcion, icono_url, tipo, regla) VALUES (?, ?, ?, ?, ?)",
      [nombre, descripcion, icono_url, tipo, regla]
    );
    return result;
  },

  obtenerTodas: async () => {
    const [rows] = await db.execute("SELECT * FROM insignias");
    return rows;
  },

  obtenerPorId: async (id) => {
    const [rows] = await db.execute("SELECT * FROM insignias WHERE id = ?", [id]);
    return rows[0];
  },

  actualizar: async (id, nombre, descripcion, icono_url, tipo, regla) => {
    const [result] = await db.execute(
      "UPDATE insignias SET nombre = ?, descripcion = ?, icono_url = ?, tipo = ?, regla = ?, activa = ? WHERE id = ?",
      [nombre, descripcion, icono_url, tipo, regla, id]
    );
    return result;
  },

  eliminar: async (id) => {
    const [result] = await db.execute("DELETE FROM insignias WHERE id = ?", [id]);
    return result;
  },
};

module.exports = Insignia;
