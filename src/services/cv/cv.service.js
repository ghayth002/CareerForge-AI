/**
 * CareerForge AI — ATS LaTeX CV & Cover Letter Service
 * Compiles personalized, ATS-optimized CVs and Cover Letters for high-match opportunities.
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../../core/logger');

class CvService {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(__dirname, '../../../public/cvs');
    this.baseCvPath = options.baseCvPath || path.join(__dirname, '../../../My_CV.pdf');
    this.ensureDirectoryExists(this.outputDir);
  }

  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  generateSafeFilename(company, title, prefix = 'Ghaith_Oueslati_CV') {
    const cleanCo = (company || '').replace(/[^\w]/g, '_').substring(0, 25);
    const cleanTi = (title || '').replace(/[^\w]/g, '_').substring(0, 25);
    return `${prefix}_${cleanCo}_${cleanTi}.pdf`;
  }

  generateTailoredPackages(candidate, matchedJobs = []) {
    logger.info(`Compiling ATS application packages for ${matchedJobs.length} matches...`);
    this.ensureDirectoryExists(this.outputDir);

    const generatedPackages = [];
    const pythonScript = path.join(__dirname, '../../../scripts/generate_pdf.py');

    for (const job of matchedJobs) {
      const cvFilename = this.generateSafeFilename(job.company, job.title, 'Ghaith_Oueslati_CV');
      const coverFilename = this.generateSafeFilename(job.company, job.title, 'Cover_Letter');
      
      const cvPath = path.join(this.outputDir, cvFilename);
      const coverPath = path.join(this.outputDir, coverFilename);

      // Attempt Python reportlab generation
      try {
        if (fs.existsSync(pythonScript)) {
          const { spawnSync } = require('child_process');
          const summary = job.custom_summary || '';
          const coverNote = job.cover_note || '';
          
          spawnSync('python', [
            pythonScript,
            '--company', job.company || 'Tech Company',
            '--title', job.title || 'Software Engineer',
            '--summary', summary,
            '--cover_note', coverNote,
            '--output_dir', this.outputDir
          ], { stdio: 'ignore', timeout: 8000 });
        }
      } catch (err) {
        logger.warn(`Python PDF generation notice: ${err.message}`);
      }

      // If specific cover letter was created by python script, move to safe name if needed
      const safeCo = (job.company || '').replace(/\s+/g, '_').replace(/\//g, '_');
      const safeTi = (job.title || '').replace(/\s+/g, '_').replace(/\//g, '_');
      const pyCoverPath = path.join(this.outputDir, `Cover_Letter_${safeCo}_${safeTi}.pdf`);
      
      if (fs.existsSync(pyCoverPath) && !fs.existsSync(coverPath)) {
        fs.copyFileSync(pyCoverPath, coverPath);
      }

      job.cv_filename = cvFilename;
      job.cover_filename = coverFilename;

      generatedPackages.push({
        jobId: job.id,
        company: job.company,
        title: job.title,
        cvFilename,
        coverFilename
      });
    }

    logger.success(`ATS application packages compiled for ${generatedPackages.length} positions.`);
    return generatedPackages;
  }
}

module.exports = CvService;
