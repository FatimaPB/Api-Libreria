// db.js
const mysql = require('mysql2/promise'); // importante usar /promise
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 20, // puedes dejarlo en 20 para prevenir saturaciones
  queueLimit: 0
});

// Prueba de conexión
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Conexión exitosa a MySQL db Librería Cristo Rey ');
    conn.release();
  } catch (err) {
    console.error('Error conectando a MySQL:', err);
  }
})();

module.exports = pool;
