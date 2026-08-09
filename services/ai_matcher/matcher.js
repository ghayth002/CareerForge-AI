/**
 * SaaS AI Matcher Module — Candidate-to-Job Fit Evaluator
 * Leverages OpenRouter API & Google Gemini for candidate fit scoring.
 */

const fs = require('fs');
const path = require('path');

async function evaluateJobMatch(candidateProfile, job, apiKey, model = 'openrouter/free') {
  if (!apiKey) return null;

  const prompt = `Evaluate candidate fit for this job posting.

CANDIDATE PROFILE:
Name: ${candidateProfile.name || 'Ghaith Oueslati'}
Title: DevSecOps & Backend Engineer
Facts:
- Cut CI/CD security triage time 60% with Gemini API + OWASP ZAP/Trivy
- Reduced backend API latency 83% via MongoDB aggregation optimization & Redis caching
- Built AI test generation agent (5,200+ lines) achieving 75%+ unit test coverage
- Migrated 38+ CI/CD workflows GitHub Actions -> GitLab CI/CD
- Migrated 8/12 microservices GCP -> Azure Container Apps

TARGET JOB:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Description: ${(job.description || '').substring(0, 1500)}

RETURN ONLY VALID JSON:
{
  "match_score": 85,
  "technical_score": 90,
  "experience_score": 80,
  "strengths": ["DevSecOps automation", "API latency optimization"],
  "missing_skills": ["Role-specific cloud tools"],
  "ai_reasoning": "Direct fit for DevSecOps & backend goals",
  "custom_summary": "DevSecOps Engineer with hands-on CI/CD security and API optimization background.",
  "cover_note": "I am eager to apply for the ${job.title} role at ${job.company}.",
  "form_field_guide": {
    "why_interested": "Impression of engineering challenge at ${job.company}.",
    "biggest_achievement": "Cut security triage by 60% and backend latency by 83%."
  }
}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ghayth002.github.io/CareerForge-AI/'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.choices[0].message.content.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { ...job, ...parsed };
      }
    }
  } catch (e) {
    console.log(`  ⚠ AI Scoring notice for ${job.title}: ${e.message}`);
  }

  return null;
}

module.exports = { evaluateJobMatch };
