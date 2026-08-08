# Setup & Deployment Guide

## Windows Setup

Run the setup wizard in PowerShell:
```powershell
cd ai-job-hunter
.\scripts\setup.ps1 -Wizard
```

## Linux/MacOS Setup

```bash
cd ai-job-hunter
cp .env.example .env
docker compose up -d
```

## n8n Credential Configuration

1. **OpenRouter API Credential**:
   - Header Name: `Authorization`
   - Header Value: `Bearer <YOUR_OPENROUTER_KEY>`

2. **Telegram Credential**:
   - Bot Token: `<YOUR_TELEGRAM_BOT_TOKEN>`

3. **PostgreSQL Credential**:
   - Host: `postgres`
   - Database: `ai_job_hunter`
   - User: `jobhunter`
   - Password: `<YOUR_POSTGRES_PASSWORD>`
