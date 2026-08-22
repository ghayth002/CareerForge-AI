/**
 * CareerForge AI — Full Design Overhaul Processor
 * Upgrades public/index.html with:
 *  - Autumn Orchard Design Tokens (Primary: #2E6F40, Accent: #DAA520, Secondary: #8E4585, Critical: #660033)
 *  - Fraunces (Editorial Display) + Plus Jakarta Sans (UI Grotesk) + JetBrains Mono (Data)
 *  - 4-Tier Tactile Elevation & Plausible Physical Depth (restrained card lift + warm-tinted shadows)
 *  - Signature Dimensional Match Ring (SVG volumetric gradient arc)
 *  - Polished Auth Portal, Overview Dashboard, Job Cards, CRM Kanban, Workflow Runner, Settings & Modal
 */

const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../public/index.html');
const dashboardTargetPath = path.join(__dirname, '../dashboard/public/index.html');

let html = fs.readFileSync(targetPath, 'utf8');

// 1. Upgrade Font Imports in <head>
const oldFontTag = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Outfit[^"]*" rel="stylesheet" \/>/;
const newFontTag = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600..900;1,9..144,600..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />`;

html = html.replace(oldFontTag, newFontTag);

// 2. Comprehensive CSS Overhaul
const newStyles = `
/* ═══════════════════════════════════════════════════════════════
   CAREERFORGE AI — AUTUMN ORCHARD DESIGN SYSTEM TOKENS
   Crafted & Dimensional • Tactile Elevation • Rich Typography
═══════════════════════════════════════════════════════════════ */
:root {
  --font-heading: 'Fraunces', Georgia, serif;
  --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-code: 'JetBrains Mono', monospace;
  
  --radius-2xl: 28px;
  --radius-xl: 20px;
  --radius-lg: 14px;
  --radius-md: 10px;
  --radius-sm: 6px;
  --radius-full: 9999px;
  
  --sidebar-width: 280px;
  --topbar-height: 74px;
  --transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: all 0.16s ease;

  /* ── Autumn Orchard Brand Colors ── */
  --primary: #2E6F40;           /* Forest Green */
  --primary-hover: #225330;
  --primary-subtle: rgba(46, 111, 64, 0.08);
  --primary-border: rgba(46, 111, 64, 0.22);
  
  --accent: #DAA520;            /* Goldenrod */
  --accent-hover: #B8860B;
  --accent-subtle: rgba(218, 165, 32, 0.12);
  --accent-border: rgba(218, 165, 32, 0.25);
  
  --secondary: #8E4585;         /* Plum (Pro tier) */
  --secondary-hover: #75366D;
  --secondary-subtle: rgba(142, 69, 133, 0.08);
  --secondary-border: rgba(142, 69, 133, 0.22);
  
  --critical: #660033;          /* Deep Maroon */
  --critical-hover: #4D0026;
  --critical-subtle: rgba(102, 0, 51, 0.08);
  --critical-border: rgba(102, 0, 51, 0.22);
}

/* ── Light Mode (Primary Canvas) ── */
[data-theme="light"], :root {
  --bg-dark: #FAFAF8;
  --bg-surface: #FFFFFF;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F6F5F0;
  --bg-card-solid: #FFFFFF;
  --surface-sunken: #F0EFEA;
  
  --border-glass: rgba(26, 26, 24, 0.08);
  --border-glass-strong: rgba(26, 26, 24, 0.16);
  --border-glow: rgba(46, 111, 64, 0.25);
  
  --text-main: #1A1A18;
  --text-muted: #575752;
  --text-dim: #8C8C84;
  
  /* 4-Tier Tactile Elevation Shadows */
  --shadow-resting: 0 1px 3px rgba(26, 26, 24, 0.04), 0 4px 12px rgba(26, 26, 24, 0.03);
  --shadow-card: 0 4px 6px -1px rgba(26, 26, 24, 0.06), 0 10px 24px -2px rgba(26, 26, 24, 0.04);
  --shadow-hover: 0 12px 32px -4px rgba(46, 111, 64, 0.12), 0 4px 12px rgba(26, 26, 24, 0.04);
  --shadow-modal: 0 24px 64px -12px rgba(26, 26, 24, 0.22), 0 8px 24px rgba(26, 26, 24, 0.08);
  --shadow-main: var(--shadow-card);

  /* Legacy Neon Aliases mapped to Autumn Orchard */
  --neon-cyan: #2E6F40;
  --neon-cyan-glow: rgba(46, 111, 64, 0.18);
  --neon-purple: #8E4585;
  --neon-purple-glow: rgba(142, 69, 133, 0.18);
  --neon-emerald: #2E6F40;
  --neon-emerald-glow: rgba(46, 111, 64, 0.18);
  --neon-amber: #DAA520;
  --neon-rose: #660033;
  --neon-blue: #2E6F40;
  --neon-indigo: #8E4585;
}

/* ── Dark Mode (Rich Autumn Night) ── */
[data-theme="dark"] {
  --bg-dark: #0F120E;
  --bg-surface: #171C15;
  --bg-card: #1D231B;
  --bg-card-hover: #262E23;
  --bg-card-solid: #171C15;
  --surface-sunken: #111510;
  
  --border-glass: rgba(255, 255, 255, 0.07);
  --border-glass-strong: rgba(255, 255, 255, 0.14);
  --border-glow: rgba(218, 165, 32, 0.35);
  
  --text-main: #F6F7F5;
  --text-muted: #A3A8A0;
  --text-dim: #70756D;
  
  --shadow-resting: 0 4px 20px rgba(0, 0, 0, 0.4);
  --shadow-card: 0 10px 30px rgba(0, 0, 0, 0.5);
  --shadow-hover: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(46, 111, 64, 0.25);
  --shadow-modal: 0 30px 80px rgba(0, 0, 0, 0.7);
  --shadow-main: var(--shadow-card);

  --neon-cyan: #48A362;
  --neon-cyan-glow: rgba(72, 163, 98, 0.3);
  --neon-purple: #B66AB0;
  --neon-purple-glow: rgba(182, 106, 176, 0.3);
  --neon-emerald: #48A362;
  --neon-emerald-glow: rgba(72, 163, 98, 0.3);
  --neon-amber: #F0BE3D;
  --neon-rose: #A8325E;
  --neon-blue: #48A362;
  --neon-indigo: #B66AB0;
}

/* ═══════════════════════════════════════════════════════════════
   RESET & GLOBAL BASE STYLES
═══════════════════════════════════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; scroll-behavior: smooth; }
body {
  font-family: var(--font-main);
  background: var(--bg-dark);
  color: var(--text-main);
  min-height: 100vh;
  overflow-x: hidden;
  line-height: 1.6;
  transition: background 0.3s ease, color 0.3s ease;
  position: relative;
}

[data-theme="light"] body {
  background-image: 
    radial-gradient(circle at 92% 6%, rgba(46, 111, 64, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 8% 94%, rgba(142, 69, 133, 0.06) 0%, transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(218, 165, 32, 0.03) 0%, transparent 60%);
  background-attachment: fixed;
}
[data-theme="dark"] body {
  background-image: 
    radial-gradient(circle at 10% 10%, rgba(46, 111, 64, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 90% 90%, rgba(142, 69, 133, 0.1) 0%, transparent 45%);
  background-attachment: fixed;
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-main);
}
h1 { font-size: 2.1rem; line-height: 1.2; }
h2 { font-size: 1.55rem; line-height: 1.25; }
h3 { font-size: 1.25rem; line-height: 1.3; }
code, pre { font-family: var(--font-code); }
a { color: var(--primary); text-decoration: none; transition: var(--transition); }
a:hover { opacity: 0.85; }

:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
    transform: none !important;
  }
}

/* Custom Sleek Scrollbars */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-glass-strong); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary); }

