// Renders the report's architecture / UML / chart diagrams from SVG to high-resolution PNG.
const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/sharp');
const OUT = path.join(__dirname, 'diagrams');
fs.mkdirSync(OUT, { recursive: true });

const C = { navy: '#1E3A8A', blue: '#2563EB', teal: '#0D9488', amber: '#B45309', grey: '#475569', light: '#EFF6FF', tlight: '#F0FDFA', alight: '#FFFBEB', line: '#334155', purple: '#6D28D9', plight: '#F5F3FF' };
const F = "font-family='Cambria, Georgia, serif'";
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function box(x, y, w, h, title, lines = [], o = {}) {
  const fill = o.fill || C.light, stroke = o.stroke || C.blue;
  let s = `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${o.rx ?? 10}' fill='${fill}' stroke='${stroke}' stroke-width='2'/>`;
  const ty = lines.length ? y + 26 : y + h / 2 + 6;
  s += `<text x='${x + w / 2}' y='${ty}' ${F} font-size='${o.fs || 17}' font-weight='bold' fill='${o.tc || C.navy}' text-anchor='middle'>${esc(title)}</text>`;
  lines.forEach((l, i) => { s += `<text x='${x + w / 2}' y='${y + 50 + i * 20}' ${F} font-size='${o.ls || 14}' fill='${C.grey}' text-anchor='middle'>${esc(l)}</text>`; });
  return s;
}
function arrow(x1, y1, x2, y2, label = '', o = {}) {
  let s = `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='${o.c || C.line}' stroke-width='2' ${o.dash ? "stroke-dasharray='6,4'" : ''} marker-end='url(#ah)'/>`;
  if (label) s += `<text x='${(x1 + x2) / 2 + (o.dx || 0)}' y='${(y1 + y2) / 2 - 6 + (o.dy || 0)}' ${F} font-size='13' fill='${C.grey}' text-anchor='middle'>${esc(label)}</text>`;
  return s;
}
function svg(w, h, body, title) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
<defs><marker id='ah' markerWidth='10' markerHeight='8' refX='9' refY='4' orient='auto'><path d='M0,0 L10,4 L0,8 z' fill='${C.line}'/></marker></defs>
<rect width='100%' height='100%' fill='white'/>${title ? `<text x='${w / 2}' y='34' ${F} font-size='22' font-weight='bold' fill='${C.navy}' text-anchor='middle'>${esc(title)}</text>` : ''}${body}</svg>`;
}
function actor(x, y, name) {
  return `<circle cx='${x}' cy='${y}' r='14' fill='white' stroke='${C.navy}' stroke-width='2'/><line x1='${x}' y1='${y + 14}' x2='${x}' y2='${y + 50}' stroke='${C.navy}' stroke-width='2'/><line x1='${x - 22}' y1='${y + 26}' x2='${x + 22}' y2='${y + 26}' stroke='${C.navy}' stroke-width='2'/><line x1='${x}' y1='${y + 50}' x2='${x - 16}' y2='${y + 76}' stroke='${C.navy}' stroke-width='2'/><line x1='${x}' y1='${y + 50}' x2='${x + 16}' y2='${y + 76}' stroke='${C.navy}' stroke-width='2'/><text x='${x}' y='${y + 98}' ${F} font-size='15' font-weight='bold' fill='${C.navy}' text-anchor='middle'>${esc(name)}</text>`;
}
const ell = (x, y, t) => `<ellipse cx='${x}' cy='${y}' rx='120' ry='24' fill='${C.tlight}' stroke='${C.teal}' stroke-width='2'/><text x='${x}' y='${y + 5}' ${F} font-size='14' fill='${C.navy}' text-anchor='middle'>${esc(t)}</text>`;

const D = {};

// Fig: overall project workflow
D.workflow = (() => {
  const steps = [['Problem Study', 'Manual form building'], ['Requirements', 'FR / NFR / scope'], ['Design', 'Architecture, UML, ER'], ['Implementation', 'Next.js + Express + AI'], ['Testing', '39 QA + 11 AI cases'], ['Deployment', 'Vercel + Render + PG'], ['Evaluation', 'Results & report']];
  let b = '';
  steps.forEach((s, i) => { const x = 30 + i * 196; b += box(x, 90, 170, 90, `${i + 1}. ${s[0]}`, [s[1]], { fs: 16, ls: 13, fill: i % 2 ? C.tlight : C.light, stroke: i % 2 ? C.teal : C.blue }); if (i < steps.length - 1) b += arrow(x + 170, 135, x + 196, 135); });
  b += `<path d='M 1305 185 C 1305 270, 115 270, 115 185' fill='none' stroke='${C.amber}' stroke-width='2' stroke-dasharray='6,4' marker-end='url(#ah)'/>`;
  b += `<text x='710' y='262' ${F} font-size='14' fill='${C.amber}' text-anchor='middle'>Iterative feedback from four progress reportings (Agile sprints)</text>`;
  return svg(1420, 290, b, 'Overall Project Workflow');
})();

// System architecture
D.architecture = (() => {
  let b = '';
  b += box(40, 70, 1300, 120, 'Presentation Tier — Next.js 15 (App Router) + React 19 + Tailwind CSS', ['Landing · Auth · Dashboard · AI Generator · Visual Builder · Templates · Analytics · Team · Billing · Public Form (/f/:id)', 'Zustand state store · React Hook Form + Zod · Recharts · Framer Motion · lib/api.ts (JWT + refresh)'], { ls: 14 });
  b += arrow(690, 190, 690, 240, 'HTTPS REST (JSON) · Bearer JWT', { dx: 140 });
  b += box(40, 245, 1300, 70, 'API Gateway Layer — Express 4.19', ['Helmet · CORS whitelist · express-rate-limit (API / AI / submissions) · requestLogger · errorHandler'], { fill: C.alight, stroke: C.amber, tc: C.amber });
  const mods = [['Auth Router', '/api/auth'], ['Forms Router', '/api/forms'], ['AI Router', '/api/ai'], ['Teams Router', '/api/teams'], ['Analytics', '/api/analytics'], ['Other Routers', 'templates · upload · workflows']];
  mods.forEach((m, i) => { b += box(40 + i * 218, 340, 200, 70, m[0], [m[1]], { fs: 15, fill: C.tlight, stroke: C.teal }); });
  b += box(40, 435, 640, 140, 'AIFormBrain (lib/aiBrain)', ['Intent · Language · Domain · Industry detectors', 'Requirement Analyzer · Deep Reasoner · Field Intelligence', 'Form Generator · Quiz Engine · Quality Reviewer', 'Document Intelligence (PDF / DOCX / image)'], { fill: C.plight, stroke: C.purple, tc: C.purple });
  b += box(700, 435, 640, 140, 'Service Layer', ['formsService · analyticsService · emailService (SMTP / Resend)', 'documentParser (pdf-parse, mammoth, xlsx) · cache · queue (BullMQ)', 'subscription middleware · activity log · validations (Zod)'], {});
  b += arrow(360, 575, 360, 625); b += arrow(1020, 575, 1020, 625); b += arrow(220, 575, 220, 625);
  b += box(40, 630, 400, 100, 'Google Gemini API', ['gemini-3.5 / 3.1 flash-lite → 2.5-flash', '→ flash-latest → 2.5-pro (fallback chain)'], { fill: C.alight, stroke: C.amber, tc: C.amber });
  b += box(470, 630, 430, 100, 'PostgreSQL via Prisma ORM 5.12', ['16 models: User, Form, Question, Response,', 'Team, Analytics, Activity, FormEvent …']);
  b += box(930, 630, 410, 100, 'Infrastructure', ['Redis cache (optional, in-memory fallback)', 'Uploads storage · SMTP / Resend email'], { fill: C.tlight, stroke: C.teal });
  return svg(1380, 760, b, 'PromptForm AI — Three-Tier System Architecture');
})();

// AI generation process flow
D.aiflow = (() => {
  const s = [['User Prompt / File', 'text, PDF, DOCX, image'], ['Validation & Credits', 'Zod · ≥5 credits · plan limit'], ['Document Parsing', 'pdf-parse · mammoth · OCR'], ['AIFormBrain', 'intent → domain → plan'], ['Gemini LLM', 'JSON schema output'], ['Quality Review', 'labels · types · options'], ['Persist & Publish', 'Prisma · uniqueShareId'], ['Builder / Share', 'edit, theme, publish']];
  let b = '';
  s.forEach((t, i) => { const col = i % 4, row = Math.floor(i / 4); const x = row ? 40 + (3 - col) * 330 : 40 + col * 330; const y = 80 + row * 170;
    b += box(x, y, 290, 90, t[0], [t[1]], { fill: row ? C.tlight : C.light, stroke: row ? C.teal : C.blue });
    if (i < 3) b += arrow(x + 290, y + 45, x + 330, y + 45);
    if (i > 3 && i < 7) b += arrow(x, y + 45, x - 40, y + 45);
  });
  b += arrow(1175, 170, 1175, 250);
  b += `<text x='690' y='400' ${F} font-size='14' fill='${C.amber}' text-anchor='middle'>If Gemini fails or times out (45 s) the deterministic AIFormBrain output is used as a fallback.</text>`;
  return svg(1380, 420, b, 'AI Form Generation Process Flow');
})();

// Use case diagram
D.usecase = (() => {
  let b = `<rect x='300' y='60' width='780' height='640' rx='14' fill='white' stroke='${C.navy}' stroke-width='2'/><text x='690' y='88' ${F} font-size='17' font-weight='bold' fill='${C.navy}' text-anchor='middle'>PromptForm AI System</text>`;
  b += actor(120, 150, 'Form Creator'); b += actor(120, 470, 'Team Member'); b += actor(1260, 150, 'Respondent'); b += actor(1260, 470, 'Administrator');
  const left = ['Register / Login', 'Generate form with AI prompt', 'Upload document to digitise', 'Edit form in visual builder', 'Publish & share form link', 'View analytics & export CSV', 'Manage team & collaborators'];
  const right = ['Fill & submit public form', 'Take timed quiz (anti-cheat)', 'Receive confirmation', 'Manage coupons & plans', 'Monitor users / platform'];
  left.forEach((t, i) => { const y = 130 + i * 80; b += ell(560, y, t); b += `<line x1='150' y1='${i < 5 ? 200 : 520}' x2='440' y2='${y}' stroke='${C.grey}' stroke-width='1.3'/>`; });
  right.forEach((t, i) => { const y = 150 + i * 105; b += ell(900, y, t); b += `<line x1='1230' y1='${i < 3 ? 200 : 520}' x2='1020' y2='${y}' stroke='${C.grey}' stroke-width='1.3'/>`; });
  return svg(1380, 730, b, 'Use Case Diagram');
})();

// ER diagram
D.er = (() => {
  const ent = {
    User: [40, 70, ['id PK', 'email UK', 'name', 'password (bcrypt)', 'role', 'subscriptionPlan', 'credits', 'activeSessionToken']],
    Form: [480, 70, ['id PK', 'title', 'status', 'settings JSON', 'theme JSON', 'ownerId FK', 'teamId FK', 'uniqueShareId UK']],
    Question: [920, 70, ['id PK', 'formId FK', 'type', 'label', 'required', 'orderIndex', 'options / validations / logic']],
    Response: [920, 400, ['id PK', 'formId FK', 'answers JSON', 'browserMetadata JSON', 'timeTaken', 'email']],
    Team: [40, 420, ['id PK', 'name', 'ownerId FK']],
    TeamMember: [40, 600, ['id PK', 'teamId FK', 'userId FK', 'role']],
    Analytics: [480, 420, ['id PK', 'formId FK', 'views', 'submissions', 'device/country stats']],
    FormEvent: [480, 640, ['id PK', 'formId FK', 'eventType', 'device', 'country']],
    Transaction: [920, 650, ['id PK', 'userId FK', 'plan', 'amount', 'receiptNumber UK']],
  };
  let b = '';
  for (const [n, [x, y, f]] of Object.entries(ent)) {
    const h = 34 + f.length * 21;
    b += `<rect x='${x}' y='${y}' width='380' height='${h}' fill='white' stroke='${C.navy}' stroke-width='2'/><rect x='${x}' y='${y}' width='380' height='30' fill='${C.navy}'/><text x='${x + 190}' y='${y + 21}' ${F} font-size='16' font-weight='bold' fill='white' text-anchor='middle'>${n}</text>`;
    f.forEach((l, i) => { b += `<text x='${x + 12}' y='${y + 50 + i * 21}' ${F} font-size='14' fill='${/PK|FK|UK/.test(l) ? C.blue : C.grey}'>${esc(l)}</text>`; });
  }
  const rel = (x1, y1, x2, y2, t) => `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='${C.teal}' stroke-width='2'/><text x='${(x1 + x2) / 2}' y='${(y1 + y2) / 2 - 6}' ${F} font-size='13' font-weight='bold' fill='${C.teal}' text-anchor='middle'>${t}</text>`;
  b += rel(420, 150, 480, 150, '1 : N'); b += rel(860, 150, 920, 150, '1 : N'); b += rel(860, 220, 920, 450, '1 : N');
  b += rel(230, 280, 230, 420, '1 : N owns'); b += rel(230, 497, 230, 600, '1 : N'); b += rel(660, 280, 660, 420, '1 : N'); b += rel(760, 547, 760, 640, '');
  b += rel(420, 260, 920, 690, '1 : N'); b += rel(420, 470, 480, 240, 'N : 1');
  b += `<text x='690' y='815' ${F} font-size='13' fill='${C.grey}' text-anchor='middle'>Additional models: TeamInvite, Workflow, Template, Coupon, FormDailyMetric, FormCollaborator, Activity (16 in total)</text>`;
  return svg(1380, 830, b, 'Entity–Relationship Diagram (Core Entities)');
})();

// Class diagram
D.classd = (() => {
  const cls = [
    [40, 70, 'AIFormBrain', ['+process(prompt, docCtx)', '+generate(prompt): FormConfig']],
    [480, 70, 'IntentDetector', ['+detect(prompt): IntentContext', '-normalise() -spellRecover()']],
    [920, 70, 'DomainDetector', ['+detect(ctx, doc): Domain', 'quiz | survey | medical | …']],
    [40, 300, 'SmartFieldIntelligenceEngine', ['+resolve(domain, industry, prompt)', 'maps intents → 11 widget types']],
    [480, 300, 'EnterpriseFormGenerator', ['+generate(plan): FormConfig', 'title · questions · theme']],
    [920, 300, 'EnterpriseQuizEngine', ['+resolve(domain, prompt, qs)', 'points · negativePoints · bloom']],
    [40, 530, 'EnterpriseQualityReviewer', ['+reviewAndImprove(cfg)', 'dedupe labels · fix options']],
    [480, 530, 'FormsService', ['+create() +update() +submit()', '+export(csv) +analytics()']],
    [920, 530, 'EmailService', ['+send(to, subject, html)', 'SMTP / Resend provider']],
  ];
  let b = '';
  cls.forEach(([x, y, n, m]) => { b += `<rect x='${x}' y='${y}' width='400' height='150' fill='white' stroke='${C.purple}' stroke-width='2'/><rect x='${x}' y='${y}' width='400' height='36' fill='${C.plight}' stroke='${C.purple}' stroke-width='2'/><text x='${x + 200}' y='${y + 24}' ${F} font-size='16' font-weight='bold' fill='${C.purple}' text-anchor='middle'>${n}</text>`;
    m.forEach((l, i) => { b += `<text x='${x + 14}' y='${y + 68 + i * 26}' ${F} font-size='14' fill='${C.grey}'>${esc(l)}</text>`; }); });
  b += arrow(440, 145, 480, 145, 'uses'); b += arrow(880, 145, 920, 145, ''); b += arrow(240, 220, 240, 300, 'uses', { dx: 30 }); b += arrow(440, 375, 480, 375); b += arrow(880, 375, 920, 375); b += arrow(680, 450, 680, 530, 'persists', { dx: 40 }); b += arrow(240, 450, 240, 530); b += arrow(880, 605, 920, 605);
  return svg(1380, 710, b, 'Class Diagram — AI Engine and Services');
})();

// Sequence diagram
D.sequence = (() => {
  const L = [['User', 90], ['Next.js UI', 300], ['Express API', 520], ['Auth/Limits', 740], ['AIFormBrain', 960], ['Gemini', 1150], ['PostgreSQL', 1310]];
  let b = '';
  L.forEach(([n, x]) => { b += `<rect x='${x - 70}' y='60' width='140' height='40' rx='6' fill='${C.light}' stroke='${C.blue}' stroke-width='2'/><text x='${x}' y='86' ${F} font-size='15' font-weight='bold' fill='${C.navy}' text-anchor='middle'>${n}</text><line x1='${x}' y1='100' x2='${x}' y2='760' stroke='${C.grey}' stroke-dasharray='5,5'/>`; });
  const msg = [[0, 1, 'enter prompt / upload'], [1, 2, 'POST /api/ai/generate'], [2, 3, 'verify JWT, credits, plan'], [3, 2, 'ok', 1], [2, 4, 'process(prompt)'], [4, 4, 'intent · domain · plan'], [2, 5, 'generateContent (JSON)'], [5, 2, 'form JSON', 1], [2, 4, 'reviewAndImprove()'], [2, 6, 'create Form + Questions'], [6, 2, 'form id, shareId', 1], [2, 1, '200 { form, summary }', 1], [1, 0, 'open builder', 1]];
  msg.forEach(([a, c, t, r], i) => { const y = 135 + i * 48; const x1 = L[a][1], x2 = L[c][1];
    if (a === c) { b += `<path d='M ${x1} ${y} h 50 v 26 h -46' fill='none' stroke='${C.line}' stroke-width='2' marker-end='url(#ah)'/><text x='${x1 + 58}' y='${y + 18}' ${F} font-size='13' fill='${C.grey}'>${t}</text>`; }
    else b += arrow(x1, y, x2 + (x2 > x1 ? -4 : 4), y, t, { dash: r });
  });
  return svg(1400, 790, b, 'Sequence Diagram — AI Form Generation');
})();

// Activity diagram
D.activity = (() => {
  let b = `<circle cx='690' cy='75' r='14' fill='${C.navy}'/>`;
  const st = ['Open public link /f/:shareId', 'Load form, theme, settings', 'Record VIEW event (device, country)', 'Respondent answers questions', 'Client-side validation (Zod)'];
  st.forEach((t, i) => { b += box(540, 105 + i * 85, 300, 52, t, [], { fs: 15, rx: 26 }); b += arrow(690, (i ? 157 + (i - 1) * 85 : 89), 690, 105 + i * 85); });
  b += `<polygon points='690,535 790,580 690,625 590,580' fill='${C.alight}' stroke='${C.amber}' stroke-width='2'/><text x='690' y='585' ${F} font-size='14' fill='${C.amber}' text-anchor='middle'>Valid?</text>`;
  b += arrow(690, 497, 690, 535); b += arrow(590, 580, 380, 580, 'no'); b += box(110, 555, 270, 50, 'Show field errors', [], { fs: 15, rx: 26 });
  b += `<path d='M 245 555 V 377 H 540' fill='none' stroke='${C.line}' stroke-width='2' marker-end='url(#ah)'/>`;
  b += arrow(690, 625, 690, 665, 'yes', { dx: 20 });
  const st2 = ['POST /api/forms/:id/submit (rate limited)', 'Save Response, update Analytics, notify owner'];
  st2.forEach((t, i) => { b += box(500, 665 + i * 85, 380, 52, t, [], { fs: 15, rx: 26 }); if (i) b += arrow(690, 717, 690, 750); });
  b += arrow(690, 802, 690, 838); b += `<circle cx='690' cy='852' r='14' fill='white' stroke='${C.navy}' stroke-width='3'/><circle cx='690' cy='852' r='8' fill='${C.navy}'/>`;
  return svg(1380, 885, b, 'Activity Diagram — Form Submission');
})();

// Deployment diagram
D.deployment = (() => {
  let b = '';
  b += box(40, 80, 300, 150, 'Client Device', ['Browser (desktop / mobile)', 'HTTPS'], { fill: C.tlight, stroke: C.teal });
  b += box(420, 70, 420, 170, 'Vercel Edge / CDN', ['Next.js 15 frontend build', 'Static assets, SSR pages', 'NEXT_PUBLIC_API_URL → API'], {});
  b += box(920, 70, 420, 170, 'Render Web Service', ['Node.js 20 · Express backend', 'npm run build → node dist/index.js', 'health: /health/liveness, /readiness'], { fill: C.alight, stroke: C.amber, tc: C.amber });
  b += box(920, 330, 420, 130, 'Managed PostgreSQL', ['Prisma migrations / generate', 'DATABASE_URL'], {});
  b += box(420, 330, 420, 130, 'Google Gemini API', ['generativelanguage.googleapis.com', 'GEMINI_API_KEY'], { fill: C.plight, stroke: C.purple, tc: C.purple });
  b += box(40, 330, 300, 130, 'Email Provider', ['Gmail SMTP / Resend', 'invites, notifications'], { fill: C.tlight, stroke: C.teal });
  b += arrow(340, 155, 420, 155, 'HTTPS'); b += arrow(840, 155, 920, 155, 'REST'); b += arrow(1130, 240, 1130, 330, 'TCP/SSL', { dx: 40 }); b += arrow(920, 230, 840, 340, 'HTTPS'); b += arrow(920, 220, 340, 360, 'SMTP/API', { dy: -10 });
  b += `<text x='690' y='510' ${F} font-size='14' fill='${C.grey}' text-anchor='middle'>Local development: docker-compose (PostgreSQL + Redis) · node dev.js runs backend :5050 and frontend :4500</text>`;
  return svg(1380, 535, b, 'Deployment Diagram');
})();

// JWT auth flow
D.auth = (() => {
  const s = [['Login / Register', 'email + password (≥10 chars)'], ['bcrypt verify', 'cost factor 10'], ['Issue JWT pair', 'access + refresh token'], ['Store session id', 'User.activeSessionToken'], ['authMiddleware', 'verify token + session'], ['subscription', 'plan limits, credits']];
  let b = '';
  s.forEach((t, i) => { const x = 30 + i * 225; b += box(x, 80, 200, 95, t[0], [t[1]], { fs: 15, ls: 12.5, fill: i % 2 ? C.tlight : C.light, stroke: i % 2 ? C.teal : C.blue }); if (i < 5) b += arrow(x + 200, 127, x + 225, 127); });
  b += `<text x='690' y='225' ${F} font-size='14' fill='${C.grey}' text-anchor='middle'>A new login replaces activeSessionToken, invalidating older sessions (single active session). 401 → client calls /api/auth/refresh.</text>`;
  return svg(1380, 250, b, 'Authentication and Authorization Flow');
})();

// Gantt chart
D.gantt = (() => {
  const tasks = [['Problem study & literature', 0, 2], ['Requirement analysis', 1, 3], ['Architecture & UML design', 2, 4], ['Database schema (Prisma)', 3, 5], ['Auth & core APIs', 4, 7], ['AI engine (AIFormBrain + Gemini)', 5, 10], ['Builder, templates, public forms', 6, 10], ['Analytics, teams, notifications', 8, 12], ['Testing & bug fixing', 9, 13], ['Deployment (Vercel/Render)', 11, 13], ['Documentation & report', 12, 14]];
  let b = ''; const x0 = 380, wk = 64;
  for (let w = 0; w < 14; w++) b += `<rect x='${x0 + w * wk}' y='60' width='${wk}' height='26' fill='${w % 2 ? C.light : 'white'}' stroke='#CBD5E1'/><text x='${x0 + w * wk + wk / 2}' y='78' ${F} font-size='13' fill='${C.navy}' text-anchor='middle'>W${w + 1}</text>`;
  tasks.forEach(([t, a, e], i) => { const y = 100 + i * 40; b += `<text x='30' y='${y + 20}' ${F} font-size='15' fill='${C.navy}'>${esc(t)}</text><rect x='${x0 + a * wk}' y='${y + 4}' width='${(e - a) * wk}' height='24' rx='5' fill='${i % 2 ? C.teal : C.blue}'/>`; });
  return svg(1300, 560, b, 'Project Schedule (Gantt Chart, 14 weeks)');
})();

// Performance chart
D.perf = (() => {
  const data = [['Manual (Google Forms)', 1200, '#94A3B8'], ['Template-based', 420, '#64748B'], ['PromptForm AI (text)', 8, C.blue], ['PromptForm AI (document)', 12, C.teal]];
  let b = ''; const x0 = 330, max = 1200, W = 880;
  data.forEach(([n, v, c], i) => { const y = 80 + i * 75; const w = Math.max(6, v / max * W); b += `<text x='310' y='${y + 30}' ${F} font-size='16' fill='${C.navy}' text-anchor='end'>${n}</text><rect x='${x0}' y='${y + 8}' width='${w}' height='36' rx='4' fill='${c}'/><text x='${x0 + w + 10}' y='${y + 32}' ${F} font-size='15' font-weight='bold' fill='${C.navy}'>${v} s</text>`; });
  b += `<text x='770' y='400' ${F} font-size='14' fill='${C.grey}' text-anchor='middle'>Average time to produce a ready-to-share 8–10 field form (seconds, lower is better)</text>`;
  return svg(1300, 420, b, 'Form Creation Time Comparison');
})();

// Test results chart
D.tests = (() => {
  const data = [['Auth', 9], ['Billing', 6], ['Builder', 4], ['Runner', 7], ['Quiz', 3], ['Analytics', 3], ['Team', 4], ['AI / Flow', 3], ['AI Gen', 11]];
  let b = ''; const base = 400, x0 = 90;
  data.forEach(([n, v], i) => { const h = v * 28; const x = x0 + i * 130; b += `<rect x='${x}' y='${base - h}' width='90' height='${h}' fill='${i === 8 ? C.teal : C.blue}' rx='4'/><text x='${x + 45}' y='${base - h - 8}' ${F} font-size='16' font-weight='bold' fill='${C.navy}' text-anchor='middle'>${v}/${v}</text><text x='${x + 45}' y='${base + 24}' ${F} font-size='15' fill='${C.navy}' text-anchor='middle'>${n}</text>`; });
  b += `<line x1='100' y1='${base}' x2='1260' y2='${base}' stroke='${C.line}' stroke-width='2'/><text x='680' y='470' ${F} font-size='14' fill='${C.grey}' text-anchor='middle'>50 automated test cases (39 platform QA + 11 AI generation) — all passed</text>`;
  return svg(1300, 490, b, 'Test Cases Passed by Suite');
})();

// Module architecture
D.modules = (() => {
  const m = [['Authentication', 'register · login · OAuth · refresh'], ['AI Generator', 'prompt / document → form'], ['Visual Builder', 'fields · logic · theme'], ['Templates', 'marketplace · preview'], ['Public Forms', 'full / wizard / chat modes'], ['Quiz Engine', 'scoring · anti-cheat · timer'], ['Responses', 'table · print · CSV/XLSX'], ['Analytics', 'views · devices · sentiment'], ['Teams', 'invites · roles · activity'], ['Billing', 'plans · coupons · credits'], ['Notifications', 'live panel · email'], ['Admin', 'users · coupons · metrics']];
  let b = box(540, 60, 300, 60, 'PromptForm AI Platform', [], { fill: C.navy, stroke: C.navy, tc: 'white' });
  m.forEach((t, i) => { const col = i % 4, row = Math.floor(i / 4); const x = 40 + col * 330, y = 170 + row * 130; b += box(x, y, 300, 90, t[0], [t[1]], { fill: row === 1 ? C.tlight : row === 2 ? C.plight : C.light, stroke: row === 1 ? C.teal : row === 2 ? C.purple : C.blue }); b += `<line x1='690' y1='120' x2='${x + 150}' y2='${y}' stroke='#CBD5E1' stroke-width='1.2'/>`; });
  return svg(1380, 570, b, 'Module Architecture');
})();

// Level-1 DFD
D.dfd = (() => {
  let b = '';
  const ent = (x, y, t) => box(x, y, 200, 80, t, [], { fill: '#F1F5F9', stroke: C.line, rx: 0 });
  b += ent(40, 330, 'Form Creator'); b += ent(40, 560, 'Gemini API'); b += ent(1140, 60, 'Respondent');
  const proc = (cx, cy, t) => `<circle cx='${cx}' cy='${cy}' r='75' fill='${C.light}' stroke='${C.blue}' stroke-width='2'/><text x='${cx}' y='${cy + 5}' ${F} font-size='14' font-weight='bold' fill='${C.navy}' text-anchor='middle'>${esc(t)}</text>`;
  b += proc(440, 150, '1.0 Authenticate'); b += proc(440, 380, '2.0 Generate Form'); b += proc(760, 380, '3.0 Edit & Publish'); b += proc(1060, 260, '4.0 Collect Response'); b += proc(760, 600, '5.0 Analyse & Export');
  const ds = (x, y, t) => `<line x1='${x}' y1='${y}' x2='${x + 210}' y2='${y}' stroke='${C.teal}' stroke-width='2'/><line x1='${x}' y1='${y + 36}' x2='${x + 210}' y2='${y + 36}' stroke='${C.teal}' stroke-width='2'/><text x='${x + 105}' y='${y + 24}' ${F} font-size='14' fill='${C.teal}' text-anchor='middle'>${esc(t)}</text>`;
  b += ds(585, 132, 'D4 Users / Sessions'); b += ds(925, 450, 'D1 Forms / Questions'); b += ds(1140, 520, 'D2 Responses'); b += ds(940, 680, 'D3 Analytics / Events');
  b += arrow(240, 345, 375, 190, 'credentials', { dx: -30 }); b += arrow(515, 150, 583, 150);
  b += arrow(240, 375, 363, 380, 'prompt / file', { dy: -8 }); b += arrow(240, 590, 385, 432, 'LLM JSON', { dx: -30 });
  b += arrow(515, 380, 683, 380, 'draft form'); b += arrow(820, 430, 925, 462, 'save', { dy: 22 }); b += arrow(825, 340, 990, 285, 'share link');
  b += arrow(1190, 140, 1115, 205, 'answers', { dx: 40 }); b += arrow(1100, 330, 1190, 518, 'store', { dx: 30 });
  b += arrow(1140, 550, 832, 585, 'responses', { dy: -4 }); b += arrow(940, 690, 834, 630, 'events', { dy: 22 });
  b += arrow(685, 615, 240, 400, 'reports, CSV', { dy: 30 });
  return svg(1380, 760, b, 'Data Flow Diagram (Level 1)');
})();
(async () => {
  for (const [n, s] of Object.entries(D)) {
    fs.writeFileSync(path.join(OUT, n + '.svg'), s);
    await sharp(Buffer.from(s), { density: 200 }).png().toFile(path.join(OUT, n + '.png'));
    console.log('rendered', n);
  }
})();

