/**
 * CareerForge AI — Pipeline Controller (Multi-Tenant)
 */

const PipelineOrchestrator = require('../../pipeline/pipeline.orchestrator');
const JobRepository = require('../../services/db/job.repository');
const PipelineRun = require('../../models/pipeline_run.model');
const config = require('../../core/config');
const { isConnected } = require('../../core/database');

class PipelineController {
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
        // Non-fatal: if we can't count runs, allow the request through
      }
    }

    // Override runtime API Key or parameters if provided in request
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

      // Fetch fresh updated jobs directly from MongoDB Atlas
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
}

module.exports = PipelineController;
