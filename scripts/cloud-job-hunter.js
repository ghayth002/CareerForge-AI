/**
 * CareerForge AI — Cloud Pipeline Runner (CLI Entry Point)
 * Refactored to delegate to the modular PipelineOrchestrator.
 */

const PipelineOrchestrator = require('../src/pipeline/pipeline.orchestrator');
const config = require('../src/core/config');
const { logger } = require('../src/core/logger');

async function main() {
  const orchestrator = new PipelineOrchestrator(config);
  try {
    const result = await orchestrator.run({
      maxJobs: config.pipeline.maxJobs,
      maxScoreJobs: 25
    });
    process.exit(result.summary.success ? 0 : 1);
  } catch (err) {
    logger.error('Fatal execution error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
