/**
 * Remotive Job Feed Adapter
 */

class RemotiveAdapter {
  static async fetchJobs(limit = 40) {
    const url = `https://remotive.com/api/remote-jobs?category=software-dev&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      source: 'remotive',
      source_job_id: String(j.id),
      company: j.company_name || 'Unknown',
      title: j.job_title || j.title || '',
      location: j.candidate_required_location || 'Worldwide Remote',
      remote: true,
      employment_type: (j.job_type || 'full-time').toLowerCase(),
      url: j.url || '',
      description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
      salary: j.salary || '',
      tags: j.tags || [],
      posted_at: j.publication_date || new Date().toISOString(),
      language: 'en'
    }));
  }
}

module.exports = RemotiveAdapter;
