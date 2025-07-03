// models/Imagen.js
const db = require("../config/db");

const Imagen = {
  /**
   * Inserta una imagen asociada a un producto.
   * @param {Object} imagen - Objeto con producto_id y url.
   * @param {function} callback - Función callback que recibe (error, result).
   */
  crear: (imagen, callback) => {
    const query = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
    db.query(query, [imagen.producto_id, imagen.url], callback);
  },
};

module.exports = Imagen;
