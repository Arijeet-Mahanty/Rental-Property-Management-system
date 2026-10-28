/**
 * RentRoll - Backend Express Server (Phase 2)
 * High-Performance REST API with JWT Auth, PostgreSQL / JSON Engine, and Static Serving
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('../database/db');

// Route modules
const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const unitsRoutes = require('./routes/units');
const leasesRoutes = require('./routes/leases');
const paymentsRoutes = require('./routes/payments');
const maintenanceRoutes = require('./routes/maintenance');
const dashboardRoutes = require('./routes/dashboard');
const contactRoutes = require('./routes/contact');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const status = await db.getStatus();
  res.json({
    status: 'healthy',
    application: 'RentRoll Property Management System',
    phase: 'Phase 2 (REST API & Multi-Tenant Core)',
    database: status,
    timestamp: new Date().toISOString()
  });
});

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/leases', leasesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/feedback', feedbackRoutes);

// Serve static frontend files from project root
const PUBLIC_DIR = path.join(__dirname, '..');
app.use(express.static(PUBLIC_DIR));

// Fallback for 404 on API calls
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl || req.path}' not found.`
  });
});

// Root fallback to index.html for direct navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
================================================================
  RentRoll Server (Phase 2 Active)
  --------------------------------------------------------------
  API & Web App Live: http://localhost:${PORT}
  Landing Page:       http://localhost:${PORT}/index.html
  Login Page:         http://localhost:${PORT}/login.html
  Dashboard:          http://localhost:${PORT}/dashboard.html
  Health Status:      http://localhost:${PORT}/api/health
================================================================
    `);
  });
}

module.exports = app;
