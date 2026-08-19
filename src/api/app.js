/**
 * CareerForge AI — Express Application Factory
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../core/config');
const HealthController = require('./controllers/health.controller');
const PipelineController = require('./controllers/pipeline.controller');
const JobsController = require('./controllers/jobs.controller');
const errorHandler = require('./middleware/error.middleware');

function createApp() {
  const app = express();

  // 1. Global Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());

  // 2. Static Asset Hosting
  app.use(express.static(config.paths.public));

  // 3. API Routes
  app.get('/api/health', HealthController.getHealth);
  app.post('/api/trigger', PipelineController.triggerPipeline);
  app.get('/api/data.enc', JobsController.getEncryptedData);
  app.get('/api/data.json', JobsController.getJobsJson);
  app.get('/api/jobs', JobsController.getMongoJobs);
  app.patch('/api/jobs/:id/crm', JobsController.updateCrmStatus);
  app.get('/api/analytics', JobsController.getAnalytics);

  // 4. Fallback Single Page Application Route
  app.get('*', (req, res) => {
    const indexPath = path.join(config.paths.public, 'index.html');
    res.sendFile(indexPath);
  });

  // 5. Error Handler Middleware
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
