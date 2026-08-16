/**
 * CareerForge AI — Structured Logging Core
 * Provides colorized level-based logging with timestamping and event capture.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 2,
  WARN: 3,
  ERROR: 4
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || LOG_LEVELS.INFO;
    this.logs = [];
    this.maxMemoryLogs = options.maxMemoryLogs || 500;
  }

  formatTime() {
    return new Date().toISOString().substring(11, 19);
  }

  log(levelName, icon, msg, data = null) {
    const timestamp = this.formatTime();
    const formatted = `[${timestamp}] ${icon} ${msg}`;
    
    this.logs.push({ timestamp, level: levelName, message: msg, data });
    if (this.logs.length > this.maxMemoryLogs) this.logs.shift();

    if (levelName === 'ERROR') {
      console.error(formatted, data || '');
    } else if (levelName === 'WARN') {
      console.warn(formatted, data || '');
    } else {
      console.log(formatted, data || '');
    }
  }

  info(msg, data) {
    this.log('INFO', 'ℹ️ ', msg, data);
  }

  success(msg, data) {
    this.log('SUCCESS', '✅', msg, data);
  }

  warn(msg, data) {
    this.log('WARN', '⚠️ ', msg, data);
  }

  error(msg, data) {
    this.log('ERROR', '❌', msg, data);
  }

  step(stepNumber, name) {
    console.log(`\n----------------------------------------------------`);
    console.log(`[ STEP ${stepNumber} ] ${name}`);
    console.log(`----------------------------------------------------`);
  }

  banner(title) {
    console.log('====================================================');
    console.log(title);
    console.log('====================================================');
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

const logger = new Logger();

module.exports = { Logger, logger, LOG_LEVELS };
