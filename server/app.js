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

module.exports = app;
