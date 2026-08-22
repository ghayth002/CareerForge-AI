/**
 * CareerForge AI — SMTP Email Adapter
 * Delivers crisp, rich HTML email notifications for Job Match alerts,
 * application packages, and cleanup notices directly to the user's signup email.
 */

const { logger } = require('../../core/logger');

class SmtpAdapter {
  constructor(credentials = {}) {
    this.user = credentials.user || process.env.SMTP_USER || '';
    this.pass = credentials.pass || process.env.SMTP_PASS || '';
    this.host = credentials.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    this.port = parseInt(credentials.port || process.env.SMTP_PORT || '587', 10);
    this.fromEmail = credentials.fromEmail || process.env.FROM_EMAIL || this.user;
  }

  isConfigured() {
    return Boolean(this.user && this.pass);
  }

  getTransporter() {
    const nodemailer = require('nodemailer');
    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.port === 465,
      auth: { user: this.user, pass: this.pass }
    });
  }

  /**
   * Sends a high-match job opportunities digest to the user's signup email.
   */
  async sendJobMatchAlertEmail(recipientEmail, recipientName = 'Candidate', matchedJobs = []) {
    if (!this.isConfigured()) {
      logger.warn('[SMTP] Email alert skipped: SMTP_USER / SMTP_PASS not configured in environment.');
      return { success: false, reason: 'SMTP not configured' };
    }

    if (!recipientEmail) {
      logger.warn('[SMTP] No recipient email specified.');
      return { success: false, reason: 'Missing recipient email' };
    }

    if (!matchedJobs || matchedJobs.length === 0) {
      return { success: true, message: 'No matches to send' };
    }

    const topMatches = matchedJobs.slice(0, 8);

    const jobsHtml = topMatches.map((job, idx) => `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid #2E6F40; border-radius: 8px; padding: 16px 20px; margin-bottom: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px; font-weight: 700;">
              ${idx + 1}. ${job.title}
            </h3>
            <div style="color: #64748b; font-size: 13px; font-weight: 500;">
              🏢 <strong>${job.company}</strong> &nbsp;•&nbsp; 📍 ${job.location || 'Remote'}
            </div>
          </div>
          <div style="background: #2E6F40; color: #ffffff; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 700; text-align: center;">
            ${job.match_score || 85}% Match
          </div>
        </div>
        ${job.ai_reasoning ? `
          <div style="background: #f8fafc; border-left: 3px solid #DAA520; padding: 8px 12px; margin: 10px 0; font-size: 12px; color: #475569; font-style: italic;">
            💡 <strong>AI Fit:</strong> ${job.ai_reasoning}
          </div>
        ` : ''}
        <div style="margin-top: 10px;">
          <a href="${job.url}" target="_blank" style="display: inline-block; background: #2E6F40; color: #ffffff; text-decoration: none; padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;">
            View Job Posting & Apply →
          </a>
        </div>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #334155; }
          .container { max-width: 620px; margin: 0 auto; background: #fafaf8; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #2E6F40 0%, #1e4b2b 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
          .content { padding: 24px; }
          .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">🎯 CareerForge AI</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">High-Relevance Engineering Opportunities Found!</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; margin-top: 0;">Hi <strong>${recipientName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              Our autonomous AI job matcher evaluated newly published opportunities against your profile and discovered <strong>${matchedJobs.length} strong matches</strong>.
            </p>
            
            <div style="margin: 20px 0;">
              ${jobsHtml}
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              Tailored ATS resumes and cover letters have already been generated for these positions.
            </p>
          </div>
          <div class="footer">
            Sent autonomously by CareerForge AI • <a href="https://github.com/ghayth002/CareerForge-AI" style="color: #2E6F40; text-decoration: none;">CareerForge AI Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: `"CareerForge AI" <${this.fromEmail}>`,
        to: recipientEmail,
        subject: `🎯 CareerForge AI — ${matchedJobs.length} New Job Matches for ${recipientName}`,
        html: htmlContent
      });

      logger.success(`[SMTP] Dispatched job match alert email to ${recipientEmail} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(`[SMTP] Failed to send job match alert email to ${recipientEmail}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends a weekly cleanup digest to the user's email.
   */
  async sendCleanupWarningEmail(recipientEmail, recipientName = 'Candidate', expiringJobs = []) {
    if (!this.isConfigured() || !recipientEmail || expiringJobs.length === 0) {
      return { success: false };
    }

    const items = expiringJobs.slice(0, 15).map(j => 
      `<li style="margin-bottom: 6px;"><strong>${j.company}</strong> — ${j.title} (${j.match_score}% match)</li>`
    ).join('');

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #660033; margin-top: 0;">🧹 CareerForge AI — Weekly Job Cleanup</h2>
        <p>Hi ${recipientName},</p>
        <p>We are cleaning up <strong>${expiringJobs.length} expired READY jobs</strong> that exceeded your tier retention period.</p>
        <p style="color: #64748b; font-size: 13px;"><em>Note: Any jobs in <strong>APPLIED</strong> or <strong>ARCHIVED</strong> status are permanently preserved in your application history.</em></p>
        <ul>${items}</ul>
        <p style="font-size: 13px; color: #475569;">Run a new pipeline search anytime from your dashboard to discover fresh opportunities!</p>
      </div>
    `;

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: `"CareerForge AI" <${this.fromEmail}>`,
        to: recipientEmail,
        subject: `🧹 CareerForge AI — Weekly Cleanup Notice (${expiringJobs.length} jobs expired)`,
        html: htmlContent
      });
      return { success: true };
    } catch (err) {
      logger.warn(`[SMTP] Cleanup email notice failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async sendApplicationEmail(recipientEmail, subject, text, attachments = []) {
    if (!this.isConfigured()) return { success: false, reason: 'SMTP not configured' };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: `"Ghaith Oueslati" <${this.fromEmail}>`,
        to: recipientEmail,
        subject,
        text,
        attachments
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = SmtpAdapter;
