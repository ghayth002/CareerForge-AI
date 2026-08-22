/**
 * CareerForge AI — Express Application Factory (SaaS Multi-Tenant)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('../core/config');
const HealthController = require('./controllers/health.controller');
const PipelineController = require('./controllers/pipeline.controller');
const JobsController = require('./controllers/jobs.controller');
const AuthController = require('./controllers/auth.controller');
const AutoApplyController = require('./controllers/auto_apply.controller');
const WebhooksController = require('./controllers/webhooks.controller');
const { authMiddleware, optionalAuthMiddleware } = require('./middleware/auth.middleware');
const { attachTier, requirePro } = require('./middleware/tier.middleware');
const errorHandler = require('./middleware/error.middleware');

function createApp() {
  const app = express();

  // 1. Security & Global Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow inline styles & scripts for dashboard single-file UI
    crossOriginEmbedderPolicy: false
  }));

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret', 'x-webhook-signature']
  }));
  app.use(express.json());

  // 2. Rate Limiting for Auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60,
    message: { success: false, error: 'Too many authentication attempts. Please try again later.' }
  });

  const pipelineLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { success: false, error: 'Too many pipeline requests. Please wait before running again.' }
  });

  // 3. Static Asset Hosting
  app.use(express.static(config.paths.public));

  // 4. Auth Routes
  app.post('/api/auth/register', authLimiter, AuthController.register);
  app.post('/api/auth/login', authLimiter, AuthController.login);
  app.get('/api/auth/me', authMiddleware, AuthController.getMe);
  app.put('/api/auth/profile', authMiddleware, AuthController.updateProfile);

  // 4b. Admin Routes (gated by x-admin-secret header)
  app.post('/api/admin/promote', AuthController.promoteUser);

  // 5. Health & Pipeline Execution Routes
  app.get('/api/health', HealthController.getHealth);
  app.post('/api/trigger',
    optionalAuthMiddleware,
    attachTier,       // Sets req.userTier from JWT; must run after optionalAuthMiddleware
    pipelineLimiter,
    PipelineController.triggerPipeline
  );

  // 6. Multi-Tenant Jobs & CRM Routes
  app.get('/api/data.enc', JobsController.getEncryptedData);
  app.get('/api/data.json', optionalAuthMiddleware, attachTier, JobsController.getJobsJson);
  app.get('/api/jobs', optionalAuthMiddleware, attachTier, JobsController.getMongoJobs);
  app.patch('/api/jobs/:id/crm', optionalAuthMiddleware, JobsController.updateCrmStatus);
  app.delete('/api/jobs/:id', authMiddleware, JobsController.deleteJob);   // Auth required for delete
  app.get('/api/analytics', optionalAuthMiddleware, attachTier, JobsController.getAnalytics);

  // 7. Autonomous AI Auto-Applier Routes
  app.post('/api/auto-apply/job/:id', optionalAuthMiddleware, attachTier, AutoApplyController.applySingleJob);
  // Batch auto-apply is Pro-only
  app.post('/api/auto-apply/batch',
    authMiddleware,
    attachTier,
    requirePro,
    AutoApplyController.applyBatchJuniorMatches
  );

  // 8. Mode B Webhook (HMAC-validated, no JWT — called by the self-hosted Python worker)
  app.post('/api/webhooks/linkedin-apply', WebhooksController.receiverLinkedInResult);

  // 9. Fallback Single Page Application Route
  app.get('*', (req, res) => {
    const indexPath = path.join(config.paths.public, 'index.html');
    res.sendFile(indexPath);
  });

  // 10. Error Handler Middleware
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
