// src/app.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./auth/auth.routes');
const usersRoutes = require('./users/users.routes');
const clientesRouter = require('./routes/clientes.router');
const kardexRoutes = require('./routes/kardex.routes');
const batchRouter = require('./routes/batch.router');
const recetasRouter = require('./routes/recetas.routes');
const ordersRouter = require('./routes/orders.routes');
const kpiRouter = require('./routes/kpi.router');
const resumenDiario = require ('./routes/resumendiario.router');
const getResumenVenta = require('./routes/resumenventa.router');



const app = express();

// Seguridad y parsers
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin "origin" (ej: Postman o cURL)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      console.log('orignes', origin);
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));


app.use((req, res, next) => {
  console.log('Origin recibido:', req.headers.origin);
  next();
});


// Rate limit básico
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
}));

// Rutas
app.use('/api', authRoutes);
app.use('/api', usersRoutes);

//Dashboard KPI
app.use('/api/dashboard', kpiRouter);
// clientes
app.use('/api/clientes', clientesRouter);
//karex
app.use('/api/kardex', kardexRoutes);
//batch
app.use('/api/batch', batchRouter);
//recetes
app.use('/api/Recetas', recetasRouter);
//Ordenes
app.use('/api/Orders', ordersRouter);
//Resumen diario
app.use('/api/resumendiario', resumenDiario);
//Resumen de ventas
app.use('/api/resumenventa', getResumenVenta);

// Ruta raíz para Render
app.get('/', (_req, res) => {
  res.send('Backend funcionando ✅');
});

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// Manejo de errores
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Error interno',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
