/**
 * Pipeline Controller
 */

const PipelineOrchestrator = require('../../pipeline/pipeline.orchestrator');
const config = require('../../core/config');

class PipelineController {
  static async triggerPipeline(req, res, next) {
    const { openrouter_key, min_match_score, max_jobs } = req.body || {};

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
      const executionResult = await orchestrator.run({ maxJobs: max_jobs || 30 });

      return res.status(200).json({
        success: true,
        message: 'Autonomous AI Job Hunter pipeline executed successfully!',
        timestamp: new Date().toISOString(),
        execution: executionResult
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = PipelineController;
