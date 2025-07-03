const express = require('express');


const db = require('./src/config/db'); // Importar la conexión a MySQL
const cors = require('cors');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const UsuarioRoutes = require('./src/routes/usuarios');
const loginRoutes = require('./src/routes/login');
const multer = require('multer'); // Importar multer
const DocumentoRegulatorioRoutes = require('./src/routes/DocumentoRegulatorio');
const TerminosycondicionesRoutes = require('./src/routes/Terminosycondiciones');
const DeslindeRoutes = require('./src/routes/Deslinde');
const EmpresaRoutes = require('./src/routes/Empresa');
const authRoutes = require('./src/routes/auth')
const limiteIntentosRoutes = require('./src/routes/limiteIntentosRoutes');
const CategoriaRoutes = require('./src/routes/Cateoria');
const ColorRoutes = require('./src/routes/Color');
const TamanosRoutes = require('./src/routes/Tamanos')
const productosRoutes = require('./src/routes/productos');
const bannerRoutes = require('./src/routes/banner');
const nosotrosRoutes = require('./src/routes/nosotros');
const metodoPagoRouter=require('./src/routes/metodos_pago');
const proveedorRouter=require('./src/routes/Proveedor');
const comprasRouter=require('./src/routes/Compras');
const oracionRouter= require('./src/routes/oracion');
const preguntasRouter = require('./src/routes/preguntas');
const noticacionesRouter = require('./src/routes/notificaciones');

const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost', 'http://localhost:4200','https://tienda-lib-cr.vercel.app'], // Permite solo desde localhost
    credentials: true,  // Permite el uso de cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],  // Encabezados permitidos
    preflightContinue: true,  // Permite continuar con la solicitud después de la prevalidación (opcional)
};




require("dotenv").config();
const app = express();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors(corsOptions));


  
app.use(cookieParser());

app.use('/api',UsuarioRoutes);
app.use('/api',loginRoutes);
app.use('/api',DocumentoRegulatorioRoutes);
app.use('/api',TerminosycondicionesRoutes);
app.use('/api',DeslindeRoutes);
app.use('/api',EmpresaRoutes);
app.use('/api',authRoutes);
app.use('/api', limiteIntentosRoutes);
app.use('/api', CategoriaRoutes);
app.use('/api', ColorRoutes);
app.use('/api', TamanosRoutes);
app.use('/api', productosRoutes);
app.use('/api', bannerRoutes);
app.use('/api', nosotrosRoutes);
app.use('/api', metodoPagoRouter);
app.use('/api', proveedorRouter);
app.use('/api', comprasRouter);
app.use('/api', oracionRouter);
app.use('/api', preguntasRouter);
app.use('/api', noticacionesRouter);




//Rutas
app.get("/", (req, res) => {
    res.send("Servidor funcionando");
});

// Ruta de prueba para verificar la conexión a MySQL
app.get("/test-db", (req, res) => {
    db.query('SELECT NOW() as fecha_actual', (err, results) => {
        if (err) {
            console.error('❌ Error ejecutando la consulta:', err);
            return res.status(500).json({ error: 'Error conectando a la base de datos' });
        }
        res.json({ mensaje: "✅ Conexión exitosa a MySQL db libreria", servidor_hora: results[0].fecha_actual });
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${port}`);
});

