/**
 * CareerForge AI — Architecture & Domain Services Test Suite
 */

const assert = require('assert');
const SecurityService = require('../src/core/security');
const FilterService = require('../src/services/filter/filter.service');
const PublisherService = require('../src/services/publisher/publisher.service');
const config = require('../src/core/config');

console.log('====================================================');
console.log('🧪 RUNNING ARCHITECTURE & UNIT TEST SUITE');
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
  // Test 1: Cryptographic Security
  runTest('SecurityService: Encrypt & Decrypt roundtrip with AES-256-GCM', () => {
    const testData = { message: 'Secret Candidate Vault Payload', timestamp: Date.now() };
    const passcode = 'Test_Passcode_123!';

    const encrypted = SecurityService.encryptPayload(testData, passcode);
    assert(encrypted.salt, 'Must include salt');
    assert(encrypted.iv, 'Must include iv');
    assert(encrypted.authTag, 'Must include authTag');
    assert(encrypted.ciphertext, 'Must include ciphertext');

    const decrypted = SecurityService.decryptPayload(encrypted, passcode);
    assert.strictEqual(decrypted.message, testData.message);
  });

  // Test 2: Filter Service Deduplication
  runTest('FilterService: Deduplication & Skill Extraction', () => {
    const filter = new FilterService();
    const mockJobs = [
      { company: 'Acme Corp', title: 'DevSecOps Engineer', description: 'Requires Docker and Kubernetes on Azure' },
      { company: 'Acme Corp', title: 'DevSecOps Engineer', description: 'Duplicate job posting' },
      { company: 'Bad Corp', title: 'Sales Representative', description: 'Sales position' }
    ];

    const result = filter.filterAndDeduplicate(mockJobs);
    assert.strictEqual(result.totalPassed, 1, 'Only 1 unique engineering job should pass');
    assert.strictEqual(result.duplicatesRemoved, 1, '1 duplicate should be identified');
    assert.strictEqual(result.irrelevantRemoved, 1, '1 sales job should be filtered');
    assert(result.jobs[0].skills.includes('Docker'), 'Should extract Docker skill');
    assert(result.jobs[0].skills.includes('Kubernetes'), 'Should extract Kubernetes skill');
  });

  // Test 3: Publisher Service Bundle Creation
  runTest('PublisherService: Encrypted Bundle Generation', () => {
    const publisher = new PublisherService(config);
    const mockJobs = [{ id: 'job-1', company: 'Tech Inc', title: 'Backend Engineer', match_score: 85, remote: true }];
    const result = publisher.publishEncryptedBundle(mockJobs, config.candidate);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stats.total_jobs, 1);
    assert.strictEqual(result.stats.matched_70_plus, 1);
  });

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
