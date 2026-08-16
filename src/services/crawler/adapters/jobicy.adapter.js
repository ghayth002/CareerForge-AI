/**
 * CareerForge AI — Jobicy Public API Adapter
 * Fetches free, direct remote engineering opportunities without paywalls.
 */

const { logger } = require('../../../core/logger');

class JobicyAdapter {
  static async fetchJobs(limit = 40) {
    const endpoint = `https://jobicy.com/api/v2/remote-jobs?count=${Math.min(50, limit)}&industry=engineering`;
    try {
      const res = await fetch(endpoint, {
        headers: { 'User-Agent': 'CareerForge-AI-Bot/2.0 (Autonomous Junior DevSecOps Job Hunter)' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawJobs = data.jobs || [];

      return rawJobs.map(j => ({
        source: 'jobicy',
        source_job_id: `jobicy_${j.id || Math.random().toString(36).substr(2, 9)}`,
        title: j.jobTitle || 'Software Engineer',
        company: j.companyName || 'Remote Tech Company',
        url: j.url,
        description: (j.jobDescription || j.jobExcerpt || '').replace(/<[^>]*>?/gm, ' '),
        location: j.jobGeo || 'Remote Worldwide',
        remote: true,
        salary: (j.annualSalaryMin && j.annualSalaryMax) ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : null,
        created_at: j.pubDate || new Date().toISOString()
      }));
    } catch (err) {
      logger.warn(`Jobicy adapter fetch error: ${err.message}`);
      return [];
    }
  }
}

module.exports = JobicyAdapter;
