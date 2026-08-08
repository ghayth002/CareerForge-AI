-- ==================================================
-- AI Job Hunter - Seed Data
-- ==================================================

-- ── Scoring weights ────────────────────────────────
INSERT INTO scoring_config (weight_name, weight_value, description) VALUES
    ('technical',   35, 'Technical skills overlap with job requirements'),
    ('experience',  25, 'Relevant experience and project history'),
    ('seniority',   15, 'Seniority level match (junior/mid/senior)'),
    ('cloud',       10, 'Cloud/DevOps tooling compatibility'),
    ('language',     5, 'Spoken language requirements match'),
    ('location',     5, 'Location/remote preference match'),
    ('visa',         5, 'Visa/work authorization eligibility')
ON CONFLICT (weight_name) DO UPDATE
    SET weight_value = EXCLUDED.weight_value;

-- ── AI usage tracker for today ─────────────────────
INSERT INTO ai_usage (date, requests_made, requests_limit)
VALUES (CURRENT_DATE, 0, 50)
ON CONFLICT (date) DO NOTHING;

-- ── Sample jobs for testing ─────────────────────────
INSERT INTO jobs (
    source, source_job_id, company, title, location, remote,
    employment_type, url, description, posted_at, language,
    skills, status
) VALUES
(
    'sample', 'sample-001', 'TechCorp Berlin', 'DevSecOps Engineer',
    'Berlin, Germany', true, 'full-time',
    'https://example.com/job/1',
    'We are looking for a DevSecOps Engineer with experience in CI/CD, Docker, Kubernetes, and security tooling (SAST/DAST). You will work with our 8-person engineering team to integrate security into our development pipeline. Requirements: 2+ years DevOps/DevSecOps experience, experience with GitHub Actions or GitLab CI/CD, familiarity with OWASP ZAP, Trivy, or SonarQube, Docker and container security, Python or JavaScript scripting. Nice to have: Terraform, AWS/Azure/GCP, Kubernetes. We offer remote-first work, competitive salary, relocation support for EU candidates.',
    NOW() - INTERVAL '1 day',
    'en',
    '["Docker","GitLab CI/CD","OWASP ZAP","Trivy","Python","DevSecOps","Terraform","Azure"]'::jsonb,
    'DISCOVERED'
),
(
    'sample', 'sample-002', 'CloudBase Amsterdam', 'Backend Engineer (Node.js)',
    'Amsterdam, Netherlands', true, 'full-time',
    'https://example.com/job/2',
    'Join our backend team building scalable microservices. We use NestJS, PostgreSQL, MongoDB, and deploy on AWS. You will design REST APIs, optimize database performance, and maintain CI/CD pipelines. Requirements: 1+ years backend development, NestJS or Express.js, MongoDB or PostgreSQL, REST API design, Docker, Git. Nice to have: AWS, TypeScript, Redis, Microservices architecture.',
    NOW() - INTERVAL '2 days',
    'en',
    '["NestJS","Node.js","MongoDB","PostgreSQL","Docker","AWS","TypeScript","REST APIs"]'::jsonb,
    'DISCOVERED'
),
(
    'sample', 'sample-003', 'FinTech London', 'Platform Engineer',
    'London, UK', false, 'full-time',
    'https://example.com/job/3',
    'We are hiring a Platform Engineer to maintain and improve our cloud infrastructure. You will work on Kubernetes clusters, Terraform IaC, and CI/CD pipelines on AWS. Requirements: 3+ years platform/infrastructure experience, Kubernetes (EKS/AKS), Terraform, AWS or Azure, GitLab CI/CD or Jenkins, monitoring (Grafana/Prometheus). Must be eligible to work in UK. Sponsorship available for exceptional candidates.',
    NOW() - INTERVAL '3 days',
    'en',
    '["Kubernetes","Terraform","AWS","Azure","GitLab CI/CD","Grafana","Docker","Jenkins"]'::jsonb,
    'DISCOVERED'
),
(
    'sample', 'sample-004', 'StartupXYZ', 'Java Developer',
    'Paris, France', false, 'full-time',
    'https://example.com/job/4',
    'Looking for a Java Developer to build enterprise applications. Must speak French fluently. 5+ years Java experience required. Spring Boot, Oracle DB, Maven. On-site Paris only.',
    NOW() - INTERVAL '1 day',
    'fr',
    '["Java","Spring Boot","Oracle","Maven"]'::jsonb,
    'DISCOVERED'
),
(
    'sample', 'sample-005', 'RemoteFirst Inc', 'Cloud Engineer (AWS/Azure)',
    'Remote', true, 'full-time',
    'https://example.com/job/5',
    'Remote Cloud Engineer to help migrate our infrastructure to multi-cloud (AWS + Azure). You will write Terraform modules, set up CI/CD pipelines, work with container services. Requirements: AWS (EC2, Lambda, S3), Azure (Container Apps, Front Door, ACR), Terraform, Docker, CI/CD pipelines, scripting (Python/Bash). Nice to have: GCP, Kubernetes, GitOps.',
    NOW() - INTERVAL '4 hours',
    'en',
    '["AWS","Azure","Terraform","Docker","Python","CI/CD","Azure Container Apps","Azure Front Door"]'::jsonb,
    'DISCOVERED'
)
ON CONFLICT DO NOTHING;

-- Log the seed operation
INSERT INTO pipeline_logs (source, operation, status, message)
VALUES ('seed', 'DATABASE_SEEDED', 'SUCCESS', 'Initial seed data loaded successfully');
