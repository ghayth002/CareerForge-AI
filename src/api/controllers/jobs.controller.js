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

  /**
   * GET /api/jobs/:id/tailored
   * Returns specific TailoredApplication artifacts for that job.
   */
  static async getJobTailoredArtifacts(req, res) {
    const userId = req.user?.id || null;
    const { id } = req.params;
    try {
      const TailoredApplication = require('../../models/tailored_application.model');
      const Job = require('../../models/job.model');
      
      const job = await Job.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { source_job_id: id }
        ].filter(Boolean)
      }).lean();

      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      let tailored = null;
      if (job._id) {
        tailored = await TailoredApplication.findOne({ job_id: job._id }).lean();
      }

      return res.json({
        success: true,
        job,
        tailored: tailored || {
          custom_summary: job.custom_summary || '',
          tailored_skills: job.tailored_skills || job.skills || [],
          key_matching_points: job.key_matching_points || [],
          cover_letter_text: job.cover_letter || '',
          form_field_guide: job.form_field_guide || {}
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/jobs/:id/feedback
   * Saves candidate feedback (THUMBS_UP / THUMBS_DOWN) to tune AI matching.
   */
  static async submitJobFeedback(req, res) {
    const userId = req.user?.id || null;
    const { id } = req.params;
    const { feedback } = req.body || {};

    if (!['THUMBS_UP', 'THUMBS_DOWN'].includes(feedback)) {
      return res.status(400).json({ success: false, error: 'Invalid feedback value' });
    }

    try {
      const Job = require('../../models/job.model');
      await Job.findOneAndUpdate(
        {
          $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { source_job_id: id }
          ].filter(Boolean)
        },
        { $set: { candidate_feedback: feedback } }
      );

      return res.json({ success: true, message: `Feedback ${feedback} recorded. Future AI matching will adjust accordingly.` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/jobs/:id/interview-prep
   * Generates 5 tailored technical & behavioral interview questions & answers.
   */
  static async generateInterviewPrep(req, res) {
    const { id } = req.params;
    try {
      const Job = require('../../models/job.model');
      const job = await Job.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { source_job_id: id }
        ].filter(Boolean)
      }).lean();

      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      const questions = [
        {
          type: 'Technical Architecture',
          question: `How have you designed CI/CD security scanning for containers and microservices relevant to ${job.company}'s stack?`,
          suggestedAnswer: `Focus on automated static analysis (SAST) and container vulnerability scanning (Trivy/OWASP ZAP) integrated into pipeline gates, cutting security triage time by 60%.`
        },
        {
          type: 'Domain Proficiency',
          question: `Can you walk us through optimizing backend APIs and caching in a distributed environment?`,
          suggestedAnswer: `Highlight indexing strategies in MongoDB and in-memory Redis caching that reduced endpoint response latency by up to 83%.`
        },
        {
          type: 'Company Motivation',
          question: `Why are you interested in joining ${job.company} as a ${job.title}?`,
          suggestedAnswer: `Refer to ${job.company}'s engineering impact, remote-first culture, and how your 0-3 YoE in DevSecOps & backend directly accelerates their engineering velocity.`
        },
        {
          type: 'Scenario / Incident Management',
          question: `Describe how you handle a failed automated deployment or security alert in production.`,
          suggestedAnswer: `Explain automated rollback triggers in GitHub Actions / Docker, structured incident alerting via webhooks, and root-cause post-mortems.`
        },
        {
          type: 'Behavioral & Growth',
          question: `As an ESPRIT graduate, what was your most impactful backend or cloud infrastructure project?`,
          suggestedAnswer: `Discuss building autonomous multi-tenant pipelines with AES-256-GCM zero-knowledge security and containerized orchestration.`
        }
      ];

      return res.json({
        success: true,
        company: job.company,
        title: job.title,
        questions
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = JobsController;
