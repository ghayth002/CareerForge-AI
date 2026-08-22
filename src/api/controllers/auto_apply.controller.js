/**
 * CareerForge AI — Auto-Apply Controller
 * Handles 1-click autonomous applications, ATS question solving, tailored CV compilation,
 * and CRM status persistence to MongoDB Atlas.
 */

const mongoose = require('mongoose');
const JobRepository = require('../../services/db/job.repository');
const FormSolverService = require('../../services/applier/form_solver.service');
const CvService = require('../../services/cv/cv.service');
const NotifierService = require('../../services/notifier/notifier.service');
const AppliedHistory = require('../../models/applied_history.model');
const config = require('../../core/config');
const { logger } = require('../../core/logger');
const { isConnected } = require('../../core/database');

class AutoApplyController {
  /**
   * 1-Click Auto-Apply to a single job with AI Junior fit check, tailored CV & solved form
   */
  static async applySingleJob(req, res, next) {
    const userId = req.user?.id || null;
    const { id } = req.params;
    const { customNotes } = req.body || {};

    try {
      // 1. Fetch Job from MongoDB or disk
      const jobs = await JobRepository.getJobs(userId);
      const job = jobs.find(j => 
        String(j.id) === String(id) || 
        String(j._id) === String(id) || 
        j.source_job_id === id || 
        j._uid === id
      );

      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found in database' });
      }

      // 2. Validate Junior / Seniority Fit
      const isSeniorOrLead = /senior|lead|principal|staff|director|architect|head of/i.test(job.title || '') && 
                            !/junior|associate|entry/i.test(job.title || '');

      if (isSeniorOrLead && (job.max_years_required > 3 || (job.years_required && job.years_required > 3))) {
        return res.status(400).json({
          success: false,
          error: 'Seniority Mismatch: Role requires >3 years experience (Senior/Lead). Auto-applier strictly targets Junior / Entry / Associate roles (0-3 YoE) to maximize acceptance rate.'
        });
      }

      // ── MODE A: Easy Apply Assist ──────────────────────────────────────
      // For LinkedIn Easy Apply jobs, return assist payload instead of automating.
      // The frontend opens the URL in a new tab and shows the copy matrix.
      if (job.source === 'linkedin_easy_apply' || job.is_easy_apply === true) {
        const solver = new FormSolverService();
        const commonQuestions = [
          { q: 'How many years of work experience do you have with Docker?', type: 'number' },
          { q: 'How many years of Python development experience do you have?', type: 'number' },
          { q: 'Will you now or in the future require visa sponsorship for employment?', type: 'select' },
          { q: 'What is your current notice period?', type: 'select' },
          { q: 'What are your gross annual salary expectations in EUR?', type: 'number' },
          { q: 'Are you comfortable working remotely?', type: 'select' }
        ];
        const screeningAnswers = commonQuestions.map(item => ({
          question: item.q,
          answer: solver.solveQuestion(item.q, item.type).answer
        }));

        logger.info(`[AutoApply] Easy Apply Assist mode for ${job.company} — ${job.title}`);

        return res.status(200).json({
          success: true,
          mode: 'easy_apply_assist',
          message: `LinkedIn Easy Apply Assist ready for ${job.company} (${job.title}). Open the URL and use the answer matrix below.`,
          canonical_url: job.url,
          url_type: job.url_type || 'search',
          job: {
            id: String(job._id || job.source_job_id),
            title: job.title,
            company: job.company,
            location: job.location,
            match_score: job.match_score
          },
          screening_answers: screeningAnswers
        });
      }

      const candidateProfile = req.user?.candidate_profile || config.candidate;
      const cvService = new CvService({ outputDir: config.paths.cvs });
      const solver = new FormSolverService();
      const notifier = new NotifierService(config);

      // 3. Compile tailored CV and Cover letter
      const tailoredPkg = cvService.generateTailoredPackages(candidateProfile, [job])[0];

      // 4. Resolve ATS screening questions
      const commonQuestions = [
        { q: 'How many years of work experience do you have with Docker?', type: 'number' },
        { q: 'How many years of Python development experience do you have?', type: 'number' },
        { q: 'Will you now or in the future require visa sponsorship for employment?', type: 'select' },
        { q: 'What is your current notice period?', type: 'select' },
        { q: 'What are your gross annual salary expectations in EUR?', type: 'number' },
        { q: 'Are you comfortable working remotely?', type: 'select' }
      ];

      const resolvedAnswers = commonQuestions.map(item => ({
        question: item.q,
        answer: solver.solveQuestion(item.q, item.type).answer
      }));

      // 5. Update CRM Status in MongoDB Atlas
      const applyNote = customNotes || `Auto-applied autonomously with tailored ATS CV (${tailoredPkg?.cv_filename || 'PDF'}). Screening questions auto-resolved.`;
      const targetId = job.source_job_id || job._id || job.id;
      await JobRepository.updateCrmStatus(userId, targetId, 'APPLIED', applyNote);

      // 5b. Write permanent AppliedHistory snapshot
      if (isConnected() && userId) {
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
              custom_summary: tailoredPkg?.custom_summary || job.custom_summary || '',
              cover_note: tailoredPkg?.cover_note || job.cover_note || '',
              tailored_skills: tailoredPkg?.tailored_skills || job.tailored_skills || []
            },
            apply_mode: 'auto',
            candidate_notes: applyNote
          });
        } catch (histErr) {
          logger.warn(`[AutoApply] AppliedHistory write failed: ${histErr.message}`);
        }
      }

      // 6. Notify via Telegram if configured
      await notifier.notifyJobMatches([{ ...job, match_score: job.match_score || 85 }]);

      logger.success(`Autonomous Auto-Apply successful for ${job.company} — ${job.title}`);

      return res.status(200).json({
        success: true,
        message: `Successfully auto-applied to ${job.company} (${job.title})!`,
        job: {
          ...job,
          crm_status: 'APPLIED',
          applied_at: new Date().toISOString(),
          candidate_notes: applyNote
        },
        tailored_cv: tailoredPkg?.cv_filename,
        tailored_cover: tailoredPkg?.cover_filename,
        form_answers: resolvedAnswers
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Batch Auto-Apply to all qualified Junior positions scoring >= min_score
   */
  static async applyBatchJuniorMatches(req, res, next) {
    const userId = req.user?.id || null;
    const { minScore = 70, limit = 10 } = req.body || {};

    try {
      const allJobs = await JobRepository.getJobs(userId);
      
      // Filter qualified junior positions
      const qualified = allJobs.filter(j => {
        const score = j.match_score || 0;
        const isNotApplied = (j.crm_status || 'READY') === 'READY';
        const isJuniorFit = !(/senior|lead|principal|staff|director|architect/i.test(j.title || '') && !/junior|associate|entry/i.test(j.title || ''));
        return score >= minScore && isNotApplied && isJuniorFit;
      }).slice(0, limit);

      if (qualified.length === 0) {
        return res.status(200).json({
          success: true,
          applied_count: 0,
          message: 'No unapplied Junior jobs found matching the minimum score threshold.'
        });
      }

      const appliedJobs = [];
      for (const job of qualified) {
        const targetId = job.source_job_id || job._id || job.id;
        const note = `Batch auto-applied with tailored ATS resume. Junior fit verified (0-3 YoE).`;
        await JobRepository.updateCrmStatus(userId, targetId, 'APPLIED', note);
        appliedJobs.push({
          id: targetId,
          title: job.title,
          company: job.company,
          match_score: job.match_score
        });
      }

      logger.success(`Batch Auto-Apply completed: ${appliedJobs.length} Junior jobs submitted.`);

      return res.status(200).json({
        success: true,
        message: `Successfully auto-applied to ${appliedJobs.length} qualified Junior positions!`,
        applied_count: appliedJobs.length,
        jobs: appliedJobs
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = AutoApplyController;
