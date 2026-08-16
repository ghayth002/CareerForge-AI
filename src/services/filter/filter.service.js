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

    this.prohibitedSeniority = options.prohibitedSeniority || [
      'tech lead', 'team lead', 'principal', 'staff', 'architect', 'director',
      'vp of', 'head of', 'chief', 'manager', 'senior lead', 'distinguished',
      'lead engineer', 'lead developer', 'senior architect', 'engineering director'
    ];

    this.genericPlaceholders = [
      'current openings', 'careers', 'join our team', 'general application',
      'open positions', 'spontaneous application', 'job openings'
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
    if (criteria.prohibitedSeniority && Array.isArray(criteria.prohibitedSeniority)) {
      this.prohibitedSeniority = criteria.prohibitedSeniority.map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    if (criteria.preferredLocations && Array.isArray(criteria.preferredLocations)) {
      this.preferredLocations = criteria.preferredLocations.map(l => l.trim().toLowerCase()).filter(Boolean);
    }
  }

  extractYearsOfExperience(text = '') {
    const patterns = [
      /(?:requires?|minimum of|at least|\bhave\b|\bwith\b)\s*(\d{1,2})\+?\s*(?:-\s*\d{1,2})?\s*(?:years?|yrs?)(?:\s*of\s*experience)?/i,
      /\b(\d{1,2})\+\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)\b/i,
      /(\d{1,2})\s*(?:-\s*\d{1,2})?\s*years?\s*(?:of\s*)?experience/i
    ];

    for (const pat of patterns) {
      const m = text.match(pat);
      if (m && m[1]) {
        const yoe = parseInt(m[1], 10);
        if (!isNaN(yoe) && yoe > 0 && yoe <= 25) return yoe;
      }
    }
    return null;
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

      const titleLower = job.title.trim().toLowerCase();

      // 1. Generic placeholder discard
      if (this.genericPlaceholders.some(gp => titleLower.includes(gp) || titleLower === gp)) {
        irrelevantCount++;
        continue;
      }

      // 2. Prohibited Seniority check (reject lead/staff/principal/architect for junior candidate)
      const hasProhibitedSeniority = this.prohibitedSeniority.some(senior => {
        const regex = new RegExp(`\\b${senior}\\b`, 'i');
        return regex.test(titleLower);
      });
      if (hasProhibitedSeniority) {
        irrelevantCount++;
        continue;
      }

      // 3. Deduplication
      const fingerprint = this.generateJobFingerprint(job);
      if (seen.has(fingerprint)) {
        duplicateCount++;
        continue;
      }
      seen.add(fingerprint);

      // 4. Keyword relevance check
      const fullText = `${job.title} ${job.description || ''}`.toLowerCase();
      
      const hasDisallowed = this.disallowedKeywords.some(bad => titleLower.includes(bad));
      if (hasDisallowed) {
        irrelevantCount++;
        continue;
      }

      const matchesTarget = this.targetKeywords.some(kw => fullText.includes(kw));
      if (!matchesTarget) {
        irrelevantCount++;
        continue;
      }

      // 5. Years of experience check (Reject roles requiring 4+ or 5+ years for junior candidate)
      const requiredYoE = this.extractYearsOfExperience(job.description || '');
      if (requiredYoE !== null && requiredYoE >= 4) {
        irrelevantCount++;
        continue;
      }

      // 6. Location preference filtering if specified
      if (this.preferredLocations.length > 0) {
        const jobLoc = (job.location || '').toLowerCase();
        const matchesLoc = job.remote || this.preferredLocations.some(loc => jobLoc.includes(loc));
        if (!matchesLoc) {
          irrelevantCount++;
          continue;
        }
      }

      // 7. Enrich job with verified skills and seniority badge
      job.skills = this.extractSkills(fullText);
      job.required_yoe = requiredYoE;

      const isJuniorKeyword = /junior|entry|graduate|associate|trainee|early career|intern/i.test(titleLower);
      if (isJuniorKeyword || (requiredYoE !== null && requiredYoE <= 2)) {
        job.seniority_level = 'Junior / Graduate (0-2 yrs)';
        job.experience_fit = 'PERFECT_JUNIOR';
      } else {
        job.seniority_level = 'Associate / Mid-Level (1-3 yrs)';
        job.experience_fit = 'GREAT_MID';
      }

      // Sanitize job title from recruitment noise
      job.title = job.title.replace(/\s*\(f\/m\/d\)/gi, '').replace(/\s*\(m\/f\/d\)/gi, '').replace(/\s*-\s*Remote/gi, '').trim();

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
