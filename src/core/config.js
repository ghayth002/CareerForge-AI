/**
 * CareerForge AI — Unified Configuration Core
 * Centralizes environment parsing, candidate profiles, scoring parameters, and job source settings.
 */

const fs = require('fs');
const path = require('path');

// Auto-load .env file if running locally
const rootDir = path.resolve(__dirname, '../../');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

function loadJsonSafe(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn(`[Config] Notice: Could not read ${filePath}: ${e.message}`);
  }
  return fallback;
}

const candidateProfile = loadJsonSafe(path.join(rootDir, 'config', 'candidate.json'), {
  name: 'Ghaith Oueslati',
  email: 'ghaythweslaty002@gmail.com',
  title: 'DevSecOps & Backend Engineer',
  location: 'Tunisia / Remote EU',
  linkedin: 'ghayth-weslati',
  github: 'ghayth002',
  phone: '+216 94854835'
});

const scoringRules = loadJsonSafe(path.join(rootDir, 'config', 'scoring.json'), {
  thresholds: { minimum: 70, strong: 80, exceptional: 90 },
  weights: { technical: 0.45, experience: 0.25, seniority: 0.15, location: 0.15 }
});

const jobSourcesConfig = loadJsonSafe(path.join(rootDir, 'config', 'job_sources.json'), {
  sources: ['remotive', 'remoteok', 'arbeitnow', 'weworkremotely']
});

const config = {
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT || process.env.DASHBOARD_PORT || '3000', 10),
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || ''
  },
  smtp: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10)
  },
  github: {
    token: process.env.GH_PAT || process.env.GITHUB_TOKEN || '',
    repo: process.env.GITHUB_REPOSITORY || 'ghayth002/CareerForge-AI',
    workflow: 'job-hunter-pipeline.yml'
  },
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || ''
  },
  pipeline: {
    minMatchScore: parseInt(process.env.MIN_MATCH_SCORE || '70', 10),
    maxJobs: parseInt(process.env.MAX_JOBS || '30', 10),
    enableEmailApply: process.env.AUTO_APPLY_ENABLED === 'true',
    passcode: process.env.DASHBOARD_PASSCODE || 'Ghaith_Master_Key_2026!'
  },
  candidate: candidateProfile,
  scoring: scoringRules,
  jobSources: jobSourcesConfig,
  paths: {
    root: rootDir,
    public: path.join(rootDir, 'public'),
    dashboard: path.join(rootDir, 'dashboard'),
    data: path.join(rootDir, 'data'),
    cvs: path.join(rootDir, 'public', 'cvs'),
    sampleJobs: path.join(rootDir, 'data', 'jobs', 'sample', 'sample_jobs.json')
  },
  // ── Tier Limits ────────────────────────────────────────────────
  tiers: {
    free: {
      retentionDays: 7,      // Job auto-expires after 7 days
      maxDailyRuns: 3,       // Max pipeline runs per day
      concurrency: 3,        // Parallel AI matcher slots
      maxJobs: 30            // Max jobs discovered per run
    },
    pro: {
      retentionDays: 30,     // Job auto-expires after 30 days
      maxDailyRuns: -1,      // Unlimited
      concurrency: 5,
      maxJobs: 100
    }
  },
  // ── Redis (for BullMQ LinkedIn worker queue) ───────────────────
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
};

module.exports = config;
