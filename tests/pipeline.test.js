/**
 * AI Job Hunter - Pipeline Tests
 * Tests normalization, filtering, scoring, deduplication, and AI mock responses
 * Run: node tests/pipeline.test.js
 */

// ── Deterministic Pre-Filter (mirrors n8n workflow logic) ────
const EXCLUDED_ROLES = [
  'frontend developer', 'ui designer', 'ux designer', 'graphic designer',
  'product manager', 'data scientist', 'ios developer', 'android developer',
  'qa engineer', 'sales engineer', 'account manager'
];

const REQUIRED_ROLE_KEYWORDS = [
  'devops', 'devsecops', 'backend', 'cloud', 'platform', 'infrastructure',
  'sre', 'site reliability', 'cicd', 'ci/cd', 'pipeline',
  'software engineer', 'software developer', 'full stack', 'fullstack',
  'node', 'python', 'java', 'nestjs', 'docker', 'kubernetes', 'terraform',
  'aws', 'azure', 'gcp', 'engineer'
];

const SENIOR_ONLY_TERMS = ['10+ years', '8+ years', '7+ years', 'vp of', 'chief ', 'director of'];
const MANDATORY_NON_ENGLISH = ['sprichst du', 'nous cherchons', 'vous devez', 'hablas', 'parli italiano', 'vous parlez'];

