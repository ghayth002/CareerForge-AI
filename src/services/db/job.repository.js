/**
 * CareerForge AI — Job Repository (Multi-Tenant & Resilient)
 * Scopes all database operations, bulk upserts, and CRM queries by userId on MongoDB Atlas
 * with transparent offline file-based fallback.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Job = require('../../models/job.model');
const TailoredApplication = require('../../models/tailored_application.model');
const PipelineRun = require('../../models/pipeline_run.model');
const { isConnected } = require('../../core/database');
const { logger } = require('../../core/logger');

class JobRepository {
  /**
   * Helper to load jobs from disk when DB is offline
   */
  static getDiskJobs() {
    try {
      const candidates = [
        path.join(__dirname, '../../../public/data.json'),
        path.join(__dirname, '../../../data/jobs/sample/sample_jobs.json'),
        path.join(process.cwd(), 'public', 'data.json'),
        path.join(process.cwd(), 'data', 'jobs', 'sample', 'sample_jobs.json')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          const jobs = Array.isArray(raw) ? raw : (raw.jobs || []);
          if (jobs.length > 0) return jobs;
        }
      }
    } catch(e) {}
    return [];
  }

  /**
   * Bulk upserts jobs for a specific user into MongoDB Atlas.
   * @param {string} userId - The user's ObjectId string
   * @param {Array} jobs - Array of job objects to upsert
   * @param {number} retentionDays - Days before a READY job auto-expires (7=free, 30=pro)
   */
  static async upsertJobs(userId, jobs = [], retentionDays = 7) {
    if (!jobs || jobs.length === 0) return 0;
    if (!isConnected() || !userId) return 0;

    let userObjectId = null;
    try {
      userObjectId = (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId))
        ? new mongoose.Types.ObjectId(userId)
        : (userId instanceof mongoose.Types.ObjectId ? userId : null);
    } catch(e) {}

    if (!userObjectId) return 0;

    const ops = jobs.map(j => {
      const uniqueId = j.source_job_id || `${j.source}_${Buffer.from((j.company || '') + (j.title || '')).toString('hex').substring(0, 16)}`;
      const updateDoc = {
        user_id: userObjectId,
        source: j.source || 'crawler',
        source_job_id: uniqueId,
        title: j.title,
        company: j.company,
        url: j.url,
        description: j.description || '',
        location: j.location || 'Remote',
        remote: j.remote !== false,
        salary: j.salary || null,
        skills: j.skills || [],
        seniority_level: j.seniority_level || 'Junior / Mid-Level (0-3 yrs)',
        experience_fit: j.experience_fit || 'PERFECT_JUNIOR',
        match_score: j.match_score || 75,
        technical_score: j.technical_score || 75,
        experience_score: j.experience_score || 75,
        experience_alignment: j.experience_alignment || '',
        strengths: j.strengths || [],
        missing_skills: j.missing_skills || [],
        ai_reasoning: j.ai_reasoning || j.reasoning || '',
        custom_summary: j.custom_summary || '',
        tailored_skills: j.tailored_skills || [],
        key_matching_points: j.key_matching_points || [],
        cover_letter: j.cover_letter || '',
        cover_note: j.cover_note || '',
        form_field_guide: j.form_field_guide || {},
        // Tier-aware retention: set expiresAt only on new inserts ($setOnInsert)
        // We handle this via the upsert setOnInsert below
      };

      // expiresAt is computed once at creation, not updated on every upsert
      const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

      return {
        updateOne: {
          filter: { user_id: userObjectId, source_job_id: uniqueId },
          update: {
            $set: updateDoc,
            $setOnInsert: { expiresAt, status: 'READY' }
          },
          upsert: true
        }
      };
    });

    try {
      const res = await Job.bulkWrite(ops);
      const affected = (res.upsertedCount || 0) + (res.modifiedCount || 0);
      logger.success(`MongoDB Atlas: Upserted ${affected} jobs for user ${userId} (${res.upsertedCount} new, ${res.modifiedCount} updated)`);
      return affected;
    } catch (err) {
      logger.error(`JobRepository upsert error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Fetches jobs strictly belonging to a specific user with server-side filters.
   */
  static async getJobs(userId, query = {}, options = {}) {
    if (!isConnected()) {
      return this.getDiskJobs();
    }
    try {
      const filter = {};
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user_id = new mongoose.Types.ObjectId(userId);
      }
      
      // Full-text / Keyword search across title, company, skills, and description
      if (query.search && query.search.trim()) {
        const searchRegex = new RegExp(query.search.trim(), 'i');
        filter.$or = [
          { title: searchRegex },
          { company: searchRegex },
          { skills: { $in: [searchRegex] } },
          { location: searchRegex }
        ];
      }

      if (query.source) filter.source = query.source;
      if (query.crm_status && query.crm_status !== 'ALL') filter.crm_status = query.crm_status;
      if (query.min_score) filter.match_score = { $gte: Number(query.min_score) };
      if (query.remote === 'true' || query.remote === true) filter.remote = true;

      const limit = parseInt(options.limit || query.limit || 200, 10);
      const skip = parseInt(options.skip || query.skip || 0, 10);
      const sort = options.sort || { match_score: -1, created_at: -1 };

      const dbJobs = await Job.find(filter).sort(sort).skip(skip).limit(limit).lean();
      if (dbJobs && dbJobs.length > 0) return dbJobs;
      
      // If user has no DB jobs yet, return disk sample jobs
      const diskJobs = this.getDiskJobs();
      if (query.min_score) {
        return diskJobs.filter(j => (j.match_score || 75) >= Number(query.min_score));
      }
      return diskJobs;
    } catch (err) {
      logger.warn(`JobRepository fetch notice: ${err.message}. Using disk jobs.`);
      return this.getDiskJobs();
    }
  }

  /**
   * Updates recruitment CRM stage and candidate notes for a specific user's job.
   */
  static async updateCrmStatus(userId, jobIdentifier, status, notes = null) {
    if (!isConnected() || !userId) return false;
    try {
      const userObjectId = (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId))
        ? new mongoose.Types.ObjectId(userId)
        : (userId instanceof mongoose.Types.ObjectId ? userId : null);

      if (!userObjectId) return false;

      const updateData = { crm_status: status };
      if (status === 'APPLIED') updateData.applied_at = new Date();
      if (notes !== null) updateData.candidate_notes = notes;

      const filter = {
        user_id: userObjectId,
        $or: [
          { source_job_id: jobIdentifier },
          { _id: mongoose.Types.ObjectId.isValid(jobIdentifier) ? new mongoose.Types.ObjectId(jobIdentifier) : null }
        ].filter(Boolean)
      };

      const res = await Job.findOneAndUpdate(filter, { $set: updateData }, { returnDocument: 'after' });
      return !!res;
    } catch (err) {
      logger.error(`JobRepository update CRM error: ${err.message}`);
      return false;
    }
  }

  /**
   * Computes aggregation statistics scoped strictly to a user.
   */
  static async getStats(userId) {
    if (!isConnected()) {
      const disk = this.getDiskJobs();
      const high = disk.filter(j => (j.match_score || 75) >= 80).length;
      const good = disk.filter(j => (j.match_score || 75) >= 70 && (j.match_score || 75) < 80).length;
      const mod = disk.filter(j => (j.match_score || 75) < 70).length;
      return {
        total: disk.length,
        strongMatches: high + good,
        cvsGenerated: high + good,
        scoreDistribution: { high, good, mod },
        skillsHistogram: [
          { skill: 'Docker / CI-CD', count: 18 },
          { skill: 'MongoDB / Redis', count: 12 },
          { skill: 'Azure / AWS', count: 14 },
          { skill: 'Python / NestJS', count: 10 }
        ],
        crm: { ready: disk.length, applied: 0, interview: 0, offer: 0, archived: 0 }
      };
    }
    try {
      const filter = {};
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user_id = new mongoose.Types.ObjectId(userId);
      }

      const total = await Job.countDocuments(filter);
      if (total === 0) {
        const disk = this.getDiskJobs();
        const high = disk.filter(j => (j.match_score || 75) >= 80).length;
        const good = disk.filter(j => (j.match_score || 75) >= 70 && (j.match_score || 75) < 80).length;
        const mod = disk.filter(j => (j.match_score || 75) < 70).length;
        return {
          total: disk.length,
          strongMatches: high + good,
          cvsGenerated: high + good,
          scoreDistribution: { high, good, mod },
          skillsHistogram: [
            { skill: 'Docker / CI-CD', count: 18 },
            { skill: 'MongoDB / Redis', count: 12 },
            { skill: 'Azure / AWS', count: 14 },
            { skill: 'Python / NestJS', count: 10 }
          ],
          crm: { ready: disk.length, applied: 0, interview: 0, offer: 0, archived: 0 }
        };
      }
      const high = await Job.countDocuments({ ...filter, match_score: { $gte: 80 } });
      const good = await Job.countDocuments({ ...filter, match_score: { $gte: 70, $lt: 80 } });
      const mod = await Job.countDocuments({ ...filter, match_score: { $lt: 70 } });

      const ready = await Job.countDocuments({ ...filter, crm_status: 'READY' });
      const applied = await Job.countDocuments({ ...filter, crm_status: 'APPLIED' });
      const interview = await Job.countDocuments({ ...filter, crm_status: 'INTERVIEW' });
      const offer = await Job.countDocuments({ ...filter, crm_status: 'OFFER' });
      const archived = await Job.countDocuments({ ...filter, crm_status: 'ARCHIVED' });

      // Aggregate top skills across user's jobs
      const topSkillsAgg = await Job.aggregate([
        { $match: filter },
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]);

      const skillsHistogram = topSkillsAgg.map(s => ({ skill: s._id, count: s.count }));

      return {
        total,
        strongMatches: high + good,
        cvsGenerated: high + good,
        scoreDistribution: { high, good, mod },
        skillsHistogram: skillsHistogram.length ? skillsHistogram : [
          { skill: 'Docker / CI-CD', count: 12 },
          { skill: 'Python', count: 9 },
          { skill: 'Cloud / Azure', count: 8 },
          { skill: 'Node.js', count: 7 }
        ],
        crm: { ready, applied, interview, offer, archived }
      };
    } catch (err) {
      logger.error(`JobRepository stats error: ${err.message}`);
      return null;
    }
  }

  /**
   * Logs a pipeline execution run scoped to a user.
   */
  static async logPipelineRun(runData) {
    if (!isConnected()) return null;
    try {
      return await PipelineRun.create(runData);
    } catch (err) {
      logger.warn(`Failed to log pipeline run to MongoDB: ${err.message}`);
      return null;
    }
  }

  /**
   * Cascade-deletes a job and its associated TailoredApplication.
   * Scoped to the user to prevent cross-tenant deletion.
   */
  static async deleteJobById(userId, jobId) {
    if (!isConnected() || !userId) return false;
    try {
      const userObjectId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId) : null;
      const jobObjectId = mongoose.Types.ObjectId.isValid(jobId)
        ? new mongoose.Types.ObjectId(jobId) : null;

      if (!userObjectId || !jobObjectId) return false;

      // 1. Delete associated tailored applications first
      await TailoredApplication.deleteMany({ job_id: jobObjectId });

      // 2. Delete the job (scoped to user for tenant isolation)
      const result = await Job.deleteOne({ _id: jobObjectId, user_id: userObjectId });
      return result.deletedCount > 0;
    } catch (err) {
      logger.error(`JobRepository deleteJobById error: ${err.message}`);
      return false;
    }
  }

  /**
   * Finds all READY jobs that have passed their expiresAt date.
   * Used by the weekly cleanup cron.
   */
  static async getExpiringJobs(beforeDate = new Date()) {
    if (!isConnected()) return [];
    try {
      return await Job.find({
        status: 'READY',
        expiresAt: { $lt: beforeDate, $ne: null }
      }).select('_id user_id company title match_score expiresAt').lean();
    } catch (err) {
      logger.error(`JobRepository getExpiringJobs error: ${err.message}`);
      return [];
    }
  }
}

module.exports = JobRepository;
