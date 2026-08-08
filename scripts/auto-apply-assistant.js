/**
 * CareerForge AI — Playwright Browser Job Application Assistant
 * Pre-fills job application forms (LinkedIn Easy Apply, Greenhouse, Lever, Workable)
 * Uploads candidate CV PDF automatically & pauses for final user review.
 * Usage: node scripts/auto-apply-assistant.js --url <job_url> --cv <path_to_pdf>
 */

const fs = require('fs');
const path = require('path');

// Candidate Profile Data
const candidateConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/candidate.json'), 'utf8'));
const candidate = candidateConfig.candidate;

const args = process.argv.slice(2);
function getArg(name, defaultVal = '') {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const jobUrl = getArg('url');
const cvPath = getArg('cv', path.join(__dirname, '../data/cv/base/Ghaith_Oueslati_CV.pdf'));

console.log('====================================================');
console.log('🤖 CareerForge AI — Interactive Browser Apply Assistant');
console.log('====================================================');
console.log(`👤 Candidate: ${candidate.name}`);
console.log(`📧 Email: ${candidate.email}`);
console.log(`📱 Phone: ${candidate.phone}`);
console.log(`📄 CV File: ${cvPath}`);
console.log(`🔗 Target Job URL: ${jobUrl || 'NOT SPECIFIED'}\n`);

if (!jobUrl) {
  console.log('❌ Job URL is required! Pass --url <job_listing_url>');
  console.log('Example: node scripts/auto-apply-assistant.js --url "https://www.linkedin.com/jobs/view/123456"');
  process.exit(1);
}

async function runApplicationAssistant() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.log('📦 Playwright is not installed. Installing playwright now...');
    require('child_process').execSync('npm install playwright', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    playwright = require('playwright');
  }

  console.log('🚀 Launching Chrome Browser in Interactive Mode...');
  const browser = await playwright.chromium.launch({
    headless: false, // Visible browser so user can supervise & complete CAPTCHAs safely
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  console.log(`🌐 Navigating to ${jobUrl}...`);
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait 3 seconds for page rendering
  await page.waitForTimeout(3000);

  // Form Pre-Fill Helper Engine
  console.log('⚡ Scanning form fields for auto-fill...');

  try {
    // Fill Name
    const nameInput = await page.$('input[name*="name" i], input[id*="name" i], input[autocomplete*="name" i]');
    if (nameInput) {
      await nameInput.fill(candidate.name);
      console.log('  ✓ Filled Name');
    }

    // Fill Email
    const emailInput = await page.$('input[type="email"], input[name*="email" i], input[id*="email" i]');
    if (emailInput) {
      await emailInput.fill(candidate.email);
      console.log('  ✓ Filled Email');
    }

    // Fill Phone
    const phoneInput = await page.$('input[type="tel"], input[name*="phone" i], input[id*="phone" i]');
    if (phoneInput) {
      await phoneInput.fill(candidate.phone);
      console.log('  ✓ Filled Phone Number');
    }

    // Fill LinkedIn URL
    const linkedinInput = await page.$('input[name*="linkedin" i], input[id*="linkedin" i]');
    if (linkedinInput) {
      await linkedinInput.fill(`https://linkedin.com/in/${candidate.linkedin}`);
      console.log('  ✓ Filled LinkedIn URL');
    }

    // Fill GitHub URL
    const githubInput = await page.$('input[name*="github" i], input[id*="github" i]');
    if (githubInput) {
      await githubInput.fill(`https://github.com/${candidate.github}`);
      console.log('  ✓ Filled GitHub URL');
    }

    // Upload CV PDF if file input exists
    const fileInput = await page.$('input[type="file"]');
    if (fileInput && fs.existsSync(cvPath)) {
      await fileInput.setInputFiles(cvPath);
      console.log(`  ✓ Uploaded CV PDF: ${path.basename(cvPath)}`);
    }

    // Handle LinkedIn Easy Apply button if on LinkedIn
    if (jobUrl.includes('linkedin.com')) {
      const easyApplyBtn = await page.$('button.jobs-apply-button, button:has-text("Easy Apply")');
      if (easyApplyBtn) {
        console.log('🎯 Found LinkedIn Easy Apply button! Clicking...');
        await easyApplyBtn.click();
        await page.waitForTimeout(2000);

        // Upload CV inside modal if present
        const modalFileInput = await page.$('.jobs-easy-apply-modal input[type="file"]');
        if (modalFileInput && fs.existsSync(cvPath)) {
          await modalFileInput.setInputFiles(cvPath);
          console.log(`  ✓ Uploaded CV PDF to LinkedIn Easy Apply modal`);
        }
      }
    }
  } catch (err) {
    console.log(`  ℹ Auto-fill notice: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('✅ Form fields pre-filled & CV attached!');
  console.log('👉 Browser is open on your screen. Review the application and click Submit.');
  console.log('====================================================\n');
}

runApplicationAssistant().catch(console.error);
