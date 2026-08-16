/**
 * CareerForge AI — WorkingNomads Free API Adapter
 * Fetches free remote engineering and DevOps positions directly.
 */

const { logger } = require('../../../core/logger');

class WorkingNomadsAdapter {
  static async fetchJobs(limit = 40) {
    const endpoint = 'https://www.workingnomads.com/api/exposed_jobs/';
    try {
      const res = await fetch(endpoint, {
        headers: { 'User-Agent': 'CareerForge-AI-Bot/2.0' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawJobs = await res.json();

      return (rawJobs || []).slice(0, limit).map(j => ({
        source: 'workingnomads',
        source_job_id: `wn_${j.id || Math.random().toString(36).substr(2, 9)}`,
        title: j.title || 'Software Engineer',
        company: j.company_name || 'Tech Company',
        url: j.url || `https://www.workingnomads.com/jobs?job=${j.slug}`,
        description: (j.description || '').replace(/<[^>]*>?/gm, ' '),
        location: j.location || 'Remote Worldwide',
        remote: true,
        salary: j.salary || null,
        created_at: j.pub_date || new Date().toISOString()
      }));
    } catch (err) {
      logger.warn(`WorkingNomads adapter notice: ${err.message}`);
      return [];
    }
  }
}

module.exports = WorkingNomadsAdapter;
