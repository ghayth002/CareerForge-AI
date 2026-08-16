/**
 * Error Handling Middleware
 */

const { logger } = require('../../core/logger');

function errorHandler(err, req, res, next) {
  logger.error(`API Error on [${req.method} ${req.path}]:`, err.message);

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;
