// ============================================================
// AI Job Hunter - Dashboard Server
// Lightweight Express API + serves static frontend
// ============================================================
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// ── Database ─────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ai_job_hunter',
  user: process.env.POSTGRES_USER || 'jobhunter',
  password: process.env.POSTGRES_PASSWORD || 'changeme',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: e.message });
  }
});

// ── API: Dashboard Stats ──────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) AS total_jobs,
        COUNT(*) FILTER (WHERE discovered_at::date = CURRENT_DATE) AS discovered_today,
        COUNT(*) FILTER (WHERE match_score >= 70) AS matched_70_plus,
        COUNT(*) FILTER (WHERE match_score >= 80) AS matched_80_plus,
        COUNT(*) FILTER (WHERE match_score >= 90) AS matched_90_plus,
        COUNT(*) FILTER (WHERE remote = true) AS remote_jobs,
        COUNT(*) FILTER (WHERE ai_analyzed = true) AS ai_analyzed,
        ROUND(AVG(match_score) FILTER (WHERE match_score > 0), 1) AS avg_score
      FROM jobs
    `;
    
    const appQuery = `
      SELECT
        COUNT(*) AS total_applications,
        COUNT(*) FILTER (WHERE status = 'READY') AS ready,
        COUNT(*) FILTER (WHERE status = 'APPLIED') AS applied,
        COUNT(*) FILTER (WHERE status = 'INTERVIEW') AS interviews,
        COUNT(*) FILTER (WHERE status = 'REJECTED_AFTER_APPLICATION') AS rejected
      FROM applications
    `;
    
    const aiQuery = `
      SELECT requests_made, requests_limit 
      FROM ai_usage 
      WHERE date = CURRENT_DATE
      LIMIT 1
    `;

    const [statsResult, appResult, aiResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(appQuery),
      pool.query(aiQuery),
    ]);

    res.json({
      jobs: statsResult.rows[0],
      applications: appResult.rows[0],
      ai_usage: aiResult.rows[0] || { requests_made: 0, requests_limit: 50 },
    });
  } catch (e) {
    console.error('Stats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── API: Job List ─────────────────────────────────────────────
app.get('/api/jobs', async (req, res) => {
  try {
    const {
      min_score = 0,
      status = '',
      remote = '',
      source = '',
      limit = 50,
      offset = 0,
      order = 'match_score',
    } = req.query;

    const conditions = [];
    const params = [];
    let pi = 1;

    if (min_score > 0) {
      conditions.push(`j.match_score >= $${pi++}`);
      params.push(parseFloat(min_score));
    }
    if (status) {
      conditions.push(`j.status = $${pi++}`);
      params.push(status);
    }
    if (remote === 'true') {
      conditions.push(`j.remote = true`);
    }
    if (source) {
      conditions.push(`j.source = $${pi++}`);
      params.push(source);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = order === 'discovered_at' ? 'j.discovered_at DESC' : 'j.match_score DESC, j.discovered_at DESC';

    const query = `
      SELECT
        j.id, j.source, j.company, j.title, j.location, j.remote,
        j.employment_type, j.url, j.salary, j.posted_at, j.discovered_at,
        j.match_score, j.technical_score, j.experience_score,
        j.seniority_score, j.location_score, j.visa_score,
        j.strengths, j.missing_skills, j.risks, j.ai_reasoning,
        j.status, j.ai_analyzed, j.skills,
        a.id as application_id, a.status as application_status,
        a.cover_note, a.custom_summary
      FROM jobs j
      LEFT JOIN applications a ON a.job_id = j.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${pi++} OFFSET $${pi++}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const countQuery = `SELECT COUNT(*) FROM jobs j ${where}`;
    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    res.json({
      jobs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (e) {
    console.error('Jobs error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── API: Single Job ───────────────────────────────────────────
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.*, a.custom_summary, a.custom_bullets, a.skills_ordering,
             a.cover_note, a.status as application_status,
             a.cv_markdown_path, a.applied_at, a.notes
      FROM jobs j
      LEFT JOIN applications a ON a.job_id = j.id
      WHERE j.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Update Job Status ────────────────────────────────────
app.patch('/api/jobs/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['DISCOVERED', 'ANALYZING', 'MATCHED', 'REJECTED',
                          'READY', 'REVIEWED', 'APPLIED', 'INTERVIEW',
                          'REJECTED_AFTER_APPLICATION', 'SKIPPED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    await pool.query(
      'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, req.params.id]
    );

    if (notes) {
      await pool.query(
        `INSERT INTO applications (job_id, status, notes)
         VALUES ($1, $2, $3)
         ON CONFLICT (job_id) DO UPDATE SET notes = $3, updated_at = NOW()`,
        [req.params.id, status, notes]
      );
    }

    if (status === 'APPLIED') {
      await pool.query(
        `UPDATE applications SET status = 'APPLIED', applied_at = NOW(), updated_at = NOW()
         WHERE job_id = $1`,
        [req.params.id]
      );
    }

    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Applications ─────────────────────────────────────────
app.get('/api/applications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, j.company, j.title, j.location, j.remote, j.url,
             j.match_score, j.strengths, j.missing_skills
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      ORDER BY a.match_score DESC, a.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Pipeline Logs ────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM pipeline_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Serve frontend for all other routes ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Job Hunter Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 Connected to PostgreSQL at ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`);
});

module.exports = app;
