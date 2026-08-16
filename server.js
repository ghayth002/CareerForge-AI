/**
 * CareerForge AI — Production Cloud API Server
 * Refactored to Clean Layered Architecture
 */

const { createApp } = require('./src/api/app');
const config = require('./src/core/config');
const { logger } = require('./src/core/logger');

const app = createApp();
const PORT = config.port || 3000;

app.listen(PORT, () => {
  logger.banner(`⚡ CareerForge AI Cloud API Server running on port ${PORT}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🚀 Live Trigger API: POST http://localhost:${PORT}/api/trigger`);
  logger.info(`📊 Dashboard: http://localhost:${PORT}/`);
});

module.exports = app;
