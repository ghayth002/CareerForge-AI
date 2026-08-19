/**
 * CareerForge AI — User Schema
 * Multi-tenant authentication, profile isolation, and role management.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password_hash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  candidate_profile: {
    title: { type: String, default: 'DevSecOps & Backend Engineer' },
    university: { type: String, default: 'ESPRIT' },
    graduation_year: { type: Number, default: 2026 },
    location: { type: String, default: 'Tunisia' },
    phone: { type: String, default: '+216 94854835' },
    linkedin: { type: String, default: 'https://linkedin.com/in/ghayth-weslati-520394266/' },
    github: { type: String, default: 'https://github.com/ghayth002' },
    portfolio: { type: String, default: 'https://oueslati-ghaith.onrender.com/' },
    seniority_target: { type: String, default: 'junior_to_mid' },
    min_match_score: { type: Number, default: 70 },
    target_roles: {
      type: [String],
      default: ['DevSecOps Engineer', 'Backend Engineer', 'Cloud Engineer', 'Platform Engineer', 'Software Engineer']
    },
    target_keywords: {
      type: [String],
      default: ['devsecops', 'devops', 'backend', 'cloud', 'security', 'software engineer', 'kubernetes', 'docker', 'python']
    },
    negative_keywords: {
      type: [String],
      default: ['sales representative', 'customer support', 'php wordpress', 'marketing manager', 'recruiter']
    },
    skills: {
      languages: {
        type: [String],
        default: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'SQL']
      },
      frameworks: {
        type: [String],
        default: ['React', 'Angular', 'Node.js', 'NestJS', 'Spring Boot', 'Flutter']
      },
      devops_cloud: {
        type: [String],
        default: ['Docker', 'Terraform', 'GitHub Actions', 'GitLab CI/CD', 'Azure', 'AWS', 'GCP']
      },
      databases: {
        type: [String],
        default: ['MongoDB', 'PostgreSQL', 'Redis', 'MySQL']
      },
      security: {
        type: [String],
        default: ['OWASP ZAP', 'Trivy', 'SonarQube', 'DevSecOps', 'SAST', 'DAST']
      }
    },
    application_answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        work_authorization: "Tunisian national. Eligible for EU Blue Card and work visa sponsorship. Open to international relocation and remote work.",
        notice_period: "2 weeks / Immediate",
        desired_salary_eur: 50000,
        english_level: "Full Professional Proficiency",
        french_level: "Full Professional Proficiency"
      }
    }
  },
  last_login_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Static helper to hash password
UserSchema.statics.hashPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
