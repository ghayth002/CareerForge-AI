/**
 * CareerForge AI — MongoDB Atlas Integration Tests (Multi-Tenant)
 */

require('dotenv').config();
const assert = require('assert');
const { connectDB, isConnected, disconnectDB } = require('../src/core/database');
const JobRepository = require('../src/services/db/job.repository');
const Job = require('../src/models/job.model');
const User = require('../src/models/user.model');

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING MONGODB ATLAS INTEGRATION TEST SUITE');
  console.log('====================================================');

  const conn = await connectDB();
  assert(isConnected(), 'MongoDB must be connected');
  console.log(`  ✅ PASS: MongoDB Atlas Connection Established (${conn.name})`);

  // Create temporary test user
  const testUser = await User.create({
    email: `integration_test_${Date.now()}@seekmake.com`,
    name: 'Integration Test User',
    password_hash: await User.hashPassword('Password123!'),
    candidate_profile: {
      title: 'Junior DevSecOps Engineer',
      university: 'ESPRIT'
    }
  });

  try {
    // Test 1: Upsert test job scoped to testUser
    const testJob = {
      source: 'mongodb_test_source',
      source_job_id: `test_job_${Date.now()}`,
      title: 'Junior DevSecOps Engineer',
      company: 'SeekMake Cloud Labs',
      url: 'https://seekmake.com/careers/devsecops',
      description: 'DevSecOps and backend cloud engineer role with Docker and CI/CD',
      location: 'Tunisia / Remote',
      remote: true,
      skills: ['Docker', 'CI/CD', 'Azure', 'Python'],
      seniority_level: 'Junior / Graduate (0-2 yrs)',
      experience_fit: 'PERFECT_JUNIOR',
      match_score: 92
    };

    const upsertedCount = await JobRepository.upsertJobs(testUser._id, [testJob]);
    assert(upsertedCount >= 1, 'At least 1 job must be upserted');
    console.log('  ✅ PASS: JobRepository: Bulk Upsert to MongoDB Atlas (Multi-Tenant)');

    // Test 2: Fetch job from DB for testUser
    const fetchedJobs = await JobRepository.getJobs(testUser._id, { source: 'mongodb_test_source' });
    assert(fetchedJobs.length > 0, 'Fetched jobs must contain the inserted test job');
    assert.strictEqual(fetchedJobs[0].company, 'SeekMake Cloud Labs');
    console.log(`  ✅ PASS: JobRepository: Query and Fetch (${fetchedJobs.length} found)`);

    // Test 3: Update CRM status
    const updated = await JobRepository.updateCrmStatus(testUser._id, testJob.source_job_id, 'INTERVIEW', 'Passed technical phone screen');
    assert(updated, 'CRM status update must return true');
    console.log('  ✅ PASS: JobRepository: Real-time CRM Status Update');

    // Test 4: Analytics aggregation
    const stats = await JobRepository.getStats(testUser._id);
    assert(stats && stats.total > 0, 'Stats must return total jobs count');
    console.log(`  ✅ PASS: JobRepository: Aggregation Stats (Total: ${stats.total}, Strong: ${stats.strongMatches})`);

    // Clean up test data
    await Job.deleteMany({ user_id: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('  ✅ PASS: Test data cleanup');

  } finally {
    await disconnectDB();
  }

  console.log('====================================================');
  console.log('📊 MONGODB ATLAS TESTS PASSED (5/5)');
  console.log('====================================================');
}

main().catch(err => {
  console.error('❌ MongoDB Test Error:', err);
  process.exit(1);
});
