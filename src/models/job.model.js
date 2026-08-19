/**
 * CareerForge AI — MongoDB Multi-Tenant Job Schema
 */

const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  source_job_id: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  company: {
    type: String,
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: 'Remote'
  },
  remote: {
    type: Boolean,
    default: true,
    index: true
  },
  salary: {
    type: String,
    default: null
  },
  skills: [{
    type: String
  }],
  seniority_level: {
    type: String,
    default: 'Junior / Mid-Level (0-3 yrs)',
    index: true
  },
  experience_fit: {
    type: String,
    default: 'PERFECT_JUNIOR'
  },
  match_score: {
    type: Number,
    default: 75,
    index: true
  },
  technical_score: {
    type: Number,
    default: 75
  },
  experience_score: {
    type: Number,
    default: 75
  },
  experience_alignment: {
    type: String,
    default: ''
  },
  strengths: [{
    type: String
  }],
  missing_skills: [{
    type: String
  }],
  ai_reasoning: {
    type: String,
    default: ''
  },
  custom_summary: {
    type: String,
    default: ''
  },
  tailored_skills: [{
    type: String
  }],
  key_matching_points: [{
    type: String
  }],
  cover_letter: {
    type: String,
    default: ''
  },
  cover_note: {
    type: String,
    default: ''
  },
  form_field_guide: {
    why_interested: { type: String, default: '' },
    biggest_achievement: { type: String, default: '' }
  },
  crm_status: {
    type: String,
    enum: ['READY', 'APPLIED', 'INTERVIEW', 'OFFER', 'ARCHIVED'],
    default: 'READY',
    index: true
  },
  candidate_notes: {
    type: String,
    default: ''
  },
  applied_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Multi-tenant compound indexes
JobSchema.index({ user_id: 1, source_job_id: 1 }, { unique: true });
JobSchema.index({ user_id: 1, match_score: -1, created_at: -1 });
JobSchema.index({ user_id: 1, crm_status: 1, match_score: -1 });

module.exports = mongoose.models.Job || mongoose.model('Job', JobSchema);
