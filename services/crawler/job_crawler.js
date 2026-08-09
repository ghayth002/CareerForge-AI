/**
 * SaaS Crawler Module — Multi-Source Job Discovery Engine
 * Supports: Remotive, RemoteOK, Arbeitnow EU/Italy/Tunisia, WeWorkRemotely RSS
 */

const fs = require('fs');
const path = require('path');

async function fetchLiveJobFeeds() {
  console.log('[ SaaS Crawler Module ] Fetching multi-source job feeds...');
  let rawJobs = [];

  // 1. Remotive API
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=40');
    if (res.ok) {
      const data = await res.json();
      const jobs = (data.jobs || []).map(j => ({
        source: 'remotive',
        source_job_id: String(j.id),
        company: j.company_name || 'Unknown',
        title: j.job_title || j.title || '',
        location: j.candidate_required_location || 'Remote',
        remote: true,
        employment_type: (j.job_type || 'full-time').toLowerCase(),
        url: j.url || '',
        description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
        language: 'en'
      }));
      rawJobs.push(...jobs);
      console.log(`  ✓ Remotive: ${jobs.length} jobs fetched`);
    }
  } catch (e) {
    console.log(`  ⚠ Remotive notice: ${e.message}`);
  }

  // 2. RemoteOK API
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'CareerForge-AI/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const jobs = data.slice(1, 30).filter(j => j.company && j.position).map(j => ({
          source: 'remoteok',
          source_job_id: String(j.id || j.slug || ''),
          company: j.company || 'Unknown',
          title: j.position || '',
          location: 'Remote',
          remote: true,
          employment_type: 'full-time',
          url: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
          description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
          language: 'en'
        }));
        rawJobs.push(...jobs);
        console.log(`  ✓ RemoteOK: ${jobs.length} jobs fetched`);
      }
    }
  } catch (e) {
    console.log(`  ⚠ RemoteOK notice: ${e.message}`);
  }

  // 3. Arbeitnow EU / Italy / Tunisia API
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        const jobs = data.data.slice(0, 40).map(j => ({
          source: 'arbeitnow_eu',
          source_job_id: String(j.slug || j.title || ''),
          company: j.company_name || 'Unknown',
          title: j.title || '',
          location: j.location || 'Europe / Remote',
          remote: j.remote || true,
          employment_type: (j.job_types || ['full-time'])[0] || 'full-time',
          url: j.url || '',
          description: (j.description || '').replace(/<[^>]+>/g, ' ').substring(0, 4000),
          language: 'en'
        }));
        rawJobs.push(...jobs);
        console.log(`  ✓ Arbeitnow EU/Italy/Tunisia: ${jobs.length} jobs fetched`);
      }
    }
  } catch (e) {
    console.log(`  ⚠ Arbeitnow notice: ${e.message}`);
  }

  // 4. WeWorkRemotely RSS
  try {
    const res = await fetch('https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss');
    if (res.ok) {
      const xml = await res.text();
      const itemMatches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<description>(.*?)<\/description>[\s\S]*?<\/item>/g)];
      const jobs = itemMatches.slice(0, 25).map(m => {
        const titleParts = (m[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').split(': ');
        return {
          source: 'weworkremotely',
          source_job_id: (m[2] || '').trim(),
          company: titleParts[0] ? titleParts[0].trim() : 'Remote Tech',
          title: titleParts[1] ? titleParts[1].trim() : titleParts[0].trim(),
          location: 'Worldwide Remote / EU / Italy',
          remote: true,
          employment_type: 'full-time',
          url: (m[2] || '').trim(),
          description: (m[3] || '').replace(/<!\[CDATA\[|\]\]>|<[^>]+>/g, ' ').substring(0, 4000),
          language: 'en'
        };
      });
      rawJobs.push(...jobs);
      console.log(`  ✓ WeWorkRemotely: ${jobs.length} jobs fetched`);
    }
  } catch (e) {
    console.log(`  ⚠ WWR notice: ${e.message}`);
  }

  return rawJobs;
}

module.exports = { fetchLiveJobFeeds };
