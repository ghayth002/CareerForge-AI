/**
 * Arbeitnow EU / Italy / Tunisia Job Feed Adapter
 */

class ArbeitnowAdapter {
  static async fetchJobs(limit = 40) {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (!Array.isArray(data.data)) return [];

    return data.data.slice(0, limit).map(j => ({
      source: 'arbeitnow_eu',
      source_job_id: String(j.slug || j.title || ''),
      company: j.company_name || 'Unknown',
      title: j.title || '',
      location: j.location || 'Europe / Remote',
      remote: j.remote !== undefined ? j.remote : true,
      employment_type: (j.job_types || ['full-time'])[0] || 'full-time',
      url: j.url || '',
      description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
      salary: '',
      tags: j.tags || [],
      posted_at: new Date(j.created_at * 1000).toISOString(),
      language: 'en'
    }));
  }
}

module.exports = ArbeitnowAdapter;