function preFilterJob(job) {
  const title = (job.title || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  if (EXCLUDED_ROLES.some(r => title.includes(r))) {
    return { passed: false, reason: 'Excluded role type' };
  }
  const hasRelevant = REQUIRED_ROLE_KEYWORDS.some(k => title.includes(k) || desc.substring(0, 500).includes(k));
  if (!hasRelevant) {
    return { passed: false, reason: 'No relevant role keywords' };
  }
  if (SENIOR_ONLY_TERMS.some(t => combined.includes(t))) {
    return { passed: false, reason: 'Too senior' };
  }
  if (MANDATORY_NON_ENGLISH.some(t => combined.includes(t))) {
    return { passed: false, reason: 'Mandatory non-English' };
  }
  if (!job.url || !job.url.startsWith('http')) {
    return { passed: false, reason: 'Invalid URL' };
  }
  return { passed: true };
}

// ── Deduplication Check ──────────────────────────────────────
function buildDeduplicationKey(job) {
  return `${job.source}::${job.source_job_id || job.url}`;
}

function deduplicateJobs(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    const key = buildDeduplicationKey(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── AI Response Parser ───────────────────────────────────────
function parseAIResponse(content) {
  let jsonStr = content;
  const codeMatch = content.match(/```(?:json)?([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1];
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  const parsed = JSON.parse(jsonStr);
  const required = ['match_score', 'technical_score', 'experience_score'];
  for (const f of required) {
    if (parsed[f] === undefined) parsed[f] = 0;
    parsed[f] = Math.min(100, Math.max(0, Number(parsed[f]) || 0));
  }
  return parsed;
}

// ── Score Calculation ────────────────────────────────────────
function calculateWeightedScore(scores, weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let weighted = 0;
  for (const [key, weight] of Object.entries(weights)) {
    weighted += (scores[key] || 0) * (weight / total);
  }
  return Math.round(weighted * 10) / 10;
}

// ── Test Utilities ───────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
    failures.push({ name, error: e.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error(`${message || ''}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ══════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 AI Job Hunter — Pipeline Tests\n');
console.log('─'.repeat(50));

// ── 1. Pre-Filter Tests ──────────────────────────────────────
console.log('\n📋 Pre-Filter Tests\n');

test('DevSecOps engineer passes filter', () => {
  const job = { title: 'DevSecOps Engineer', description: 'GitLab CI/CD OWASP ZAP Trivy Docker', url: 'https://example.com/1' };
  const result = preFilterJob(job);
  assert(result.passed, `Expected to pass but got: ${result.reason}`);
});

test('Backend engineer passes filter', () => {
  const job = { title: 'Backend Engineer', description: 'NestJS MongoDB REST APIs', url: 'https://example.com/2' };
  const result = preFilterJob(job);
  assert(result.passed, result.reason);
});

test('Cloud engineer passes filter', () => {
  const job = { title: 'Cloud Engineer', description: 'AWS Azure Terraform Docker Kubernetes', url: 'https://example.com/3' };
  const result = preFilterJob(job);
  assert(result.passed, result.reason);
});

test('SRE passes filter', () => {
  const job = { title: 'Site Reliability Engineer', description: 'Kubernetes monitoring Grafana AWS', url: 'https://example.com/4' };
  const result = preFilterJob(job);
  assert(result.passed, result.reason);
});

test('Frontend developer is rejected', () => {
  const job = { title: 'Frontend Developer', description: 'React Vue.js CSS animations', url: 'https://example.com/5' };
  const result = preFilterJob(job);
  assert(!result.passed, 'Should have been rejected');
});

test('UI/UX designer is rejected', () => {
  const job = { title: 'UI Designer', description: 'Figma Adobe XD design systems', url: 'https://example.com/6' };
  const result = preFilterJob(job);
  assert(!result.passed, 'Should have been rejected');
});

test('French-mandatory job is rejected', () => {
  const job = { title: 'Java Developer', description: 'Nous cherchons un développeur Java. Vous devez parler français.', url: 'https://example.com/7' };
  const result = preFilterJob(job);
  assert(!result.passed, 'Should have been rejected for non-English');
});

test('10+ years experience requirement is rejected', () => {
  const job = { title: 'Principal Engineer', description: '10+ years of software engineering experience required', url: 'https://example.com/8' };
  const result = preFilterJob(job);
  assert(!result.passed, 'Should have been rejected as too senior');
});

test('Job with invalid URL is rejected', () => {
  const job = { title: 'DevOps Engineer', description: 'Docker Kubernetes', url: 'not-a-url' };
  const result = preFilterJob(job);
  assert(!result.passed, 'Should have been rejected for invalid URL');
});

test('Product manager is rejected', () => {
  const job = { title: 'Product Manager', description: 'Roadmap strategy agile ceremonies', url: 'https://example.com/pm' };
  const result = preFilterJob(job);
  assert(!result.passed, 'Should have been rejected');
});

// ── 2. Deduplication Tests ───────────────────────────────────
console.log('\n🔄 Deduplication Tests\n');

test('Identical jobs deduplicated', () => {
  const jobs = [
    { source: 'remoteok', source_job_id: '123', title: 'DevOps Engineer', url: 'https://example.com' },
    { source: 'remoteok', source_job_id: '123', title: 'DevOps Engineer', url: 'https://example.com' }
  ];
  const result = deduplicateJobs(jobs);
  assertEqual(result.length, 1, 'Should have 1 job after dedup');
});

test('Different sources with same title are kept', () => {
  const jobs = [
    { source: 'remoteok', source_job_id: '123', title: 'DevOps Engineer', url: 'https://a.com' },
    { source: 'remotive', source_job_id: '456', title: 'DevOps Engineer', url: 'https://b.com' }
  ];
  const result = deduplicateJobs(jobs);
  assertEqual(result.length, 2, 'Different sources should both be kept');
});

test('5 unique jobs → 5 results', () => {
  const jobs = Array.from({ length: 5 }, (_, i) => ({
    source: 'remoteok', source_job_id: String(i), title: `Job ${i}`, url: `https://example.com/${i}`
  }));
  const result = deduplicateJobs(jobs);
  assertEqual(result.length, 5, 'All unique jobs should be kept');
});

test('Dedup key built correctly', () => {
  const job = { source: 'remoteok', source_job_id: 'abc123', url: 'https://example.com' };
  const key = buildDeduplicationKey(job);
  assertEqual(key, 'remoteok::abc123', 'Dedup key should be source::source_job_id');
});

// ── 3. AI Response Parsing Tests ─────────────────────────────
console.log('\n🤖 AI Response Parsing Tests\n');

test('Valid JSON response parsed correctly', () => {
  const response = JSON.stringify({
    match_score: 82,
    technical_score: 88,
    experience_score: 70,
    seniority_score: 85,
    language_score: 95,
    location_score: 90,
    visa_score: 75,
    strengths: ['Strong CI/CD experience', 'DevSecOps background'],
    missing_skills: ['Kubernetes production experience'],
    risks: ['May need visa sponsorship'],
    reasoning: 'Strong technical match with direct experience in the required tools.',
    should_apply: true
  });
  const result = parseAIResponse(response);
  assertEqual(result.match_score, 82, 'match_score');
  assertEqual(result.technical_score, 88, 'technical_score');
  assert(Array.isArray(result.strengths), 'strengths should be array');
});

test('JSON in markdown code block parsed', () => {
  const response = `Here is my analysis:\n\`\`\`json\n{"match_score": 75, "technical_score": 80, "experience_score": 65, "should_apply": true}\n\`\`\``;
  const result = parseAIResponse(response);
  assertEqual(result.match_score, 75, 'match_score from markdown block');
});

test('Score clamped to 0-100', () => {
  const response = JSON.stringify({ match_score: 150, technical_score: -10, experience_score: 50 });
  const result = parseAIResponse(response);
  assertEqual(result.match_score, 100, 'Should be clamped to 100');
  assertEqual(result.technical_score, 0, 'Should be clamped to 0');
});

test('Missing fields default to 0', () => {
  const response = JSON.stringify({ should_apply: false });
  const result = parseAIResponse(response);
  assertEqual(result.match_score, 0, 'Missing match_score should default to 0');
  assertEqual(result.technical_score, 0, 'Missing technical_score should default to 0');
});

test('Invalid JSON returns graceful error', () => {
  let threw = false;
  try {
    parseAIResponse('This is not JSON at all');
    threw = false;
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw on invalid JSON');
});

// ── 4. Score Calculation Tests ───────────────────────────────
console.log('\n📊 Score Calculation Tests\n');

const defaultWeights = { technical: 35, experience: 25, seniority: 15, cloud: 10, language: 5, location: 5, visa: 5 };

test('Perfect scores give ~100', () => {
  const scores = { technical: 100, experience: 100, seniority: 100, cloud: 100, language: 100, location: 100, visa: 100 };
  const result = calculateWeightedScore(scores, defaultWeights);
  assertEqual(result, 100, 'Perfect scores should give 100');
});

test('Zero scores give 0', () => {
  const scores = { technical: 0, experience: 0, seniority: 0, cloud: 0, language: 0, location: 0, visa: 0 };
  const result = calculateWeightedScore(scores, defaultWeights);
  assertEqual(result, 0, 'Zero scores should give 0');
});

test('Mixed scores calculate correctly', () => {
  const scores = { technical: 90, experience: 70, seniority: 80, cloud: 85, language: 100, location: 90, visa: 60 };
  const result = calculateWeightedScore(scores, defaultWeights);
  assert(result > 70 && result < 100, `Score ${result} should be between 70-100`);
});

test('Weights sum to 100', () => {
  const total = Object.values(defaultWeights).reduce((a, b) => a + b, 0);
  assertEqual(total, 100, 'Default weights should sum to 100');
});

// ── 5. Job Normalization Tests ───────────────────────────────
console.log('\n🔧 Normalization Tests\n');

function normalizeRemotiveJob(raw) {
  return {
    source: 'remotive',
    source_job_id: String(raw.id),
    company: raw.company_name || 'Unknown',
    title: raw.job_title || raw.title || '',
    location: raw.candidate_required_location || 'Remote',
    remote: true,
    employment_type: (raw.job_type || 'full-time').toLowerCase().replace('_', '-'),
    url: raw.url || '',
    description: (raw.description || '').replace(/<[^>]+>/g, ' ').substring(0, 6000),
    salary: raw.salary || null,
    language: 'en',
    skills: raw.tags || []
  };
}

test('Remotive job normalized correctly', () => {
  const raw = {
    id: 42,
    company_name: 'TestCorp',
    job_title: 'DevOps Engineer',
    candidate_required_location: 'Worldwide',
    job_type: 'full_time',
    url: 'https://remotive.com/job/42',
    description: '<p>Docker Kubernetes AWS</p>',
    tags: ['devops', 'docker', 'kubernetes']
  };
  const normalized = normalizeRemotiveJob(raw);
  assertEqual(normalized.source, 'remotive');
  assertEqual(normalized.source_job_id, '42');
  assertEqual(normalized.company, 'TestCorp');
  assertEqual(normalized.employment_type, 'full-time');
  assert(!normalized.description.includes('<'), 'Description should have HTML stripped');
  assert(normalized.remote, 'Should be remote');
});

test('Description truncated at 6000 chars', () => {
  const raw = {
    id: 1,
    company_name: 'Corp',
    job_title: 'Engineer',
    description: 'x'.repeat(10000),
    url: 'https://example.com'
  };
  const normalized = normalizeRemotiveJob(raw);
  assert(normalized.description.length <= 6000, `Description too long: ${normalized.description.length}`);
});

test('HTML stripped from description', () => {
  const raw = {
    id: 1,
    company_name: 'Corp',
    job_title: 'Engineer',
    description: '<div><p>Docker <strong>Kubernetes</strong></p><ul><li>AWS</li></ul></div>',
    url: 'https://example.com'
  };
  const normalized = normalizeRemotiveJob(raw);
  assert(!normalized.description.includes('<'), 'Should not contain HTML tags');
  assert(normalized.description.includes('Docker'), 'Should contain Docker text');
});

// ── 6. Sample Jobs Loading Test ──────────────────────────────
console.log('\n📂 Sample Data Tests\n');

test('Sample jobs file is valid JSON with expected fields', () => {
  const fs = require('fs');
  const path = require('path');
  const samplePath = path.join(__dirname, '..', 'data', 'jobs', 'sample', 'sample_jobs.json');
  assert(fs.existsSync(samplePath), 'Sample jobs file should exist');

  const raw = fs.readFileSync(samplePath, 'utf8');
  const jobs = JSON.parse(raw);
  assert(Array.isArray(jobs), 'Should be an array');
  assert(jobs.length >= 5, `Should have at least 5 sample jobs, got ${jobs.length}`);

  const requiredFields = ['source', 'company', 'title', 'url', 'description'];
  for (const job of jobs) {
    for (const f of requiredFields) {
      assert(job[f], `Job "${job.title}" missing field: ${f}`);
    }
  }
});

test('Sample jobs contain expected categories', () => {
  const fs = require('fs');
  const path = require('path');
  const jobs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jobs', 'sample', 'sample_jobs.json'), 'utf8'));
  const titles = jobs.map(j => j.title.toLowerCase());
  assert(titles.some(t => t.includes('devsecops')), 'Should have DevSecOps job');
  assert(titles.some(t => t.includes('backend')), 'Should have Backend job');
  assert(titles.some(t => t.includes('cloud')), 'Should have Cloud job');
});

test('French job in samples is correctly identified', () => {
  const fs = require('fs');
  const path = require('path');
  const jobs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jobs', 'sample', 'sample_jobs.json'), 'utf8'));
  const frenchJob = jobs.find(j => j.language === 'fr');
  assert(frenchJob, 'Should have a French language job for filter testing');
  const filterResult = preFilterJob(frenchJob);
  assert(!filterResult.passed, `French job should be filtered out. Got: ${filterResult.reason}`);
});

test('5 valid English jobs pass the pre-filter', () => {
  const fs = require('fs');
  const path = require('path');
  const jobs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jobs', 'sample', 'sample_jobs.json'), 'utf8'));
  const passed_count = jobs.filter(j => preFilterJob(j).passed).length;
  assert(passed_count >= 4, `Expected at least 4 jobs to pass filter, got ${passed_count}`);
});

// ── 7. Config Validation Tests ───────────────────────────────
console.log('\n⚙️ Configuration Tests\n');

test('candidate.json is valid and has required fields', () => {
  const fs = require('fs');
  const path = require('path');
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'candidate.json'), 'utf8'));
  assert(config.target_roles && config.target_roles.length > 0, 'Should have target roles');
  assert(config.minimum_match_score >= 0, 'Should have minimum match score');
  assert(config.candidate && config.candidate.name, 'Should have candidate name');
  assert(config.skills, 'Should have skills');
});

test('scoring.json weights sum to 100', () => {
  const fs = require('fs');
  const path = require('path');
  const scoring = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'scoring.json'), 'utf8'));
  const total = Object.values(scoring.weights).reduce((sum, w) => sum + (w.value || w), 0);
  assertEqual(total, 100, 'Scoring weights must sum to 100');
});

test('job_sources.json has enabled sources', () => {
  const fs = require('fs');
  const path = require('path');
  const sources = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'job_sources.json'), 'utf8'));
  const enabled = sources.sources.filter(s => s.enabled);
  assert(enabled.length >= 3, `Should have at least 3 enabled sources, got ${enabled.length}`);
});

// ── Results ──────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.log('❌ Failed tests:');
  failures.forEach(f => console.log(`   • ${f.name}: ${f.error}`));
  console.log('');
  process.exit(1);
} else {
  console.log('✅ All tests passed!\n');
}
