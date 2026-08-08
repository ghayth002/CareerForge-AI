/**
 * CareerForge AI — Email Auto-Apply Module
 * Automatically sends CV PDF & Cover Letter PDF via SMTP for email-based job applications.
 * Usage: node scripts/email-auto-apply.js --to <email> --company <name> --title <role> --cv <path> --cover <path>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('📦 Installing nodemailer module...');
  execSync('npm install nodemailer', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  nodemailer = require('nodemailer');
}

// Load environment variables
const envPath = path.join(__dirname, '../.env');
let smtpHost = 'smtp.gmail.com';
let smtpPort = 587;
let smtpUser = '';
let smtpPass = '';
let fromEmail = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('SMTP_HOST=')) smtpHost = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('SMTP_PORT=')) smtpPort = parseInt(trimmed.split('=')[1].trim());
    if (trimmed.startsWith('SMTP_USER=')) smtpUser = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('SMTP_PASS=')) smtpPass = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('FROM_EMAIL=')) fromEmail = trimmed.split('=')[1].trim();
  });
}

if (!fromEmail) fromEmail = smtpUser;

const args = process.argv.slice(2);
function getArg(name, defaultVal = '') {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const targetEmail = getArg('to');
const company = getArg('company', 'Target Company');
const jobTitle = getArg('title', 'Engineering Position');
const customCvPath = getArg('cv', path.join(__dirname, '../data/cv/base/Ghaith_Oueslati_CV.pdf'));
const customCoverPath = getArg('cover');

console.log('====================================================');
console.log('✉️ CareerForge AI — Email Auto-Apply System');
console.log('====================================================');
console.log(`🏢 Company: ${company}`);
console.log(`💼 Role: ${jobTitle}`);
console.log(`📧 Target Email: ${targetEmail || 'NOT SPECIFIED'}`);
console.log(`👤 From: ${fromEmail}`);
console.log(`📄 CV File: ${customCvPath}\n`);

if (!targetEmail) {
  console.error('❌ Target email is required! Pass --to <email@company.com>');
  process.exit(1);
}

const emailSubject = `Application: ${jobTitle} — Ghaith Oueslati`;
const emailBodyText = `Dear Hiring Team at ${company},

I am writing to formally express my strong interest in the ${jobTitle} position at ${company}.

With hands-on experience in DevSecOps automation, backend microservices performance tuning, and CI/CD security pipeline integration at SeekMake, I am confident in contributing immediate technical value to your team.

Key Highlights of my experience:
• Cut security triage time by 60% by integrating Google Gemini API into CI/CD pipelines (OWASP ZAP & Trivy).
• Reduced backend API latency by 83% through MongoDB aggregation pipeline optimization and caching.
• Built an AI-powered test generation agent (5,200+ lines) achieving 75%+ unit test coverage with Vertex AI.
• Migrated 38+ CI/CD workflows to GitLab CI/CD and 8 microservices to Azure Container Apps.

Please find my customized Resume/CV and Cover Letter attached for your review. I look forward to discussing how my background aligns with ${company}'s goals.

Best regards,

Ghaith Oueslati
DevSecOps & Backend Engineer
Degree Candidate in Computer Engineering (ESPRIT 2026)
Phone: +216 94854835
Email: ${fromEmail}
LinkedIn: linkedin.com/in/ghayth-weslati
GitHub: github.com/ghayth002`;

async function sendApplicationEmail() {
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const attachments = [];
  if (fs.existsSync(customCvPath)) {
    attachments.push({ filename: `Ghaith_Oueslati_CV_${company.replace(/\s+/g, '_')}.pdf`, path: customCvPath });
  }
  if (customCoverPath && fs.existsSync(customCoverPath)) {
    attachments.push({ filename: `Cover_Letter_Ghaith_Oueslati.pdf`, path: customCoverPath });
  }

  console.log('Sending email via Gmail SMTP...');
  const info = await transporter.sendMail({
    from: `Ghaith Oueslati <${fromEmail}>`,
    to: targetEmail,
    subject: emailSubject,
    text: emailBodyText,
    attachments
  });

  console.log(`\n✅ EMAIL SENT SUCCESSFULLY! Message ID: ${info.messageId}`);
  console.log(`📧 Sent to: ${targetEmail}`);
  console.log(`📄 Attached: ${attachments.map(a => a.filename).join(', ')}\n`);
}

sendApplicationEmail().catch(console.error);