/* ═══════════════════════════════════════════════════════════════
   SIGNATURE ELEMENT — DIMENSIONAL MATCH RING
═══════════════════════════════════════════════════════════════ */
.match-ring-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}
.match-ring-svg {
  display: block;
  overflow: visible;
}
.match-ring-label {
  position: absolute;
  font-family: var(--font-code);
  font-weight: 800;
  color: var(--text-main);
  display: flex;
  align-items: baseline;
  justify-content: center;
  letter-spacing: -0.04em;
  line-height: 1;
}
.match-ring-pct {
  font-size: 0.55em;
  font-weight: 700;
  opacity: 0.8;
  margin-left: 1px;
}

/* ═══════════════════════════════════════════════════════════════
   BUTTONS & TACTILE INTERACTIVE CONTROLS
═══════════════════════════════════════════════════════════════ */
.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-family: var(--font-main);
  font-size: 0.88rem;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
}
.ui-btn:active { transform: scale(0.98); }

.ui-btn-primary {
  background: var(--primary);
  color: #FFFFFF;
  border-color: var(--primary);
  box-shadow: 0 4px 14px rgba(46, 111, 64, 0.25);
}
.ui-btn-primary:hover {
  background: var(--primary-hover);
  box-shadow: 0 6px 20px rgba(46, 111, 64, 0.38);
  transform: translateY(-2px);
  color: #FFFFFF;
}

