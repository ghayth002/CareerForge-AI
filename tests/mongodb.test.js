/**
 * CareerForge AI — MongoDB Atlas Integration Tests
 */

require('dotenv').config();
const assert = require('assert');
const { connectDB, isConnected, disconnectDB } = require('../src/core/database');
const JobRepository = require('../src/services/db/job.repository');
const Job = require('../src/models/job.model');

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING MONGODB ATLAS INTEGRATION TEST SUITE');
  console.log('====================================================');

  const conn = await connectDB();
  assert(isConnected(), 'MongoDB must be connected');
  console.log(`  ✅ PASS: MongoDB Atlas Connection Established (${conn.name})`);

  // Test 1: Upsert test job
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

  const upsertedCount = await JobRepository.upsertJobs([testJob]);
  assert(upsertedCount >= 1, 'At least 1 job must be upserted');
  console.log('  ✅ PASS: JobRepository: Bulk Upsert to MongoDB Atlas');

  // Test 2: Fetch job from DB
  const fetchedJobs = await JobRepository.getJobs({ source: 'mongodb_test_source' });
  assert(fetchedJobs.length > 0, 'Fetched jobs must contain the inserted test job');
  assert.strictEqual(fetchedJobs[0].company, 'SeekMake Cloud Labs');
  console.log(`  ✅ PASS: JobRepository: Query and Fetch (${fetchedJobs.length} found)`);

  // Test 3: Update CRM status
  const updated = await JobRepository.updateCrmStatus(testJob.source_job_id, 'INTERVIEW', 'Passed technical phone screen');
  assert(updated, 'CRM status update must return true');
  console.log('  ✅ PASS: JobRepository: Real-time CRM Status Update');

  // Test 4: Analytics aggregation
  const stats = await JobRepository.getStats();
  assert(stats && stats.total > 0, 'Stats must return total jobs count');
  console.log(`  ✅ PASS: JobRepository: Aggregation Stats (Total: ${stats.total}, Strong: ${stats.strongMatches})`);

  // Clean up test job
  await Job.deleteOne({ source_job_id: testJob.source_job_id });
  console.log('  ✅ PASS: Test data cleanup');

  await disconnectDB();

  console.log('====================================================');
  console.log('📊 MONGODB ATLAS TESTS PASSED (5/5)');
  console.log('====================================================');
}

main().catch(err => {
  console.error('❌ MongoDB Test Error:', err);
  process.exit(1);
});
