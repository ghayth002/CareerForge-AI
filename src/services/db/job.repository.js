/**
 * CareerForge AI — Job Repository
 * Handles all database persistence, bulk upserting, and CRM queries on MongoDB Atlas.
 */

const Job = require('../../models/job.model');
const PipelineRun = require('../../models/pipeline_run.model');
const { isConnected } = require('../../core/database');
const { logger } = require('../../core/logger');

class JobRepository {
  /**
   * Bulk upserts jobs into MongoDB Atlas using source_job_id as unique key.
   */
  static async upsertJobs(jobs = []) {
    if (!isConnected() || !jobs || jobs.length === 0) return 0;

    const ops = jobs.map(j => {
      const uniqueId = j.source_job_id || `${j.source}_${Buffer.from((j.company || '') + (j.title || '')).toString('hex').substring(0, 16)}`;
      const updateDoc = {
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
        form_field_guide: j.form_field_guide || {}
      };

      return {
        updateOne: {
          filter: { source_job_id: uniqueId },
          update: { $set: updateDoc },
          upsert: true
        }
      };
    });

    try {
      const res = await Job.bulkWrite(ops);
      const affected = (res.upsertedCount || 0) + (res.modifiedCount || 0);
      logger.success(`MongoDB Atlas: Upserted ${affected} jobs (${res.upsertedCount} new, ${res.modifiedCount} updated)`);
      return affected;
    } catch (err) {
      logger.error(`JobRepository upsert error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Fetches jobs from MongoDB Atlas with optional filtering and sorting.
   */
  static async getJobs(query = {}, options = {}) {
    if (!isConnected()) return [];
    try {
      const filter = {};
      if (query.source) filter.source = query.source;
      if (query.crm_status) filter.crm_status = query.crm_status;
      if (query.min_score) filter.match_score = { $gte: Number(query.min_score) };
      if (query.remote) filter.remote = true;

      const limit = options.limit || 200;
      const sort = options.sort || { match_score: -1, created_at: -1 };

      return await Job.find(filter).sort(sort).limit(limit).lean();
    } catch (err) {
      logger.error(`JobRepository fetch error: ${err.message}`);
      return [];
    }
  }

  /**
   * Updates recruitment CRM stage and candidate notes.
   */
  static async updateCrmStatus(jobIdentifier, status, notes = null) {
    if (!isConnected()) return false;
    try {
      const updateData = { crm_status: status };
      if (status === 'APPLIED') updateData.applied_at = new Date();
      if (notes !== null) updateData.candidate_notes = notes;

      const filter = {
        $or: [
          { source_job_id: jobIdentifier },
          { _id: jobIdentifier.match(/^[0-9a-fA-F]{24}$/) ? jobIdentifier : null }
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
   * Computes aggregation statistics for the dashboard.
   */
  static async getStats() {
    if (!isConnected()) return null;
    try {
      const total = await Job.countDocuments();
      const strongMatches = await Job.countDocuments({ match_score: { $gte: 70 } });
      const ready = await Job.countDocuments({ crm_status: 'READY' });
      const applied = await Job.countDocuments({ crm_status: 'APPLIED' });
      const interview = await Job.countDocuments({ crm_status: 'INTERVIEW' });
      const offer = await Job.countDocuments({ crm_status: 'OFFER' });

      return {
        total,
        strongMatches,
        crm: { ready, applied, interview, offer }
      };
    } catch (err) {
      logger.error(`JobRepository stats error: ${err.message}`);
      return null;
    }
  }

  /**
   * Logs a pipeline execution run.
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
}

module.exports = JobRepository;
