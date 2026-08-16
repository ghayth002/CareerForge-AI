/**
 * CareerForge AI — Concurrency & Dynamic Criteria Test Suite
 */

const assert = require('assert');
const MatcherService = require('../src/services/matcher/matcher.service');
const FilterService = require('../src/services/filter/filter.service');

console.log('====================================================');
console.log('🧪 RUNNING CONCURRENCY & DYNAMIC CRITERIA TESTS');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
  }
}

async function main() {
  // Test 1: Concurrency Pool Limiter
  await runAsyncTest('MatcherService: Enforces exact concurrency limit of 3', async () => {
    const matcher = new MatcherService(null, { concurrency: 3 });
    let activeWorkers = 0;
    let maxObservedActiveWorkers = 0;

    const mockTasks = Array.from({ length: 9 }, (_, i) => async () => {
      activeWorkers++;
      maxObservedActiveWorkers = Math.max(maxObservedActiveWorkers, activeWorkers);
      // Simulate async processing delay
      await new Promise(r => setTimeout(r, 40));
      activeWorkers--;
      return `result-${i}`;
    });

    const results = await matcher.executeWithConcurrency(mockTasks, 3);
    assert.strictEqual(results.length, 9, 'All 9 tasks should complete');
    assert(maxObservedActiveWorkers <= 3, `Max active workers (${maxObservedActiveWorkers}) must not exceed limit 3`);
  });

  // Test 2: Dynamic Search Criteria Customization
  runTest('FilterService: Dynamically updates target and negative keywords', () => {
    const filter = new FilterService();
    
    filter.setCriteria({
      targetKeywords: ['rust', 'blockchain', 'solidity'],
      disallowedKeywords: ['junior', 'intern'],
      prohibitedSeniority: [],
      preferredLocations: ['remote', 'italy']
    });

    const mockJobs = [
      { company: 'Web3 Labs', title: 'Senior Rust & Blockchain Architect', description: 'Rust and Solidity role in Italy', remote: true },
      { company: 'Web3 Labs', title: 'Junior Rust Developer', description: 'Internship role' },
      { company: 'Other Labs', title: 'Python Engineer', description: 'Python dev' }
    ];

    const result = filter.filterAndDeduplicate(mockJobs);
    assert.strictEqual(result.totalPassed, 1, 'Only the qualified Rust position should pass');
    assert.strictEqual(result.jobs[0].title, 'Senior Rust & Blockchain Architect');
  });

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
