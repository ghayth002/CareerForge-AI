/**
 * RemoteOK Job Feed Adapter
 */

class RemoteOkAdapter {
  static async fetchJobs(limit = 30) {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'CareerForge-AI/2.0 (Autonomous Candidate Engine)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .slice(1, limit + 1)
      .filter(j => j.company && (j.position || j.title))
      .map(j => ({
        source: 'remoteok',
        source_job_id: String(j.id || j.slug || ''),
        company: j.company || 'Unknown',
        title: j.position || j.title || '',
        location: j.location || 'Remote',
        remote: true,
        employment_type: 'full-time',
        url: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
        description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
        salary: j.salary || '',
        tags: j.tags || [],
        posted_at: j.date || new Date().toISOString(),
        language: 'en'
      }));
  }
}

module.exports = RemoteOkAdapter;
