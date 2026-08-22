/**
 * CareerForge AI — Notification & Auto-Apply Service
 * Dispatches high-relevance job matches to the user's signup email via SMTP,
 * with optional fallback/duplicate to Telegram if configured.
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

  /**
   * Notifies the candidate of newly matched jobs via their signup email address.
   * If Telegram bot token & chat ID are configured, also sends Telegram alerts.
   */
  async notifyJobMatches(matchedJobs = [], recipientEmail = null, recipientName = 'Candidate') {
    if (!matchedJobs || matchedJobs.length === 0) {
      logger.info('Notification: No high-match jobs to alert.');
      return;
    }

    logger.info(`Sending notifications for ${matchedJobs.length} top matches...`);

    // 1. Email Notification to user's registered signup email
    if (recipientEmail) {
      logger.info(`[Notifier] Sending job match digest to user email: ${recipientEmail}`);
      await this.smtp.sendJobMatchAlertEmail(recipientEmail, recipientName, matchedJobs);
    } else {
      logger.info('[Notifier] No user recipient email provided — skipping email notification.');
    }

    // 2. Telegram Alert (optional/supplementary)
    if (this.telegram.botToken && this.telegram.chatId) {
      let sentCount = 0;
      for (const job of matchedJobs.slice(0, 5)) {
        const sent = await this.telegram.sendJobMatchAlert(job);
        if (sent) sentCount++;
      }
      if (sentCount > 0) {
        logger.success(`Telegram: Dispatched ${sentCount} supplementary job alerts.`);
      }
    }
  }

  async processAutoApplications(matchedJobs = [], senderName = 'Ghaith Oueslati') {
    if (!this.autoApplyEnabled) {
      logger.info('Auto-Apply: Disabled in config (safe mode active).');
      return { totalApplied: 0 };
    }

    logger.info('Executing automated candidate application router...');
    let appliedCount = 0;

    for (const job of matchedJobs) {
      if (job.application_email) {
        const subject = `Application for ${job.title} — ${senderName}`;
        const body = job.cover_note || `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${job.title} position at ${job.company}.\n\nPlease find attached my tailored CV.\n\nBest regards,\n${senderName}`;
        
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
