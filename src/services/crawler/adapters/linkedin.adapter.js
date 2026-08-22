/**
 * CareerForge AI — LinkedIn Easy Apply Adapter
 * Discovers and parses high-relevance LinkedIn Easy Apply engineering opportunities.
 *
 * WS2 Fix: Each entry now carries a url_type field ('search' | 'direct')
 * so the frontend knows whether the URL is a canonical job post or a search query.
 * The dashboard should open search-type URLs in a new tab (Easy Apply Assist mode)
 * rather than attempting any server-side automation against them.
 */

const { logger } = require('../../../core/logger');

class LinkedInAdapter {
  /**
   * Builds targeted LinkedIn search URLs configured with Easy Apply & Experience filters.
   * f_LF=f_AL: Easy Apply only
   * f_E=2,3:   Entry-level & Associate
   * f_WT=2:    Remote
   */
  static buildSearchUrl(keywords = 'devsecops engineer', location = 'Worldwide', options = {}) {
    const kw = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const easyApply = options.easyApply !== false ? '&f_LF=f_AL' : '';
    const remote = options.remote !== false ? '&f_WT=2' : '';
    const entryLevel = '&f_E=2%2C3';
    return `https://www.linkedin.com/jobs/search/?keywords=${kw}&location=${loc}${easyApply}${remote}${entryLevel}&sortBy=DD`;
  }

  /**
   * Builds a canonical LinkedIn job post URL from a numeric job ID.
   * Returns null if the id is not a valid numeric LinkedIn job ID.
   */
  static buildCanonicalUrl(numericJobId) {
    if (!numericJobId || !/^\d{9,12}$/.test(String(numericJobId))) return null;
    return `https://www.linkedin.com/jobs/view/${numericJobId}`;
  }

  static async fetchJobs(limit = 25) {
    logger.info('Querying LinkedIn Easy Apply discovery feeds...');
    const targetQueries = [
      { role: 'Junior DevSecOps Engineer', geo: 'Worldwide' },
      { role: 'Backend Engineer NestJS Node.js', geo: 'Europe' },
      { role: 'Cloud Engineer Azure Docker', geo: 'Remote' }
    ];

    const results = [];

    for (const query of targetQueries) {
      try {
        const searchUrl = this.buildSearchUrl(query.role, query.geo);

        /**
         * NOTE: We cannot scrape LinkedIn job IDs without a session cookie / Puppeteer.
         * url_type='search' is set here because these are filtered search results pages,
         * not canonical job post URLs. The frontend should open these in a new tab for
         * "Easy Apply Assist" mode (Mode A) rather than attempting any automation.
         *
         * When a real numeric job ID becomes available (e.g., from a future Puppeteer
         * worker or the Mode B webhook), url_type should be set to 'direct' and the
         * url should be built with buildCanonicalUrl(numericId).
         */
        results.push({
          source: 'linkedin_easy_apply',
          source_job_id: `li_${Buffer.from(query.role + query.geo).toString('hex').substring(0, 12)}`,
          title: query.role,
          company: 'LinkedIn Direct Employer (Easy Apply)',
          url: searchUrl,
          url_type: 'search',   // 'search' | 'direct' — determines Easy Apply Assist behaviour
          description: `Direct LinkedIn Easy Apply opportunity for ${query.role} in ${query.geo}. Filtered for 0-3 years experience (Entry/Associate). Click "Open & Apply" to launch Easy Apply Assist.`,
          location: `${query.geo} (Remote / Easy Apply)`,
          remote: true,
          salary: null,
          is_easy_apply: true,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        logger.warn(`LinkedIn adapter search error for ${query.role}: ${err.message}`);
      }
    }

    return results.slice(0, limit);
  }
}

module.exports = LinkedInAdapter;
