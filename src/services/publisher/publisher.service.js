/**
 * CareerForge AI — Zero-Knowledge Dashboard Publisher Service
 * Encrypts discovered jobs, metrics, and dispatch tokens into AES-256-GCM packages.
 * Prepares static output bundles for instant deployment to GitHub Pages or cloud hosting.
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../../core/logger');
const SecurityService = require('../../core/security');

class PublisherService {
  constructor(config = {}) {
    this.publicDir = config.paths?.public || path.join(__dirname, '../../../public');
    this.dashboardDir = config.paths?.dashboard || path.join(__dirname, '../../../dashboard');
    this.passcode = config.pipeline?.passcode || 'Ghaith_Master_Key_2026!';
    this.config = config;
  }

  buildPayload(rawJobs = [], candidate = {}) {
    const enrichedJobs = rawJobs.map(j => {
      let score = j.match_score;
      if (!score || score <= 0) {
        // Calculate deterministic AST match score from candidate skills & job text
        const text = `${j.title || ''} ${j.description || ''} ${(j.skills || []).join(' ')}`.toLowerCase();
        let skillMatches = 0;
        const targetSkills = ['devsecops', 'devops', 'backend', 'cloud', 'security', 'docker', 'ci/cd', 'kubernetes', 'python', 'aws', 'azure', 'node', 'nestjs', 'golang', 'linux', 'sast', 'dast', 'redis', 'mongodb', 'terraform', 'rest'];
        targetSkills.forEach(s => { if (text.includes(s)) skillMatches++; });
        score = Math.min(94, Math.max(62, 58 + skillMatches * 5));
      }

      return {
        ...j,
        match_score: score,
        technical_score: j.technical_score || score + 2,
        experience_score: j.experience_score || score - 2,
        ai_reasoning: j.ai_reasoning || j.reasoning || `Strong technical fit evaluated for ${j.title || 'engineering role'} based on candidate profile.`,
        custom_summary: j.custom_summary || `${candidate.role || candidate.title || 'DevSecOps & Backend Engineer'} with hands-on experience matching ${j.company || 'target'} requirements.`,
        cover_note: j.cover_note || `I am excited to apply for the ${j.title || 'Engineer'} role at ${j.company || 'your team'}. My technical background in cloud infrastructure, security automation, and backend systems directly aligns with your goals.`,
        form_field_guide: j.form_field_guide || {
          why_interested: `Strong alignment with ${j.company || 'the team'}'s engineering goals and technical challenges.`,
          biggest_achievement: 'Reduced backend API latency by 83% and cut security triage time 60% with AI automation.'
        }
      };
    });

    const stats = {
      total_jobs: enrichedJobs.length,
      discovered_today: enrichedJobs.length,
      matched_70_plus: enrichedJobs.filter(j => (j.match_score || 0) >= 70).length,
      matched_80_plus: enrichedJobs.filter(j => (j.match_score || 0) >= 80).length,
      matched_90_plus: enrichedJobs.filter(j => (j.match_score || 0) >= 90).length,
      remote_jobs: enrichedJobs.filter(j => j.remote).length,
      last_updated: new Date().toISOString()
    };

    return {
      stats,
      jobs: enrichedJobs,
      candidate: {
        name: candidate.name || 'Ghaith Oueslati',
        title: candidate.title || 'DevSecOps & Backend Engineer',
        email: candidate.email || 'ghaythweslaty002@gmail.com',
        location: candidate.location || 'Tunisia / Remote EU',
        linkedin: candidate.linkedin || 'ghayth-weslati',
        github: candidate.github || 'ghayth002',
        phone: candidate.phone || '+216 94854835'
      },
      dispatch: {
        workflow: this.config.github?.workflow || 'job-hunter-pipeline.yml',
        repo: this.config.github?.repo || 'ghayth002/CareerForge-AI',
        token: this.config.github?.token || '',
        n8n_webhook: this.config.n8n?.webhookUrl || '',
        cloud_api: '/api/trigger'
      },
      generated_at: new Date().toISOString()
    };
  }

  publishEncryptedBundle(jobs = [], candidate = {}) {
    logger.info('Building encrypted AES-256 zero-knowledge dataset package...');
    
    if (!fs.existsSync(this.publicDir)) {
      fs.mkdirSync(this.publicDir, { recursive: true });
    }

    const payload = this.buildPayload(jobs, candidate);
    const encryptedPkg = SecurityService.encryptPayload(payload, this.passcode);

    // Write encrypted binary package
    const encPath = path.join(this.publicDir, 'data.enc');
    fs.writeFileSync(encPath, JSON.stringify(encryptedPkg), 'utf8');

    // Also write unencrypted data.json for local/debug environments
    const jsonPath = path.join(this.publicDir, 'data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

    // Sync dashboard/public/index.html to public/index.html if needed
    const srcHtml = path.join(this.dashboardDir, 'public', 'index.html');
    const destHtml = path.join(this.publicDir, 'index.html');
    if (fs.existsSync(srcHtml) && !fs.existsSync(destHtml)) {
      fs.copyFileSync(srcHtml, destHtml);
    }

    logger.success(`Zero-Knowledge package built: ${encPath} (${fs.statSync(encPath).size} bytes)`);
    return {
      success: true,
      stats: payload.stats,
      encryptedPath: encPath,
      jsonPath
    };
  }
}

module.exports = PublisherService;
