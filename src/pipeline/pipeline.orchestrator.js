/**
 * CareerForge AI — Pipeline Orchestration Engine (Multi-Tenant SaaS)
 * Coordinates the 6-Node Autonomous Job Intelligence Workflow:
 * 1. Discovery (Multi-source feeds)
 * 2. Pre-Filter (Deduplication & ATS skill parsing)
 * 3. AI Matcher (OpenRouter LLM candidate scoring)
 * 4. ATS Tailor CV (LaTeX resume & cover letter generation)
 * 5. Auto-Apply & Notify (SMTP router & Telegram alerts)
 * 6. Deploy & Publish (MongoDB Atlas user sync & encrypted bundle)
 */

const { logger } = require('../core/logger');
const defaultConfig = require('../core/config');
const CrawlerService = require('../services/crawler/crawler.service');
const FilterService = require('../services/filter/filter.service');
const MatcherService = require('../services/matcher/matcher.service');
const CvService = require('../services/cv/cv.service');
const NotifierService = require('../services/notifier/notifier.service');
const PublisherService = require('../services/publisher/publisher.service');
const { connectDB } = require('../core/database');
const JobRepository = require('../services/db/job.repository');
const User = require('../models/user.model');

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

  async resolveUserContext(userParam) {
    if (userParam && userParam._id) return userParam;

    try {
      await connectDB();
      const { isConnected } = require('../core/database');
      if (isConnected()) {
        let user = await User.findOne({ email: 'ghaythweslaty002@gmail.com' });
        if (!user) {
          const passwordHash = await User.hashPassword('CareerForge2026!');
          user = new User({
            email: 'ghaythweslaty002@gmail.com',
            name: 'Ghaith Oueslati',
            password_hash: passwordHash,
            role: 'admin',
            candidate_profile: this.config.candidate
          });
          await user.save();
          logger.info(`Initialized default primary tenant user: ${user.email} (${user._id})`);
        }
        return user;
      }
    } catch (err) {
      logger.warn(`resolveUserContext DB notice: ${err.message}. Using default in-memory candidate profile.`);
    }

    // Default tenant user fallback
    return {
      _id: '6a85cf900f514f72532b2876',
      name: this.config.candidate?.name || 'Ghaith Oueslati',
      email: this.config.candidate?.email || 'ghaythweslaty002@gmail.com',
      candidate_profile: this.config.candidate
    };
  }

  async run(userOrOptions = {}, maybeOptions = {}) {
    const startTime = Date.now();
    let user = null;
    let options = {};

    if (userOrOptions && userOrOptions._id) {
      user = userOrOptions;
      options = maybeOptions || {};
    } else {
      options = userOrOptions || {};
    }

    user = await this.resolveUserContext(user);
    const candidate = user.candidate_profile || this.config.candidate;

    // Apply user dynamic keywords if specified
    if (candidate.target_keywords) {
      this.filter.setCriteria({
        targetKeywords: candidate.target_keywords,
        disallowedKeywords: candidate.negative_keywords,
        prohibitedSeniority: candidate.prohibited_seniority
      });
    }

    logger.banner('🚀 CAREERFORGE AI — AUTONOMOUS PIPELINE EXECUTION');
    logger.info(`Tenant User: ${user.name} <${user.email}> (ID: ${user._id})`);
    logger.info(`Candidate Target: ${candidate.title || 'DevSecOps Engineer'} (Seniority: ${candidate.seniority_target || 'Junior/Mid'})`);
    logger.info(`Model: ${this.config.openRouter?.model} | Min Score: ${candidate.min_match_score || this.config.pipeline?.minMatchScore}%`);

    const executionLog = {
      nodes: {},
      summary: {},
      durationMs: 0
    };

    const emit = typeof options.onEvent === 'function' ? options.onEvent : () => {};

    try {
      // ── NODE 1: DISCOVERY ──────────────────────────────────────────
      emit({ type: 'node_start', nodeIndex: 1, nodeName: 'Discovery', message: 'Fetching live multi-source feeds...' });
      logger.step(1, 'Discovery: Fetching live multi-source job feeds');
      const node1Start = Date.now();
      const crawlerResult = await this.crawler.fetchAllSources({ 
        limit: options.maxJobs || 40,
        concurrency: options.concurrency || 2
      });
      executionLog.nodes.discovery = {
        status: 'COMPLETED',
        discoveredCount: crawlerResult.total,
        sourceBreakdown: crawlerResult.stats,
        durationMs: Date.now() - node1Start
      };
      emit({ type: 'node_complete', nodeIndex: 1, nodeName: 'Discovery', count: crawlerResult.total, stats: crawlerResult.stats, durationMs: Date.now() - node1Start });

      // ── NODE 2: PRE-FILTER & DEDUPLICATION ─────────────────────────
      emit({ type: 'node_start', nodeIndex: 2, nodeName: 'Pre-Filter', message: 'Deduplicating and filtering jobs...' });
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
      emit({ type: 'node_complete', nodeIndex: 2, nodeName: 'Pre-Filter', count: filterResult.totalPassed, durationMs: Date.now() - node2Start });

      // ── NODE 3: AI FIT MATCHER ────────────────────────────────────
      emit({ type: 'node_start', nodeIndex: 3, nodeName: 'AI Matcher', message: `Evaluating candidate fit with ${this.config.openRouter?.model}...` });
      logger.step(3, 'AI Matcher: Evaluating candidate fit with LLM intelligence');
      const node3Start = Date.now();
      const matchedJobs = await this.matcher.evaluateBatch(
        filterResult.jobs,
        candidate,
        {
          minScore: candidate.min_match_score || this.config.pipeline?.minMatchScore || 70,
          concurrency: options.concurrency || this.config.pipeline?.aiConcurrency || 3,
          maxJobsToEvaluate: options.maxScoreJobs || this.config.pipeline?.maxScoreJobs || 25
        }
      );
      executionLog.nodes.matcher = {
        status: 'COMPLETED',
        evaluatedCount: filterResult.jobs.length,
        matchedCount: matchedJobs.length,
        durationMs: Date.now() - node3Start
      };
      emit({ type: 'node_complete', nodeIndex: 3, nodeName: 'AI Matcher', count: matchedJobs.length, durationMs: Date.now() - node3Start });

      // Merge all jobs (both high-match and all passed) for comprehensive dashboard view
      const allJobsMap = new Map();
      filterResult.jobs.forEach(j => allJobsMap.set(this.filter.generateJobFingerprint(j), j));
      matchedJobs.forEach(j => allJobsMap.set(this.filter.generateJobFingerprint(j), j));
      const consolidatedJobs = Array.from(allJobsMap.values());

      // ── NODE 4: TAILOR CV & COVER LETTER ──────────────────────────
      emit({ type: 'node_start', nodeIndex: 4, nodeName: 'Tailor CV', message: 'Compiling tailored ATS resumes & LaTeX packages...' });
      logger.step(4, 'Tailor CV: Compiling ATS-optimized CVs and Cover Letters');
      const node4Start = Date.now();
      const tailoredJobs = await this.cv.generateTailoredPackages(matchedJobs, candidate);
      executionLog.nodes.tailorCv = {
        status: 'COMPLETED',
        tailoredCount: tailoredJobs.length,
        durationMs: Date.now() - node4Start
      };
      emit({ type: 'node_complete', nodeIndex: 4, nodeName: 'Tailor CV', count: tailoredJobs.length, durationMs: Date.now() - node4Start });

      // ── NODE 5: AUTO-APPLY & NOTIFICATIONS ─────────────────────────
      emit({ type: 'node_start', nodeIndex: 5, nodeName: 'Auto-Apply', message: 'Routing email applications & dispatching alerts...' });
      logger.step(5, 'Auto-Apply & Notify: Dispatching alerts to candidate email & SMTP router');
      const node5Start = Date.now();
      await this.notifier.notifyJobMatches(matchedJobs, user.email, user.name);
      const applyResult = await this.notifier.processAutoApplications(matchedJobs, user.name);
      executionLog.nodes.autoApply = {
        status: 'COMPLETED',
        appliedCount: applyResult.totalApplied,
        durationMs: Date.now() - node5Start
      };
      emit({ type: 'node_complete', nodeIndex: 5, nodeName: 'Auto-Apply', count: applyResult.totalApplied, durationMs: Date.now() - node5Start });

      // ── NODE 6: PUBLISH, ENCRYPT & DEPLOY ──────────────────────────
      emit({ type: 'node_start', nodeIndex: 6, nodeName: 'Deploy', message: 'Publishing encrypted bundle & syncing MongoDB Atlas...' });
      logger.step(6, 'Publish & Encrypt: Zero-knowledge bundle & MongoDB sync');
      const node6Start = Date.now();
      const publishResult = this.publisher.publishEncryptedBundle(consolidatedJobs, candidate);
      
      // Auto-sync to MongoDB Atlas scoped to current tenant user, with tier-aware retention
      const retentionDays = options.retentionDays || 7;
      await JobRepository.upsertJobs(user._id, consolidatedJobs, retentionDays);

      executionLog.nodes.deploy = {
        status: 'COMPLETED',
        publishedCount: consolidatedJobs.length,
        encryptedPath: publishResult.encryptedPath,
        durationMs: Date.now() - node6Start
      };
      emit({ type: 'node_complete', nodeIndex: 6, nodeName: 'Deploy', count: consolidatedJobs.length, durationMs: Date.now() - node6Start });

      const totalDuration = Date.now() - startTime;
      executionLog.durationMs = totalDuration;
      executionLog.summary = {
        success: true,
        userId: user._id,
        userEmail: user.email,
        totalDiscovered: crawlerResult.total,
        qualifiedJobs: filterResult.totalPassed,
        strongMatches: matchedJobs.length,
        durationSeconds: (totalDuration / 1000).toFixed(1)
      };

      // Log telemetry run to MongoDB
      await JobRepository.logPipelineRun({
        user_id: user._id,
        run_id: `run_${Date.now()}`,
        status: 'COMPLETED',
        sources_crawled: crawlerResult.stats,
        total_discovered: crawlerResult.total,
        total_passed_filter: filterResult.totalPassed,
        total_ai_matched: matchedJobs.length,
        high_matches_count: matchedJobs.length,
        ai_model_used: this.config.openRouter?.model || 'google/gemini-2.5-flash',
        duration_ms: totalDuration
      });

      logger.banner(`✅ PIPELINE COMPLETE in ${executionLog.summary.durationSeconds}s (${matchedJobs.length} matches ready for ${user.email})`);
      return executionLog;

    } catch (err) {
      logger.error('Pipeline execution encountered an unexpected error:', err.message);
      executionLog.summary = { success: false, error: err.message };
      throw err;
    }
  }
}

module.exports = PipelineOrchestrator;
