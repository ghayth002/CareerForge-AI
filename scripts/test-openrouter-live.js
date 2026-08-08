/**
 * Live OpenRouter Free Model Test
 * Tests API key authentication and response parsing from OpenRouter free model.
 * Run: node scripts/test-openrouter-live.js
 */

const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.join(__dirname, '../.env');
let apiKey = '';
let model = 'meta-llama/llama-3.1-8b-instruct:free';
let baseUrl = 'https://openrouter.ai/api/v1';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('OPENROUTER_API_KEY=')) apiKey = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('OPENROUTER_MODEL=')) model = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('OPENROUTER_BASE_URL=')) baseUrl = trimmed.split('=')[1].trim();
  });
}

console.log('====================================================');
console.log('🤖 Testing Live OpenRouter Integration');
console.log('====================================================');
console.log(`🔑 Key: ${apiKey ? apiKey.substring(0, 15) + '...' : 'NOT FOUND'}`);
console.log(`🤖 Model: ${model}`);
console.log(`🌐 Base URL: ${baseUrl}\n`);

if (!apiKey || apiKey.includes('your_openrouter_api_key_here')) {
  console.error('❌ OpenRouter API key is missing or invalid in .env!');
  process.exit(1);
}

const promptText = `You are a senior technical recruiter. Compare the candidate against this job. Return ONLY JSON.

CANDIDATE:
Name: Ghaith Oueslati
Role: DevSecOps & Backend Engineer (ESPRIT 2026)
Skills: Docker, Terraform, GitLab CI/CD, GitHub Actions, AWS, Azure, NestJS, Python, OWASP ZAP, Trivy, MongoDB, PostgreSQL
Achievements: Cut security triage 60% with Gemini API in CI/CD, reduced API latency 83% via MongoDB optimization, built AI test agent (5200+ lines).

JOB:
Title: DevSecOps Engineer
Company: TechCorp Berlin
Requirements: GitLab CI/CD, Docker, SAST/DAST tooling (OWASP ZAP/Trivy), Python, Azure.

Return ONLY this JSON format:
{
  "match_score": 85,
  "technical_score": 90,
  "experience_score": 80,
  "strengths": ["..."],
  "missing_skills": ["..."],
  "reasoning": "..."
}`;

async function testOpenRouter() {
  try {
    console.log('Sending request to OpenRouter API (Free Model)...');

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/ghayth002/ai-job-hunter',
        'X-Title': 'AI Job Hunter'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: promptText }],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log('\n✅ Response Received from OpenRouter!');
    console.log('----------------------------------------------------');
    const content = data.choices?.[0]?.message?.content || '';
    console.log(content);
    console.log('----------------------------------------------------');
    console.log(`📊 Tokens Used: ${data.usage?.total_tokens || 'N/A'}`);
    console.log('\n✨ Live OpenRouter test SUCCESSFUL!\n');

  } catch (e) {
    console.error('\n❌ Primary Model Test Failed:', e.message);
    console.log('\nTrying fallback free model: mistralai/mistral-7b-instruct:free ...');
    
    try {
      const fallbackModel = 'mistralai/mistral-7b-instruct:free';
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/ghayth002/ai-job-hunter',
          'X-Title': 'AI Job Hunter'
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.1,
          max_tokens: 500
        })
      });

      if (!res.ok) throw new Error(`Fallback HTTP ${res.status}: ${await res.text()}`);

      const data = await res.json();
      console.log('\n✅ Fallback Response Received!');
      console.log('----------------------------------------------------');
      console.log(data.choices?.[0]?.message?.content || '');
      console.log('----------------------------------------------------');
      console.log('✨ Fallback OpenRouter test SUCCESSFUL!\n');
    } catch (err2) {
      console.error('❌ Fallback model also failed:', err2.message);
    }
  }
}

testOpenRouter();
