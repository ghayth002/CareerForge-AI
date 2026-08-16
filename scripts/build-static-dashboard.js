/**
 * CareerForge AI — Static Dashboard Encrypted Build Script
 * Refactored to delegate to PublisherService & SecurityService.
 */

const fs = require('fs');
const path = require('path');
const config = require('../src/core/config');
const { logger } = require('../src/core/logger');
const PublisherService = require('../src/services/publisher/publisher.service');

function build() {
  logger.banner('🔨 BUILDING STATIC ENCRYPTED DASHBOARD BUNDLE');
  
  // Load sample jobs or existing jobs database
  let jobs = [];
  const samplePath = config.paths.sampleJobs;
  if (fs.existsSync(samplePath)) {
    try {
      jobs = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
    } catch (e) {
      logger.warn(`Could not load sample jobs: ${e.message}`);
    }
  }

  const publisher = new PublisherService(config);
  const result = publisher.publishEncryptedBundle(jobs, config.candidate);

  logger.banner(`✨ Build successfully created at ${result.encryptedPath}`);
}

if (require.main === module) {
  build();
}

module.exports = { build };