.ui-btn-purple, .ui-btn-secondary {
  background: var(--secondary);
  color: #FFFFFF;
  border-color: var(--secondary);
  box-shadow: 0 4px 14px rgba(142, 69, 133, 0.25);
}
.ui-btn-purple:hover, .ui-btn-secondary:hover {
  background: var(--secondary-hover);
  box-shadow: 0 6px 20px rgba(142, 69, 133, 0.38);
  transform: translateY(-2px);
  color: #FFFFFF;
}

.ui-btn-emerald {
  background: var(--primary);
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(46, 111, 64, 0.25);
}
.ui-btn-emerald:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

.ui-btn-ghost {
  background: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-glass-strong);
}
.ui-btn-ghost:hover {
  background: var(--bg-card-hover);
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-2px);
}

.ui-btn-danger {
  background: var(--critical-subtle);
  color: var(--critical);
  border: 1px solid var(--critical-border);
}
.ui-btn-danger:hover {
  background: var(--critical);
  color: #FFFFFF;
  border-color: var(--critical);
  transform: translateY(-2px);
}

.action-icon-btn {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  color: var(--text-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem;
  transition: var(--transition);
}
.action-icon-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: var(--shadow-resting);
  transform: translateY(-2px);
}

/* ═══════════════════════════════════════════════════════════════
   CHIPS & BADGES
═══════════════════════════════════════════════════════════════ */
.chip-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.chip-green, .chip-emerald {
  background: var(--primary-subtle);
  color: var(--primary);
  border: 1px solid var(--primary-border);
}
.chip-blue {
  background: rgba(46, 111, 64, 0.08);
  color: var(--primary);
  border: 1px solid var(--primary-border);
}
.chip-purple {
  background: var(--secondary-subtle);
  color: var(--secondary);
  border: 1px solid var(--secondary-border);
}
.chip-amber {
  background: var(--accent-subtle);
  color: var(--accent-hover);
  border: 1px solid var(--accent-border);
}
.chip-rose {
  background: var(--critical-subtle);
  color: var(--critical);
  border: 1px solid var(--critical-border);
}

/* Pro Badge — Signature Plum */
.pro-badge, .badge-pro {
  background: var(--secondary) !important;
  color: #FFFFFF !important;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}

/* CRM Status Badges */
.status-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.72rem;
  font-weight: 800;
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--transition-fast);
}
.status-ready { background: var(--primary-subtle); color: var(--primary); border-color: var(--primary-border); }
.status-applied { background: var(--secondary-subtle); color: var(--secondary); border-color: var(--secondary-border); }
.status-interview { background: var(--accent-subtle); color: var(--accent-hover); border-color: var(--accent-border); }
.status-offer { background: rgba(46, 111, 64, 0.16); color: var(--primary); border-color: var(--primary-border); }
.status-archived { background: var(--critical-subtle); color: var(--critical); border-color: var(--critical-border); }

/* ═══════════════════════════════════════════════════════════════
   FORM INPUTS & WELLS
═══════════════════════════════════════════════════════════════ */
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-label {
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.form-input {
  background: var(--bg-card);
  border: 1.5px solid var(--border-glass-strong);
  border-radius: var(--radius-md);
  color: var(--text-main);
  padding: 11px 16px;
  font-size: 0.9rem;
  font-family: var(--font-main);
  font-weight: 500;
  width: 100%;
  outline: none;
  transition: var(--transition);
}
.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-subtle);
  background: var(--bg-card-solid);
}

/* ═══════════════════════════════════════════════════════════════
   AUTH SPLIT MODAL
═══════════════════════════════════════════════════════════════ */
#auth-overlay-screen {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 24, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
  transition: var(--transition);
}

.auth-split-container {
  display: grid;
  grid-template-columns: 1.15fr 1.25fr;
  max-width: 980px;
  width: 100%;
  min-height: 580px;
  background: var(--bg-surface);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
  position: relative;
}

