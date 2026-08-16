/**
 * Jobs Controller
 */

const fs = require('fs');
const path = require('path');
const config = require('../../core/config');

class JobsController {
  static getEncryptedData(req, res) {
    const encPath = path.join(config.paths?.public, 'data.enc');
    if (fs.existsSync(encPath)) {
      return res.sendFile(encPath);
    }
    return res.status(404).json({ error: 'data.enc payload not built yet' });
  }

  static getJobsJson(req, res) {
    const jsonPath = path.join(config.paths?.public, 'data.json');
    if (fs.existsSync(jsonPath)) {
      return res.sendFile(jsonPath);
    }
    return res.status(404).json({ error: 'data.json payload not built yet' });
  }
}

module.exports = JobsController;
