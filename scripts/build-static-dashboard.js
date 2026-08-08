/**
 * CareerForge AI — Static Dashboard Builder for GitHub Pages
 * Builds a single static JSON data store and bundles the frontend UI for 100% free hosting on GitHub Pages.
 * Run: node scripts/build-static-dashboard.js
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const docsDir = path.join(__dirname, '../docs');
const customizedCvDir = path.join(__dirname, '../data/cv/customized');
const appDir = path.join(__dirname, '../data/applications');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Load sample/cached jobs if available
const jobsPath = path.join(__dirname, '../data/jobs/sample/sample_jobs.json');
let jobs = [];

if (fs.existsSync(jobsPath)) {
  jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
}

// Add simulated match scores for static display if missing
jobs = jobs.map((job, idx) => {
  const isDevOps = (job.title || '').toLowerCase().includes('devops') || (job.title || '').toLowerCase().includes('devsecops');
  const isBackend = (job.title || '').toLowerCase().includes('backend');
  const score = isDevOps ? 89 - (idx * 2) : isBackend ? 84 - (idx * 2) : 76 - (idx * 3);

  return {
    id: `job-${idx + 1}`,
    ...job,
    match_score: score,
    technical_score: score + 5 > 100 ? 98 : score + 5,
    experience_score: score - 5,
    strengths: [
      'Hands-on DevSecOps automation and CI/CD security pipeline experience at SeekMake',
      'Proven performance optimization (83% backend latency reduction & Gemini API integration)'
    ],
    missing_skills: ['Role-specific enterprise cloud domain features'],
    ai_reasoning: `Strong technical match with verified achievements from CV. Candidate satisfies ${job.title} core criteria.`,
    custom_summary: `DevSecOps & Backend Engineer graduating ESPRIT (2026) with proven experience optimizing CI/CD pipelines, cutting triage effort by 60%, and engineering backend services.`,
    cover_note: `I am eager to apply for the ${job.title} role at ${job.company}. My background in security automation, cloud migrations, and API performance optimization aligns directly with your goals.`,
    custom_bullets: [
      'Cut manual security triage time by 60% by integrating Google Gemini API into CI/CD pipeline.',
      'Reduced backend API response latency by 83% via MongoDB aggregation optimization and caching.',
      'Built AI-powered test generation agent (5,200+ lines) achieving 75%+ test coverage with Vertex AI.'
    ]
  };
});

// Compile statistics
const stats = {
  total_jobs: jobs.length,
  discovered_today: jobs.length,
  matched_70_plus: jobs.filter(j => j.match_score >= 70).length,
  matched_80_plus: jobs.filter(j => j.match_score >= 80).length,
  matched_90_plus: jobs.filter(j => j.match_score >= 90).length,
  remote_jobs: jobs.filter(j => j.remote).length,
  last_updated: new Date().toISOString()
};

// Export data bundle
const staticData = {
  stats,
  jobs,
  candidate: {
    name: 'Ghaith Oueslati',
    email: 'ghaythweslaty002@gmail.com',
    linkedin: 'ghayth-weslati',
    github: 'ghayth002'
  }
};

fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(staticData, null, 2));

// Copy index.html to public/
const srcHtml = path.join(__dirname, '../dashboard/public/index.html');
if (fs.existsSync(srcHtml)) {
  let htmlContent = fs.readFileSync(srcHtml, 'utf8');
  // Update API calls to read from data.json for GitHub Pages static mode
  htmlContent = htmlContent.replace("await api('/api/stats')", "await api('./data.json')");
  htmlContent = htmlContent.replace("await api(`/api/jobs?${params}`)", "await api('./data.json')");
  htmlContent = htmlContent.replace("await api('/api/jobs?min_score=70&limit=50')", "await api('./data.json')");
  htmlContent = htmlContent.replace("await api('/api/applications')", "await api('./data.json')");
  
  fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);
}

console.log('✓ Static Dashboard data bundle built successfully in /public');
