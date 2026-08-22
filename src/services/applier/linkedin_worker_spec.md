# CareerForge AI — LinkedIn Auto-Apply Worker: Mode B Specification

> **Status**: Documentation / Contract Spec.
> This document defines the interface contract between the CareerForge AI SaaS API and the
> user-operated self-hosted Python/Selenium auto-apply worker.
> The SaaS server **never** hosts this bot. Users run it on their own machine.

---

## Overview

Mode B automates LinkedIn Easy Apply form submission using Selenium on the **user's machine**.
The CareerForge AI API provides:
- The job data and tailored screening answers (via API)
- An HMAC-secured webhook endpoint to receive results back

The worker provides:
- Browser automation (Selenium + Xvfb on Linux, or Chrome on Windows)
- LinkedIn session management (user supplies their own session cookie)
- `dry_run: true` default — stages the form and sends a Telegram confirmation before final submit

---

## Queue Message Schema (BullMQ Job Payload)

When the SaaS API enqueues a job for the worker via BullMQ/Redis:

```json
{
  "jobId": "64c3f1a2b89e3d00012a4b5c",
  "jobUrl": "https://www.linkedin.com/jobs/view/3987654321",
  "url_type": "direct",
  "resumePath": "/home/user/.careerforge/resume_ghaith_oueslati.pdf",
  "userId": "64a1c3e2b45f1d00012c3d4e",
  "webhookUrl": "https://your-api.onrender.com/api/webhooks/linkedin-apply",
  "webhookHmacSecret": "<WEBHOOK_HMAC_SECRET from .env>",
  "dryRun": true,
  "answers": {
    "years_of_experience_general": 2,
    "docker_years": 2,
    "python_years": 2,
    "visa_sponsorship": "No, I do not require visa sponsorship",
    "notice_period": "2 weeks / Immediate",
    "salary_expectation_eur": 50000,
    "comfortable_remote": "Yes",
    "willing_to_relocate": "Yes",
    "linkedin_url": "https://linkedin.com/in/ghayth-weslati-520394266/",
    "phone": "+216 94854835",
    "cover_note": "<cover_note from job document>"
  }
}
```

---

## Webhook Contract — Worker → API

After processing (success or failure), the worker POSTs to `POST /api/webhooks/linkedin-apply`:

### Request Headers
```
Content-Type: application/json
x-webhook-signature: sha256=<HMAC-SHA256-hex of raw body using WEBHOOK_HMAC_SECRET>
```

### Request Body
```json
{
  "jobId": "64c3f1a2b89e3d00012a4b5c",
  "userId": "64a1c3e2b45f1d00012c3d4e",
  "status": "APPLIED",
  "reason": null,
  "timestamp": "2026-08-22T22:00:00.000Z"
}
```

On failure:
```json
{
  "jobId": "...",
  "userId": "...",
  "status": "FAILED",
  "reason": "LinkedIn 2FA challenge triggered — manual intervention required",
  "timestamp": "..."
}
```

### Response
```json
{ "success": true, "message": "Job updated to APPLIED.", "processed_at": "..." }
```

---

## Credential & Security Model

- User credentials (LinkedIn email + password / session cookie) are **never** stored on the SaaS server.
- If the API needs to pass them: encrypt with `SecurityService.encryptPayload()` (AES-256-GCM)
  and decrypt **only** in worker memory at runtime. Never log decrypted credentials.
- The `WEBHOOK_HMAC_SECRET` is set by the user in their `.env` and shared with the worker
  out-of-band (e.g., copied to the worker's config file).

---

## Docker Compose — Worker Container (user-run)

Add to the user's local `docker-compose.yml`:

```yaml
services:
  linkedin-worker:
    build:
      context: ./worker
      dockerfile: Dockerfile.linkedin
    container_name: careerforge-linkedin-worker
    restart: unless-stopped
    environment:
      REDIS_URL: redis://redis:6379
      CAREERFORGE_API_URL: https://your-api.onrender.com
      WEBHOOK_HMAC_SECRET: ${WEBHOOK_HMAC_SECRET}
      LI_EMAIL: ${LI_EMAIL}       # User's LinkedIn email
      LI_PASS: ${LI_PASS}         # User's LinkedIn password (or use LI_SESSION_COOKIE)
      DRY_RUN: "true"             # Set false only after reviewing Telegram confirmations
      TZ: Africa/Tunis
    depends_on:
      - redis
    networks:
      - job-hunter-net
```

### Worker `Dockerfile.linkedin`
```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    chromium chromium-driver xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
ENV DISPLAY=:99

CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 & python worker.py"]
```

### `requirements.txt`
```
selenium==4.20.0
undetected-chromedriver==3.5.5
bullmq==0.3.9
requests==2.32.3
python-dotenv==1.0.1
```

---

## Dry-Run Flow (Default)

1. Worker dequeues job from Redis/BullMQ
2. Opens LinkedIn job page in headless Chrome
3. Clicks "Easy Apply", fills all form fields using `answers` from the queue payload
4. **Pauses before final "Submit" click**
5. Sends Telegram message: `"🔍 Ready to apply to {company} — {title}. Reply with /confirm_{jobId} to submit."`
6. Waits for Telegram confirmation (5-minute timeout)
7. On confirm: submits → POSTs APPLIED to webhook
8. On timeout: discards → POSTs FAILED to webhook

---

## Deployment Model

```
┌─────────────────────────────┐     queue     ┌───────────────────────┐
│  CareerForge AI SaaS API    │ ──────────→   │  Redis (BullMQ)       │
│  (Render.com, $0 infra)     │               │  (user's local Docker) │
└─────────────────────────────┘               └───────────────────────┘
         ▲  webhook (HMAC)                              │
         │                                             ▼
         └────────────────────────────── LinkedIn Worker (user's machine)
                                         Selenium + Xvfb + Python
```

The SaaS server acts as the job intelligence layer (discovery, scoring, CV tailoring).
The worker is a thin browser automation layer that users run locally with their own credentials.
No LinkedIn credentials ever leave the user's machine.
