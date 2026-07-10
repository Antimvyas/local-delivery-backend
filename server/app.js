const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const foodRoutes = require('./routes/foodRoutes');

const app = express();

// Security and Performance Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Let React Native/Expo connect freely
}));
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiters for Authentication Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    errorCode: 'TOO_MANY_REQUESTS'
  }
});
app.use('/api/v1/login', authLimiter);
app.use('/api/v1/otp', authLimiter);

// Mount Routers
app.use('/api/v1', authRoutes);
app.use('/api/v1', foodRoutes);

// Temporary Diagnostics Endpoint
app.get('/api/v1/diagnostics', (req, res) => {
  res.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST ? 'PRESENT' : 'MISSING',
      DB_USER: process.env.DB_USER ? 'PRESENT' : 'MISSING',
      DB_NAME: process.env.DB_NAME ? 'PRESENT' : 'MISSING',
      MYSQLHOST: process.env.MYSQLHOST ? 'PRESENT' : 'MISSING',
      MYSQLUSER: process.env.MYSQLUSER ? 'PRESENT' : 'MISSING',
      MYSQLDATABASE: process.env.MYSQLDATABASE ? 'PRESENT' : 'MISSING',
      MYSQLPORT: process.env.MYSQLPORT || '3306 (default)',
      DATABASE_URL: process.env.DATABASE_URL ? 'PRESENT' : 'MISSING',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'PRESENT' : 'MISSING',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'PRESENT' : 'MISSING',
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ? 'PRESENT' : 'MISSING',
    }
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler caught:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An internal server error occurred',
    errorCode: err.code || 'INTERNAL_ERROR',
    stack: err.stack,
    sqlState: err.sqlState,
    sqlMessage: err.sqlMessage,
    sql: err.sql
  });
});

module.exports = app;


