/**
 * CareerForge AI — Pipeline Controller (Multi-Tenant & Live SSE Streaming)
 */

const PipelineOrchestrator = require('../../pipeline/pipeline.orchestrator');
const JobRepository = require('../../services/db/job.repository');
const PipelineRun = require('../../models/pipeline_run.model');
const config = require('../../core/config');
const { isConnected } = require('../../core/database');
const { logger } = require('../../core/logger');

class PipelineController {
  /**
   * Standard JSON POST endpoint for pipeline trigger
   */
  static async triggerPipeline(req, res, next) {
    const { openrouter_key, min_match_score, max_jobs } = req.body || {};
    const tier = req.userTier || 'free';
    const tierConfig = config.tiers ? (config.tiers[tier] || config.tiers.free) : { retentionDays: 7, maxDailyRuns: 3, concurrency: 3, maxJobs: 30 };

    // Daily run gate for free tier
    if (tierConfig.maxDailyRuns > 0 && isConnected() && req.user?.id) {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayRuns = await PipelineRun.countDocuments({
          user_id: req.user.id,
          created_at: { $gte: todayStart }
        });
        if (todayRuns >= tierConfig.maxDailyRuns) {
          return res.status(429).json({
            success: false,
            error: `Daily pipeline run limit reached (${tierConfig.maxDailyRuns} runs/day on Free tier). Upgrade to Pro for unlimited runs.`,
            tier,
            upgrade: true,
            runs_today: todayRuns,
            limit: tierConfig.maxDailyRuns
          });
        }
      } catch (e) {
        // Non-fatal
      }
    }

    const runtimeConfig = { ...config };
    if (openrouter_key) {
      runtimeConfig.openRouter = { ...runtimeConfig.openRouter, apiKey: openrouter_key };
    }
    if (min_match_score) {
      runtimeConfig.pipeline = { ...runtimeConfig.pipeline, minMatchScore: parseInt(min_match_score, 10) };
    }

    try {
      const orchestrator = new PipelineOrchestrator(runtimeConfig);
      const executionResult = await orchestrator.run(req.user, {
        maxJobs: max_jobs || tierConfig.maxJobs,
        concurrency: tierConfig.concurrency,
        retentionDays: tierConfig.retentionDays
      });

      const freshJobs = await JobRepository.getJobs(req.user?.id);

      return res.status(200).json({
        success: true,
        message: 'Autonomous AI Job Hunter pipeline executed successfully!',
        timestamp: new Date().toISOString(),
        tier,
        execution: executionResult,
        count: freshJobs.length,
        jobs: freshJobs
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Real-time Server-Sent Events (SSE) stream endpoint: GET /api/trigger/stream
   * Emits live node progress, counts, and terminal logs as execution occurs.
   */
  static async streamPipeline(req, res) {
    const tier = req.userTier || 'free';
    const tierConfig = config.tiers ? (config.tiers[tier] || config.tiers.free) : { retentionDays: 7, maxDailyRuns: 3, concurrency: 3, maxJobs: 30 };

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('init', { message: 'Connected to CareerForge AI Cloud Orchestrator', tier, timestamp: new Date().toISOString() });

    // Daily run gate
    if (tierConfig.maxDailyRuns > 0 && isConnected() && req.user?.id) {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayRuns = await PipelineRun.countDocuments({
          user_id: req.user.id,
          created_at: { $gte: todayStart }
        });
        if (todayRuns >= tierConfig.maxDailyRuns) {
          sendEvent('error', {
            error: `Daily pipeline limit reached (${tierConfig.maxDailyRuns} runs/day on Free tier). Upgrade to Pro for unlimited runs.`,
            upgrade: true
          });
          return res.end();
        }
      } catch (e) {}
    }

    try {
      const orchestrator = new PipelineOrchestrator(config);

      const executionResult = await orchestrator.run(req.user, {
        maxJobs: tierConfig.maxJobs || 40,
        concurrency: tierConfig.concurrency || 3,
        retentionDays: tierConfig.retentionDays || 7,
        onEvent: (eventData) => {
          sendEvent('progress', eventData);
        }
      });

      const freshJobs = await JobRepository.getJobs(req.user?.id);

      sendEvent('complete', {
        success: true,
        message: 'Pipeline execution complete!',
        execution: executionResult,
        count: freshJobs.length,
        jobs: freshJobs
      });

      res.end();
    } catch (err) {
      sendEvent('error', { error: err.message });
      res.end();
    }
  }
}

module.exports = PipelineController;
