const mysql = require('mysql2');
require('dotenv').config();
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/*
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Sin contraseña
  database: 'dblibreria',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
*/

// Prueba de conexión
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
  } else {
    console.log('✅ Conexión exitosa a MySQL db Librería Cristo Rey ✅');
    connection.release();
  }
});

module.exports = pool;
