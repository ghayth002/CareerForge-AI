/**
 * CareerForge AI — Form Solver Unit Tests
 */

const assert = require('assert');
const FormSolverService = require('../src/services/applier/form_solver.service');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING FORM SOLVER TEST SUITE');
console.log('====================================================');

const solver = new FormSolverService();

runTest('FormSolver: Specific tech skill experience (Docker)', () => {
  const result = solver.solveQuestion('How many years of work experience do you have with Docker?', 'number');
  assert.strictEqual(result.answer, 2);
  assert(result.confidence > 0.9);
});

runTest('FormSolver: Specific tech skill experience (Python)', () => {
  const result = solver.solveQuestion('Years of experience using Python in production', 'text');
  assert.strictEqual(result.answer, '2');
});

runTest('FormSolver: Visa sponsorship question', () => {
  const result = solver.solveQuestion('Will you now or in the future require visa sponsorship to work in the EU?', 'radio', ['Yes', 'No']);
  assert.strictEqual(result.answer, 'Yes');
});

runTest('FormSolver: Notice period resolution with select options', () => {
  const result = solver.solveQuestion('What is your current notice period?', 'select', ['Immediate', '2 weeks', '1 month', '3 months']);
  assert.strictEqual(result.answer, '2 weeks');
});

runTest('FormSolver: Numeric range matching for dropdowns', () => {
  const result = solver.solveQuestion('How many years of DevOps experience do you have?', 'select', ['0-1 years', '1-3 years', '3-5 years', '5+ years']);
  assert.strictEqual(result.answer, '1-3 years');
});

runTest('FormSolver: Remote work comfort', () => {
  const result = solver.solveQuestion('Are you comfortable working 100% remotely?', 'radio', ['Yes', 'No']);
  assert.strictEqual(result.answer, 'Yes');
});

runTest('FormSolver: Language proficiency (English)', () => {
  const result = solver.solveQuestion('What is your English proficiency level?', 'select', ['Basic', 'Conversational', 'Full Professional Proficiency', 'Native']);
  assert.strictEqual(result.answer, 'Full Professional Proficiency');
});

console.log('====================================================');
console.log('📊 FORM SOLVER TESTS PASSED (7/7)');
console.log('====================================================');
