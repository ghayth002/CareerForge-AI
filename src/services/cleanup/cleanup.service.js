/**
 * CareerForge AI — Cleanup Service
 * Weekly cron job that:
 *  1. Finds all READY jobs where expiresAt < now (never touches APPLIED/ARCHIVED)
 *  2. Sends an Email digest warning to each user's signup email
 *  3. Cascade-deletes: TailoredApplication first, then Job
 *
 * Uses node-cron — fires every Sunday at 02:00 server time.
 */

const cron = require('node-cron');
const mongoose = require('mongoose');
const Job = require('../../models/job.model');
const User = require('../../models/user.model');
const TailoredApplication = require('../../models/tailored_application.model');
const SmtpAdapter = require('../notifier/smtp.adapter');
const TelegramAdapter = require('../notifier/telegram.adapter');
const { logger } = require('../../core/logger');

/**
 * Runs one cleanup pass — finds and deletes expired READY jobs (cascade).
 */
async function runCleanup(config = {}) {
  const smtp = new SmtpAdapter(config.smtp);
  const telegram = new TelegramAdapter(
    process.env.TELEGRAM_BOT_TOKEN || config.telegram?.botToken || '',
    process.env.TELEGRAM_CHAT_ID || config.telegram?.chatId || ''
  );

  logger.info('[Cleanup] Starting weekly expired-job sweep...');
  const now = new Date();

  try {
    // 1. Find all expiring READY jobs
    const expiringJobs = await Job.find({
      status: 'READY',
      expiresAt: { $lt: now }
    }).select('_id user_id company title match_score expiresAt').lean();

    if (expiringJobs.length === 0) {
      logger.info('[Cleanup] No expired jobs found — nothing to delete.');
      return { deleted: 0 };
    }

    logger.warn(`[Cleanup] Found ${expiringJobs.length} expired READY jobs to delete.`);

    // 2. Group expiring jobs by user_id and email each user
    const jobsByUser = {};
    for (const job of expiringJobs) {
      const uId = String(job.user_id);
      if (!jobsByUser[uId]) jobsByUser[uId] = [];
      jobsByUser[uId].push(job);
    }

    for (const [userId, userJobs] of Object.entries(jobsByUser)) {
      try {
        const user = await User.findById(userId).select('email name').lean();
        if (user && user.email) {
          await smtp.sendCleanupWarningEmail(user.email, user.name, userJobs);
        }
      } catch (userErr) {
        logger.warn(`[Cleanup] Failed to fetch user ${userId} for email notice: ${userErr.message}`);
      }
    }

    // 3. Cascade delete: TailoredApplication → Job
    let deletedCount = 0;
    const jobIds = expiringJobs.map(j => j._id);

    // Batch delete all associated TailoredApplications
    await TailoredApplication.deleteMany({ job_id: { $in: jobIds } });

    // Batch delete expired jobs
    const deleteResult = await Job.deleteMany({
      _id: { $in: jobIds },
      status: 'READY'  // Extra guard: never delete non-READY jobs
    });

    deletedCount = deleteResult.deletedCount;
    logger.success(`[Cleanup] Deleted ${deletedCount} expired jobs and their tailored artifacts.`);

    return { deleted: deletedCount, jobs: expiringJobs.length };
  } catch (err) {
    logger.error(`[Cleanup] Error during cleanup run: ${err.message}`);
    return { deleted: 0, error: err.message };
  }
}

/**
 * Registers the weekly cleanup cron job.
 */
function scheduleCleanup(config = {}, cronExpression = '0 2 * * 0') {
  logger.info(`[Cleanup] Scheduling weekly job cleanup: cron="${cronExpression}"`);

  cron.schedule(cronExpression, async () => {
    logger.info('[Cleanup] Weekly cleanup cron triggered.');
    if (mongoose.connection.readyState !== 1) {
      logger.warn('[Cleanup] Skipping cleanup — MongoDB not connected.');
      return;
    }
    await runCleanup(config);
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'Africa/Tunis'
  });

  logger.success('[Cleanup] Weekly cleanup job scheduled successfully.');
}

module.exports = { scheduleCleanup, runCleanup };
