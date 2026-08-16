/**
 * CareerForge AI — Notification & Auto-Apply Service
 * Manages Telegram alerts and automated email applications.
 */

const { logger } = require('../../core/logger');
const TelegramAdapter = require('./telegram.adapter');
const SmtpAdapter = require('./smtp.adapter');

class NotifierService {
  constructor(config = {}) {
    this.telegram = new TelegramAdapter(config.telegram?.botToken, config.telegram?.chatId);
    this.smtp = new SmtpAdapter(config.smtp);
    this.autoApplyEnabled = config.pipeline?.enableEmailApply || false;
  }

  async notifyJobMatches(matchedJobs = []) {
    logger.info(`Sending notifications for ${matchedJobs.length} top matches...`);
    let sentCount = 0;

    for (const job of matchedJobs.slice(0, 5)) {
      const sent = await this.telegram.sendJobMatchAlert(job);
      if (sent) sentCount++;
    }

    if (sentCount > 0) {
      logger.success(`Telegram: Dispatched ${sentCount} job alert notifications.`);
    } else {
      logger.info('Telegram: Alerts bypassed or token not configured.');
    }
  }

  async processAutoApplications(matchedJobs = []) {
    if (!this.autoApplyEnabled) {
      logger.info('Auto-Apply: Disabled in config (safe mode active).');
      return { totalApplied: 0 };
    }

    logger.info('Executing automated candidate application router...');
    let appliedCount = 0;

    for (const job of matchedJobs) {
      if (job.application_email) {
        const subject = `Application for ${job.title} — Ghaith Oueslati`;
        const body = job.cover_note || `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${job.title} position at ${job.company}.\n\nPlease find attached my tailored CV.\n\nBest regards,\nGhaith Oueslati`;
        
        const result = await this.smtp.sendApplicationEmail(job.application_email, subject, body);
        if (result.success) {
          job.auto_applied_email = true;
          appliedCount++;
          logger.success(`  ✉️ Auto-applied: ${job.company} (${job.application_email})`);
        }
      }
    }

    return { totalApplied: appliedCount };
  }
}

module.exports = NotifierService;
