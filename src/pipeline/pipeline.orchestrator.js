/**
 * CareerForge AI — Pipeline Orchestration Engine
 * Coordinates the 6-Node Autonomous Job Intelligence Workflow:
 * 1. Discovery (Multi-source feeds)
 * 2. Pre-Filter (Deduplication & ATS skill parsing)
 * 3. AI Matcher (OpenRouter LLM candidate scoring)
 * 4. ATS Tailor CV (LaTeX resume & cover letter generation)
 * 5. Auto-Apply & Notify (SMTP router & Telegram alerts)
 * 6. Deploy & Publish (AES-256 encrypted static CDN package)
 */

const { logger } = require('../core/logger');
const defaultConfig = require('../core/config');
const CrawlerService = require('../services/crawler/crawler.service');
const FilterService = require('../services/filter/filter.service');
const MatcherService = require('../services/matcher/matcher.service');
const CvService = require('../services/cv/cv.service');
const NotifierService = require('../services/notifier/notifier.service');
const PublisherService = require('../services/publisher/publisher.service');

class PipelineOrchestrator {
  constructor(config = defaultConfig) {
    this.config = config;
    this.crawler = new CrawlerService();
    this.filter = new FilterService();
    this.matcher = new MatcherService(config.openRouter?.apiKey, {
      model: config.openRouter?.model,
      minMatchScore: config.pipeline?.minMatchScore
    });
    this.cv = new CvService({
      outputDir: config.paths?.cvs
    });
    this.notifier = new NotifierService(config);
    this.publisher = new PublisherService(config);
  }

  async run(options = {}) {
    const startTime = Date.now();
    logger.banner('🚀 CAREERFORGE AI — AUTONOMOUS PIPELINE EXECUTION');
    logger.info(`Candidate: ${this.config.candidate?.name} (${this.config.candidate?.title})`);
    logger.info(`Model: ${this.config.openRouter?.model} | Min Score: ${this.config.pipeline?.minMatchScore}%`);

    const executionLog = {
      nodes: {},
      summary: {},
      durationMs: 0
    };

    try {
      // ── NODE 1: DISCOVERY ──────────────────────────────────────────
      logger.step(1, 'Discovery: Fetching live multi-source job feeds');
      const node1Start = Date.now();
      const crawlerResult = await this.crawler.fetchAllSources({ limit: options.maxJobs || 40 });
      executionLog.nodes.discovery = {
        status: 'COMPLETED',
        discoveredCount: crawlerResult.total,
        sourceBreakdown: crawlerResult.stats,
        durationMs: Date.now() - node1Start
      };

      // ── NODE 2: PRE-FILTER & DEDUPLICATION ─────────────────────────
      logger.step(2, 'Pre-Filter: Deterministic ranking, deduplication & skill extraction');
      const node2Start = Date.now();
      const filterResult = this.filter.filterAndDeduplicate(crawlerResult.jobs);
      executionLog.nodes.preFilter = {
        status: 'COMPLETED',
        passedCount: filterResult.totalPassed,
        duplicatesRemoved: filterResult.duplicatesRemoved,
        irrelevantRemoved: filterResult.irrelevantRemoved,
        durationMs: Date.now() - node2Start
      };

      // ── NODE 3: AI FIT MATCHER ────────────────────────────────────
      logger.step(3, 'AI Matcher: Evaluating candidate fit with LLM intelligence');
      const node3Start = Date.now();
      const matchedJobs = await this.matcher.evaluateBatch(
        this.config.candidate,
        filterResult.jobs,
        { maxJobs: options.maxScoreJobs || 20 }
      );
      executionLog.nodes.aiMatcher = {
        status: 'COMPLETED',
        evaluatedCount: filterResult.jobs.length,
        strongMatchesCount: matchedJobs.length,
        durationMs: Date.now() - node3Start
      };

      // Merge all jobs (both high-match and all passed) for comprehensive dashboard view
      const allJobsMap = new Map();
      filterResult.jobs.forEach(j => allJobsMap.set(this.filter.generateJobFingerprint(j), j));
      matchedJobs.forEach(j => allJobsMap.set(this.filter.generateJobFingerprint(j), j));
      const consolidatedJobs = Array.from(allJobsMap.values());

      // ── NODE 4: ATS TAILORED CV COMPILATION ────────────────────────
      logger.step(4, 'Tailor CV: Compiling ATS LaTeX application packages');
      const node4Start = Date.now();
      const cvPackages = this.cv.generateTailoredPackages(this.config.candidate, matchedJobs);
      executionLog.nodes.tailorCv = {
        status: 'COMPLETED',
        packagesCompiled: cvPackages.length,
        durationMs: Date.now() - node4Start
      };

      // ── NODE 5: AUTO-APPLY & NOTIFICATIONS ─────────────────────────
      logger.step(5, 'Auto-Apply & Notify: Dispatching alerts & email router');
      const node5Start = Date.now();
      await this.notifier.notifyJobMatches(matchedJobs);
      const applyResult = await this.notifier.processAutoApplications(matchedJobs);
      executionLog.nodes.autoApply = {
        status: 'COMPLETED',
        appliedCount: applyResult.totalApplied,
        durationMs: Date.now() - node5Start
      };

      // ── NODE 6: DEPLOY & PUBLISH ──────────────────────────────────
      logger.step(6, 'Deploy & Publish: Generating encrypted AES-256 package');
      const node6Start = Date.now();
      const publishResult = this.publisher.publishEncryptedBundle(consolidatedJobs, this.config.candidate);
      executionLog.nodes.deploy = {
        status: 'COMPLETED',
        encryptedPath: publishResult.encryptedPath,
        stats: publishResult.stats,
        durationMs: Date.now() - node6Start
      };

      const totalDuration = Date.now() - startTime;
      executionLog.durationMs = totalDuration;
      executionLog.summary = {
        success: true,
        totalDiscovered: crawlerResult.total,
        qualifiedJobs: filterResult.totalPassed,
        strongMatches: matchedJobs.length,
        durationSeconds: (totalDuration / 1000).toFixed(1)
      };

      logger.banner(`✅ PIPELINE COMPLETE in ${executionLog.summary.durationSeconds}s (${matchedJobs.length} matches ready)`);
      return executionLog;

    } catch (err) {
      logger.error('Pipeline execution encountered an unexpected error:', err.message);
      executionLog.summary = { success: false, error: err.message };
      throw err;
    }
  }
}

module.exports = PipelineOrchestrator;
