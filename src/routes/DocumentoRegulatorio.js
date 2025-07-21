const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Asegúrate de que esta sea tu configuración MySQL


// Crear un nuevo Documento Regulatorio (POST) con tipo de documento
router.post('/politicas/:tipo', async (req, res) => {
  const { titulo, contenido, fecha_vigencia, tipo } = req.body;

  if (!titulo || !contenido || !fecha_vigencia || !tipo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  try {
    const conn = await pool.getConnection();

    if (tipo === 'politica') {
      await conn.query('UPDATE documentosr SET vigente = FALSE WHERE vigente = TRUE AND tipo = "politica"');
    }

    const [rows] = await conn.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo]);
    const nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

    const [result] = await conn.query(
      'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
      [titulo, contenido, fecha_vigencia, nuevaVersion, tipo]
    );

    conn.release();

    res.status(201).json({
      id: result.insertId,
      titulo,
      contenido,
      fecha_vigencia,
      version: nuevaVersion,
      vigente: true,
      tipo
    });
  } catch (error) {
    console.error('Error al insertar documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un documento creando una nueva versión con tipo de documento
router.post('/politicas/:tipo/:id/version', async (req, res) => {
  const { id, tipo } = req.params;
  const { contenido, fecha_vigencia } = req.body;

  if (!contenido || !fecha_vigencia || !tipo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  try {
    const conn = await pool.getConnection();

    const [rows] = await conn.query('SELECT * FROM documentosr WHERE id = ? AND eliminado = FALSE', [id]);
    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Documento no encontrado o eliminado.' });
    }

    const documentoOriginal = rows[0];

    await conn.query('UPDATE documentosr SET vigente = FALSE WHERE id = ?', [id]);

    const nuevaVersion = (parseFloat(documentoOriginal.version) + 0.1).toFixed(1);

    const [result] = await conn.query(
      'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
      [documentoOriginal.titulo, contenido, fecha_vigencia, nuevaVersion, tipo]
    );

    conn.release();

    res.status(201).json({
      id: result.insertId,
      titulo: documentoOriginal.titulo,
      contenido,
      fecha_vigencia,
      version: nuevaVersion,
      vigente: true,
      tipo
    });
  } catch (error) {
    console.error('Error al crear nueva versión:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar (lógicamente) un documento
router.delete('/politicas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      'UPDATE documentosr SET eliminado = TRUE, vigente = FALSE WHERE id = ? AND eliminado = FALSE',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Documento no encontrado o ya eliminado.' });
    }

    res.json({ message: 'Documento marcado como eliminado.' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener documento vigente de tipo "política"
router.get('/politicas/vigente', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documentosr WHERE vigente = TRUE AND eliminado = FALSE AND tipo= "politica" ORDER BY creado_en DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay documentos vigentes de tipo política.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener documento vigente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener historial de documentos de tipo "política"
router.get('/politicas/historial', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documentosr WHERE tipo = "politica" ORDER BY creado_en ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial de documentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});



// Crear un nuevo Documento Regulatorio (POST) con tipo de documento
router.post('/deslindes/:tipo', async (req, res) => {
  const { titulo, contenido, fecha_vigencia, tipo } = req.body;

  if (!titulo || !contenido || !fecha_vigencia || !tipo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  const conn = await pool.getConnection();
  try {
    if (tipo === 'deslinde') {
      await conn.query('UPDATE documentosr SET vigente = FALSE WHERE vigente = TRUE AND tipo = "deslinde"');
    }

    const [rows] = await conn.query(
      'SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?',
      [tipo]
    );

    const nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

    const [result] = await conn.query(
      'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
      [titulo, contenido, fecha_vigencia, nuevaVersion, tipo]
    );

    res.status(201).json({
      id: result.insertId,
      titulo,
      contenido,
      fecha_vigencia,
      version: nuevaVersion,
      vigente: true,
      tipo
    });
  } catch (error) {
    console.error('Error al insertar documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// Actualizar un documento creando una nueva versión con tipo de documento
router.post('/deslindes/:tipo/:id/version', async (req, res) => {
  const { id, tipo } = req.params;
  const { contenido, fecha_vigencia } = req.body;

  if (!contenido || !fecha_vigencia || !tipo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT * FROM documentosr WHERE id = ? AND eliminado = FALSE',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Documento no encontrado o eliminado.' });
    }

    const documentoOriginal = rows[0];

    await conn.query('UPDATE documentosr SET vigente = FALSE WHERE id = ?', [id]);

    const nuevaVersion = (parseFloat(documentoOriginal.version) + 0.1).toFixed(1);

    const [result] = await conn.query(
      'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
      [documentoOriginal.titulo, contenido, fecha_vigencia, nuevaVersion, tipo]
    );

    res.status(201).json({
      id: result.insertId,
      titulo: documentoOriginal.titulo,
      contenido,
      fecha_vigencia,
      version: nuevaVersion,
      vigente: true,
      tipo
    });
  } catch (error) {
    console.error('Error al crear nueva versión:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// Eliminar (lógicamente) un documento
router.delete('/deslindes/:id', async (req, res) => {
  const { id } = req.params;

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      'UPDATE documentosr SET eliminado = TRUE, vigente = FALSE WHERE id = ? AND eliminado = FALSE',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Documento no encontrado o ya eliminado.' });
    }

    res.json({ message: 'Documento marcado como eliminado.' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// Obtener documento vigente de tipo "deslinde"
router.get('/deslindes/vigente', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT * FROM documentosr WHERE vigente = TRUE AND eliminado = FALSE AND tipo = "deslinde" ORDER BY creado_en DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay documentos vigentes de tipo deslinde.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener documento vigente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// Obtener historial de documentos de tipo "deslinde"
router.get('/deslindes/historial', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT * FROM documentosr WHERE tipo = "deslinde" ORDER BY creado_en ASC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial de documentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});



// Crear un nuevo Documento Regulatorio (POST) con tipo de documento
router.post('/terminos/:tipo', async (req, res) => {
  const { titulo, contenido, fecha_vigencia, tipo } = req.body;

  if (!titulo || !contenido || !fecha_vigencia || !tipo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  try {
    const conn = await pool.getConnection();

    try {
      if (tipo === 'termino') {
        await conn.query('UPDATE documentosr SET vigente = FALSE WHERE vigente = TRUE AND tipo = "termino"');
      }

      const [rows] = await conn.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo]);
      let nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

      const [result] = await conn.query(
        'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
        [titulo, contenido, fecha_vigencia, nuevaVersion, tipo]
      );

      res.status(201).json({
        id: result.insertId,
        titulo,
        contenido,
        fecha_vigencia,
        version: nuevaVersion,
        vigente: true,
        tipo
      });
    } finally {
      conn.release();
    }

  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Actualizar un documento creando una nueva versión con tipo de documento
router.post('/terminos/:tipo/:id/version', async (req, res) => {
  const { id, tipo } = req.params;
  const { contenido, fecha_vigencia } = req.body;

  if (!contenido || !fecha_vigencia || !tipo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  try {
    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.query('SELECT * FROM documentosr WHERE id = ? AND eliminado = FALSE', [id]);
      if (rows.length === 0) return res.status(404).json({ message: 'Documento no encontrado o eliminado.' });

      const documentoOriginal = rows[0];

      await conn.query('UPDATE documentosr SET vigente = FALSE WHERE id = ?', [id]);
      let nuevaVersion = (parseFloat(documentoOriginal.version) + 0.1).toFixed(1);

      const [result] = await conn.query(
        'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
        [documentoOriginal.titulo, contenido, fecha_vigencia, nuevaVersion, tipo]
      );

      res.status(201).json({
        id: result.insertId,
        titulo: documentoOriginal.titulo,
        contenido,
        fecha_vigencia,
        version: nuevaVersion,
        vigente: true,
        tipo
      });
    } finally {
      conn.release();
    }

  } catch (error) {
    console.error('Error al crear nueva versión:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Eliminar (lógicamente) un documento
router.delete('/terminos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      'UPDATE documentosr SET eliminado = TRUE, vigente = FALSE WHERE id = ? AND eliminado = FALSE',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Documento no encontrado o ya eliminado.' });
    }

    res.json({ message: 'Documento marcado como eliminado.' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Obtener documento vigente de tipo "termino"
router.get('/terminos/vigente', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documentosr WHERE vigente = TRUE AND eliminado = FALSE AND tipo = "termino" ORDER BY creado_en DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay documentos vigentes de tipo termino.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener documento vigente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Obtener historial de documentos de tipo "termino"
router.get('/terminos/historial', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM documentosr WHERE tipo = "termino" ORDER BY creado_en ASC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial de documentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
