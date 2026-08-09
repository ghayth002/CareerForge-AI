#!/usr/bin/env python3
"""
CareerForge AI — ATS-Optimized LaTeX CV Generator
Generates a tailored LaTeX CV from the template, compiles to PDF.
Usage: python scripts/generate_latex_cv.py --company "Acme" --title "DevSecOps Engineer" --description "..."
"""

import os, sys, json, re, subprocess, tempfile, shutil, argparse, urllib.request, urllib.parse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ── Config ──────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_PATH = os.path.join(ROOT, "config", "cv_template.tex")
CV_OUT_DIR    = os.path.join(ROOT, "data", "cv", "customized")
BASE_CV_PDF   = os.path.join(ROOT, "data", "cv", "base", "Ghaith_Oueslati_CV.pdf")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
os.makedirs(CV_OUT_DIR, exist_ok=True)

# ── Full base skills line (default order) ───────────────────────────────────
BASE_SKILLS = """\
     \\textbf{Languages:} JavaScript, TypeScript, Python, Java, C\\#, C++, C, PL/SQL, SQL \\\\
     \\textbf{Frameworks:} React, Angular, Node.js, NestJS, Spring Boot, .NET, Flutter, Django, Laravel, Symfony \\\\
     \\textbf{Databases:} MySQL, MongoDB, PostgreSQL, Redis \\\\
     \\textbf{DevOps \\& Cloud:} Docker, Terraform, GitHub Actions, GitLab CI/CD, AWS (EC2, Lambda, Secrets Manager), Azure (Container Apps, Front Door, ACR), GCP (Cloud Run, GAR) \\\\
     \\textbf{Security:} OWASP ZAP, Trivy, SonarQube, SAST/DAST automation, Keycloak, JWT \\\\
     \\textbf{Tools:} Jenkins, Git, Swagger, Postman, Grafana, Figma \\\\
     \\textbf{Concepts:} REST APIs, Microservices, CI/CD Automation, DevSecOps, Agile/Scrum, Blue/Green Deployments, Infrastructure as Code"""


def sanitize_latex(text: str) -> str:
    """Escape special LaTeX characters safely."""
    replacements = [
        ("&",  r"\&"),
        ("%",  r"\%"),
        ("$",  r"\$"),
        ("#",  r"\#"),
        ("_",  r"\_"),
        ("^",  r"\^{}"),
        ("~",  r"\textasciitilde{}"),
        ("<",  r"\textless{}"),
        (">",  r"\textgreater{}"),
        ("\\textbf{", "{{BOLD_OPEN}}"),   # protect existing \textbf
    ]
    # Protect existing LaTeX commands first
    text = text.replace("\\textbf{", "\x00BOPEN\x00")
    text = text.replace("\\%", "\x00PCT\x00")
    for char, repl in [("&", r"\&"), ("%", r"\%"), ("$", r"\$"), ("#", r"\#"),
                       ("_", r"\_")]:
        text = text.replace(char, repl)
    text = text.replace("\x00BOPEN\x00", "\\textbf{")
    text = text.replace("\x00PCT\x00", "\\%")
    return text


def call_openrouter(prompt: str) -> str:
    """Call OpenRouter API and return text response."""
    if not OPENROUTER_API_KEY:
        return ""
    payload = json.dumps({
        "model": "openrouter/free",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 800
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ghayth002.github.io/CareerForge-AI/",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"  ⚠ OpenRouter call failed: {e}")
        return ""


def generate_tailored_content(company: str, title: str, description: str) -> dict:
    """Ask AI to generate ATS-optimized Summary and reordered Skills for this job."""

    prompt = f"""You are writing a LaTeX resume for Ghaith Oueslati, a DevSecOps & Backend Engineer.

JOB TARGET:
Company: {company}
Title: {title}
Job Description (first 1500 chars): {description[:1500]}

CANDIDATE FACTS (do NOT invent metrics):
- Cut CI/CD security triage by 60% with Gemini API + OWASP ZAP/Trivy
- Reduced backend API latency by 83% via MongoDB optimization + Redis caching
- Built AI test generator agent 5200+ lines, 75%+ unit test coverage with Vertex AI
- Migrated 38+ CI/CD workflows GitHub Actions → GitLab CI/CD
- Migrated 8/12 microservices GCP Cloud Run → Azure Container Apps
- Currently at SeekMake as DevSecOps & Backend Engineer (Jan 2026–Present)
- Graduating ESPRIT June 2026 (B.Eng Computer Engineering)
- Italian B2 certified (CISIA)

WRITING RULES:
- NO AI clichés: NO "thrilled", "passionate", "dynamic", "fast-paced", "leverage", "spearhead"
- Sound like a real senior engineer — direct, metric-focused, concise
- Summary: 2-3 sentences max, mention the specific role title naturally, include 2-3 keywords from the job description naturally
- Skills highlight: list the 3-5 most relevant skill CATEGORIES for this job first (in LaTeX \\textbf{{Category:}} format), using only skills from the candidate's actual list

Return ONLY valid JSON:
{{
  "summary": "2-3 sentence ATS-optimized summary referencing the role and company type",
  "top_skills_order": ["DevOps & Cloud", "Security", "Languages", "Frameworks", "Databases", "Tools"]
}}"""

    raw = call_openrouter(prompt)
    if not raw:
        return {}
    
    # Parse JSON from response
    try:
        match = re.search(r'\{[\s\S]*\}', raw)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {}


def build_skills_section(top_skills_order: list) -> str:
    """Reorder the skills section based on job priority."""
    skill_map = {
        "Languages":     "\\textbf{Languages:} JavaScript, TypeScript, Python, Java, C\\#, C++, PL/SQL, SQL",
        "Frameworks":    "\\textbf{Frameworks:} NestJS, Node.js, React, Angular, Spring Boot, .NET, Django, Flutter",
        "Databases":     "\\textbf{Databases:} MongoDB, PostgreSQL, MySQL, Redis",
        "DevOps & Cloud":"\\textbf{DevOps \\& Cloud:} Docker, Terraform, GitHub Actions, GitLab CI/CD, AWS (EC2, Lambda, Secrets Manager), Azure (Container Apps, Front Door, ACR), GCP (Cloud Run)",
        "Security":      "\\textbf{Security:} OWASP ZAP, Trivy, SonarQube, SAST/DAST automation, Keycloak, JWT",
        "Tools":         "\\textbf{Tools:} Jenkins, Git, Swagger, Postman, Grafana, Figma",
        "Concepts":      "\\textbf{Concepts:} REST APIs, Microservices, CI/CD Automation, DevSecOps, Agile/Scrum, Blue/Green Deployments, IaC"
    }
    ordered = []
    seen = set()
    for key in (top_skills_order or []):
        for k in skill_map:
            if k.lower() in key.lower() or key.lower() in k.lower():
                if k not in seen:
                    ordered.append(skill_map[k])
                    seen.add(k)
    for k, v in skill_map.items():
        if k not in seen:
            ordered.append(v)
    return " \\\\\n     ".join(ordered)


def compile_latex_to_pdf(tex_content: str, output_path: str) -> bool:
    """Compile LaTeX to PDF using pdflatex if available."""
    if not shutil.which("pdflatex"):
        print("  ℹ pdflatex not found — skipping LaTeX compilation")
        return False
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_file = os.path.join(tmpdir, "cv.tex")
        with open(tex_file, "w", encoding="utf-8") as f:
            f.write(tex_content)
        
        try:
            for _ in range(2):  # compile twice for proper rendering
                result = subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_file],
                    capture_output=True, text=True, timeout=60
                )
            
            pdf_tmp = os.path.join(tmpdir, "cv.pdf")
            if os.path.exists(pdf_tmp):
                shutil.copy(pdf_tmp, output_path)
                print(f"  ✅ LaTeX PDF compiled: {os.path.basename(output_path)}")
                return True
            else:
                print(f"  ⚠ pdflatex ran but PDF not found. Log:\n{result.stdout[-800:]}")
                return False
        except subprocess.TimeoutExpired:
            print("  ⚠ pdflatex timed out")
            return False
        except Exception as e:
            print(f"  ⚠ pdflatex error: {e}")
            return False


