/**
 * CareerForge AI — MongoDB Connection Manager
 * Manages production-grade MongoDB Atlas connection lifecycle with auto-reconnection.
 */

const mongoose = require('mongoose');
const { logger } = require('./logger');

let isConnecting = false;

async function connectDB(customUri = null) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    logger.info('MongoDB connection already in progress, waiting...');
    return;
  }

  const uri = customUri || process.env.MONGODB_URI;
  if (!uri) {
    logger.warn('MONGODB_URI not provided. Running in memory / file fallback mode.');
    return null;
  }

  isConnecting = true;
  try {
    const opts = {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1
    };

    const conn = await mongoose.connect(uri, opts);
    logger.success(`Connected to MongoDB Atlas: ${conn.connection.host}/${conn.connection.name}`);
    isConnecting = false;
    return conn.connection;
  } catch (err) {
    isConnecting = false;
    logger.error(`MongoDB connection error: ${err.message}`);
    return null;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB Atlas.');
  }
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  disconnectDB,
  isConnected,
  mongoose
};
