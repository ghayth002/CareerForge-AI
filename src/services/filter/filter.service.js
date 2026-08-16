/**
 * CareerForge AI — Pre-Filter & Deterministic Ranker Service
 * Supports dynamic keyword sets, user criteria, deduplication, and ATS skill extraction.
 */

const { logger } = require('../../core/logger');

class FilterService {
  constructor(options = {}) {
    this.targetKeywords = options.targetKeywords || [
      'devsecops', 'devops', 'backend', 'cloud', 'security', 'software engineer',
      'site reliability', 'sre', 'infrastructure', 'platform engineer', 'golang',
      'python', 'nodejs', 'microservices', 'kubernetes', 'docker', 'ci/cd'
    ];

    this.disallowedKeywords = options.disallowedKeywords || [
      'cabin cleaning', 'cleaning agent', 'cleaner', 'graphic design', 'graphic designer',
      'ui/ux designer', 'product designer', 'sales representative', 'customer support',
      'helpdesk', 'service desk', 'tier iii service', 'tier i', 'tier ii', 'call center',
      'telemarketing', 'php wordpress', 'marketing manager', 'recruiter', 'account executive',
      'financial analyst', 'accountant', 'driver', 'warehouse', 'nurse', 'cook'
    ];

    this.preferredLocations = options.preferredLocations || [];
  }

  setCriteria(criteria = {}) {
    if (criteria.targetKeywords && Array.isArray(criteria.targetKeywords)) {
      this.targetKeywords = criteria.targetKeywords.map(k => k.trim().toLowerCase()).filter(Boolean);
    }
    if (criteria.disallowedKeywords && Array.isArray(criteria.disallowedKeywords)) {
      this.disallowedKeywords = criteria.disallowedKeywords.map(k => k.trim().toLowerCase()).filter(Boolean);
    }
    if (criteria.preferredLocations && Array.isArray(criteria.preferredLocations)) {
      this.preferredLocations = criteria.preferredLocations.map(l => l.trim().toLowerCase()).filter(Boolean);
    }
  }

  generateJobFingerprint(job) {
    const cleanCo = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTi = (job.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanCo}::${cleanTi}`;
  }

  extractSkills(text = '') {
    const knownSkills = [
      'Docker', 'Kubernetes', 'CI/CD', 'GitLab CI', 'GitHub Actions', 'Azure',
      'AWS', 'GCP', 'MongoDB', 'Redis', 'Python', 'Node.js', 'NestJS', 'Express',
      'Go', 'Golang', 'PostgreSQL', 'Terraform', 'OWASP ZAP', 'Trivy', 'SonarQube',
      'Linux', 'DevSecOps', 'SAST', 'DAST', 'REST API', 'GraphQL', 'Microservices'
    ];

    const lower = text.toLowerCase();
    return knownSkills.filter(skill => {
      const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(lower);
    });
  }

  filterAndDeduplicate(rawJobs = []) {
    logger.info(`Starting pre-filtering & deduplication on ${rawJobs.length} raw jobs...`);
    const seen = new Set();
    const passed = [];
    let duplicateCount = 0;
    let irrelevantCount = 0;

    for (const job of rawJobs) {
      if (!job.title || !job.company) continue;

      // 1. Deduplication
      const fingerprint = this.generateJobFingerprint(job);
      if (seen.has(fingerprint)) {
        duplicateCount++;
        continue;
      }
      seen.add(fingerprint);

      // 2. Keyword relevance check
      const fullText = `${job.title} ${job.description || ''}`.toLowerCase();
      
      const hasDisallowed = this.disallowedKeywords.some(bad => job.title.toLowerCase().includes(bad));
      if (hasDisallowed) {
        irrelevantCount++;
        continue;
      }

      const matchesTarget = this.targetKeywords.some(kw => fullText.includes(kw));
      if (!matchesTarget) {
        irrelevantCount++;
        continue;
      }

      // 3. Location preference filtering if specified
      if (this.preferredLocations.length > 0) {
        const jobLoc = (job.location || '').toLowerCase();
        const matchesLoc = job.remote || this.preferredLocations.some(loc => jobLoc.includes(loc));
        if (!matchesLoc) {
          irrelevantCount++;
          continue;
        }
      }

      // Extract skills and enrich job object
      job.skills = this.extractSkills(fullText);
      passed.push(job);
    }

    logger.success(`Pre-filter complete: ${passed.length} qualified jobs passed (${duplicateCount} duplicates, ${irrelevantCount} irrelevant removed)`);
    return {
      jobs: passed,
      duplicatesRemoved: duplicateCount,
      irrelevantRemoved: irrelevantCount,
      totalPassed: passed.length
    };
  }
}

module.exports = FilterService;
