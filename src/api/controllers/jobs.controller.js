/**
 * CareerForge AI — Jobs Controller (Multi-Tenant)
 * Serves real-time MongoDB Atlas queries and encrypted dataset packages scoped by user.
 */

const fs = require('fs');
const path = require('path');
const config = require('../../core/config');
const JobRepository = require('../../services/db/job.repository');
const { isConnected } = require('../../core/database');

class JobsController {
  static getEncryptedData(req, res) {
    const encPath = path.join(config.paths?.public, 'data.enc');
    if (fs.existsSync(encPath)) {
      return res.sendFile(encPath);
    }
    return res.status(404).json({ error: 'data.enc payload not built yet' });
  }

  static async getJobsJson(req, res) {
    const userId = req.user?.id || null;
    if (isConnected()) {
      const jobs = await JobRepository.getJobs(userId, req.query);
      if (jobs.length > 0) {
        return res.json({
          source: 'mongodb_atlas',
          total: jobs.length,
          jobs
        });
      }
    }

    const jsonPath = path.join(config.paths?.public, 'data.json');
    if (fs.existsSync(jsonPath)) {
      return res.sendFile(jsonPath);
    }
    return res.status(404).json({ error: 'data.json payload not built yet' });
  }

  static async getMongoJobs(req, res) {
    const userId = req.user?.id || null;
    try {
      const jobs = await JobRepository.getJobs(userId, req.query);
      return res.json({
        success: true,
        count: jobs.length,
        jobs
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateCrmStatus(req, res) {
    const userId = req.user?.id || null;
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updated = await JobRepository.updateCrmStatus(userId, id, status, notes);
      if (updated) {
        return res.json({ success: true, message: 'CRM status updated in MongoDB Atlas' });
      }
      return res.status(404).json({ success: false, error: 'Job not found in database for this user' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAnalytics(req, res) {
    const userId = req.user?.id || null;
    try {
      const stats = await JobRepository.getStats(userId);
      return res.json({ success: true, stats });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = JobsController;
