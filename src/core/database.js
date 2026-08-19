/**
 * CareerForge AI — MongoDB Connection Manager
 * Manages production-grade MongoDB Atlas connection lifecycle with auto-reconnection and zero-crash fallbacks.
 */

const mongoose = require('mongoose');
const { logger } = require('./logger');

// Disable command buffering so operations fail fast if DB is disconnected rather than hanging for 10s
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 3000);

let isConnecting = false;

async function connectDB(customUri = null) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return null;
  }

  const uri = customUri || process.env.MONGODB_URI;
  if (!uri) {
    logger.warn('MONGODB_URI not set in environment. Running in resilient local/file mode.');
    return null;
  }

  isConnecting = true;
  try {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 1
    };

    const conn = await mongoose.connect(uri, opts);
    logger.success(`Connected to MongoDB Atlas: ${conn.connection.host}/${conn.connection.name}`);
    isConnecting = false;
    return conn.connection;
  } catch (err) {
    isConnecting = false;
    logger.warn(`MongoDB Atlas connection notice: ${err.message}. Operating in resilient fallback mode.`);
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
  return mongoose.connection && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  disconnectDB,
  isConnected,
  mongoose
};
