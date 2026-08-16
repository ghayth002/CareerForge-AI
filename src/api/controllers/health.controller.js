/**
 * Health Controller
 */

const config = require('../../core/config');

class HealthController {
  static getHealth(req, res) {
    return res.status(200).json({
      status: 'online',
      service: 'CareerForge AI Cloud Orchestrator',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      env: {
        has_openrouter_key: Boolean(config.openRouter?.apiKey),
        has_smtp: Boolean(config.smtp?.user && config.smtp?.pass),
        has_telegram: Boolean(config.telegram?.botToken && config.telegram?.chatId),
        has_github: Boolean(config.github?.token)
      }
    });
  }
}

module.exports = HealthController;
