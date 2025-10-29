// app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const UsuarioRoutes = require('./src/routes/usuarios');
const loginRoutes = require('./src/routes/login');
const DocumentoRegulatorioRoutes = require('./src/routes/DocumentoRegulatorio');
const TerminosycondicionesRoutes = require('./src/routes/Terminosycondiciones');
const DeslindeRoutes = require('./src/routes/Deslinde');
const EmpresaRoutes = require('./src/routes/Empresa');
const authRoutes = require('./src/routes/auth');
const limiteIntentosRoutes = require('./src/routes/limiteIntentosRoutes');
const CategoriaRoutes = require('./src/routes/Cateoria');
const ColorRoutes = require('./src/routes/Color');
const TamanosRoutes = require('./src/routes/Tamanos');
const productosRoutes = require('./src/routes/productos');
const bannerRoutes = require('./src/routes/banner');
const nosotrosRoutes = require('./src/routes/nosotros');
const metodoPagoRouter = require('./src/routes/metodos_pago');
const proveedorRouter = require('./src/routes/Proveedor');
const comprasRouter = require('./src/routes/Compras');
const oracionRouter = require('./src/routes/oracion');
const preguntasRouter = require('./src/routes/preguntas');
const noticacionesRouter = require('./src/routes/notificaciones');
const noticiasEventosRoutes = require('./src/routes/noticiasEventos');
const carritoRouter = require('./src/routes/carrito');
const catalogoRouter = require('./src/routes/catalogo');
const ventasRouter = require('./src/routes/ventas');
const comentariosRouter = require('./src/routes/comentarios');
const descuentosRouter = require('./src/routes/descuentos');
const insignasRouter = require('./src/routes/Insignias');

require('dotenv').config();

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost',
    'http://localhost:4200',
    'https://tienda-lib-cr.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: true
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());

// Rutas
app.use('/api', UsuarioRoutes);
app.use('/api', loginRoutes);
app.use('/api', DocumentoRegulatorioRoutes);
app.use('/api', TerminosycondicionesRoutes);
app.use('/api', DeslindeRoutes);
app.use('/api', EmpresaRoutes);
app.use('/api', authRoutes);
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
app.use('/api', noticiasEventosRoutes);
app.use('/api', carritoRouter);
app.use('/api', catalogoRouter);
app.use('/api', ventasRouter);
app.use('/api', comentariosRouter);
app.use('/api', descuentosRouter);
app.use('/api', insignasRouter);

// Ruta principal
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

module.exports = app;
