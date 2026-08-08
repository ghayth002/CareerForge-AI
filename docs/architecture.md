# System Architecture — AI Job Hunter

```
                       ┌─────────────────────────┐
                       │   Job Source Adapters   │
                       │ (RemoteOK, Remotive,    │
                       │  WeWorkRemotely, EU)    │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │ 01-job-discovery.json   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Deterministic Pre-Filter│ (No AI Cost)
                       └────────────┬────────────┘
                                    │ Passed
                                    ▼
                       ┌─────────────────────────┐
                       │ Deduplication Engine    │ (source + job_id)
                       └────────────┬────────────┘
                                    │ Unique
                                    ▼
                       ┌─────────────────────────┐
                       │ PostgreSQL Database     │
                       └────────────┬────────────┘
                                    │ Unanalyzed
                                    ▼
                       ┌─────────────────────────┐
                       │ 04-job-ai-analysis.json │ ◄── Quota Guard (50/day)
                       └────────────┬────────────┘
                                    │ Call OpenRouter (Free Model)
                                    ▼
                       ┌─────────────────────────┐
                       │ 05-application-gen.json │ (Score >= 70%)
                       └────────────┬────────────┘
                                    │ Generate CV Bullets + Cover Note
                                    ▼
                       ┌─────────────────────────┐
                       │ 06-telegram-notif.json  │ ──► Send Telegram Alert
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │ Express & Web Dashboard │ (Port 3000)
                       └─────────────────────────┘
```

## Security & Privacy
- Zero cloud database dependencies (everything local in PostgreSQL).
- Secrets stored in `.env` outside source control.
- Free-tier rate limiting & quota guarding to keep costs $0 forever.