def generate_cv(company: str, title: str, description: str = "") -> str:
    """Main entry point: generate tailored LaTeX CV and compile to PDF."""
    print(f"\n📄 Generating ATS-Optimized LaTeX CV for: {company} — {title}")
    
    # Load template
    if not os.path.exists(TEMPLATE_PATH):
        print(f"  ❌ Template not found: {TEMPLATE_PATH}")
        return BASE_CV_PDF
    
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template = f.read()
    
    # Get AI-tailored content
    ai_content = {}
    if description:
        ai_content = generate_tailored_content(company, title, description)
    
    # Build summary
    default_summary = (
        f"Backend-leaning full-stack engineer graduating from ESPRIT in 2026, "
        f"with hands-on experience shipping DevSecOps automation, CI/CD pipelines, and "
        f"AI-integrated backend services in production. Built and shipped an AI test-generation "
        f"agent (5,200+ lines) and cut security triage time 60\\% at SeekMake. "
        f"Strong background in cloud infrastructure and microservices — well-suited for {title} roles."
    )
    summary = sanitize_latex(ai_content.get("summary", default_summary))
    
    # Build skills section
    top_order = ai_content.get("top_skills_order", [])
    skills_section = build_skills_section(top_order)
    
    # Fill template
    tex_content = template
    tex_content = tex_content.replace("{{SUMMARY}}", summary)
    tex_content = tex_content.replace("{{SKILLS_SECTION}}", skills_section)
    
    # Safe filename
    safe_co = re.sub(r'[^\w]', '_', company)[:30]
    safe_ti = re.sub(r'[^\w]', '_', title)[:30]
    base_name = f"Ghaith_Oueslati_CV_{safe_co}_{safe_ti}"
    
    # Save .tex file
    tex_path = os.path.join(CV_OUT_DIR, f"{base_name}.tex")
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)
    print(f"  📝 LaTeX source saved: {tex_path}")
    
    # Compile to PDF
    pdf_path = os.path.join(CV_OUT_DIR, f"{base_name}.pdf")
    compiled = compile_latex_to_pdf(tex_content, pdf_path)
    
    if not compiled:
        # Fallback to base CV PDF
        if os.path.exists(BASE_CV_PDF):
            shutil.copy(BASE_CV_PDF, pdf_path)
            print(f"  📎 Using base CV PDF as fallback: {pdf_path}")
        else:
            print(f"  ℹ LaTeX .tex file saved (compile locally with pdflatex)")
            
    # Copy to public/cvs/ so dashboard instantly hosts the file
    public_cv_dir = os.path.join(ROOT, "public", "cvs")
    os.makedirs(public_cv_dir, exist_ok=True)
    if os.path.exists(pdf_path):
        shutil.copy(pdf_path, os.path.join(public_cv_dir, f"{base_name}.pdf"))
        print(f"  📄 Copied to public/cvs/{base_name}.pdf for 1-click dashboard download")
    
    return pdf_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--company",     required=True)
    parser.add_argument("--title",       required=True)
    parser.add_argument("--description", default="")
    args = parser.parse_args()
    out = generate_cv(args.company, args.title, args.description)
    print(f"\n✅ Output: {out}")
