/**
 * WeWorkRemotely RSS Feed Adapter
 */

class WeWorkRemotelyAdapter {
  static async fetchJobs(limit = 25) {
    const res = await fetch('https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss');
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const xml = await res.text();
    const itemMatches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<description>(.*?)<\/description>[\s\S]*?<\/item>/g)];
    
    return itemMatches.slice(0, limit).map(m => {
      const titleParts = (m[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').split(': ');
      return {
        source: 'weworkremotely',
        source_job_id: (m[2] || '').trim(),
        company: titleParts[0] ? titleParts[0].trim() : 'Remote Tech',
        title: titleParts[1] ? titleParts[1].trim() : titleParts[0].trim(),
        location: 'Worldwide Remote / EU',
        remote: true,
        employment_type: 'full-time',
        url: (m[2] || '').trim(),
        description: (m[3] || '').replace(/<!\[CDATA\[|\]\]>|<[^>]+>/g, ' ').substring(0, 4000),
        salary: '',
        tags: ['backend', 'remote'],
        posted_at: new Date().toISOString(),
        language: 'en'
      };
    });
  }
}

module.exports = WeWorkRemotelyAdapter;
