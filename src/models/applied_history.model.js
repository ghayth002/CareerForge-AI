/**
 * CareerForge AI — AppliedHistory Model
 * Permanent snapshot written when a job transitions to APPLIED.
 * Never auto-deleted — provides "what was actually sent" reference
 * even after the original Job document expires and is removed.
 */

const mongoose = require('mongoose');

const AppliedHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null   // May be null if job was deleted after application
  },
  // Snapshot of job data at time of application
  company: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, default: '' },
  location: { type: String, default: 'Remote' },
  match_score: { type: Number, default: 0 },
  source: { type: String, default: '' },
  // Snapshot of application content
  cv_snapshot: {
    custom_summary: { type: String, default: '' },
    cover_note: { type: String, default: '' },
    tailored_skills: [{ type: String }]
  },
  // How was it applied?
  apply_mode: {
    type: String,
    enum: ['auto', 'easy_apply_assist', 'manual', 'webhook'],
    default: 'manual'
  },
  candidate_notes: { type: String, default: '' },
  applied_at: { type: Date, default: Date.now, index: true }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

AppliedHistorySchema.index({ user_id: 1, applied_at: -1 });

module.exports = mongoose.models.AppliedHistory ||
  mongoose.model('AppliedHistory', AppliedHistorySchema);
