const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 50, // Puedes subirlo a 20 si necesitas más conexiones temporales
  queueLimit: 0
});

// Versión con promesas (para async/await)
const promisePool = pool.promise();

// Prueba de conexión
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
  } else {
    console.log('✅ Conexión exitosa a MySQL db Librería Cristo Rey');
    connection.release();
  }
});

// Exporta ambas versiones
module.exports = {
  pool,         // Callbacks (tu código actual)
  promisePool   // Promesas (para migrar a async/await)
};
