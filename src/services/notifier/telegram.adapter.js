/**
 * Telegram Notification Adapter
 */

class TelegramAdapter {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async sendJobMatchAlert(job) {
    if (!this.botToken || !this.chatId) return false;

    const message = `🎯 <b>CareerForge AI — Strong Match Found!</b>\n\n` +
      `🏢 <b>Company:</b> ${job.company}\n` +
      `💼 <b>Role:</b> ${job.title}\n` +
      `🔥 <b>Match Score:</b> ${job.match_score}%\n` +
      `📍 <b>Location:</b> ${job.location || 'Remote'}\n` +
      `🔗 <a href="${job.url}">View Job Posting</a>\n\n` +
      `💡 <i>Reasoning: ${job.ai_reasoning || 'Strong technical match'}</i>`;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
}

module.exports = TelegramAdapter;
