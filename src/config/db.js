// src/config/db.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// 👇 Si estamos en modo test, usa .env.test
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

// Prueba de conexión
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log(
      `✅ Conexión exitosa a MySQL: ${process.env.MYSQL_DATABASE} (${process.env.NODE_ENV || 'production'})`
    );
    conn.release();
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
  }
})();

module.exports = pool;
