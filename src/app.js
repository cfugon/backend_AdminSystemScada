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

const app = express();

// --------------------------
// Seguridad y parsers
// --------------------------
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// --------------------------
// CORS seguro para frontend
// --------------------------

// Leer la variable de entorno y separar múltiples orígenes si es necesario
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

app.use(cors({
  origin: function(origin, callback) {
    // Permite solicitudes sin origen (ej. Postman) o desde frontend autorizado
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: acceso denegado desde ${origin}`));
    }
  },
  credentials: true,
}));

// --------------------------
// Rate limit básico
// --------------------------
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,                 // Máximo 300 requests por ventana
}));

// --------------------------
// Rutas
// --------------------------
app.use('/api', authRoutes);
app.use('/api', usersRoutes);

// Dashboard KPI
app.use('/api/dashboard', kpiRouter);

// Clientes
app.use('/api/clientes', clientesRouter);

// Kardex
app.use('/api/kardex', kardexRoutes);

// Batch
app.use('/api/batch', batchRouter);

// Recetas
app.use('/api/Recetas', recetasRouter);

// Ordenes
app.use('/api/Orders', ordersRouter);

// --------------------------
// Ruta raíz y Healthcheck
// --------------------------
app.get('/', (_req, res) => res.send('Backend funcionando ✅'));

app.get('/health', (_req, res) => res.json({ ok: true }));

// --------------------------
// Manejo de errores
// --------------------------
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Error interno',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// --------------------------
// Puerto dinámico para Render
// --------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
