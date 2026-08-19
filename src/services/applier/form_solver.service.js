/**
 * CareerForge AI — Intelligent Form Solver Service
 * Resolves ATS and LinkedIn screening questions with rule-based heuristics & AI fallbacks.
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../../core/logger');

class FormSolverService {
  constructor(customAnswers = null) {
    this.answers = customAnswers || this.loadDefaultAnswers();
  }

  loadDefaultAnswers() {
    const answersPath = path.join(__dirname, '../../../config/application_answers.json');
    if (fs.existsSync(answersPath)) {
      try {
        return JSON.parse(fs.readFileSync(answersPath, 'utf8'));
      } catch (err) {
        logger.warn(`Failed to parse application_answers.json: ${err.message}`);
      }
    }
    return {};
  }

  /**
   * Evaluates any question text and returns the optimal structured answer.
   * @param {string} questionText - Raw question label from ATS or LinkedIn
   * @param {string} inputType - 'text' | 'number' | 'radio' | 'select' | 'textarea'
   * @param {Array<string>} availableOptions - Optional list of select/radio choices
   * @returns {Object} { answer: string|number|boolean, matchedBy: string, confidence: number }
   */
  solveQuestion(questionText = '', inputType = 'text', availableOptions = []) {
    if (!questionText) {
      return { answer: '', matchedBy: 'fallback', confidence: 0 };
    }

    const q = questionText.trim().toLowerCase();

    // 1. Tech Skill Specific Years of Experience
    // e.g. "How many years of work experience do you have with Docker?"
    const techExpMap = this.answers.tech_experience_years || {};
    for (const [tech, years] of Object.entries(techExpMap)) {
      const techRegex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (techRegex.test(q) && /year|experience|how many/i.test(q)) {
        const val = (inputType === 'number') ? years : String(years);
        return {
          answer: this.pickBestOption(val, availableOptions) || val,
          matchedBy: `tech_skill:${tech}`,
          confidence: 0.98
        };
      }
    }

    // 2. General Years of Experience
    if (/years of.*experience|total.*experience/i.test(q)) {
      const genYoe = this.answers.common_questions_mapping?.years_of_experience_general || 2;
      const val = (inputType === 'number') ? genYoe : String(genYoe);
      return {
        answer: this.pickBestOption(val, availableOptions) || val,
        matchedBy: 'general_experience',
        confidence: 0.92
      };
    }

    // 3. Work Authorization & Sponsorship
    // e.g. "Will you now or in the future require visa sponsorship?"
    if (/sponsorship|require.*visa|need.*visa|work permit/i.test(q)) {
      const requiresSponsorship = this.answers.work_authorization?.requires_sponsorship_eu !== false;
      const val = requiresSponsorship ? 'Yes' : 'No';
      return {
        answer: this.pickBestOption(val, availableOptions, requiresSponsorship),
        matchedBy: 'visa_sponsorship',
        confidence: 0.95
      };
    }

    // e.g. "Are you legally authorized to work in..."
    if (/legally authorized|eligible to work|authorized to work/i.test(q)) {
      return {
        answer: this.pickBestOption('Yes', availableOptions, true),
        matchedBy: 'work_authorization',
        confidence: 0.88
      };
    }

    // 4. Remote & Relocation
    if (/remote|work from home|telecommute/i.test(q)) {
      return {
        answer: this.pickBestOption('Yes', availableOptions, true),
        matchedBy: 'remote_preference',
        confidence: 0.95
      };
    }
    if (/relocat|willing to move/i.test(q)) {
      return {
        answer: this.pickBestOption('Yes', availableOptions, true),
        matchedBy: 'relocation',
        confidence: 0.95
      };
    }

    // 5. Notice Period & Start Date
    if (/notice period|how soon|when can you start|start date|availability/i.test(q)) {
      const noticeText = this.answers.employment_terms?.notice_period_text || '2 weeks';
      const noticeWeeks = this.answers.employment_terms?.notice_period_weeks || 2;
      if (inputType === 'number') {
        return { answer: noticeWeeks, matchedBy: 'notice_period', confidence: 0.95 };
      }
      return {
        answer: this.pickBestOption(noticeText, availableOptions) || noticeText,
        matchedBy: 'notice_period',
        confidence: 0.95
      };
    }

    // 6. Salary Expectations
    if (/salary|compensation|expected rate|desired pay|hourly rate/i.test(q)) {
      const salary = this.answers.employment_terms?.desired_annual_salary_target || 50000;
      if (/hour|hourly/i.test(q)) {
        const hourly = this.answers.employment_terms?.desired_hourly_rate_usd || 30;
        return { answer: inputType === 'number' ? hourly : String(hourly), matchedBy: 'hourly_rate', confidence: 0.9 };
      }
      return {
        answer: inputType === 'number' ? salary : `${salary} EUR`,
        matchedBy: 'salary_expectation',
        confidence: 0.9
      };
    }

    // 7. Education Level
    if (/degree|education|highest level|bachelor|master/i.test(q)) {
      const degree = this.answers.education?.highest_degree || "Bachelor's Degree";
      return {
        answer: this.pickBestOption(degree, availableOptions) || degree,
        matchedBy: 'education_level',
        confidence: 0.92
      };
    }

    // 8. Language Proficiency
    const languages = this.answers.languages || {};
    for (const [lang, level] of Object.entries(languages)) {
      if (new RegExp(`\\b${lang}\\b`, 'i').test(q)) {
        return {
          answer: this.pickBestOption(level, availableOptions) || level,
          matchedBy: `language:${lang}`,
          confidence: 0.94
        };
      }
    }

    // 9. Personal Info Fields
    const p = this.answers.personal || {};
    if (/phone|mobile/i.test(q)) return { answer: p.phone_full || '+216 94854835', matchedBy: 'personal:phone', confidence: 0.99 };
    if (/linkedin/i.test(q)) return { answer: p.linkedin_url || '', matchedBy: 'personal:linkedin', confidence: 0.99 };
    if (/github/i.test(q)) return { answer: p.github_url || '', matchedBy: 'personal:github', confidence: 0.99 };
    if (/portfolio|website/i.test(q)) return { answer: p.portfolio_url || '', matchedBy: 'personal:portfolio', confidence: 0.99 };
    if (/city/i.test(q)) return { answer: p.city || 'Ariana', matchedBy: 'personal:city', confidence: 0.95 };
    if (/country/i.test(q)) return { answer: this.pickBestOption(p.country || 'Tunisia', availableOptions) || p.country, matchedBy: 'personal:country', confidence: 0.95 };

    // Default Fallback
    const fallbackAnswer = (inputType === 'number') ? 1 : 'Yes';
    return {
      answer: this.pickBestOption(fallbackAnswer, availableOptions) || fallbackAnswer,
      matchedBy: 'default_fallback',
      confidence: 0.5
    };
  }

  /**
   * Fuzzy matches target value against list of select options or radio choices.
   */
  pickBestOption(targetValue, availableOptions = [], isBoolean = null) {
    if (!availableOptions || availableOptions.length === 0) return null;

    const targetStr = String(targetValue).toLowerCase();

    // 1. Direct equality
    for (const opt of availableOptions) {
      if (String(opt).toLowerCase() === targetStr) return opt;
    }

    // 2. Boolean mapping (Yes / No, True / False)
    if (isBoolean !== null) {
      if (isBoolean === true) {
        const yesOpt = availableOptions.find(o => /^(yes|true|oui|y|authorized|willing)/i.test(String(o).trim()));
        if (yesOpt) return yesOpt;
      } else {
        const noOpt = availableOptions.find(o => /^(no|false|non|n|unauthorized)/i.test(String(o).trim()));
        if (noOpt) return noOpt;
      }
    }

    // 3. Numeric range matching (e.g. target is 2 and options are ['0-1 years', '1-3 years', '3-5 years'])
    const num = parseFloat(targetValue);
    if (!isNaN(num)) {
      for (const opt of availableOptions) {
        const rangeMatch = String(opt).match(/(\d+)\s*(?:-|to)\s*(\d+)/i);
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          if (num >= min && num <= max) return opt;
        }
        if (String(opt).includes(String(num))) return opt;
      }
    }

    // 4. Substring / Includes matching
    for (const opt of availableOptions) {
      const optStr = String(opt).toLowerCase();
      if (optStr.includes(targetStr) || targetStr.includes(optStr)) return opt;
    }

    return availableOptions[0] || null;
  }
}

module.exports = FormSolverService;
