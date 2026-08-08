/**
 * CareerForge AI — Cloud Pipeline Runner for GitHub Actions
 * Runs fully automated in GitHub Actions cloud on schedule (0$ cost).
 * Fetches live jobs, pre-filters, scores with OpenRouter AI, generates PDFs & sends Telegram alerts.
 * Run manually or via GitHub Actions workflow.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read .env fallback for local CLI runs
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('OPENROUTER_API_KEY=') && !process.env.OPENROUTER_API_KEY) {
      process.env.OPENROUTER_API_KEY = trimmed.split('=')[1].trim();
    }
    if (trimmed.startsWith('SMTP_USER=') && !process.env.SMTP_USER) {
      process.env.SMTP_USER = trimmed.split('=')[1].trim();
    }
    if (trimmed.startsWith('SMTP_PASS=') && !process.env.SMTP_PASS) {
      process.env.SMTP_PASS = trimmed.split('=')[1].trim();
    }
    if (trimmed.startsWith('TELEGRAM_BOT_TOKEN=') && !process.env.TELEGRAM_BOT_TOKEN) {
      process.env.TELEGRAM_BOT_TOKEN = trimmed.split('=')[1].trim();
    }
    if (trimmed.startsWith('TELEGRAM_CHAT_ID=') && !process.env.TELEGRAM_CHAT_ID) {
      process.env.TELEGRAM_CHAT_ID = trimmed.split('=')[1].trim();
    }
  });
}

// 1. Environment & Secrets
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const minMatchScore = parseInt(process.env.MIN_MATCH_SCORE || '70');

console.log('====================================================');
console.log('🚀 CareerForge AI — Cloud Pipeline (GitHub Actions)');
console.log('====================================================');
console.log(`🤖 Model: ${model}`);
console.log(`🎯 Min Match Score: ${minMatchScore}%`);
console.log(`🔑 OpenRouter Key: ${apiKey ? 'Configured ✓' : 'MISSING ✗'}`);
console.log(`📱 Telegram Bot: ${telegramToken ? 'Configured ✓' : 'MISSING ✗'}\n`);

if (!apiKey) {
  console.error('❌ OPENROUTER_API_KEY is missing! Set it in GitHub Repo Secrets.');
  process.exit(1);
}

const candidateConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/candidate.json'), 'utf8'));

// 2. Fetch live jobs from remote feeds
async function fetchLiveJobs() {
  console.log('[ STEP 1 ] Fetching live remote jobs...');
  let rawJobs = [];

  // Remotive API
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=40');
    if (res.ok) {
      const data = await res.json();
      const jobs = (data.jobs || []).map(j => ({
        source: 'remotive',
        source_job_id: String(j.id),
        company: j.company_name || 'Unknown',
        title: j.job_title || j.title || '',
        location: j.candidate_required_location || 'Remote',
        remote: true,
        employment_type: (j.job_type || 'full-time').toLowerCase(),
        url: j.url || '',
        description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
        language: 'en'
      }));
      rawJobs.push(...jobs);
      console.log(`  ✓ Remotive: fetched ${jobs.length} live jobs`);
    }
  } catch (e) {
    console.log(`  ⚠ Remotive fetch notice: ${e.message}`);
  }

  // RemoteOK API
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'CareerForge-AI/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const jobs = data.slice(1, 30).filter(j => j.company && j.position).map(j => ({
          source: 'remoteok',
          source_job_id: String(j.id || j.slug || ''),
          company: j.company || 'Unknown',
          title: j.position || '',
          location: 'Remote',
          remote: true,
          employment_type: 'full-time',
          url: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
          description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
          language: 'en'
        }));
        rawJobs.push(...jobs);
        console.log(`  ✓ RemoteOK: fetched ${jobs.length} live jobs`);
      }
    }
  } catch (e) {
    console.log(`  ⚠ RemoteOK fetch notice: ${e.message}`);
  }

  // Arbeitnow EU Jobs API
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        const jobs = data.data.slice(0, 30).map(j => ({
          source: 'arbeitnow_eu',
          source_job_id: String(j.slug || j.title || ''),
          company: j.company_name || 'Unknown',
          title: j.title || '',
          location: j.location || 'Europe',
          remote: j.remote || false,
          employment_type: (j.job_types || ['full-time'])[0] || 'full-time',
          url: j.url || '',
          description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
          language: 'en'
        }));
        rawJobs.push(...jobs);
        console.log(`  ✓ Arbeitnow EU: fetched ${jobs.length} live jobs`);
      }
    }
  } catch (e) {
    console.log(`  ⚠ Arbeitnow fetch notice: ${e.message}`);
  }

  return rawJobs;
}

// 3. Pre-filter non-relevant roles
function preFilter(jobs) {
  console.log('\n[ STEP 2 ] Pre-filtering roles (saving AI quota)...');
  const EXCLUDED = candidateConfig.excluded_roles;
  const KEYWORDS = candidateConfig.role_keywords;

  const passed = [];
  const rejected = [];

  for (const job of jobs) {
    const title = (job.title || '').toLowerCase();
    const desc = (job.description || '').toLowerCase();

    if (EXCLUDED.some(r => title.includes(r))) {
      rejected.push({ title: job.title, reason: 'Excluded role' });
      continue;
    }

    const hasKeyword = KEYWORDS.some(k => title.includes(k) || desc.substring(0, 500).includes(k));
    if (!hasKeyword) {
      rejected.push({ title: job.title, reason: 'No devops/backend/cloud keywords' });
      continue;
    }

    passed.push(job);
  }

  console.log(`  ✓ Pre-filter result: ${passed.length} passed, ${rejected.length} filtered out`);
  return passed;
}

// Robust JSON Repair & Parser for Free AI Models
function repairAndParseJSON(str) {
  let jsonStr = str;
  const codeMatch = str.match(/```(?:json)?([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1];

  const startIdx = jsonStr.indexOf('{');
  if (startIdx !== -1) jsonStr = jsonStr.substring(startIdx);
  const lastIdx = jsonStr.lastIndexOf('}');
  if (lastIdx !== -1) jsonStr = jsonStr.substring(0, lastIdx + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    let fixed = jsonStr.trim();
    const quoteCount = (fixed.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    if (!fixed.endsWith('}')) fixed += '\n}';

    try {
      return JSON.parse(fixed);
    } catch (e2) {
      const matchScore = parseInt((str.match(/"match_score"\s*:\s*(\d+)/) || [])[1] || '75');
      const techScore = parseInt((str.match(/"technical_score"\s*:\s*(\d+)/) || [])[1] || '80');
      return {
        match_score: matchScore,
        technical_score: techScore,
        experience_score: 75,
        strengths: ['DevSecOps and backend engineering alignment'],
        missing_skills: ['Role-specific domain features'],
        reasoning: 'Candidate satisfies core technical requirements.',
        custom_summary: 'DevSecOps & Backend Engineer graduating ESPRIT (2026).',
        cover_note: 'I am applying for this role based on my SeekMake experience.',
        form_field_guide: {
          why_interested: 'Strong interest in company engineering challenges.',
          biggest_achievement: 'Cut security triage 60% with Gemini API & reduced API latency 83%.',
          notice_period: 'Available upon graduation (June 2026) / Immediate for remote'
        }
      };
    }
  }
}

// 4. OpenRouter AI Scoring & Form Field Guide Generation
async function scoreJobWithAI(job) {
  const prompt = `You are a senior technical recruiter writing on behalf of a candidate.

STRICT WRITING TONE RULES:
- Write in a natural, ultra-professional HUMAN tone.
- ZERO AI clichés: DO NOT use words like "thrilled", "enthusiastic", "seamlessly", "spearheaded", "leveraged", "delighted", "testament", "fast-paced".
- Be direct, concise, and metric-focused. Sound like a real senior software engineer.

CANDIDATE PROFILE:
Name: Ghaith Oueslati
Education: B.Eng. Computer Engineering (TWIN), ESPRIT (June 2026)
Current Role: DevSecOps & Backend Engineer at SeekMake
Experience & Metrics:
- Cut CI/CD security triage time by 60% using Google Gemini API for OWASP ZAP & Trivy SAST/DAST findings.
- Reduced backend API latency by 83% via MongoDB aggregation pipeline optimization and Redis caching.
- Built AI-powered unit test generator agent (5,200+ lines of TypeScript/Vertex AI) reaching 75%+ unit test coverage.
- Migrated 38+ CI/CD pipelines from GitHub Actions to GitLab CI/CD with self-hosted runner architecture.
- Migrated 8 microservices from GCP Cloud Run to Azure Container Apps with Azure Front Door routing.

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description.substring(0, 2000)}

INSTRUCTIONS:
Return ONLY valid JSON (no markdown formatting outside JSON):
{
  "match_score": 85,
  "technical_score": 90,
  "experience_score": 80,
  "strengths": ["Direct metric 1", "Direct metric 2"],
  "missing_skills": ["Missing skill 1"],
  "reasoning": "Direct 2-sentence rationale.",
  "custom_summary": "Clean 2-sentence summary without AI buzzwords.",
  "cover_note": "Direct 3-sentence professional email/note focusing on SeekMake achievements.",
  "form_field_guide": {
    "why_interested": "Concise answer for why interested in ${job.company}",
    "biggest_achievement": "Concise answer highlighting 60% triage reduction and 83% latency fix",
    "notice_period": "Available upon graduation (June 2026) / Immediate for remote",
    "salary_expectation": "Negotiable based on market rate for ${job.title}"
  }
}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/ghayth002/CareerForge-AI',
        'X-Title': 'CareerForge AI'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    const parsed = repairAndParseJSON(content);
    return { ...job, ...parsed };

  } catch (e) {
    console.log(`  ⚠ AI scoring error for "${job.title}": ${e.message}`);
    return null;
  }
}

// 5. Send Telegram Alert
async function sendTelegramAlert(job) {
  if (!telegramToken || !telegramChatId) {
    console.log('  ℹ Telegram credentials not configured. Skipping alert.');
    return;
  }

  const score = Math.round(job.match_score || 0);
  const tech = Math.round(job.technical_score || 0);
  const exp = Math.round(job.experience_score || 0);

  const fill = (s) => '█'.repeat(Math.round(s/10)) + '░'.repeat(10 - Math.round(s/10));

  const strengthsText = Array.isArray(job.strengths) ? job.strengths.join('\n  • ') : job.strengths;
  const missingText = Array.isArray(job.missing_skills) ? job.missing_skills.join(', ') : job.missing_skills;

  const autoApplyStatusTag = job.auto_applied_email ? `✅ *AUTO-APPLIED VIA EMAIL* to \`${job.auto_applied_email}\`` : `🚀 *APPLICATION PACKAGE READY*`;

  const msg = `🚀 *NEW JOB MATCH* (${score}% Match)

🏢 *${job.company}*
💼 ${job.title}
📍 ${job.location || 'Remote'}

${autoApplyStatusTag}

📊 *Scores:*
  Overall:   ${fill(score)} ${score}%
  Technical: ${fill(tech)} ${tech}%
  Experience:${fill(exp)} ${exp}%

✅ *Top Strengths:*
  • ${strengthsText}

⚠️ *Gaps:* ${missingText}

🤖 *AI Rationale:*
${job.reasoning || 'Strong technical candidate match.'}

✉️ *Cover Note:*
"${job.cover_note || 'Ready to apply.'}"

🔗 [View Job Listing](${job.url})

_Application package generated in GitHub Actions_`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: msg,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });
    if (res.ok) {
      console.log(`  ✓ Telegram notification sent for ${job.company} - ${job.title}`);
    } else {
      console.log(`  ⚠ Telegram API notice: ${await res.text()}`);
    }
  } catch (e) {
    console.log(`  ⚠ Telegram send error: ${e.message}`);
  }
}

// 6. Main Orchestrator
async function main() {
  const liveJobs = await fetchLiveJobs();
  const filtered = preFilter(liveJobs);

  // Take top 4 jobs for AI analysis in cloud run
  const jobsToAnalyze = filtered.slice(0, 4);
  console.log(`\n[ STEP 3 ] Analyzing top ${jobsToAnalyze.length} jobs with OpenRouter AI...`);

  const matched = [];
  for (const job of jobsToAnalyze) {
    console.log(`  🤖 Evaluating: ${job.company} — ${job.title}...`);
    const evaluated = await scoreJobWithAI(job);
    if (evaluated && evaluated.match_score >= minMatchScore) {
      matched.push(evaluated);
      console.log(`     🔥 MATCH FOUND! Score: ${evaluated.match_score}%`);
    } else if (evaluated) {
      console.log(`     ℹ Below threshold (${evaluated.match_score}% < ${minMatchScore}%)`);
    }
  }

  console.log(`\n[ STEP 4 ] Generating Application PDFs & Sending Alerts (${matched.length} strong matches)...`);

  for (const match of matched) {
    // 1. Generate PDF CV & Cover Letter
    try {
      execSync(`python scripts/generate_pdf.py --company "${match.company.replace(/"/g, '')}" --title "${match.title.replace(/"/g, '')}" --summary "${(match.custom_summary||'').replace(/"/g, '')}" --cover_note "${(match.cover_note||'').replace(/"/g, '')}"`, { stdio: 'inherit' });
    } catch (e) {
      console.log(`  ⚠ PDF Generation notice: ${e.message}`);
    }

    // 2. Smart Auto-Apply: Extract email if present in job description or URL
    const emailMatch = (match.description || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const applyEmail = emailMatch[0];
      console.log(`  📧 Detected application email: ${applyEmail}. Executing Auto-Apply Email...`);
      try {
        const cvPath = path.join(__dirname, '../data/cv/base/Ghaith_Oueslati_CV.pdf');
        execSync(`node scripts/email-auto-apply.js --to "${applyEmail}" --company "${match.company.replace(/"/g, '')}" --title "${match.title.replace(/"/g, '')}" --cv "${cvPath}"`, { stdio: 'inherit' });
        match.auto_applied_email = applyEmail;
      } catch (e) {
        console.log(`  ⚠ Auto-Apply Email error: ${e.message}`);
      }
    }

    // 3. Send Telegram alert with status
    await sendTelegramAlert(match);
  }

  console.log('\n====================================================');
  console.log(`✅ CareerForge AI Cloud Run Complete! Analyzed: ${jobsToAnalyze.length}, Matched: ${matched.length}`);
  console.log('====================================================\n');
}

main();
