
// models/Producto.js
const db = require("../config/db");

const Producto = {
  /**
   * Inserta un nuevo producto en la tabla productos.
   * @param {Object} producto - Objeto con las propiedades del producto.
   * @param {function} callback - Función callback que recibe (error, result).
   */
  crear: (producto, callback) => {
    const query = `
      INSERT INTO productos 
        (nombre, descripcion, sku, costo, porcentaje_ganancia, precio_calculado, calificacion_promedio, total_resenas, cantidad_stock, categoria_id, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
      query,
      [
        producto.nombre,
        producto.descripcion,
        producto.sku,
        producto.costo,
        producto.porcentaje_ganancia,
        producto.precio_calculado,
        producto.calificacion_promedio,
        producto.total_resenas,
        producto.cantidad_stock,
        producto.categoria_id,
        producto.usuario_id,
      ],
      callback
    );
  },
};



module.exports = Producto;
