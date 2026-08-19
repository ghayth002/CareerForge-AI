/**
 * CareerForge AI — Client-side PDF Generation & Print Orchestrator
 */

function downloadTailoredCvPdf(jobIdentifier) {
  const job = (typeof allJobsList !== 'undefined' ? allJobsList : []).find(j => 
    j._uid === jobIdentifier || 
    String(j.id) === String(jobIdentifier) || 
    j.source_job_id === jobIdentifier || 
    j.title === jobIdentifier
  ) || {};

  const company = (job.company || 'Target Company').replace(/\s*\(\s*Formerly.*?\)/gi, '').trim();
  let title = (job.title || 'DevSecOps & Backend Engineer').replace(/\s*\(f\/m\/d\)/gi, '').replace(/\s*\(m\/f\/d\)/gi, '').trim();
  if (/current openings|careers|job opening|open position/i.test(title)) title = 'DevSecOps & Backend Engineer';

  const activeUser = (typeof currentAuthUser !== 'undefined' && currentAuthUser) || (() => {
    try { return JSON.parse(localStorage.getItem('cf_user_profile') || '{}'); } catch(e) { return {}; }
  })();

  const candName = activeUser.name || 'Ghaith Oueslati';
  const candEmail = activeUser.email || 'ghaythweslaty002@gmail.com';
  const candPhone = activeUser.phone || '+216 94854835';
  const candRole = activeUser.role || 'DevSecOps & Backend Engineer';
  const candLinkedin = activeUser.linkedin || 'ghayth-weslati';
  const candGithub = activeUser.github || 'ghayth002';
  const candLocation = activeUser.location || 'Tunisia / Remote EU';

  let cleanSummary = (job.custom_summary || '')
    .replace(/\bundefined\b/gi, candRole)
    .trim();

  if (!cleanSummary || cleanSummary.length < 25) {
    cleanSummary = `Results-driven ${candRole} graduating from ESPRIT in 2026, with hands-on experience shipping DevSecOps automation, scalable CI/CD pipelines, and high-performance backend microservices. Built an AI test-generation agent (5,200+ lines) and cut security triage time 60% at SeekMake. Strong in NestJS, Python, Docker, and Azure cloud infrastructure, tailored for ${company}'s ${title} requirements.`;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${candName.replace(/\s+/g, '_')}_CV_${company.replace(/\W+/g, '_')}.pdf</title>
  <style>
    @page {
      size: letter;
      margin: 0;
    }
    @media print {
      html, body {
        width: 100%;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff;
      }
      .no-print { display: none; }
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Latin Modern Roman', 'CMU Serif', 'Times New Roman', Times, Georgia, serif;
      color: #111111;
      line-height: 1.25;
      margin: 0;
      padding: 8mm 12mm;
      font-size: 9.6pt;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .header-box {
      text-align: center;
      margin-bottom: 6pt;
    }
    .header-name {
      font-size: 19pt;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-variant: small-caps;
      margin-bottom: 2pt;
      color: #000000;
    }
    .header-links {
      font-size: 8.8pt;
      color: #222222;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .header-links a {
      color: #111111;
      text-decoration: underline;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      font-variant: small-caps;
      letter-spacing: 0.04em;
      border-bottom: 0.8pt solid #111111;
      padding-bottom: 1.5pt;
      margin-top: 6pt;
      margin-bottom: 3pt;
      color: #000000;
    }
    .summary-text {
      font-size: 9.3pt;
      text-align: justify;
      line-height: 1.28;
      margin-bottom: 4pt;
      color: #111111;
    }
    table.item-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin-top: 2.5pt;
      margin-bottom: 1pt;
      page-break-inside: avoid;
    }
    table.item-table td {
      padding: 0;
      vertical-align: baseline;
    }
    .td-left-title {
      font-size: 10.2pt;
      font-weight: 700;
      text-align: left;
      color: #000000;
    }
    .td-right-date {
      font-size: 9.3pt;
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
      width: 155px;
      color: #000000;
    }
    .td-left-sub {
      font-size: 9.6pt;
      font-style: italic;
      text-align: left;
      color: #222222;
    }
    .td-right-loc {
      font-size: 9.3pt;
      font-style: italic;
      text-align: right;
      white-space: nowrap;
      width: 155px;
      color: #333333;
    }
    ul.bullet-list {
      margin: 1.5pt 0 3.5pt 0;
      padding-left: 15pt;
      list-style-type: disc;
      page-break-inside: avoid;
    }
    ul.bullet-list li {
      font-size: 9.3pt;
      line-height: 1.26;
      margin-bottom: 1.2pt;
      text-align: justify;
      color: #111111;
    }
    .skills-block {
      font-size: 9.2pt;
      line-height: 1.32;
      margin-top: 2pt;
      margin-bottom: 3pt;
      color: #111111;
    }
    .skills-block div {
      margin-bottom: 1pt;
    }
    .skills-block b { font-weight: 700; color: #000000; }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="header-name">${candName}</div>
    <div class="header-links">
      <span>📞 <a href="tel:${candPhone}">${candPhone}</a></span>
      <span>✉ <a href="mailto:${candEmail}">${candEmail}</a></span>
      <span>🔗 <a href="https://linkedin.com/in/${candLinkedin}">linkedin.com/in/${candLinkedin}</a></span>
      <span>💻 <a href="https://github.com/${candGithub}">github.com/${candGithub}</a></span>
      <span>🌐 <a href="https://oueslati-ghaith.onrender.com">Portfolio</a></span>
    </div>
  </div>

  <div class="section-title">Summary</div>
  <div class="summary-text">${cleanSummary}</div>

  <div class="section-title">Education</div>
  <table class="item-table">
    <tr>
      <td class="td-left-title">Esprit</td>
      <td class="td-right-date">Sep 2021 – Jun 2026</td>
    </tr>
    <tr>
      <td class="td-left-sub">B.Eng. in Computer Engineering (TWIN: Web & Internet Technologies)</td>
      <td class="td-right-loc">Ariana, Tunisia</td>
    </tr>
  </table>
  <ul class="bullet-list">
    <li>Relevant Coursework: Data Structures, Algorithms, Machine Learning, Cloud Computing, Distributed Systems.</li>
  </ul>

  <div class="section-title">Technical Skills</div>
  <div class="skills-block">
    <div><b>Languages:</b> JavaScript, TypeScript, Python, Java, C#, C++, C, PL/SQL, SQL</div>
    <div><b>Frameworks & Runtimes:</b> React, Angular, Node.js, NestJS, Spring Boot, .NET, Flutter, Django, Laravel, Symfony</div>
    <div><b>Databases & Caching:</b> MySQL, MongoDB, Redis, PostgreSQL</div>
    <div><b>DevOps & Cloud:</b> Docker, Terraform, GitHub Actions, GitLab CI/CD, AWS (EC2, Lambda), Azure (Container Apps, Front Door, ACR), GCP</div>
    <div><b>Testing & Quality:</b> Unit Testing, SonarQube, SAST/DAST, OWASP ZAP, Trivy, Code Review</div>
    <div><b>Concepts & Tools:</b> REST APIs, Microservices, CI/CD Automation, DevSecOps, Agile/Scrum, IaC, JWT, Keycloak, Git, Swagger, Grafana</div>
  </div>

  <div class="section-title">Experience</div>

  <table class="item-table">
    <tr>
      <td class="td-left-title">SeekMake</td>
      <td class="td-right-date">Jan 2026 – Present</td>
    </tr>
    <tr>
      <td class="td-left-sub">DevSecOps & Backend Engineer</td>
      <td class="td-right-loc">Tunisia</td>
    </tr>
  </table>
  <ul class="bullet-list">
    <li>Cut manual security triage time by <b>60%</b> by integrating Google Gemini API into the CI/CD pipeline to classify OWASP ZAP & Trivy scan findings and auto-generate fix recommendations.</li>
    <li>Reduced backend API response latency by <b>83%</b> by optimizing MongoDB aggregation pipelines and implementing Redis caching for high-traffic endpoints.</li>
    <li>Built an AI-powered test generation agent (<b>5,200+ lines</b>) using Vertex AI, lifting unit test coverage to <b>75%+</b> through automated self-healing validation loops on pull requests.</li>
    <li>Contributed to migrating <b>38+ CI/CD workflows</b> from GitHub Actions to GitLab CI/CD with self-hosted runners, reducing pipeline setup time by <b>45%</b>.</li>
    <li>Partnered with the senior DevOps team to migrate <b>8 of 12</b> microservices to Azure Container Apps, configuring deployment manifests and Azure Front Door routing.</li>
  </ul>

  <table class="item-table">
    <tr>
      <td class="td-left-title">Cube IT</td>
      <td class="td-right-date">Jun 2025 – Present</td>
    </tr>
    <tr>
      <td class="td-left-sub">Mobile Developer Intern</td>
      <td class="td-right-loc">Tunisia</td>
    </tr>
  </table>
  <ul class="bullet-list">
    <li>Improved travel time estimation accuracy by <b>15%</b> by integrating mapping APIs and refining routing logic in a cross-platform Flutter transport application.</li>
    <li>Built and unit-tested core booking and payment-gateway features in Flutter and Spring Boot across <b>6</b> agile sprints.</li>
  </ul>

  <table class="item-table">
    <tr>
      <td class="td-left-title">Barmej Tech</td>
      <td class="td-right-date">Jun 2024 – Aug 2024</td>
    </tr>
    <tr>
      <td class="td-left-sub">Fullstack Developer Intern</td>
      <td class="td-right-loc">Tunisia</td>
    </tr>
  </table>
  <ul class="bullet-list">
    <li>Boosted backend query speed by <b>30%</b> by optimizing SQL indexes and caching core HR API endpoints.</li>
    <li>Delivered employee leave-tracking and reporting features end-to-end using REST APIs secured with JWT authentication.</li>
  </ul>

  <div class="section-title">Key Projects</div>

  <table class="item-table">
    <tr>
      <td class="td-left-title">AI-Enhanced DevSecOps Pipeline | NestJS, GitHub Actions, Vertex AI, Terraform</td>
      <td class="td-right-date">Jan 2026 – Present</td>
    </tr>
  </table>
  <ul class="bullet-list">
    <li>Engineered a security automation pipeline combining OWASP ZAP, Trivy, and Gemini-based filtering, reducing false-positive triage effort by <b>60%</b> across <b>9 microservices</b>.</li>
  </ul>

  <table class="item-table">
    <tr>
      <td class="td-left-title">Self-Hosted CI/CD Runner Infrastructure | AWS, Terraform, Lambda, EC2</td>
      <td class="td-right-date">2026</td>
    </tr>
  </table>
  <ul class="bullet-list">
    <li>Designed a serverless orchestrator with AWS Lambda and GitHub webhooks to provision ephemeral EC2 runners, cutting idle cloud runner costs by <b>35%</b>.</li>
  </ul>

  <table class="item-table">
    <tr>
      <td class="td-left-title">RecruitPro | MERN, Machine Learning</td>
      <td class="td-right-date">Jan 2025 – May 2025</td>
    </tr>
  </table>
  <ul class="bullet-list">
    <li>Built an AI-based recruitment platform improving candidate matching accuracy by <b>25%</b> and cutting hiring turnaround time by <b>20%</b> via analytics dashboards.</li>
  </ul>

  <div class="section-title">Languages</div>
  <ul class="bullet-list" style="margin-bottom:0;">
    <li><b>Arabic:</b> Native • <b>French:</b> Professional Working Proficiency • <b>English:</b> Professional Working Proficiency • <b>Italian:</b> Upper Intermediate (CISIA B2)</li>
  </ul>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(function() {
    try { printWindow.focus(); printWindow.print(); } catch(e) {}
  }, 250);
}

function downloadMotivationLetterPdf(company, title, fullText, filename) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const activeUser = (typeof currentAuthUser !== 'undefined' && currentAuthUser) || (() => {
    try { return JSON.parse(localStorage.getItem('cf_user_profile') || '{}'); } catch(e) { return {}; }
  })();

  const candName = activeUser.name || 'Ghaith Oueslati';
  const candEmail = activeUser.email || 'ghaythweslaty002@gmail.com';
  const candPhone = activeUser.phone || '+216 94854835';
  const candRole = activeUser.role || 'DevSecOps & Backend Engineer';
  const candLocation = activeUser.location || 'Tunisia / Remote EU';

  let cleanTitle = (title || 'DevSecOps & Backend Engineer').replace(/\s*\(f\/m\/d\)/gi, '').replace(/\s*\(m\/f\/d\)/gi, '').trim();
  if (/current openings|careers|job opening|open position|spontaneous/i.test(cleanTitle) || cleanTitle.length < 4) {
    cleanTitle = 'DevSecOps & Backend Engineer';
  }
  let cleanCompany = (company || 'Hiring Team').replace(/\s*\(\s*Formerly.*?\)/gi, '').trim();

  // Strip duplicate sign-offs from AI text
  let cleanBody = (fullText || '')
    .replace(/\n*Sincerely,[\s\S]*$/i, '')
    .replace(/\n*Best regards,[\s\S]*$/i, '')
    .replace(/\n*Regards,[\s\S]*$/i, '')
    .trim();

  // If body still has generic references, clean them
  cleanBody = cleanBody.replace(/Current openings/g, cleanTitle);

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cover_Letter_${candName.replace(/\s+/g, '_')}_${cleanCompany.replace(/\W+/g, '_')}.pdf</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    @media print {
      html, body {
        width: 100%;
        height: 100%;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      line-height: 1.65;
      margin: 0;
      padding: 16mm 20mm;
      font-size: 13px;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .header-name {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }
    .header-role {
      font-size: 12px;
      font-weight: 700;
      color: #0284c7;
      margin-top: 2px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .header-contact {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 5px;
      line-height: 1.4;
    }
    .date-row {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .recipient-block {
      font-size: 12px;
      line-height: 1.45;
      color: #0f172a;
      margin-bottom: 14px;
    }
    .re-subject {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 14px;
    }
    .letter-body {
      font-size: 12.5px;
      line-height: 1.7;
      color: #334155;
      white-space: pre-wrap;
      text-align: justify;
      margin-bottom: 20px;
    }
    .sign-off {
      font-size: 12.5px;
      line-height: 1.5;
      color: #0f172a;
    }
    .sign-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="header-name">${candName}</div>
        <div class="header-role">${candRole}</div>
      </td>
      <td style="text-align:right;vertical-align:bottom;">
        <div class="header-contact">
          ${candPhone} • ${candEmail}<br>
          ${candLocation} • <a href="https://oueslati-ghaith.onrender.com" style="color:#0284c7;text-decoration:none;">oueslati-ghaith.onrender.com</a>
        </div>
      </td>
    </tr>
  </table>

  <div class="date-row">${today}</div>

  <div class="recipient-block">
    <strong>Hiring & Talent Acquisition Team</strong><br>
    ${cleanCompany}<br>
    Re: ${cleanTitle} Application
  </div>

  <div class="re-subject">
    Application for ${cleanTitle} — ${candName}
  </div>

  <div class="letter-body">
${cleanBody}
  </div>

  <div class="sign-off">
    Sincerely,<br><br>
    <div class="sign-name">${candName}</div>
    <div style="font-size:11px;color:#64748b;">${candRole}</div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(function() {
    try { printWindow.focus(); printWindow.print(); } catch(e) {}
  }, 250);
}
