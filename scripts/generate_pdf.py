#!/usr/bin/env python3
"""
CareerForge AI — PDF Generator Script
Generates professional PDF CV and Cover Letter (Lettre de Motivation) for matched job applications.
Usage: python scripts/generate_pdf.py --job_id <uuid> --company <name> --title <role> --output_dir <path>
"""

import sys
import os
import json
import argparse
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# ── Primary Color Palette ──────────────────────────────────────
PRIMARY_COLOR = colors.HexColor('#0F172A')     # Dark Slate
ACCENT_COLOR = colors.HexColor('#0284C7')      # Sky Blue
TEXT_COLOR = colors.HexColor('#334155')        # Slate Text
MUTED_COLOR = colors.HexColor('#64748B')       # Slate Muted
BG_LIGHT = colors.HexColor('#F8FAFC')          # Off White Light

def create_pdf_cv(candidate, job_data, output_path):
    """Generate a clean, modern PDF CV tailored for a specific job application."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY_COLOR,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=ACCENT_COLOR,
        spaceAfter=8
    )

    contact_style = ParagraphStyle(
        'HeaderContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=MUTED_COLOR,
        spaceAfter=12
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY_COLOR,
        spaceBefore=12,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_COLOR,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4
    )

    # 1. Header
    story.append(Paragraph(candidate.get('name', 'Ghaith Oueslati'), title_style))
    role_title = job_data.get('title', 'DevSecOps & Backend Engineer')
    story.append(Paragraph(f"<b>{role_title}</b> | Customized Application for {job_data.get('company', 'Target Role')}", subtitle_style))
    
    contact_line = f"📧 {candidate.get('email', 'ghaythweslaty002@gmail.com')}  |  🔗 linkedin.com/in/{candidate.get('linkedin', 'ghayth-weslati')}  |  💻 github.com/ghayth002  |  📍 {candidate.get('location', 'Tunisia')}"
    story.append(Paragraph(contact_line, contact_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceAfter=10))

    # 2. Executive Summary
    story.append(Paragraph("PROFESSIONAL SUMMARY", section_heading))
    summary_text = job_data.get('custom_summary') or (
        "Backend-leaning full-stack engineer graduating from ESPRIT in 2026 with hands-on experience shipping "
        "DevSecOps automation, CI/CD security pipelines, and high-performance backend microservices in production. "
        "Built AI test generation tooling and cut manual security triage time by 60% at SeekMake."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceAfter=8))

    # 3. Key Accomplishments for Role
    if job_data.get('custom_bullets'):
        story.append(Paragraph("ROLE-RELEVANT HIGHLIGHTS", section_heading))
        for bullet in job_data['custom_bullets']:
            story.append(Paragraph(f"• {bullet}", bullet_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceAfter=8))

    # 4. Technical Skills
    story.append(Paragraph("TECHNICAL SKILLS", section_heading))
    skills = candidate.get('skills', {})
    skills_data = [
        [Paragraph("<b>DevOps & Cloud:</b>", body_style), Paragraph(", ".join(skills.get('devops_cloud', ['Docker', 'Terraform', 'GitLab CI/CD', 'AWS', 'Azure'])), body_style)],
        [Paragraph("<b>Languages & DBs:</b>", body_style), Paragraph(", ".join(skills.get('languages', ['Python', 'TypeScript', 'SQL']) + skills.get('databases', ['MongoDB', 'PostgreSQL'])), body_style)],
        [Paragraph("<b>Frameworks & Tools:</b>", body_style), Paragraph(", ".join(skills.get('frameworks', ['NestJS', 'Spring Boot', 'React']) + skills.get('security', ['OWASP ZAP', 'Trivy'])), body_style)]
    ]
    t = Table(skills_data, colWidths=[110, 430])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t)
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceAfter=8))

    # 5. Experience
    story.append(Paragraph("PROFESSIONAL EXPERIENCE", section_heading))
    
    # SeekMake
    story.append(Paragraph("<b>SeekMake</b> — <i>DevSecOps & Backend Engineer</i> <font color='#64748B' size=8>(Jan 2026 – Present | Tunisia)</font>", body_style))
    seekmake_bullets = [
        "Reduced manual security triage time by <b>60%</b> by integrating Google Gemini API into CI/CD to classify OWASP ZAP and Trivy findings.",
        "Reduced backend API response latency by <b>83%</b> by optimizing MongoDB aggregation pipelines and implementing caching.",
        "Engineered an AI-powered test generation agent (<b>5,200+ lines</b>) with Vertex AI, lifting unit test coverage to <b>75%+</b>.",
        "Migrated <b>38+ CI/CD workflows</b> from GitHub Actions to GitLab CI/CD with self-hosted runner infrastructure.",
        "Migrated 8 of 12 microservices from GCP Cloud Run to Azure Container Apps and configured Azure Front Door routing."
    ]
    for b in seekmake_bullets:
        story.append(Paragraph(f"• {b}", bullet_style))
    story.append(Spacer(1, 4))

    # Cube IT
    story.append(Paragraph("<b>Cube IT</b> — <i>Mobile Developer Intern</i> <font color='#64748B' size=8>(Jun 2025 – Present | Tunisia)</font>", body_style))
    cube_bullets = [
        "Improved travel time estimation accuracy by <b>15%</b> by integrating mapping APIs and routing logic in Flutter transport app.",
        "Built core booking and payment gateway features using Flutter and Spring Boot microservices."
    ]
    for b in cube_bullets:
        story.append(Paragraph(f"• {b}", bullet_style))
    story.append(Spacer(1, 4))

    # Barmej Tech
    story.append(Paragraph("<b>Barmej Tech</b> — <i>Fullstack Developer Intern</i> <font color='#64748B' size=8>(Jun 2024 – Aug 2024 | Tunisia)</font>", body_style))
    story.append(Paragraph("• Boosted backend performance by <b>30%</b> by optimizing SQL queries and caching core HR endpoints with JWT auth.", bullet_style))

    # 6. Education
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceAfter=8))
    story.append(Paragraph("EDUCATION & LANGUAGES", section_heading))
    story.append(Paragraph("<b>ESPRIT</b> — <i>B.Eng. in Computer Engineering (TWIN: Web & Internet Technologies)</i> <font color='#64748B' size=8>(Graduating June 2026)</font>", body_style))
    story.append(Paragraph("<b>Languages:</b> Arabic (Native) • French (Professional) • English (Professional) • Italian (B2 Certified)", body_style))

    doc.build(story)
    print(f"[OK] Created CV PDF: {output_path}")

def create_pdf_cover_letter(candidate, job_data, output_path):
    """Generate a formal PDF Cover Letter (Lettre de Motivation)."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=48,
        leftMargin=48,
        topMargin=48,
        bottomMargin=48
    )
    story = []
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'CLHeader',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY_COLOR,
        spaceAfter=4
    )
    
    subhead_style = ParagraphStyle(
        'CLSubhead',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=MUTED_COLOR,
        spaceAfter=18
    )

    body_style = ParagraphStyle(
        'CLBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=16,
        textColor=TEXT_COLOR,
        spaceAfter=12
    )

    date_style = ParagraphStyle(
        'CLDate',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        textColor=MUTED_COLOR,
        spaceAfter=14
    )

    recipient_style = ParagraphStyle(
        'CLRecipient',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=PRIMARY_COLOR,
        spaceAfter=14
    )

    # Header
    story.append(Paragraph(candidate.get('name', 'Ghaith Oueslati'), header_style))
    story.append(Paragraph(f"Email: {candidate.get('email', 'ghaythweslaty002@gmail.com')} | LinkedIn: ghayth-weslati | Phone: +216 94854835", subhead_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceAfter=14))

    # Date & Recipient
    today_str = datetime.now().strftime("%B %d, %Y")
    story.append(Paragraph(today_str, date_style))
    
    company = job_data.get('company', 'Hiring Team')
    title = job_data.get('title', 'DevSecOps & Backend Engineer')
    
    # Sanitize title & company
    if any(gt in title.lower() for gt in ['current openings', 'careers', 'openings', 'spontaneous', 'job opening']):
        title = 'DevSecOps & Backend Engineer'
    import re
    company = re.sub(r'\s*\(\s*Formerly.*?\)', '', company).strip()

    story.append(Paragraph(f"<b>Hiring Manager & Engineering Leadership</b><br/>{company}", recipient_style))
    story.append(Paragraph(f"<b>RE: Application for {title} Role</b>", ParagraphStyle('Sub', parent=body_style, fontName='Helvetica-Bold', fontSize=10.5, textColor=ACCENT_COLOR, spaceAfter=14)))

    # Bullet style for achievements
    cl_bullet_style = ParagraphStyle(
        'CLBullet',
        parent=body_style,
        fontSize=9.5,
        leading=14,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=5
    )

    p1 = f"Dear Hiring Team at {company},"
    p2 = job_data.get('cover_note') or (
        f"I am writing to express my strong enthusiasm for the {title} position at {company}. "
        f"With hands-on experience in DevSecOps automation, microservice architecture, and AI tool integration, "
        f"I am confident in my ability to bring immediate technical value to your engineering organization."
    )
    p3_lead = "Key technical achievements and relevant qualifications from my experience include:"
    b1 = "&bull; <b>CI/CD Security Automation:</b> Cut manual vulnerability triage time by <b>60%</b> by integrating Google Gemini API + Trivy and OWASP ZAP scanners directly into automated pipelines."
    b2 = "&bull; <b>Backend Performance & Latency:</b> Reduced API response latency by <b>83%</b> through MongoDB aggregation pipeline optimization and multi-tier Redis caching."
    b3 = "&bull; <b>Cloud & Container Orchestration:</b> Successfully migrated 38+ CI/CD workflows to GitLab CI/CD and migrated containerized microservices to Azure Container Apps and AWS."

    p4 = (
        f"I would welcome the opportunity to discuss how my technical expertise in cloud infrastructure, "
        f"backend systems, and security automation can support {company}'s upcoming milestones. Thank you for your time and consideration."
    )

    story.append(Paragraph(p1, body_style))
    story.append(Paragraph(p2, body_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(p3_lead, body_style))
    story.append(Paragraph(b1, cl_bullet_style))
    story.append(Paragraph(b2, cl_bullet_style))
    story.append(Paragraph(b3, cl_bullet_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(p4, body_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Sincerely,", body_style))
    story.append(Paragraph("<b>Ghaith Oueslati</b><br/><font size=8.5 color='#64748B'>DevSecOps & Backend Engineer</font>", body_style))

    doc.build(story)
    print(f"[OK] Created Cover Letter PDF: {output_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='CareerForge AI PDF Generator')
    parser.add_argument('--company', default='TechCorp Berlin', help='Company name')
    parser.add_argument('--title', default='DevSecOps Engineer', help='Job title')
    parser.add_argument('--summary', default='', help='Custom summary')
    parser.add_argument('--cover_note', default='', help='Cover note text')
    parser.add_argument('--output_dir', default='data/applications', help='Output directory')
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    os.makedirs('data/cv/customized', exist_ok=True)

    # Load candidate config
    candidate_config_path = os.path.join(os.path.dirname(__file__), '../config/candidate.json')
    candidate = {}
    if os.path.exists(candidate_config_path):
        with open(candidate_config_path, 'r', encoding='utf-8') as f:
            cdata = json.load(f)
            candidate = cdata.get('candidate', {})
            candidate['skills'] = cdata.get('skills', {})

    job_data = {
        'company': args.company,
        'title': args.title,
        'custom_summary': args.summary,
        'cover_note': args.cover_note,
        'custom_bullets': [
            'Cut security triage time by 60% by integrating Google Gemini API into CI/CD for OWASP ZAP & Trivy findings.',
            'Reduced backend API latency by 83% through MongoDB pipeline optimization and caching.',
            'Built AI-powered test generation agent (5,200+ lines) achieving 75%+ unit test coverage.'
        ]
    }

    safe_company = args.company.replace(' ', '_').replace('/', '_')
    safe_title = args.title.replace(' ', '_').replace('/', '_')

    cv_pdf_path = os.path.join('data/cv/customized', f"Ghaith_Oueslati_CV_{safe_company}_{safe_title}.pdf")
    cl_pdf_path = os.path.join(args.output_dir, f"Cover_Letter_{safe_company}_{safe_title}.pdf")

    create_pdf_cv(candidate, job_data, cv_pdf_path)
    create_pdf_cover_letter(candidate, job_data, cl_pdf_path)