.auth-hero-showcase {
  background: linear-gradient(145deg, #225330 0%, #1A1A18 100%);
  color: #FFFFFF;
  padding: 44px 36px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.auth-hero-showcase::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(218, 165, 32, 0.25) 0%, transparent 70%);
}

.auth-brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--accent);
  margin-bottom: 20px;
}

.auth-hero-title {
  font-family: var(--font-heading);
  font-size: 2.3rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 12px;
  color: #FFFFFF;
}

.auth-feature-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: var(--transition);
}
.auth-feature-item:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}
.auth-feat-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  background: rgba(218, 165, 32, 0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.auth-form-panel {
  padding: 40px 44px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--bg-surface);
}

.auth-segmented-tabs {
  display: flex;
  background: var(--surface-sunken);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-full);
  padding: 4px;
  margin-bottom: 24px;
}
.auth-tab-btn {
  flex: 1;
  padding: 9px 14px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-main);
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
  transition: var(--transition);
}
.auth-tab-btn.active {
  background: var(--primary);
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(46, 111, 64, 0.3);
}

.cv-dropzone-box {
  background: var(--primary-subtle);
  border: 2px dashed var(--primary-border);
  border-radius: var(--radius-lg);
  padding: 22px 16px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 16px;
  transition: var(--transition);
}
.cv-dropzone-box:hover {
  background: rgba(46, 111, 64, 0.14);
  border-color: var(--primary);
  transform: translateY(-2px);
}
.cv-dropzone-icon { font-size: 2.2rem; margin-bottom: 6px; }

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR & NAVIGATION
═══════════════════════════════════════════════════════════════ */
sidebar {
  width: var(--sidebar-width);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-glass-strong);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 50;
  padding: 24px 18px;
  transition: var(--transition);
  box-shadow: var(--shadow-resting);
}

.brand-box {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-glass);
  margin-bottom: 18px;
}
.brand-header { display: flex; align-items: center; gap: 12px; }
.brand-logo-icon {
  width: 44px; height: 44px;
  border-radius: var(--radius-md);
  background: var(--primary);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem;
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(46, 111, 64, 0.3);
  flex-shrink: 0;
}
.brand-title-text {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--primary);
}

.nav-group-label {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  padding: 14px 12px 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  width: 100%;
  text-align: left;
  transition: var(--transition);
  font-family: var(--font-main);
}
.nav-item:hover {
  background: var(--bg-card-hover);
  color: var(--text-main);
  transform: translateX(4px);
}
.nav-item.active {
  background: var(--primary-subtle);
  color: var(--primary);
  border-color: var(--primary-border);
  font-weight: 700;
}
.nav-item-icon {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}
.nav-item.active .nav-item-icon {
  background: var(--primary);
  color: #FFFFFF;
}

.sidebar-engine-card {
  background: var(--secondary-subtle);
  border: 1px solid var(--secondary-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin: 14px 0;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CONTENT & TOPBAR
═══════════════════════════════════════════════════════════════ */
.main-wrapper {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar-header {
  height: var(--topbar-height);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-glass-strong);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36px;
  position: sticky;
  top: 0;
  z-index: 40;
  box-shadow: var(--shadow-resting);
}
.content-viewport {
  padding: 32px 36px;
  flex: 1;
}

/* ═══════════════════════════════════════════════════════════════
   TACTILE STAT CARDS (4 MONOLITHS)
═══════════════════════════════════════════════════════════════ */
.stats-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}
.stat-card-3d {
  background: var(--bg-card);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-lg);
  padding: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: var(--transition);
}
.stat-card-3d::before {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 4px;
  background: var(--accent-line, var(--primary));
}
.stat-card-3d:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
  border-color: var(--primary-border);
}
.stat-card-icon-box {
  width: 44px; height: 44px;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
  margin-bottom: 14px;
  background: var(--surface-sunken);
}
.stat-card-value-num {
  font-family: var(--font-code);
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1;
  color: var(--text-main);
}

/* ═══════════════════════════════════════════════════════════════
   CHARTS & SECTIONS
═══════════════════════════════════════════════════════════════ */
.charts-panels-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
  margin-bottom: 32px;
}
.chart-panel-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

