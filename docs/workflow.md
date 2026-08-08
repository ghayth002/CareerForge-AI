# n8n Workflows Documentation

## Workflow Overview

1. **`00-master-job-agent.json`**: Master orchestrator running on a 24-hour cron (default 8AM).
2. **`01-job-discovery.json`**: Fetches jobs from RemoteOK, Remotive, Arbeitnow, and WeWorkRemotely RSS. Pre-filters non-engineering jobs and deduplicates entries.
3. **`04-job-ai-analysis.json`**: Checks daily AI request quota, constructs structured prompt using candidate profile from CV, calls OpenRouter free model, and updates job match scores.
4. **`05-application-generator.json`**: For jobs matching ≥70%, generates tailored summary, optimized CV bullets, customized skill ordering, and cover note.
5. **`06-telegram-notification.json`**: Sends rich Telegram alert with match breakdown scorebars and quick action buttons.
6. **`07-daily-summary.json`**: Evening cron trigger (8PM) sending daily digest report to Telegram.
