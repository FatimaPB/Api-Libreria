const db = require("../config/db");

const nosotros = {
  crear: async (mision, vision, valores) => {
    const query = "INSERT INTO nosotros (mision, vision, valores) VALUES (?, ?, ?)";
    const [result] = await db.execute(query, [mision, vision, valores]);
    return result;
  },

  obtenerTodos: async () => {
    const query = "SELECT * FROM nosotros LIMIT 1";
    const [results] = await db.execute(query);
    return results;
  },

  obtenerPorId: async (id) => {
    const query = "SELECT * FROM nosotros WHERE id = ?";
    const [results] = await db.execute(query, [id]);
    return results;
  },

  actualizar: async (id, mision, vision, valores) => {
    const query = "UPDATE nosotros SET mision = ?, vision = ?, valores = ? WHERE id = ?";
    const [result] = await db.execute(query, [mision, vision, valores, id]);
    return result;
  },

  eliminar: async (id) => {
    const query = "DELETE FROM nosotros WHERE id = ?";
    const [result] = await db.execute(query, [id]);
    return result;
  }
};

module.exports = nosotros;