/* ═══════════════════════════════════════════════════════════════
   JOB CARDS WITH SIGNATURE ACCENT & MATCH RING
═══════════════════════════════════════════════════════════════ */
.jobs-cards-stack { display: flex; flex-direction: column; gap: 14px; }
.job-item-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-lg);
  padding: 18px 22px;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 18px;
  position: relative;
  overflow: visible;
  box-shadow: var(--shadow-resting);
}
.job-item-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 4px;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.65;
  transition: width 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease;
}
.job-item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
  border-color: var(--primary-border);
}
.job-item-card:hover::before {
  width: 7px;
  opacity: 1.0;
  background: var(--primary);
}

.job-logo-box {
  width: 48px; height: 48px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  border: 1px solid var(--border-glass-strong);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--primary);
  flex-shrink: 0;
}
.job-company-tag {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.job-title-text {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 2px 0;
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH & FILTERS
═══════════════════════════════════════════════════════════════ */
.search-filters-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  background: var(--bg-card);
  border: 1px solid var(--border-glass-strong);
  padding: 12px 18px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-resting);
}
.filter-search-input {
  background: var(--surface-sunken);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  color: var(--text-main);
  font-size: 0.9rem;
  font-family: var(--font-main);
  flex: 1;
  min-width: 220px;
  outline: none;
}
.filter-search-input:focus { border-color: var(--primary); }

.filter-pill-btn {
  background: var(--surface-sunken);
  border: 1px solid var(--border-glass);
  color: var(--text-muted);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition-fast);
}
.filter-pill-btn:hover { color: var(--text-main); border-color: var(--primary); }
.filter-pill-btn.active {
  background: var(--primary);
  color: #FFFFFF;
  border-color: var(--primary);
  box-shadow: 0 2px 10px rgba(46, 111, 64, 0.25);
}

/* ═══════════════════════════════════════════════════════════════
   WORKFLOW RUNNER
═══════════════════════════════════════════════════════════════ */
.runner-hero-card {
  background: linear-gradient(145deg, #1C2B1E 0%, #1A1A18 100%);
  color: #FFFFFF;
  border-radius: var(--radius-xl);
  padding: 30px 36px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-card);
}
.runner-meta-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-lg);
  padding: 18px;
  box-shadow: var(--shadow-resting);
  display: flex;
  align-items: center;
  gap: 14px;
}

.free-flow-graph-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-xl);
  padding: 28px;
  box-shadow: var(--shadow-card);
}
.free-flow-node-card {
  background: var(--surface-sunken);
  border: 1.5px solid var(--border-glass-strong);
  border-radius: var(--radius-md);
  padding: 18px 14px;
  text-align: center;
  transition: var(--transition);
}
.free-flow-node-card:hover {
  border-color: var(--primary);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card);
}

.runner-console-container {
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: #151814;
  border: 1px solid var(--border-glass-strong);
  box-shadow: var(--shadow-card);
}

/* ═══════════════════════════════════════════════════════════════
   MODAL DIALOGS
═══════════════════════════════════════════════════════════════ */
.modal-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 24, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 99999;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal-backdrop.open { display: flex !important; animation: fadeInModal 0.2s ease; }
@keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }

.modal-dialog-box {
  background: var(--bg-surface);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 880px;
  max-height: 88vh;
  overflow-y: auto;
  box-shadow: var(--shadow-modal);
}
.modal-dialog-header {
  padding: 26px 34px;
  border-bottom: 1px solid var(--border-glass);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: var(--bg-surface);
  z-index: 10;
}
.modal-dialog-body { padding: 32px; }

.modal-info-panel {
  background: var(--surface-sunken);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  padding: 18px 22px;
  margin-bottom: 18px;
}
.modal-info-label {
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
  margin-bottom: 8px;
}

