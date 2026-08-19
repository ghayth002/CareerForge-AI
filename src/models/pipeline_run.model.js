/**
 * CareerForge AI — MongoDB Pipeline Run Telemetry Schema
 */

const mongoose = require('mongoose');

const PipelineRunSchema = new mongoose.Schema({
  run_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['RUNNING', 'COMPLETED', 'FAILED'],
    default: 'RUNNING',
    index: true
  },
  sources_crawled: {
    type: Map,
    of: Number,
    default: {}
  },
  total_discovered: {
    type: Number,
    default: 0
  },
  total_passed_filter: {
    type: Number,
    default: 0
  },
  total_ai_matched: {
    type: Number,
    default: 0
  },
  high_matches_count: {
    type: Number,
    default: 0
  },
  ai_model_used: {
    type: String,
    default: 'google/gemini-2.5-flash'
  },
  duration_ms: {
    type: Number,
    default: 0
  },
  error_message: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'started_at', updatedAt: 'completed_at' }
});

module.exports = mongoose.models.PipelineRun || mongoose.model('PipelineRun', PipelineRunSchema);
