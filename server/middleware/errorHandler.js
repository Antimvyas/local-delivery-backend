const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - Error: ${err.message}`, err);

  const status = err.status || 500;
  const message = err.message || 'An internal server error occurred';
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(status).json({
    success: false,
    message: message,
    errorCode: errorCode
  });
};

module.exports = errorHandler;