/* Modal Sub-Tabs */
.modal-nav-tabs {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border-glass);
  padding: 0 32px;
  background: var(--bg-surface);
  position: sticky;
  top: 73px;
  z-index: 9;
  overflow-x: auto;
}
.modal-tab-btn {
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 2.5px solid transparent;
  color: var(--text-muted);
  font-family: var(--font-main);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: var(--transition-fast);
}
.modal-tab-btn:hover { color: var(--text-main); border-bottom-color: var(--border-glass-strong); }
.modal-tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 800;
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast-card {
  pointer-events: auto;
  min-width: 320px;
  max-width: 420px;
  background: var(--bg-surface);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-modal);
  animation: slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-icon-box {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.toast-title { font-size: 0.9rem; font-weight: 800; color: var(--text-main); }
.toast-message { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
`;

// Replace style content
const styleRegex = /<style>[\s\S]*?<\/style>/;
html = html.replace(styleRegex, `<style>\n${newStyles}\n</style>`);

// 3. Inject Signature Match Ring JS & update job card rendering in HTML
const matchRingJsFunction = `
// ── SIGNATURE ELEMENT: DIMENSIONAL MATCH RING ──────────────────
function renderMatchRing(score, size = 'md') {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  let dim = 52, r = 20, sw = 4.5, fSize = '0.9rem', subSize = '0.55rem';
  if (size === 'lg') { dim = 82; r = 33; sw = 6.5; fSize = '1.4rem'; subSize = '0.75rem'; }
  if (size === 'sm') { dim = 38; r = 14; sw = 3.5; fSize = '0.74rem'; subSize = '0.48rem'; }
  if (size === 'badge') { dim = 26; r = 9.5; sw = 2.5; fSize = '0.6rem'; subSize = '0.38rem'; }
  
  const circ = 2 * Math.PI * r;
  const offset = circ - (s / 100) * circ;
  const gradId = 'rg_' + size + '_' + s + '_' + Math.floor(Math.random()*100000);
  
  const isHigh = s >= 75;
  const isMid = s >= 70 && s < 75;
  const stop1 = isHigh ? '#DAA520' : (isMid ? '#8E4585' : '#660033');
  const stop2 = isHigh ? '#2E6F40' : (isMid ? '#DAA520' : '#8E4585');
  
  return '<div class="match-ring-wrapper match-ring-' + size + '" style="width:' + dim + 'px; height:' + dim + 'px;" title="' + s + '% AI Match Score">' +
    '<svg width="' + dim + '" height="' + dim + '" viewBox="0 0 ' + dim + ' ' + dim + '" class="match-ring-svg">' +
      '<defs>' +
        '<linearGradient id="' + gradId + '" x1="0%" y1="100%" x2="100%" y2="0%">' +
          '<stop offset="0%" stop-color="' + stop1 + '" />' +
          '<stop offset="100%" stop-color="' + stop2 + '" />' +
        '</linearGradient>' +
      '</defs>' +
      '<circle cx="' + (dim/2) + '" cy="' + (dim/2) + '" r="' + r + '" fill="none" stroke="var(--surface-sunken)" stroke-width="' + sw + '" />' +
      '<circle cx="' + (dim/2) + '" cy="' + (dim/2) + '" r="' + r + '" fill="none" stroke="url(#' + gradId + ')" stroke-width="' + sw + '" ' +
        'stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" stroke-linecap="round" ' +
        'style="transform: rotate(-90deg); transform-origin: 50% 50%;" />' +
    '</svg>' +
    '<div class="match-ring-label" style="font-size:' + fSize + ';">' +
      s + '<span class="match-ring-pct" style="font-size:' + subSize + ';">%</span>' +
    '</div>' +
  '</div>';
}
`;

// Insert matchRingJsFunction before renderJobsCardsStack
html = html.replace('function renderJobsCardsStack', matchRingJsFunction + '\nfunction renderJobsCardsStack');

// Update renderJobsCardsStack to use renderMatchRing
html = html.replace(
  /<div class="score-badge-circle \$\{scoreClass\}">[\s\S]*?<\/div>/,
  `\${renderMatchRing(score, 'md')}`
);

// Update Modal header to use large match ring
html = html.replace(
  /\$\{score\}% AI Match/,
  `\${score}% Fit`
);

// Update Chart.js palette to Autumn Orchard
html = html.replace(
  /backgroundColor: \['rgba\(16, 185, 129, 0\.85\)', 'rgba\(245, 158, 11, 0\.85\)', 'rgba\(0, 240, 255, 0\.85\)'\]/,
  `backgroundColor: ['#2E6F40', '#DAA520', '#660033']`
);
html = html.replace(
  /backgroundColor: \['#00F0FF', '#A855F7', '#10B981', '#F59E0B'\]/,
  `backgroundColor: ['#2E6F40', '#8E4585', '#DAA520', '#660033']`
);

// Write to public/index.html and dashboard/public/index.html
fs.writeFileSync(targetPath, html, 'utf8');
if (fs.existsSync(path.dirname(dashboardTargetPath))) {
  fs.writeFileSync(dashboardTargetPath, html, 'utf8');
}

console.log('✅ public/index.html and dashboard/public/index.html upgraded successfully with Autumn Orchard Design System!');
