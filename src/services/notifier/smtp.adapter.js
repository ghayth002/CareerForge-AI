/**
 * SMTP Email Auto-Apply Adapter
 */

class SmtpAdapter {
  constructor(credentials = {}) {
    this.user = credentials.user;
    this.pass = credentials.pass;
    this.host = credentials.host || 'smtp.gmail.com';
    this.port = credentials.port || 587;
  }

  isConfigured() {
    return Boolean(this.user && this.pass);
  }

  async sendApplicationEmail(recipientEmail, subject, text, attachments = []) {
    if (!this.isConfigured()) return { success: false, reason: 'SMTP not configured' };

    try {
      // Lazy load nodemailer if available
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: { user: this.user, pass: this.pass }
      });

      const info = await transporter.sendMail({
        from: `"Ghaith Oueslati" <${this.user}>`,
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
