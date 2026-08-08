-- ==================================================
-- AI Job Hunter - PostgreSQL Schema
-- ==================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- JOBS TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS jobs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source              VARCHAR(100) NOT NULL,
    source_job_id       VARCHAR(500),
    company             VARCHAR(255) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    location            VARCHAR(500),
    remote              BOOLEAN DEFAULT FALSE,
    employment_type     VARCHAR(100),    -- full-time, part-time, contract, internship
    url                 TEXT NOT NULL,
    description         TEXT,
    salary              VARCHAR(500),
    posted_at           TIMESTAMPTZ,
    discovered_at       TIMESTAMPTZ DEFAULT NOW(),
    language            VARCHAR(50) DEFAULT 'en',
    -- Extracted skills (JSON array of strings)
    skills              JSONB DEFAULT '[]'::jsonb,
    -- AI Scores (0-100)
    match_score         NUMERIC(5,2) DEFAULT 0,
    technical_score     NUMERIC(5,2) DEFAULT 0,
    experience_score    NUMERIC(5,2) DEFAULT 0,
    location_score      NUMERIC(5,2) DEFAULT 0,
    language_score      NUMERIC(5,2) DEFAULT 0,
    seniority_score     NUMERIC(5,2) DEFAULT 0,
    visa_score          NUMERIC(5,2) DEFAULT 0,
    -- AI Analysis (JSON)
    strengths           JSONB DEFAULT '[]'::jsonb,
    missing_skills      JSONB DEFAULT '[]'::jsonb,
    risks               JSONB DEFAULT '[]'::jsonb,
    ai_reasoning        TEXT,
    -- Pipeline status
    status              VARCHAR(50) DEFAULT 'DISCOVERED',
    ai_analyzed         BOOLEAN DEFAULT FALSE,
    ai_analyzed_at      TIMESTAMPTZ,
    filter_passed       BOOLEAN,
    filter_reason       TEXT,
    -- Metadata
    raw_data            JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    -- Deduplication constraints
    CONSTRAINT uq_source_job UNIQUE (source, source_job_id)
);

-- Secondary deduplication index (company+title+url)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_company_title_url
    ON jobs (company, title, url)
    WHERE source_job_id IS NULL OR source_job_id = '';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_match_score   ON jobs (match_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status        ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_discovered_at ON jobs (discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source        ON jobs (source);
CREATE INDEX IF NOT EXISTS idx_jobs_remote        ON jobs (remote);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at     ON jobs (posted_at DESC);

-- ==================================================
-- APPLICATIONS TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score         NUMERIC(5,2),
    -- AI-Generated content
    custom_summary      TEXT,
    custom_bullets      JSONB DEFAULT '[]'::jsonb,   -- Array of bullet strings
    skills_ordering     JSONB DEFAULT '[]'::jsonb,   -- Ordered skill list
    cover_note          TEXT,
    -- Generated CV file paths
    cv_markdown_path    TEXT,
    cv_txt_path         TEXT,
    -- Tracking
    status              VARCHAR(50) DEFAULT 'READY',
    application_url     TEXT,
    applied_at          TIMESTAMPTZ,
    notes               TEXT,
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_application_per_job UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id    ON applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status    ON applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_score     ON applications (match_score DESC);

-- ==================================================
-- PIPELINE LOGS TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS pipeline_logs (
    id              BIGSERIAL PRIMARY KEY,
    run_id          UUID DEFAULT uuid_generate_v4(),
    timestamp       TIMESTAMPTZ DEFAULT NOW(),
    source          VARCHAR(100),
    job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
    operation       VARCHAR(200) NOT NULL,
    status          VARCHAR(50) NOT NULL,  -- SUCCESS, FAILURE, SKIP, INFO
    message         TEXT,
    ai_tokens_used  INTEGER DEFAULT 0,
    duration_ms     INTEGER,
    error_details   JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_run_id    ON pipeline_logs (run_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON pipeline_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_status    ON pipeline_logs (status);
CREATE INDEX IF NOT EXISTS idx_logs_job_id    ON pipeline_logs (job_id);

-- ==================================================
-- AI USAGE TRACKING TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS ai_usage (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    requests_made   INTEGER DEFAULT 0,
    requests_limit  INTEGER DEFAULT 50,
    tokens_used     INTEGER DEFAULT 0,
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_ai_usage_date UNIQUE (date)
);

-- ==================================================
-- SCORING CONFIG TABLE (overrides scoring.json)
-- ==================================================
CREATE TABLE IF NOT EXISTS scoring_config (
    id              SERIAL PRIMARY KEY,
    weight_name     VARCHAR(100) NOT NULL UNIQUE,
    weight_value    NUMERIC(5,2) NOT NULL,
    description     TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ==================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- VIEWS
-- ==================================================

-- Dashboard stats view
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    COUNT(*)                                                          AS total_jobs,
    COUNT(*) FILTER (WHERE discovered_at::date = CURRENT_DATE)       AS discovered_today,
    COUNT(*) FILTER (WHERE match_score >= 70)                        AS matched_70_plus,
    COUNT(*) FILTER (WHERE match_score >= 80)                        AS matched_80_plus,
    COUNT(*) FILTER (WHERE match_score >= 90)                        AS matched_90_plus,
    COUNT(*) FILTER (WHERE remote = true)                            AS remote_jobs,
    COUNT(*) FILTER (WHERE ai_analyzed = true)                       AS ai_analyzed,
    COUNT(*) FILTER (WHERE status = 'REJECTED')                      AS rejected,
    AVG(match_score) FILTER (WHERE match_score > 0)                  AS avg_match_score
FROM jobs;

-- Top matches view
CREATE OR REPLACE VIEW v_top_matches AS
SELECT
    j.id, j.company, j.title, j.location, j.remote, j.url,
    j.match_score, j.technical_score, j.experience_score,
    j.strengths, j.missing_skills,
    j.status, j.discovered_at, j.posted_at,
    a.status AS application_status,
    a.cover_note,
    a.custom_summary
FROM jobs j
LEFT JOIN applications a ON a.job_id = j.id
WHERE j.match_score >= 70
ORDER BY j.match_score DESC, j.discovered_at DESC;

-- Application pipeline view
CREATE OR REPLACE VIEW v_application_pipeline AS
SELECT
    a.id AS application_id,
    j.company, j.title, j.location, j.remote, j.url,
    a.match_score,
    a.status,
    a.cover_note,
    a.custom_summary,
    a.custom_bullets,
    a.skills_ordering,
    a.cv_markdown_path,
    a.applied_at,
    a.notes,
    a.created_at
FROM applications a
JOIN jobs j ON j.id = a.job_id
ORDER BY a.match_score DESC, a.created_at DESC;
