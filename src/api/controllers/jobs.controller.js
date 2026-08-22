/**
 * CareerForge AI — Jobs Controller (Multi-Tenant)
 * Serves real-time MongoDB Atlas queries and encrypted dataset packages scoped by user.
 */

const fs = require('fs');
const path = require('path');
const config = require('../../core/config');
const JobRepository = require('../../services/db/job.repository');
const AppliedHistory = require('../../models/applied_history.model');
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

      // When transitioning to APPLIED, write a permanent AppliedHistory snapshot first
      if (status === 'APPLIED' && isConnected() && userId) {
        const jobs = await JobRepository.getJobs(userId);
        const job = jobs.find(j =>
          String(j._id) === String(id) ||
          j.source_job_id === id
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
              apply_mode: 'manual',
              candidate_notes: notes || ''
            });
          } catch (histErr) {
            // Non-fatal: log but don't block the CRM update
            console.warn('[JobsController] AppliedHistory write failed:', histErr.message);
          }
        }
      }

      const updated = await JobRepository.updateCrmStatus(userId, id, status, notes);
      if (updated) {
        return res.json({ success: true, message: 'CRM status updated in MongoDB Atlas' });
      }
      return res.status(404).json({ success: false, error: 'Job not found in database for this user' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Deletes a single job and cascades to its TailoredApplication.
   * Scoped to the authenticated user for tenant isolation.
   */
  static async deleteJob(req, res) {
    const userId = req.user?.id || null;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required to delete jobs.' });
    }

    try {
      const deleted = await JobRepository.deleteJobById(userId, id);
      if (deleted) {
        return res.status(204).send();
      }
      return res.status(404).json({ success: false, error: 'Job not found or does not belong to your account.' });
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
