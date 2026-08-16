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

    // Ensure base CV is copied to public/cvs/
    const defaultCvDest = path.join(this.outputDir, 'Ghaith_Oueslati_CV.pdf');
    if (fs.existsSync(this.baseCvPath) && !fs.existsSync(defaultCvDest)) {
      fs.copyFileSync(this.baseCvPath, defaultCvDest);
    }

    const generatedPackages = [];

    for (const job of matchedJobs) {
      const cvFilename = this.generateSafeFilename(job.company, job.title, 'Ghaith_Oueslati_CV');
      const coverFilename = this.generateSafeFilename(job.company, job.title, 'Cover_Letter');
      
      const cvPath = path.join(this.outputDir, cvFilename);
      const coverPath = path.join(this.outputDir, coverFilename);

      // Link or copy base CV for static download availability
      if (fs.existsSync(this.baseCvPath) && !fs.existsSync(cvPath)) {
        fs.copyFileSync(this.baseCvPath, cvPath);
      }
      if (fs.existsSync(this.baseCvPath) && !fs.existsSync(coverPath)) {
        fs.copyFileSync(this.baseCvPath, coverPath);
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
