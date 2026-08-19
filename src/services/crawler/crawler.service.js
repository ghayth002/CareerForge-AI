const { logger } = require('../../core/logger');
const RemotiveAdapter = require('./adapters/remotive.adapter');
const RemoteOkAdapter = require('./adapters/remoteok.adapter');
const ArbeitnowAdapter = require('./adapters/arbeitnow.adapter');
const WeWorkRemotelyAdapter = require('./adapters/weworkremotely.adapter');
const JobicyAdapter = require('./adapters/jobicy.adapter');
const HackerNewsAdapter = require('./adapters/hackernews.adapter');
const WorkingNomadsAdapter = require('./adapters/workingnomads.adapter');
const LinkedInAdapter = require('./adapters/linkedin.adapter');

class CrawlerService {
  constructor(adapters = {}) {
    this.adapters = {
      remotive: adapters.remotive || RemotiveAdapter,
      jobicy: adapters.jobicy || JobicyAdapter,
      linkedin: adapters.linkedin || LinkedInAdapter,
      hackernews: adapters.hackernews || HackerNewsAdapter,
      workingnomads: adapters.workingnomads || WorkingNomadsAdapter,
      remoteok: adapters.remoteok || RemoteOkAdapter,
      arbeitnow: adapters.arbeitnow || ArbeitnowAdapter,
      weworkremotely: adapters.weworkremotely || WeWorkRemotelyAdapter
    };
  }

  async fetchAllSources(options = {}) {
    logger.info('Initiating parallel multi-source job crawler...');
    const results = [];
    const sourceStats = {};

    const fetchTasks = Object.entries(this.adapters).map(async ([sourceName, adapter]) => {
      try {
        const jobs = await adapter.fetchJobs(options.limit || 40);
        sourceStats[sourceName] = jobs.length;
        logger.success(`Source [${sourceName}]: Discovered ${jobs.length} live jobs`);
        return jobs;
      } catch (err) {
        sourceStats[sourceName] = 0;
        logger.warn(`Source [${sourceName}] notice: ${err.message}`);
        return [];
      }
    });

    const settled = await Promise.all(fetchTasks);
    settled.forEach(jobs => results.push(...jobs));

    logger.info(`Total discovered jobs: ${results.length}`, sourceStats);
    return {
      jobs: results,
      stats: sourceStats,
      total: results.length
    };
  }
}

module.exports = CrawlerService;
