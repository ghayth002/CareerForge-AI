/**
 * CareerForge AI — HackerNews "Who is Hiring?" Adapter
 * Ingests 100% direct founder and hiring manager postings without middlemen or paywalls.
 */

const { logger } = require('../../../core/logger');

class HackerNewsAdapter {
  static async fetchJobs(limit = 35) {
    try {
      const userRes = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring.json');
      if (!userRes.ok) throw new Error('HN User API unavailable');
      const userData = await userRes.json();
      
      const latestStoryId = (userData.submitted || [])[0];
      if (!latestStoryId) return [];

      const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${latestStoryId}.json`);
      if (!storyRes.ok) return [];
      const storyData = await storyRes.json();

      const kidIds = (storyData.kids || []).slice(0, Math.min(limit, 40));
      const jobPromises = kidIds.map(async id => {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!itemRes.ok) return null;
          const item = await itemRes.json();
          if (!item || !item.text || item.deleted || item.dead) return null;

          const rawText = item.text.replace(/<p>/gi, '\n\n').replace(/<[^>]*>?/gm, ' ');
          const firstLine = rawText.split('\n')[0] || '';
          const parts = firstLine.split('|').map(p => p.trim());

          const company = parts[0] || 'Tech Startup (HN)';
          const title = parts[1] || 'Software / Cloud Engineer';
          const location = parts[2] || 'Remote';
          const isRemote = /remote/i.test(firstLine) || /remote/i.test(rawText);

          return {
            source: 'hackernews',
            source_job_id: `hn_${item.id}`,
            title: title.substring(0, 70),
            company: company.substring(0, 50),
            url: `https://news.ycombinator.com/item?id=${item.id}`,
            description: rawText,
            location: location.substring(0, 50),
            remote: isRemote,
            salary: null,
            created_at: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString()
          };
        } catch (e) {
          return null;
        }
      });

      const fetched = await Promise.all(jobPromises);
      return fetched.filter(Boolean);
    } catch (err) {
      logger.warn(`HackerNews adapter notice: ${err.message}`);
      return [];
    }
  }
}

module.exports = HackerNewsAdapter;
