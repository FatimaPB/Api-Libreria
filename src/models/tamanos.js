const db = require("../config/db");

const tamano = {
    crear: async (nombre_tamano) => {
        const query = "INSERT INTO tamaños (nombre_tamano) VALUES (?)";
        const [result] = await db.execute(query, [nombre_tamano]);
        return result;
    },

    obtenerTodas: async () => {
        const query = "SELECT * FROM tamaños";
        const [rows] = await db.execute(query);
        return rows;
    },

    obtenerPorId: async (id) => {
        const query = "SELECT * FROM tamaños WHERE id = ?";
        const [rows] = await db.execute(query, [id]);
        return rows;
    },

    actualizar: async (id, nombre_tamano) => {
        const query = "UPDATE tamaños SET nombre_tamano = ? WHERE id = ?";
        const [result] = await db.execute(query, [nombre_tamano, id]);
        return result;
    },

    eliminar: async (id) => {
        const query = "DELETE FROM tamaños WHERE id = ?";
        const [result] = await db.execute(query, [id]);
        return result;
    },
};

module.exports = tamano;
