// index.js
const app = require('./app');
const db = require('./src/config/db');

const port = process.env.PORT || 3000;

// Ruta de prueba para verificar la conexión a MySQL
app.get('/test-db', (req, res) => {
  db.query('SELECT NOW() as fecha_actual', (err, results) => {
    if (err) {
      console.error('❌ Error ejecutando la consulta:', err);
      return res.status(500).json({ error: 'Error conectando a la base de datos' });
    }
    res.json({
      mensaje: '✅ Conexión exitosa a MySQL db libreria',
      servidor_hora: results[0].fecha_actual
    });
  });
});

// Levantar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${port}`);
});
