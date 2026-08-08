/**
 * Local End-to-End Pipeline Execution Test
 * Simulates full discovery, pre-filtering, deduplication, AI scoring, application package creation, and output.
 * Run with: node scripts/test-pipeline-runner.js
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🎯 AI Job Hunter — Local Pipeline Runner Test');
console.log('====================================================\n');

// 1. Load Configurations
const candidateConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/candidate.json'), 'utf8'));
const scoringConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/scoring.json'), 'utf8'));
const sampleJobs = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/jobs/sample/sample_jobs.json'), 'utf8'));

console.log(`👤 Candidate: ${candidateConfig.candidate.name}`);
console.log(`🎯 Target Roles: ${candidateConfig.target_roles.slice(0, 4).join(', ')}...`);
console.log(`📊 Minimum Match Score: ${candidateConfig.minimum_match_score}%\n`);

// 2. Pre-Filtering Phase
console.log('[ PHASE 1: DISCOVERY & PRE-FILTERING ]');
console.log(`Received ${sampleJobs.length} raw jobs for processing.`);

const EXCLUDED_ROLES = candidateConfig.excluded_roles;
const REQUIRED_KEYWORDS = candidateConfig.role_keywords;

const passedJobs = [];
const rejectedJobs = [];

for (const job of sampleJobs) {
  const title = (job.title || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  
  if (EXCLUDED_ROLES.some(r => title.includes(r))) {
    rejectedJobs.push({ title: job.title, reason: 'Excluded role type' });
    continue;
  }
  
  const hasKeyword = REQUIRED_KEYWORDS.some(k => title.includes(k) || desc.substring(0, 500).includes(k));
  if (!hasKeyword) {
    rejectedJobs.push({ title: job.title, reason: 'No matching keywords' });
    continue;
  }
  
  if (job.language !== 'en' && candidateConfig.english_required) {
    rejectedJobs.push({ title: job.title, reason: 'Non-English job description' });
    continue;
  }
  
  passedJobs.push(job);
}

console.log(`✅ Passed Pre-Filter: ${passedJobs.length} jobs`);
console.log(`❌ Filtered Out: ${rejectedJobs.length} jobs`);
rejectedJobs.forEach(r => console.log(`   - "${r.title}": ${r.reason}`));

// 3. AI Analysis & Scoring Simulation
console.log('\n[ PHASE 2: AI MATCHING & SCORING ]');

const analyzedJobs = passedJobs.map(job => {
  let techScore = 85;
  let expScore = 75;
  let seniorityScore = 80;
  let locationScore = job.remote ? 95 : 70;
  let visaScore = 80;
  let strengths = [];
  let missingSkills = [];

  const titleLower = job.title.toLowerCase();

  if (titleLower.includes('devsecops')) {
    techScore = 95;
    expScore = 90;
    strengths = [
      'Direct hands-on experience integrating Gemini API into CI/CD for OWASP ZAP & Trivy SAST/DAST triage at SeekMake',
      'Strong proficiency with GitLab CI/CD, GitHub Actions, Docker, and Terraform'
    ];
    missingSkills = ['Kubernetes enterprise production administration'];
  } else if (titleLower.includes('backend')) {
    techScore = 90;
    expScore = 85;
    strengths = [
      'Proven 83% backend latency reduction via MongoDB aggregation pipeline optimization & caching',
      'NestJS, Node.js, Spring Boot, and REST API development experience'
    ];
    missingSkills = ['Kafka event streaming'];
  } else if (titleLower.includes('cloud')) {
    techScore = 92;
    expScore = 80;
    strengths = [
      'Migration experience from GCP Cloud Run to Azure Container Apps & Azure Front Door',
      'AWS Lambda & EC2 automated self-hosted runner infrastructure using Terraform'
    ];
    missingSkills = ['GCP Kubernetes Engine (GKE)'];
  } else {
    techScore = 78;
    expScore = 70;
    strengths = ['Solid CS fundamentals from ESPRIT', 'Agile team experience with 88% PR approval rate'];
    missingSkills = ['Senior platform leadership'];
  }

  // Calculate weighted score
  const matchScore = Math.round(
    techScore * 0.35 +
    expScore * 0.25 +
    seniorityScore * 0.15 +
    locationScore * 0.10 +
    visaScore * 0.15
  );

  return {
    ...job,
    match_score: matchScore,
    technical_score: techScore,
    experience_score: expScore,
    strengths,
    missing_skills: missingSkills
  };
});

analyzedJobs.sort((a, b) => b.match_score - a.match_score);

analyzedJobs.forEach(job => {
  const badge = job.match_score >= 80 ? '🔥 HIGH MATCH' : '✅ GOOD MATCH';
  console.log(`\n  ${badge} [${job.match_score}%] ${job.company} — ${job.title}`);
  console.log(`     Location: ${job.location} (Remote: ${job.remote})`);
  console.log(`     Technical: ${job.technical_score}% | Experience: ${job.experience_score}%`);
  console.log(`     Strengths: ${job.strengths[0]}`);
});

// 4. Application Generation
console.log('\n[ PHASE 3: APPLICATION PACKAGE GENERATION ]');
const topMatches = analyzedJobs.filter(j => j.match_score >= candidateConfig.minimum_match_score);

console.log(`Preparing ${topMatches.length} application packages...`);

topMatches.forEach((job, index) => {
  const summary = `DevSecOps & Backend Engineer graduating from ESPRIT (2026) with proven experience optimizing CI/CD security pipelines, cutting triage time by 60%, and engineering AI-driven backend services. Target match for ${job.title} at ${job.company}.`;
  
  const coverNote = `I am writing to express my strong interest in the ${job.title} position at ${job.company}. With hands-on experience reducing backend latency by 83% and building AI test generation tooling in production environments at SeekMake, I am confident in adding immediate value to your team.`;

  console.log(`\n📦 Application Package #${index + 1}: ${job.company} - ${job.title}`);
  console.log(`   Summary: ${summary.substring(0, 110)}...`);
  console.log(`   Cover Note: "${coverNote}"`);
});

// 5. Telegram Alert Preview
console.log('\n[ PHASE 4: TELEGRAM NOTIFICATION PREVIEW ]');
const topJob = topMatches[0];
const telegramPreview = `🚀 NEW JOB MATCH

Company: ${topJob.company}
Role: ${topJob.title}
Location: ${topJob.location}
Match: ${topJob.match_score}%

Technical: ${topJob.technical_score}%
Experience: ${topJob.experience_score}%

Why this matches:
• ${topJob.strengths.join('\n• ')}

Missing: ${topJob.missing_skills.join(', ')}

URL: ${topJob.url}

Application package ready.`;

console.log('----------------------------------------------------');
console.log(telegramPreview);
console.log('----------------------------------------------------');

console.log('\n✨ Pipeline test completed successfully!');
