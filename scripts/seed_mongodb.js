/**
 * CareerForge AI — Initial MongoDB Atlas Data Seeder
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../src/core/database');
const JobRepository = require('../src/services/db/job.repository');

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  await connectDB();

  const samplePath = path.join(__dirname, '../data/jobs/sample/sample_jobs.json');
  if (fs.existsSync(samplePath)) {
    const rawData = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
    const jobs = Array.isArray(rawData) ? rawData : (rawData.jobs || []);
    console.log(`Seeding ${jobs.length} sample jobs to MongoDB Atlas...`);
    const count = await JobRepository.upsertJobs(jobs);
    console.log(`✅ Successfully synced ${count} jobs to MongoDB Atlas!`);
  } else {
    console.log('No sample_jobs.json found to seed.');
  }

  await disconnectDB();
}

seed().catch(console.error);
