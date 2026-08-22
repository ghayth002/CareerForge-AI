require('dotenv').config();
const { createApp } = require('./src/api/app');
const config = require('./src/core/config');
const { logger } = require('./src/core/logger');
const { connectDB } = require('./src/core/database');
const { scheduleCleanup } = require('./src/services/cleanup/cleanup.service');

const app = createApp();
const PORT = config.port || 3000;

app.listen(PORT, async () => {
  logger.banner(`⚡ CareerForge AI Cloud API Server running on port ${PORT}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🚀 Live Trigger API: POST http://localhost:${PORT}/api/trigger`);
  logger.info(`📊 Dashboard: http://localhost:${PORT}/`);
  
  // Connect to MongoDB Atlas
  await connectDB();

  // Schedule weekly expired-job cleanup (every Sunday 02:00)
  scheduleCleanup(config);
});

module.exports = app;
