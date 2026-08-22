/**
 * CareerForge AI — TailoredApplication Model
 * Stores CV/cover-letter artifacts generated per job, decoupled from the Job document
 * so they can be deleted or retained independently of the job lifecycle.
 */

const mongoose = require('mongoose');

const TailoredApplicationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  // Generated CV artifact metadata
  cv_filename: { type: String, default: '' },
  cv_html: { type: String, default: '' },       // Client-rendered HTML if no PDF
  cover_letter_text: { type: String, default: '' },
  cover_letter_filename: { type: String, default: '' },
  // AI-tailored content
  tailored_skills: [{ type: String }],
  custom_summary: { type: String, default: '' },
  key_matching_points: [{ type: String }],
  form_field_guide: {
    why_interested: { type: String, default: '' },
    biggest_achievement: { type: String, default: '' }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index: one tailored app per user per job
TailoredApplicationSchema.index({ user_id: 1, job_id: 1 }, { unique: true });

module.exports = mongoose.models.TailoredApplication ||
  mongoose.model('TailoredApplication', TailoredApplicationSchema);
