# CareerForge AI 🚀

<p align="center">
  <strong>Completely Free & Local AI-Powered Job Search, Scoring, and Application Automation Engine</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cost-$0%2Fmonth-brightgreen?style=for-the-badge&logo=dollar" alt="Cost $0/month">
  <img src="https://img.shields.io/badge/Docker-Supported-blue?style=for-the-badge&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/n8n-Self--Hosted-ff6d5a?style=for-the-badge&logo=n8n" alt="n8n">
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/OpenRouter-Free%20Tier-purple?style=for-the-badge" alt="OpenRouter">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

---

## 💡 Overview

**CareerForge AI** is a production-grade, self-hosted job search and application preparation platform. It continuously scans permitted public job sources worldwide, filters non-relevant roles deterministically to save AI quota, evaluates remaining engineering roles against your CV using free OpenRouter LLM models (`openrouter/free`), generates customized application packages, and notifies you via Telegram.

### 🎯 Supported Engineering Focus Areas
- **DevSecOps Engineer**
- **DevOps Engineer**
- **Backend Engineer** (Node.js / NestJS / Spring Boot / Python / .NET)
- **Cloud & Platform Engineer** (AWS / Azure / GCP)
- **Site Reliability Engineer (SRE)**
- **Infrastructure & CI/CD Engineer**

---

## ✨ Key Features

- 🆓 **100% Free to Operate**: Zero paid SaaS subscriptions required. Uses self-hosted n8n, local PostgreSQL, and OpenRouter free models (`openrouter/free`).
- ⚡ **Deterministic Pre-Filtering**: Filters out non-technical roles, mandatory non-English postings, and excessive seniority requirements *before* hitting AI APIs.
- 🛡️ **Zero-Hallucination CV Customization**: Customizes professional summaries, orders skills, and drafts cover notes using **only** facts present in your base CV.
- 📱 **Telegram Bot Integration**: Delivers instant alerts with score visualizers (`████████░░ 85%`) and interactive action buttons (*View Job*, *View Application*, *Mark Applied*, *Skip*).
- 📊 **Real-time Glassmorphism Dashboard**: Dark-mode dashboard built with Node.js & Express to inspect match history, applications, pipeline logs, and live stats.
- 🛡️ **Ethical & Permitted**: Operates strictly via legal public APIs and RSS feeds (RemoteOK, Remotive, WeWorkRemotely, Arbeitnow). **No anti-bot evasion, no LinkedIn scraping, no mass automated submissions.**

---

## 🏗️ Architecture

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
                       │  Deterministic Pre-Filter│ (Zero AI Cost)
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
                       │ 04-job-ai-analysis.json │ ◄── Daily Quota Guard
                       └────────────┬────────────┘
                                    │ Call OpenRouter (Free Model)
                                    ▼
                       ┌─────────────────────────┐
                       │ 05-application-gen.json │ (Score >= 70%)
                       └────────────┬────────────┘
                                    │ Tailor Bullets & Cover Note
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

---

## 💰 Cost Breakdown Guarantee

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Workflow Automation | Self-Hosted n8n (Docker) | **$0.00** |
| Relational Storage | Self-Hosted PostgreSQL 16 (Docker) | **$0.00** |
| AI Inference | OpenRouter (`openrouter/free`) | **$0.00** |
| Instant Alerts | Telegram Bot API | **$0.00** |
| Web Dashboard | Local Node.js Express Server | **$0.00** |
| Job Data Feeds | Permitted Public APIs & RSS Feeds | **$0.00** |
| **Total** | | **$0.00 / month** |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.
- [Git](https://git-scm.com/) installed.
- Free [OpenRouter API Key](https://openrouter.ai/keys).
- [Telegram Bot Token](https://t.me/BotFather) & Chat ID (via [@userinfobot](https://t.me/userinfobot)).

### 1. Clone the Repository
```bash
git clone https://github.com/ghayth002/CareerForge-AI.git
cd CareerForge-AI
```

### 2. Run Setup Wizard (Windows PowerShell)
```powershell
.\scripts\setup.ps1 -Wizard
```

*(Or on Linux/macOS)*:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```env
POSTGRES_USER=jobhunter
POSTGRES_PASSWORD=changeme_strong_password
POSTGRES_DB=ai_job_hunter

OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

### 4. Launch Services
```bash
docker compose up -d
```

Access services:
- 📊 **Dashboard**: [http://localhost:3000](http://localhost:3000)
- 🔧 **n8n Automation**: [http://localhost:5678](http://localhost:5678)

---

## 🔧 n8n Workflows Setup

1. Open n8n at `http://localhost:5678`.
2. Login with credentials set in `.env` (`N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`).
3. Add mandatory credentials:
   - **OpenRouter**: `HTTP Header Auth` → Header: `Authorization` → Value: `Bearer YOUR_KEY`
   - **Telegram**: `Telegram API` → Token: `YOUR_BOT_TOKEN`
   - **PostgreSQL**: `PostgreSQL` → Host: `postgres`, DB: `ai_job_hunter`
4. Import workflow JSON files from `n8n/workflows/`:
   - `00-master-job-agent.json` (Master Orchestrator - 8AM Cron)
   - `01-job-discovery.json` (Discovery & Pre-Filter)
   - `04-job-ai-analysis.json` (AI Match Scoring)
   - `05-application-generator.json` (CV & Cover Note Tailoring)
   - `06-telegram-notification.json` (Instant Notifications)
   - `07-daily-summary.json` (Evening Summary - 8PM Cron)

---

## 🧪 Testing

Run the automated test suite (33 unit tests for pre-filter, deduplication, JSON parser, and score weights):
```bash
node tests/pipeline.test.js
```

Run a live end-to-end pipeline test with real public jobs & OpenRouter AI:
```bash
node scripts/test-pipeline-live.js
```

---

## 📂 Repository Structure

```
CareerForge-AI/
├── docker-compose.yml           # PostgreSQL, n8n & Dashboard containers
├── .env.example                 # Environment template with placeholders
├── .gitignore                   # Excludes secrets, binaries, and logs
├── README.md                    # Project documentation
│
├── n8n/
│   ├── workflows/               # 8 importable n8n workflow JSON files
│   └── prompts/                 # Recruiter AI prompt templates
│
├── database/
│   ├── schema.sql               # PostgreSQL schema (tables, views, triggers)
│   └── seed.sql                 # Weight configuration & sample datasets
│
├── config/
│   ├── candidate.json           # Candidate profile, skills, and target roles
│   ├── job_sources.json         # Modular job source registry
│   └── scoring.json             # Weight distribution rules (sum = 100%)
│
├── dashboard/
│   ├── Dockerfile
│   ├── server.js                # Express REST API
│   └── public/index.html        # Glassmorphism UI
│
├── scripts/
│   ├── setup.ps1                # PowerShell setup wizard for Windows
│   ├── setup.sh                 # Shell setup script for Linux/macOS
│   ├── backup.sh                # PostgreSQL database backup tool
│   └── test-pipeline-live.js    # Live pipeline execution test
│
└── tests/
    └── pipeline.test.js         # 33-test automated test suite
```

---

## 🛡️ License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<p align="center">
  Developed by <strong><a href="https://github.com/ghayth002">Ghaith Oueslati</a></strong> — DevSecOps & Backend Engineer
</p>
