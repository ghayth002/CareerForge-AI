# ==============================================================
# AI Job Hunter - Windows PowerShell Setup Script
# Run this after cloning the repository
# ==============================================================

param(
    [switch]$SkipDocker,
    [switch]$Wizard
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     🎯 AI Job Hunter — Setup Wizard          ║" -ForegroundColor Cyan
Write-Host "  ║     Ghaith Oueslati — Job Search Platform    ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# ── Step 1: Check Prerequisites ──────────────────────────────
Write-Host "[ STEP 1 ] Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "  ✓ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker not found. Please install Docker Desktop from https://docker.com" -ForegroundColor Red
    exit 1
}

# Check Docker is running
try {
    docker ps | Out-Null
    Write-Host "  ✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "  ✓ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Git not found (optional for this step)" -ForegroundColor Yellow
}

Write-Host ""

# ── Step 2: Create .env file ──────────────────────────────────
Write-Host "[ STEP 2 ] Setting up environment configuration..." -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "  .env already exists. Skipping..." -ForegroundColor Yellow
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "  ✓ .env created from .env.example" -ForegroundColor Green
    
    # Generate a random encryption key
    $encKey = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $dashSecret = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
    
    # Read and update .env
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace "changeme_generate_with_openssl_rand_hex_32", $encKey
    $envContent = $envContent -replace "changeme_dashboard_secret", $dashSecret
    Set-Content ".env" $envContent
    
    Write-Host "  ✓ Generated random encryption keys" -ForegroundColor Green
}

Write-Host ""

# ── Step 3: Collect secrets (Wizard mode) ────────────────────
if ($Wizard) {
    Write-Host "[ STEP 3 ] Configuration Wizard" -ForegroundColor Yellow
    Write-Host "  (Press Enter to skip any field and configure it later in .env)" -ForegroundColor Gray
    Write-Host ""
    
    $openrouterKey = Read-Host "  OpenRouter API Key (get free at openrouter.ai/keys)"
    $telegramToken = Read-Host "  Telegram Bot Token (from @BotFather)"
    $telegramChatId = Read-Host "  Telegram Chat ID (from @userinfobot)"
    $minScore = Read-Host "  Minimum match score to notify (default: 70)"
    $aiModel = Read-Host "  OpenRouter model (default: meta-llama/llama-3.1-8b-instruct:free)"
    
    $envContent = Get-Content ".env" -Raw
    
    if ($openrouterKey) {
        $envContent = $envContent -replace "your_openrouter_api_key_here", $openrouterKey
        Write-Host "  ✓ OpenRouter API key set" -ForegroundColor Green
    }
    if ($telegramToken) {
        $envContent = $envContent -replace "your_telegram_bot_token_here", $telegramToken
        Write-Host "  ✓ Telegram bot token set" -ForegroundColor Green
    }
    if ($telegramChatId) {
        $envContent = $envContent -replace "your_telegram_chat_id_here", $telegramChatId
        Write-Host "  ✓ Telegram chat ID set" -ForegroundColor Green
    }
    if ($minScore) {
        $envContent = $envContent -replace "MIN_MATCH_SCORE=70", "MIN_MATCH_SCORE=$minScore"
    }
    if ($aiModel) {
        $envContent = $envContent -replace "OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free", "OPENROUTER_MODEL=$aiModel"
    }
    
    Set-Content ".env" $envContent
} else {
    Write-Host "[ STEP 3 ] Skipping wizard. Edit .env manually." -ForegroundColor Yellow
    Write-Host "  → Open .env and fill in: OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID" -ForegroundColor Gray
}

Write-Host ""

# ── Step 4: Create required directories ──────────────────────
Write-Host "[ STEP 4 ] Creating data directories..." -ForegroundColor Yellow

$dirs = @(
    "data\cv\base",
    "data\cv\customized",
    "data\jobs\sample",
    "data\applications",
    "logs"
)

foreach ($dir in $dirs) {
    $path = Join-Path $ProjectRoot $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
        Write-Host "  ✓ Created $dir" -ForegroundColor Green
    }
}

Write-Host ""

# ── Step 5: Start Docker services ────────────────────────────
if (-not $SkipDocker) {
    Write-Host "[ STEP 5 ] Starting Docker services..." -ForegroundColor Yellow
    Write-Host "  This may take a few minutes on first run (downloading images)..." -ForegroundColor Gray
    Write-Host ""
    
    try {
        docker compose up -d --build
        Write-Host ""
        Write-Host "  ✓ Docker services started" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to start Docker services: $_" -ForegroundColor Red
        Write-Host "  Try: docker compose logs" -ForegroundColor Gray
        exit 1
    }
    
    # ── Step 6: Wait for health checks ───────────────────────
    Write-Host ""
    Write-Host "[ STEP 6 ] Waiting for services to be healthy..." -ForegroundColor Yellow
    
    $maxWait = 120
    $waited = 0
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 5
        $waited += 5
        
        try {
            $pgReady = docker exec ai-job-hunter-postgres pg_isready -U jobhunter 2>&1
            if ($pgReady -match "accepting connections") {
                Write-Host "  ✓ PostgreSQL is ready ($waited s)" -ForegroundColor Green
                break
            }
        } catch {}
        
        Write-Host "  ... waiting for PostgreSQL ($waited/$maxWait s)" -ForegroundColor Gray
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "  ⚠ PostgreSQL took too long. Check: docker compose logs postgres" -ForegroundColor Yellow
    }
    
    # Check n8n
    Write-Host "  Checking n8n..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
    
    try {
        $n8nHealth = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -TimeoutSec 5 -UseBasicParsing 2>&1
        Write-Host "  ✓ n8n is responding" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ n8n may still be starting. Wait 30s then check http://localhost:5678" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║     ✅ Setup Complete!                        ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Fill in .env with your API keys (if not using --Wizard)" -ForegroundColor Cyan
Write-Host "     → OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Open n8n: http://localhost:5678" -ForegroundColor Cyan
Write-Host "     → Login: admin / (your N8N_BASIC_AUTH_PASSWORD from .env)" -ForegroundColor Gray
Write-Host "     → Settings → Credentials → Add OpenRouter (HTTP Header Auth)" -ForegroundColor Gray
Write-Host "     → Settings → Credentials → Add Telegram Bot" -ForegroundColor Gray
Write-Host "     → Settings → Credentials → Add PostgreSQL (host=postgres, db=ai_job_hunter)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Import workflows from n8n/workflows/*.json" -ForegroundColor Cyan
Write-Host "     → n8n → Workflows → Import from File" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Open Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  5. Run first test:" -ForegroundColor Cyan
Write-Host "     → In n8n, open '01 - Job Discovery' workflow" -ForegroundColor Gray
Write-Host "     → Click 'Execute Workflow'" -ForegroundColor Gray
Write-Host "     → Check dashboard for results" -ForegroundColor Gray
Write-Host ""
Write-Host "  Docker commands:" -ForegroundColor White
Write-Host "  docker compose logs -f          # View all logs" -ForegroundColor Gray
Write-Host "  docker compose logs n8n         # n8n logs only" -ForegroundColor Gray
Write-Host "  docker compose restart n8n      # Restart n8n" -ForegroundColor Gray
Write-Host "  docker compose down             # Stop everything" -ForegroundColor Gray
Write-Host ""
