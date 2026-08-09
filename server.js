/**
 * CareerForge AI — Production Cloud API Server
 * 1-Click Deployable to Render.com / Vercel / Railway / Docker (100% FREE)
 * Handles multi-user live pipeline triggers, OpenRouter AI scoring, & SMTP auto-apply.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend GitHub Pages dashboard
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve static compiled dashboard & PDFs if requested
app.use(express.static(path.join(__dirname, 'public')));

// ── 1. Health Check Endpoint ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'CareerForge AI Cloud Orchestrator',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    env: {
      has_openrouter_key: !!process.env.OPENROUTER_API_KEY,
      has_smtp: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
    }
  });
});

// ── 2. Live Pipeline Trigger Endpoint ──────────────────────────────────────
app.post('/api/trigger', async (req, res) => {
  console.log('\n====================================================');
  console.log('🚀 API TRIGGER RECEIVED: Executing Cloud Job Pipeline');
  console.log('====================================================');

  const { openrouter_key, min_match_score = 70, max_jobs = 15 } = req.body || {};

  // Override API Key if provided by user in request
  if (openrouter_key) {
    process.env.OPENROUTER_API_KEY = openrouter_key;
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    // Step 1: Run Live Job Hunter Workflow Script
    console.log('[STEP 1] Running Cloud Job Hunter Engine...');
    const hunterOutput = execSync(`node scripts/cloud-job-hunter.js`, {
      encoding: 'utf8',
      env: { ...process.env, MIN_MATCH_SCORE: min_match_score, MAX_JOBS: max_jobs }
    });

    // Step 2: Rebuild Encrypted Dashboard Payload
    console.log('[STEP 2] Rebuilding Encrypted AES-256 Payload...');
    const buildOutput = execSync(`node scripts/build-static-dashboard.js`, {
      encoding: 'utf8',
      env: process.env
    });

    // Load generated summary stats
    let stats = {};
    const sampleJobsPath = path.join(__dirname, 'data', 'jobs', 'sample', 'sample_jobs.json');
    let jobsCount = 0;
    if (fs.existsSync(sampleJobsPath)) {
      const jobsData = JSON.parse(fs.readFileSync(sampleJobsPath, 'utf8'));
      jobsCount = jobsData.length;
    }

    return res.status(200).json({
      success: true,
      message: 'Autonomous AI Job Hunter pipeline executed successfully!',
      timestamp: new Date().toISOString(),
      jobs_discovered: jobsCount,
      logs: hunterOutput.split('\n').filter(l => l.trim()).slice(-15)
    });

  } catch (error) {
    console.error('❌ Cloud Pipeline Execution Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      stdout: error.stdout ? error.stdout.toString() : ''
    });
  }
});

// ── 3. Data Package Endpoint ───────────────────────────────────────────────
app.get('/api/data.enc', (req, res) => {
  const encPath = path.join(__dirname, 'public', 'data.enc');
  if (fs.existsSync(encPath)) {
    res.sendFile(encPath);
  } else {
    res.status(404).json({ error: 'data.enc payload not built yet' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CareerForge AI — Cloud API Node</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #060813; color: #F8FAFC; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: rgba(20,28,48,0.8); border: 1px solid rgba(0,240,255,0.3); border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 20px 50px rgba(0,240,255,0.2); max-width: 500px; }
        h1 { background: linear-gradient(135deg, #00F0FF, #A855F7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .badge { background: rgba(16,185,129,0.2); color: #10B981; border: 1px solid #10B981; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 0.8rem; display: inline-block; margin-bottom: 16px; }
        a { color: #00F0FF; text-decoration: none; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">● CLOUD API ONLINE</div>
        <h1>CareerForge AI Cloud Node</h1>
        <p>Autonomous AI Job Hunter & Multi-User Pipeline Orchestrator API is running live.</p>
        <p><a href="https://ghayth002.github.io/CareerForge-AI/" target="_blank">🚀 Open Live Dashboard →</a></p>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`⚡ CareerForge AI Cloud API Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🚀 Live Trigger API: POST http://localhost:${PORT}/api/trigger`);
  console.log(`====================================================\n`);
});
