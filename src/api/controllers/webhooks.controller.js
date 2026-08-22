/**
 * CareerForge AI — Webhooks Controller
 * WS2 Mode B: Receives results from the self-hosted LinkedIn auto-apply Python worker.
 * Validates HMAC-SHA256 signature, updates job CRM status, writes AppliedHistory.
 *
 * Expected request:
 *   POST /api/webhooks/linkedin-apply
 *   Headers: x-webhook-signature: sha256=<hex>
 *   Body: { jobId, userId, status: 'APPLIED'|'FAILED', reason?, timestamp }
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const JobRepository = require('../../services/db/job.repository');
const AppliedHistory = require('../../models/applied_history.model');
const { isConnected } = require('../../core/database');
const { logger } = require('../../core/logger');

const HMAC_SECRET = process.env.WEBHOOK_HMAC_SECRET || '';

/**
 * Verifies the HMAC-SHA256 signature provided in the x-webhook-signature header.
 */
function verifyHmac(rawBody, signatureHeader) {
  if (!HMAC_SECRET) {
    logger.warn('[Webhook] WEBHOOK_HMAC_SECRET is not set — accepting request without signature verification (insecure in production!)');
    return true;
  }
  if (!signatureHeader) return false;

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;

  const expectedSig = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(parts[1], 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
}

class WebhooksController {
  /**
   * POST /api/webhooks/linkedin-apply
   * Called by the Mode B Python/Selenium worker after an application attempt.
   */
  static async receiverLinkedInResult(req, res) {
    // 1. HMAC signature validation
    const rawBody = JSON.stringify(req.body);
    const sigHeader = req.headers['x-webhook-signature'] || '';

    if (!verifyHmac(rawBody, sigHeader)) {
      logger.warn('[Webhook] Invalid HMAC signature on linkedin-apply webhook.');
      return res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
    }

    const { jobId, userId, status, reason, timestamp } = req.body || {};

    if (!jobId || !userId || !status) {
      return res.status(400).json({ success: false, error: 'jobId, userId, and status are required.' });
    }

    if (!['APPLIED', 'FAILED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be APPLIED or FAILED.' });
    }

    if (!isConnected()) {
      return res.status(503).json({ success: false, error: 'Database unavailable.' });
    }

    logger.info(`[Webhook] LinkedIn apply result received: jobId=${jobId} userId=${userId} status=${status}`);

    try {
      // 2. Update CRM status (only update to APPLIED if worker succeeded)
      const crmStatus = status === 'APPLIED' ? 'APPLIED' : 'READY';
      const note = status === 'APPLIED'
        ? `Auto-applied via Mode B self-hosted worker at ${timestamp || new Date().toISOString()}`
        : `Mode B worker failed: ${reason || 'Unknown error'}`;

      await JobRepository.updateCrmStatus(userId, jobId, crmStatus, note);

      // 3. Write permanent AppliedHistory if application was successful
      if (status === 'APPLIED') {
        // Fetch minimal job details for the snapshot
        const jobs = await JobRepository.getJobs(userId);
        const job = jobs.find(j =>
          String(j._id) === String(jobId) ||
          j.source_job_id === jobId
        );

        if (job) {
          try {
            await AppliedHistory.create({
              user_id: userId,
              job_id: job._id || null,
              company: job.company,
              title: job.title,
              url: job.url,
              location: job.location,
              match_score: job.match_score,
              source: job.source,
              cv_snapshot: {
                custom_summary: job.custom_summary || '',
                cover_note: job.cover_note || '',
                tailored_skills: job.tailored_skills || []
              },
              apply_mode: 'webhook',
              candidate_notes: note,
              applied_at: timestamp ? new Date(timestamp) : new Date()
            });
          } catch (histErr) {
            logger.warn(`[Webhook] AppliedHistory write failed: ${histErr.message}`);
          }
        }
      }

      logger.success(`[Webhook] Processed LinkedIn apply result for jobId=${jobId}: ${status}`);
      return res.status(200).json({
        success: true,
        message: `Job ${jobId} updated to ${crmStatus}.`,
        processed_at: new Date().toISOString()
      });
    } catch (err) {
      logger.error(`[Webhook] Error processing linkedin-apply webhook: ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = WebhooksController;
