const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Asegúrate de que esta sea tu configuración MySQL


// Crear un nuevo Documento Regulatorio (POST) con tipo de documento
router.post('/politicas/:tipo', (req, res) => {
  const { titulo, contenido, fecha_vigencia, tipo } = req.body;

  if (!titulo || !contenido || !fecha_vigencia || !tipo) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  // Actualizar documentos previos a no vigentes solo si son del tipo "política"
  if (tipo === 'politica') {
    db.query('UPDATE documentosr SET vigente = FALSE WHERE vigente = TRUE AND tipo = "politica"', (error) => {
      if (error) {
          console.error('Error al actualizar documentos:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      // Obtener la última versión de los documentos del tipo especificado
      db.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo], (error, rows) => {
          if (error) {
              console.error('Error al obtener última versión:', error);
              return res.status(500).json({ message: 'Error interno del servidor' });
          }

          let nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

          // Insertar el nuevo documento con tipo
          db.query(
              'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
              [titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
              (error, result) => {
                  if (error) {
                      console.error('Error al insertar documento:', error);
                      return res.status(500).json({ message: 'Error interno del servidor' });
                  }
                  res.status(201).json({
                      id: result.insertId, 
                      titulo, 
                      contenido, 
                      fecha_vigencia, 
                      version: nuevaVersion, 
                      vigente: true,
                      tipo
                  });
              }
          );
      });
    });
  } else {
    // Si no es tipo "política", solo se inserta el nuevo documento sin actualizar los previos
    db.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo], (error, rows) => {
      if (error) {
          console.error('Error al obtener última versión:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      let nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

      // Insertar el nuevo documento con tipo
      db.query(
          'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
          [titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
          (error, result) => {
              if (error) {
                  console.error('Error al insertar documento:', error);
                  return res.status(500).json({ message: 'Error interno del servidor' });
              }
              res.status(201).json({
                  id: result.insertId, 
                  titulo, 
                  contenido, 
                  fecha_vigencia, 
                  version: nuevaVersion, 
                  vigente: true,
                  tipo
              });
          }
      );
    });
  }
});


// Actualizar un documento creando una nueva versión con tipo de documento
router.post('/politicas/:tipo/:id/version', (req, res) => {
  const { id, tipo } = req.params;
  const { contenido, fecha_vigencia } = req.body;
  if (!contenido || !fecha_vigencia || !tipo) return res.status(400).json({ message: 'Todos los campos son requeridos.' });

  db.query('SELECT * FROM documentosr WHERE id = ? AND eliminado = FALSE', [id], (error, rows) => {
    if (error) return res.status(500).json({ message: 'Error interno del servidor' });
    if (rows.length === 0) return res.status(404).json({ message: 'Documento no encontrado o eliminado.' });

    const documentoOriginal = rows[0];
    db.query('UPDATE documentosr SET vigente = FALSE WHERE id = ?', [id], (error) => {
      if (error) return res.status(500).json({ message: 'Error interno del servidor' });
      let nuevaVersion = (parseFloat(documentoOriginal.version) + 0.1).toFixed(1);

      db.query(
        'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
        [documentoOriginal.titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
        (error, result) => {
          if (error) return res.status(500).json({ message: 'Error interno del servidor' });
          res.status(201).json({
            id: result.insertId, 
            titulo: documentoOriginal.titulo, 
            contenido, 
            fecha_vigencia, 
            version: nuevaVersion, 
            vigente: true,
            tipo
          });
        }
      );
    });
  });
});


// Eliminar (lógicamente) un documento
router.delete('/politicas/:id', (req, res) => {
  const { id } = req.params;
  db.query('UPDATE documentosr SET eliminado = TRUE, vigente = FALSE WHERE id = ? AND eliminado = FALSE', [id], (error, result) => {
    if (error) return res.status(500).json({ message: 'Error interno del servidor' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado o ya eliminado.' });
    res.json({ message: 'Documento marcado como eliminado.' });
  });
});

// Obtener documento vigente de tipo "política"
router.get('/politicas/vigente', (req, res) => {
  db.query('SELECT * FROM documentosr WHERE vigente = TRUE AND eliminado = FALSE AND tipo= "politica" ORDER BY creado_en DESC LIMIT 1', (error, rows) => {
      if (error) {
          console.error('Error al obtener documento vigente:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      if (rows.length === 0) {
          return res.status(404).json({ message: 'No hay documentos vigentes de tipo política.' });
      }

      res.json(rows[0]);
  });
});

// Obtener historial de documentos de tipo "política"
router.get('/politicas/historial', (req, res) => {
  db.query('SELECT * FROM documentosr WHERE tipo = "politica" ORDER BY creado_en ASC', (error, rows) => {
      if (error) {
          console.error('Error al obtener historial de documentos:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      res.json(rows);
  });
});





// Crear un nuevo Documento Regulatorio (POST) con tipo de documento
router.post('/deslindes/:tipo', (req, res) => {
  const { titulo, contenido, fecha_vigencia, tipo } = req.body;

  if (!titulo || !contenido || !fecha_vigencia || !tipo) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  // Actualizar documentos previos a no vigentes solo si son del tipo "política"
  if (tipo === 'deslinde') {
    db.query('UPDATE documentosr SET vigente = FALSE WHERE vigente = TRUE AND tipo = "deslinde"', (error) => {
      if (error) {
          console.error('Error al actualizar documentos:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      // Obtener la última versión de los documentos del tipo especificado
      db.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo], (error, rows) => {
          if (error) {
              console.error('Error al obtener última versión:', error);
              return res.status(500).json({ message: 'Error interno del servidor' });
          }

          let nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

          // Insertar el nuevo documento con tipo
          db.query(
              'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
              [titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
              (error, result) => {
                  if (error) {
                      console.error('Error al insertar documento:', error);
                      return res.status(500).json({ message: 'Error interno del servidor' });
                  }
                  res.status(201).json({
                      id: result.insertId, 
                      titulo, 
                      contenido, 
                      fecha_vigencia, 
                      version: nuevaVersion, 
                      vigente: true,
                      tipo
                  });
              }
          );
      });
    });
  } else {
    // Si no es tipo "política", solo se inserta el nuevo documento sin actualizar los previos
    db.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo], (error, rows) => {
      if (error) {
          console.error('Error al obtener última versión:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      let nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

      // Insertar el nuevo documento con tipo
      db.query(
          'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
          [titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
          (error, result) => {
              if (error) {
                  console.error('Error al insertar documento:', error);
                  return res.status(500).json({ message: 'Error interno del servidor' });
              }
              res.status(201).json({
                  id: result.insertId, 
                  titulo, 
                  contenido, 
                  fecha_vigencia, 
                  version: nuevaVersion, 
                  vigente: true,
                  tipo
              });
          }
      );
    });
  }
});


// Actualizar un documento creando una nueva versión con tipo de documento
router.post('/deslindes/:tipo/:id/version', (req, res) => {
  const { id, tipo } = req.params;
  const { contenido, fecha_vigencia } = req.body;
  if (!contenido || !fecha_vigencia || !tipo) return res.status(400).json({ message: 'Todos los campos son requeridos.' });

  db.query('SELECT * FROM documentosr WHERE id = ? AND eliminado = FALSE', [id], (error, rows) => {
    if (error) return res.status(500).json({ message: 'Error interno del servidor' });
    if (rows.length === 0) return res.status(404).json({ message: 'Documento no encontrado o eliminado.' });

    const documentoOriginal = rows[0];
    db.query('UPDATE documentosr SET vigente = FALSE WHERE id = ?', [id], (error) => {
      if (error) return res.status(500).json({ message: 'Error interno del servidor' });
      let nuevaVersion = (parseFloat(documentoOriginal.version) + 0.1).toFixed(1);

      db.query(
        'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
        [documentoOriginal.titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
        (error, result) => {
          if (error) return res.status(500).json({ message: 'Error interno del servidor' });
          res.status(201).json({
            id: result.insertId, 
            titulo: documentoOriginal.titulo, 
            contenido, 
            fecha_vigencia, 
            version: nuevaVersion, 
            vigente: true,
            tipo
          });
        }
      );
    });
  });
});


// Eliminar (lógicamente) un documento
router.delete('/deslindes/:id', (req, res) => {
  const { id } = req.params;
  db.query('UPDATE documentosr SET eliminado = TRUE, vigente = FALSE WHERE id = ? AND eliminado = FALSE', [id], (error, result) => {
    if (error) return res.status(500).json({ message: 'Error interno del servidor' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado o ya eliminado.' });
    res.json({ message: 'Documento marcado como eliminado.' });
  });
});

// Obtener documento vigente de tipo "deslinde"
router.get('/deslindes/vigente', (req, res) => {
  db.query('SELECT * FROM documentosr WHERE vigente = TRUE AND eliminado = FALSE AND tipo= "deslinde" ORDER BY creado_en DESC LIMIT 1', (error, rows) => {
      if (error) {
          console.error('Error al obtener documento vigente:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      if (rows.length === 0) {
          return res.status(404).json({ message: 'No hay documentos vigentes de tipo política.' });
      }

      res.json(rows[0]);
  });
});

// Obtener historial de documentos de tipo "deslinde"
router.get('/deslindes/historial', (req, res) => {
  db.query('SELECT * FROM documentosr WHERE tipo = "deslinde" ORDER BY creado_en ASC', (error, rows) => {
      if (error) {
          console.error('Error al obtener historial de documentos:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      res.json(rows);
  });
});


// Crear un nuevo Documento Regulatorio (POST) con tipo de documento
router.post('/terminos/:tipo', (req, res) => {
  const { titulo, contenido, fecha_vigencia, tipo } = req.body;

  if (!titulo || !contenido || !fecha_vigencia || !tipo) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  // Actualizar documentos previos a no vigentes solo si son del tipo "política"
  if (tipo === 'termino') {
    db.query('UPDATE documentosr SET vigente = FALSE WHERE vigente = TRUE AND tipo = "termino"', (error) => {
      if (error) {
          console.error('Error al actualizar documentos:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      // Obtener la última versión de los documentos del tipo especificado
      db.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo], (error, rows) => {
          if (error) {
              console.error('Error al obtener última versión:', error);
              return res.status(500).json({ message: 'Error interno del servidor' });
          }

          let nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

          // Insertar el nuevo documento con tipo
          db.query(
              'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
              [titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
              (error, result) => {
                  if (error) {
                      console.error('Error al insertar documento:', error);
                      return res.status(500).json({ message: 'Error interno del servidor' });
                  }
                  res.status(201).json({
                      id: result.insertId, 
                      titulo, 
                      contenido, 
                      fecha_vigencia, 
                      version: nuevaVersion, 
                      vigente: true,
                      tipo
                  });
              }
          );
      });
    });
  } else {
    // Si no es tipo "política", solo se inserta el nuevo documento sin actualizar los previos
    db.query('SELECT MAX(CAST(version AS DECIMAL(10,1))) AS ultimaVersion FROM documentosr WHERE tipo = ?', [tipo], (error, rows) => {
      if (error) {
          console.error('Error al obtener última versión:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      let nuevaVersion = rows[0].ultimaVersion ? (parseFloat(rows[0].ultimaVersion) + 1).toFixed(1) : "1.0";

      // Insertar el nuevo documento con tipo
      db.query(
          'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
          [titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
          (error, result) => {
              if (error) {
                  console.error('Error al insertar documento:', error);
                  return res.status(500).json({ message: 'Error interno del servidor' });
              }
              res.status(201).json({
                  id: result.insertId, 
                  titulo, 
                  contenido, 
                  fecha_vigencia, 
                  version: nuevaVersion, 
                  vigente: true,
                  tipo
              });
          }
      );
    });
  }
});


// Actualizar un documento creando una nueva versión con tipo de documento
router.post('/terminos/:tipo/:id/version', (req, res) => {
  const { id, tipo } = req.params;
  const { contenido, fecha_vigencia } = req.body;
  if (!contenido || !fecha_vigencia || !tipo) return res.status(400).json({ message: 'Todos los campos son requeridos.' });

  db.query('SELECT * FROM documentosr WHERE id = ? AND eliminado = FALSE', [id], (error, rows) => {
    if (error) return res.status(500).json({ message: 'Error interno del servidor' });
    if (rows.length === 0) return res.status(404).json({ message: 'Documento no encontrado o eliminado.' });

    const documentoOriginal = rows[0];
    db.query('UPDATE documentosr SET vigente = FALSE WHERE id = ?', [id], (error) => {
      if (error) return res.status(500).json({ message: 'Error interno del servidor' });
      let nuevaVersion = (parseFloat(documentoOriginal.version) + 0.1).toFixed(1);

      db.query(
        'INSERT INTO documentosr (titulo, contenido, fecha_vigencia, version, vigente, eliminado, tipo) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)',
        [documentoOriginal.titulo, contenido, fecha_vigencia, nuevaVersion, tipo],
        (error, result) => {
          if (error) return res.status(500).json({ message: 'Error interno del servidor' });
          res.status(201).json({
            id: result.insertId, 
            titulo: documentoOriginal.titulo, 
            contenido, 
            fecha_vigencia, 
            version: nuevaVersion, 
            vigente: true,
            tipo
          });
        }
      );
    });
  });
});


// Eliminar (lógicamente) un documento
router.delete('/terminos/:id', (req, res) => {
  const { id } = req.params;
  db.query('UPDATE documentosr SET eliminado = TRUE, vigente = FALSE WHERE id = ? AND eliminado = FALSE', [id], (error, result) => {
    if (error) return res.status(500).json({ message: 'Error interno del servidor' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado o ya eliminado.' });
    res.json({ message: 'Documento marcado como eliminado.' });
  });
});

// Obtener documento vigente de tipo "deslinde"
router.get('/terminos/vigente', (req, res) => {
  db.query('SELECT * FROM documentosr WHERE vigente = TRUE AND eliminado = FALSE AND tipo= "termino" ORDER BY creado_en DESC LIMIT 1', (error, rows) => {
      if (error) {
          console.error('Error al obtener documento vigente:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      if (rows.length === 0) {
          return res.status(404).json({ message: 'No hay documentos vigentes de tipo política.' });
      }

      res.json(rows[0]);
  });
});

// Obtener historial de documentos de tipo "deslinde"
router.get('/terminos/historial', (req, res) => {
  db.query('SELECT * FROM documentosr WHERE tipo = "termino" ORDER BY creado_en ASC', (error, rows) => {
      if (error) {
          console.error('Error al obtener historial de documentos:', error);
          return res.status(500).json({ message: 'Error interno del servidor' });
      }

      res.json(rows);
  });
});

module.exports = router;
