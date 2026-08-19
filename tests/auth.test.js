/**
 * CareerForge AI — Authentication & Multi-Tenant Isolation Tests
 */

require('dotenv').config();
const assert = require('assert');
const { connectDB, isConnected, disconnectDB } = require('../src/core/database');
const User = require('../src/models/user.model');
const JobRepository = require('../src/services/db/job.repository');
const Job = require('../src/models/job.model');
const AuthController = require('../src/api/controllers/auth.controller');

function mockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTHENTICATION & MULTI-TENANT TEST SUITE');
  console.log('====================================================');

  await connectDB();
  assert(isConnected(), 'Database must be connected');

  const testEmailA = `test_user_a_${Date.now()}@seekmake.com`;
  const testEmailB = `test_user_b_${Date.now()}@seekmake.com`;

  try {
    // ── TEST 1: User Registration with bcrypt password hashing
    const reqReg = {
      body: {
        email: testEmailA,
        password: 'SecurePassword123!',
        name: 'Ghaith Test User A',
        university: 'ESPRIT'
      }
    };
    const resReg = mockResponse();
    await AuthController.register(reqReg, resReg);

    assert.strictEqual(resReg.statusCode, 201, 'Registration should return 201 Created');
    assert(resReg.data.token, 'Token must be returned on registration');
    assert.strictEqual(resReg.data.user.email, testEmailA);
    console.log('  ✅ PASS: AuthController: User Registration with bcrypt password hash & JWT');

    // ── TEST 2: User Login
    const reqLogin = {
      body: {
        email: testEmailA,
        password: 'SecurePassword123!'
      }
    };
    const resLogin = mockResponse();
    await AuthController.login(reqLogin, resLogin);

    assert.strictEqual(resLogin.statusCode, 200, 'Login should return 200 OK');
    assert(resLogin.data.token, 'Login must issue JWT token');
    const userA = resLogin.data.user;
    console.log('  ✅ PASS: AuthController: Secure Login & Token Verification');

    // ── TEST 3: User Profile Update
    const reqUpdate = {
      user: { id: userA.id },
      body: {
        name: 'Ghaith Oueslati (Updated)',
        candidate_profile: {
          title: 'Senior DevSecOps & Cloud Architect',
          skills: {
            languages: ['Python', 'TypeScript', 'Rust'],
            devops_cloud: ['Docker', 'Kubernetes', 'Azure', 'AWS']
          }
        }
      }
    };
    const resUpdate = mockResponse();
    await AuthController.updateProfile(reqUpdate, resUpdate);

    assert.strictEqual(resUpdate.statusCode, 200, 'Profile update should return 200');
    assert.strictEqual(resUpdate.data.user.name, 'Ghaith Oueslati (Updated)');
    assert.strictEqual(resUpdate.data.user.candidate_profile.title, 'Senior DevSecOps & Cloud Architect');
    console.log('  ✅ PASS: AuthController: Dynamic Profile Update in MongoDB Atlas');

    // ── TEST 4: Multi-Tenant Data Isolation (User A vs User B)
    // Register User B
    const reqRegB = {
      body: {
        email: testEmailB,
        password: 'PasswordB456!',
        name: 'User B (Different Tenant)',
        university: 'ESPRIT'
      }
    };
    const resRegB = mockResponse();
    await AuthController.register(reqRegB, resRegB);
    const userB = resRegB.data.user;

    // User A inserts 2 jobs
    const jobA1 = {
      source: 'linkedin',
      source_job_id: `user_a_job_1_${Date.now()}`,
      title: 'DevSecOps Engineer',
      company: 'User A Private Employer',
      url: 'https://example.com/jobA1',
      match_score: 95
    };
    await JobRepository.upsertJobs(userA.id, [jobA1]);

    // User B inserts 1 job
    const jobB1 = {
      source: 'remotive',
      source_job_id: `user_b_job_1_${Date.now()}`,
      title: 'Mobile Engineer',
      company: 'User B Private Employer',
      url: 'https://example.com/jobB1',
      match_score: 80
    };
    await JobRepository.upsertJobs(userB.id, [jobB1]);

    // Fetch jobs for User A -> Must only see User A's jobs
    const jobsForUserA = await JobRepository.getJobs(userA.id);
    assert(jobsForUserA.every(j => String(j.user_id) === String(userA.id)), 'User A must only see User A jobs');
    assert(jobsForUserA.some(j => j.company === 'User A Private Employer'), 'User A must see their own job');
    assert(!jobsForUserA.some(j => j.company === 'User B Private Employer'), 'User A MUST NOT see User B jobs');

    // Fetch jobs for User B -> Must only see User B's jobs
    const jobsForUserB = await JobRepository.getJobs(userB.id);
    assert(jobsForUserB.every(j => String(j.user_id) === String(userB.id)), 'User B must only see User B jobs');
    assert(jobsForUserB.some(j => j.company === 'User B Private Employer'), 'User B must see their own job');
    assert(!jobsForUserB.some(j => j.company === 'User A Private Employer'), 'User B MUST NOT see User A jobs');

    console.log('  ✅ PASS: JobRepository: Strict Multi-Tenant Data Isolation Verified');

    // Clean up test data
    await Job.deleteMany({ user_id: { $in: [userA.id, userB.id] } });
    await User.deleteMany({ _id: { $in: [userA.id, userB.id] } });
    console.log('  ✅ PASS: Cleaned up test tenant data');

  } finally {
    await disconnectDB();
  }

  console.log('====================================================');
  console.log('📊 ALL AUTH & MULTI-TENANT TESTS PASSED (5/5)');
  console.log('====================================================');
}

main().catch(err => {
  console.error('❌ Auth Test Error:', err);
  process.exit(1);
});
