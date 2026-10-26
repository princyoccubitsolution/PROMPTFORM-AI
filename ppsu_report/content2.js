// Chapters 6–9: System analysis & design, Technology stack, Implementation, Testing.
const path = require('path');
const S = f => path.join(__dirname, 'shots', f + '.png');
const D = f => path.join(__dirname, 'diagrams', f + '.png');
const qa = require('../qa_test_report.json').results;
const ai = require('../ai_generator_qa_report.json').results;
const st = s => (s === 'VERIFIED_FIX' ? 'Pass (fix verified)' : 'Pass');

module.exports = [
  // ======================= CHAPTER 6 =======================
  { h1: ['6', 'System Analysis and Design'] },
  { h2: '6.1 Existing System / Current Practice' },
  { p: [
    'In current practice a form author opens a hosted builder, creates an empty form and adds questions one at a time. For every question the author types a label, selects a type from a menu, types each option for choice questions, toggles the required flag and optionally adds validation such as an e-mail pattern. Themes are chosen from a small set of presets. If the organisation already has the form on paper or in a PDF, every field is re-typed. For assessments, correct answers and marks are entered manually for each question.',
    'After publication, responses are viewed as a list or exported to a spreadsheet; deeper analysis such as completion rate, drop-off, device split or sentiment of text answers is either unavailable or requires external tools. Collaboration is usually limited to sharing an edit link, which gives full control to anyone holding it. The main weaknesses of the existing practice are therefore: high authoring time, inconsistent field types and validation, no digitisation of existing documents, limited quiz integrity controls, shallow analytics and coarse access control.',
  ] },
  { h2: '6.2 Proposed System' },
  { p: [
    'The proposed system, PromptForm AI, replaces manual authoring with AI generation while keeping the author in control. The author types a description or uploads a document; the backend validates the request, checks plan limits and AI credits, extracts text from documents, and runs the AIFormBrain pipeline, which detects intent, language, domain and industry, plans the fields with appropriate types and validations, and calls Gemini for natural wording. The quality reviewer corrects the result, which is saved as a published form with a unique share link and opened in the visual builder for refinement.',
    'Respondents fill the form in full-page, wizard or chat mode. Submissions are validated on the server (required fields, password protection, response limits, anti-cheat flags) and stored together with browser metadata. Analytics events (views, starts, submissions, drop-outs) feed per-form and workspace dashboards, and the owner can export responses, ask the AI to analyse them, and receive notifications. Teams, roles and collaborators provide controlled access. The key advantages are speed, consistency of field types, digitisation, integrity of quizzes, richer analytics and secure collaboration.',
  ] },
  { h2: '6.3 System Architecture' },
  { p: 'PromptForm AI follows a three-tier client–server architecture ({f_arch}). The presentation tier is a Next.js single-page experience; the application tier is an Express REST API composed of a gateway layer (security middleware), routers, the AIFormBrain engine and services; the data tier is PostgreSQL accessed through Prisma. External services include the Gemini API and an e-mail provider. The API is stateless — identity travels in a JWT — so it can be scaled horizontally.' },
  { fig: { key: 'f_arch', img: D('architecture'), cap: 'Final System Architecture' } },
  { h2: '6.4 Workflow / Process Flow' },
  { p: 'The core process — turning a prompt or document into a published form — is shown in {f_aiflow}. Each step either enriches the form definition or enforces a rule (credits, plan limits, schema validity) before the next step is executed.' },
  { fig: { key: 'f_aiflow', img: D('aiflow'), cap: 'Final Workflow / Process Flow' } },
  { h2: '6.5 UML / Design Diagrams' },
  { p: 'The design was documented using UML and structured-analysis diagrams: the use case diagram ({f_uc}) identifies actors and their goals; the Level-1 data flow diagram ({f_dfd}) shows processes and data stores; the class diagram ({f_class}) shows the main engine and service classes; the sequence diagram ({f_seq}) details AI generation; the activity diagram ({f_act}) describes form submission; and the ER diagram ({f_er}) presents the database schema.' },
  { ul: ['Use Case Diagram', 'Class Diagram', 'Sequence Diagram', 'Activity Diagram', 'ER Diagram / Database Schema', 'Other domain-specific diagrams (Data Flow Diagram – Level 1)'] },
  { fig: { key: 'f_uc', img: D('usecase'), cap: 'Major UML / ER / Design Diagram — Use Case Diagram' } },
  { p: 'Four actors interact with the system. The **Form Creator** generates, edits, publishes and analyses forms; a **Team Member** collaborates on shared forms according to an assigned role; a **Respondent** fills public forms and quizzes without needing an account; and the **Administrator** manages plans, coupons and platform-level monitoring.' },
  { fig: { key: 'f_dfd', img: D('dfd'), cap: 'Data Flow Diagram (Level 1)' } },
  { fig: { key: 'f_class', img: D('classd'), cap: 'Class Diagram — AI Engine and Services' } },
  { fig: { key: 'f_seq', img: D('sequence'), cap: 'Sequence Diagram — AI Form Generation' } },
  { fig: { key: 'f_act', img: D('activity'), cap: 'Activity Diagram — Form Submission', w: 520 } },
  { fig: { key: 'f_er', img: D('er'), cap: 'ER Diagram / Database Schema' } },
  { h2: '6.6 Module-wise Design' },
  { tbl: { key: 't_modules', cap: 'Module-wise design', head: ['Module', 'Purpose', 'Inputs', 'Processing', 'Outputs', 'Dependencies'], w: [14, 18, 16, 22, 15, 15], rows: [
    ['Authentication', 'Identify users securely', 'Email, password, OAuth code', 'bcrypt verify, JWT issue, session token', 'Access/refresh tokens', 'User model, JWT'],
    ['AI Generator', 'Create forms automatically', 'Prompt, file, options', 'Parsing, AIFormBrain, Gemini, review', 'Saved form + summary', 'Gemini, documentParser'],
    ['Visual Builder', 'Edit forms', 'Form JSON, user edits', 'State store, undo/redo, PUT questions', 'Updated form', 'Forms API, Zustand'],
    ['Templates', 'Start from ready forms', 'Template id', 'Clone structure into new form', 'New form', 'Template model'],
    ['Public Responder', 'Collect answers', 'Share id, answers', 'Client + server validation, events', 'Response record', 'Forms submit API'],
    ['Quiz Engine', 'Assessments', 'Graded questions, answers', 'Scoring, negative marks, timer, tab-switch', 'Score, flags, CSV', 'Response metadata'],
    ['Analytics', 'Insight into performance', 'Events, responses', 'Aggregation, daily metrics, sentiment', 'Charts, KPIs', 'FormEvent, Analytics'],
    ['Teams', 'Collaboration', 'Team, invites, roles', 'RBAC checks, invite tokens, activity log', 'Members, access', 'Team models, email'],
    ['Billing', 'Plans and credits', 'Plan, coupon', 'Limit checks, discounts, receipts', 'Transaction', 'subscription middleware'],
    ['Notifications', 'Inform owners', 'Submission, invite events', 'Live feed + e-mail dispatch', 'Alerts, e-mails', 'emailService'],
  ] } },
  { h2: '6.7 Database / Data Design' },
  { p: 'The relational schema contains 16 Prisma models. Flexible, form-specific structures (settings, theme, options, validations, logic, answers) are stored as PostgreSQL JSON columns, while identity and relationships use UUID keys, foreign keys with cascade rules, unique constraints and indexes on frequently filtered columns.' },
  { tbl: { key: 't_db', cap: 'Database entities', head: ['Entity / Table', 'Key Fields', 'Relationships', 'Purpose'], w: [18, 32, 26, 24], rows: [
    ['User', 'id, email (unique), password, role, subscriptionPlan, credits, activeSessionToken', '1:N Form, Team, Transaction, Activity', 'Accounts and plans'],
    ['Form', 'id, title, status, settings, theme, ownerId, teamId, uniqueShareId', 'N:1 User/Team; 1:N Question, Response', 'Form definition'],
    ['Question', 'id, formId, type, label, required, orderIndex, options, validations, logic', 'N:1 Form', 'Form fields'],
    ['Response', 'id, formId, answers, browserMetadata, timeTaken, email', 'N:1 Form', 'Submitted answers'],
    ['Team / TeamMember', 'team id, name, ownerId; member role', 'N:M User via TeamMember', 'Workspaces and RBAC'],
    ['TeamInvite', 'email, role, token (unique), status, expiresAt', 'N:1 Team', 'E-mail invitations'],
    ['FormCollaborator', 'formId, userId, role (unique pair)', 'N:M Form–User', 'Per-form sharing'],
    ['Analytics / FormDailyMetric', 'views, submissions, device/country stats, date', 'N:1 Form', 'Aggregated metrics'],
    ['FormEvent', 'eventType, questionId, device, country', 'N:1 Form', 'Raw analytics events'],
    ['Workflow', 'trigger, action, config, active', 'N:1 Form', 'Automation on submit'],
    ['Template', 'title, category, structure', '—', 'Template marketplace'],
    ['Transaction / Coupon', 'plan, amount, receiptNumber; code, discountPercent', 'N:1 User', 'Billing records'],
    ['Activity', 'action, targetTitle, details, metadata', 'N:1 User/Team/Form', 'Audit trail'],
  ] } },
  { h2: '6.8 Interface / UI Design (if applicable)' },
  { p: [
    'The interface follows a warm, minimal design language: a cream background, a brown primary accent, rounded cards, Inter typography and generous spacing, with a full dark mode through next-themes. Navigation in the authenticated area uses a top bar with Overview, Forms, AI Generator, Templates, Analytics, Team and Settings, plus search, theme toggle, notifications and profile menu. The builder uses a three-pane layout — field palette, live canvas and properties panel — so that every change is visible immediately.',
    'The public landing page ({f_ui}) introduces the product, demonstrates prompt-based generation and links to templates and pricing. All pages are responsive and were checked at mobile, tablet and desktop widths.',
  ] },
  { fig: { key: 'f_ui', img: S('landing'), cap: 'Major Interface / UI Design' } },

  // ======================= CHAPTER 7 =======================
  { h1: ['7', 'Technology Stack and Development Environment'] },
  { h2: '7.1 Programming Languages' },
  { tbl: { cap: 'Programming languages', head: ['Technology', 'Version', 'Purpose', 'Major Usage'], w: [20, 14, 30, 36], rows: [
    ['TypeScript', '5.4 / 5.5', 'Typed superset of JavaScript', 'All frontend, backend and shared code'],
    ['JavaScript (ES2022)', 'Node 20+', 'Scripts and tooling', 'dev orchestrator, QA scripts, build helpers'],
    ['SQL (PostgreSQL dialect)', '15/16', 'Database language', 'Generated by Prisma migrations, JSON queries'],
    ['HTML5 / CSS3', '—', 'Markup and styling', 'Rendered by React, styled with Tailwind CSS'],
    ['Prisma Schema Language', '5.12', 'Data modelling', 'schema.prisma with 16 models'],
  ] } },
  { h2: '7.2 Frameworks / Libraries / APIs' },
  { tbl: { key: 't_libs', cap: 'Frameworks, libraries and APIs', head: ['Tool / Framework / API', 'Version', 'Purpose', 'Usage'], w: [24, 12, 28, 36], rows: [
    ['Next.js (App Router)', '15.5', 'React framework', 'Routing for 29 pages, builds, dev server on port 4500'],
    ['React / React DOM', '19 RC', 'UI rendering', 'Components, hooks'],
    ['Tailwind CSS', '3.4', 'Utility-first CSS', 'Design system, dark mode'],
    ['Zustand', '5.0', 'State management', 'Builder and session stores'],
    ['React Hook Form + Zod', '7.53 / 3.23', 'Forms and schemas', 'Client validation'],
    ['Recharts', '3.10', 'Charts', 'Analytics dashboards'],
    ['Framer Motion, Lucide', '11 / 0.453', 'Animation, icons', 'UI polish'],
    ['Express', '4.19', 'HTTP server', '73 REST routes'],
    ['jsonwebtoken, bcryptjs', '9.0 / 2.4', 'Auth', 'Tokens and password hashing'],
    ['Helmet, cors, express-rate-limit', '7.1 / 2.8 / 7.2', 'Security', 'Headers, origins, throttling'],
    ['Multer', '1.4', 'File upload', 'Documents and response files'],
    ['pdf-parse, mammoth, xlsx', '2.4 / 1.12 / 0.18', 'Document parsing', 'PDF, DOCX, spreadsheet text'],
    ['Nodemailer / Resend', '10.0', 'E-mail', 'Invites, notifications'],
    ['BullMQ, redis', '5.79 / 4.6', 'Queue and cache', 'Background jobs (optional)'],
    ['geoip-lite, ua-parser-js', '2.0 / 2.0', 'Analytics enrichment', 'Country and device detection'],
    ['Google Gemini API', 'v1beta', 'LLM', 'Form generation, document reading, analysis, chat'],
  ] } },
  { h2: '7.3 Database / Storage' },
  { tbl: { cap: 'Database and storage', head: ['Database / Storage', 'Version', 'Purpose', 'Data Managed'], w: [24, 14, 26, 36], rows: [
    ['PostgreSQL', '15/16', 'Primary relational store', 'Users, forms, questions, responses, teams, analytics, billing'],
    ['Prisma Client', '5.12', 'Type-safe ORM', 'Queries, transactions, migrations'],
    ['Redis', '7 (optional)', 'Cache and queue backend', 'Cached lookups, job queue; in-memory fallback when disabled'],
    ['Local file storage', '—', 'Uploads directory', 'Files uploaded in responses and documents'],
    ['Browser localStorage', '—', 'Client session', 'Access/refresh tokens, theme preferences'],
  ] } },
  { h2: '7.4 Hardware / Cloud / Deployment Environment' },
  { tbl: { cap: 'Hardware, cloud and deployment environment', head: ['Platform / Hardware', 'Specification', 'Purpose', 'Status'], w: [22, 34, 28, 16], rows: [
    ['Developer laptop', 'Windows 10, 8–16 GB RAM, SSD', 'Development and testing', 'Used'],
    ['Docker Compose', 'PostgreSQL + Redis containers', 'Local infrastructure', 'Used'],
    ['Vercel', 'Next.js hosting with CDN', 'Frontend production', 'Deployed'],
    ['Render', 'Node web service (render.yaml)', 'Backend production', 'Deployed'],
    ['Managed PostgreSQL', 'Cloud database', 'Production data', 'Configured'],
    ['Google AI Studio', 'Gemini API key', 'LLM access', 'Configured'],
  ] } },
  { h2: '7.5 Development Tools' },
  { tbl: { cap: 'Development tools', head: ['Tool', 'Purpose', 'Usage'], w: [22, 30, 48], rows: [
    ['Visual Studio Code', 'IDE', 'Editing, debugging, integrated terminal'],
    ['Git', 'Version control', '66 commits with descriptive messages on main branch'],
    ['npm workspaces', 'Monorepo management', 'frontend, backend and packages/shared'],
    ['nodemon + ts-node', 'Backend hot reload', 'npm run dev:backend'],
    ['ESLint + Prettier', 'Code quality', 'Consistent formatting and linting'],
    ['Prisma CLI / Studio', 'DB tooling', 'generate, migrate, seed, inspect data'],
    ['Postman / custom Node scripts', 'API testing', 'Manual checks and automated QA runner'],
    ['Chrome / Edge DevTools', 'Frontend debugging', 'Network, console, responsive checks'],
  ] } },
  { h2: '7.6 Technology Selection Rationale' },
  { p: [
    '**TypeScript end-to-end** was selected so that the same types and Zod schemas describe forms in the frontend, backend and shared package, catching mismatches at compile time. **Next.js** offers file-based routing, optimised production builds and first-class deployment on Vercel, and **React 19** provides a modern component model. **Tailwind CSS** enabled a consistent design system and dark mode with little custom CSS.',
    '**Express** was chosen for the API because it is minimal, mature and easy to compose with security middleware; it also makes streaming responses (AI chat) straightforward. **PostgreSQL** provides relational integrity for users, teams and billing together with JSON columns for flexible form definitions, and **Prisma** adds type-safe queries and migrations.',
    '**Google Gemini** was selected as the LLM because it supports multimodal input (images and PDFs) in the same request, native JSON output with response schemas, a generous free tier and several model sizes that allow a cost/latency-aware fallback chain. Vercel and Render were selected for hosting because both deploy directly from Git, provide HTTPS by default and have free tiers suitable for an internship project.',
  ] },

  // ======================= CHAPTER 8 =======================
  { h1: ['8', 'System Implementation', 'Technical core of the report; consolidate Reporting 2, 3 and 4 implementation work.'] },
  { h2: '8.1 Implementation Overview' },
  { p: [
    'The system is implemented as an npm-workspaces monorepo with three packages. **frontend/** contains the Next.js application with 29 page routes (landing, auth, dashboard, AI generator, builder, templates, analytics, responses, team, settings, billing, admin, public form and others), reusable components (DashboardLayout, AssistantChat, notification panel, team components, UI primitives) and lib/api.ts, which wraps fetch with automatic token refresh. **backend/** contains the Express server (index.ts), 8 routers exposing 73 routes, 4 middlewares, 3 services and the lib folder with the AIFormBrain engine, document parser, cache, queue and validation schemas. **packages/shared/** holds shared types and schemas.',
    'Development started with the database schema and authentication (Reporting 2), followed by forms CRUD, the builder and the public responder. The AI engine, document digitisation and quiz engine were implemented next (Reporting 3), followed by analytics, teams, notifications, billing and the admin panel. Reporting 4 concentrated on defect fixing, performance tuning, deployment and documentation. The three central modules are described in the following sections.',
  ] },
  { h2: '8.2 Module / Feature 1 – AI Form Generator' },
  { p: [
    'The AI generator is exposed as POST /api/ai/generate (and /generate-from-file). The route accepts a prompt, optional file (via Multer), desired question count and theme preferences. It first validates the input: prompts shorter than three characters return suggestions rather than an error, unauthenticated users can try generation in demo mode, and authenticated users must have at least 5 AI credits and must not exceed the free-plan limit of 5 active forms.',
    'Uploaded documents are converted to text by documentParser (pdf-parse for PDF, mammoth for DOCX, SheetJS for spreadsheets), while images and PDFs are also passed to Gemini as inline base64 data for multimodal understanding. The AIFormBrain pipeline then produces a deterministic plan, Gemini produces natural wording through a JSON response schema, and the EnterpriseQualityReviewer merges and repairs the result. The form is saved as PUBLISHED with a unique share id, 5 credits are deducted and the response includes an “understanding summary” (topic, purpose, form type, difficulty, question count) that is shown to the user. The AI Generator page is shown in {f_aigen}.',
  ] },
  { fig: { key: 'f_aigen', img: S('dashboard_ai'), cap: 'Module 1 Implementation / Output' } },
  { h2: '8.3 Module / Feature 2 – Visual Form Builder' },
  { p: [
    'The builder (/builder/[id]) loads the form and renders a three-pane editor. The left palette groups field presets (Profile & Contact, Choices & Options, Advanced) such as Full Name, Email, Phone, Address, Country, Gender, Checkboxes, Radio, Agreement, Rating, Date, File Upload and Signature. The canvas shows the form exactly as respondents will see it; each question card supports duplicate, delete, reorder, logic and type badges. The right panel edits field properties (type, label, required, options, validation) and the live branding editor (accent colour, typography, corner radius, display mode).',
    'State is held in a Zustand store with an undo/redo history. Saving calls PUT /api/forms/:id/questions, which upserts questions while preserving existing question UUIDs so that historical responses remain linked (a defect fixed during QA, see Section 9.9). Publish/share, preview, collaborators and close-form actions are available from the toolbar. {f_builder} shows the builder editing the AI-generated Patient Intake Form.',
  ] },
  { fig: { key: 'f_builder', img: S('builder'), cap: 'Module 2 Implementation / Output' } },
  { h2: '8.4 Module / Feature 3 – Responses, Quiz Engine and Analytics' },
  { p: [
    'Public forms are served at /f/[shareId] in full, wizard or chat mode. The submit endpoint (POST /api/forms/:id/submit) is rate limited and validates answers with Zod, enforces required fields and form passwords on the server, applies response limits and auto-closes forms when the limit is reached. For quizzes, the EnterpriseQuizEngine attaches correct answers, points, negative points, difficulty and Bloom’s taxonomy level to each question; the client enforces a timer and counts tab switches, and submissions exceeding the threshold are flagged in browserMetadata. Scores are calculated with weighted marks and exported to CSV for leaderboards.',
    'Every view, start, submission and drop-out is recorded as a FormEvent with device (ua-parser-js) and country (geoip-lite). The analyticsService aggregates these into FormDailyMetric rows and the per-form dashboard ({f_analytics}) presents views, submissions, completion rate, average time, historical trends, device distribution, top locations and an AI sentiment summary of text answers.',
  ] },
  { fig: { key: 'f_analytics', img: S('form_analytics'), cap: 'Module 3 Implementation / Output' } },
  { h2: '8.5 Algorithm / Logic / Model Description' },
  { p: 'The heart of the system is the hybrid generation algorithm implemented in backend/src/lib/aiBrain. Its steps are:' },
  { ol: [
    '**Intent detection:** normalise the prompt (lower-case, spelling and phonetic recovery), extract the requested action (create quiz, survey, registration…), desired question count and constraints.',
    '**Language detection:** identify the language and right-to-left scripts so the theme can set rtl = true.',
    '**Domain and industry detection:** score the prompt and any document context against keyword dictionaries for domains (quiz, survey, medical, education, HR, events, feedback, contact…) and industries (healthcare, dentistry, hospitality, education…).',
    '**Requirement analysis and deep reasoning:** derive mandatory fields for the domain (e.g. patient name, date of birth and allergies for medical intake) and recommended settings (collect e-mails, response limits).',
    '**Smart field intelligence:** map each planned field to one of the widget types and attach validations — e-mail pattern, phone pattern, numeric ranges, date pickers, file size and type limits.',
    '**Form generation:** assemble title, description, ordered questions and an HSL-harmonised theme.',
    '**Quiz enrichment:** for quiz, survey and medical domains, the quiz engine adds options, correct answers, explanations, points, negative points and difficulty, and enables shuffle, anti-cheat and a 600-second timer for quizzes.',
    '**LLM generation:** the prompt, the plan and a system instruction are sent to Gemini with responseMimeType = application/json and a response schema. Models are tried in order (gemini-3.5-flash-lite → gemini-3.1-flash-lite → gemini-2.5-flash → gemini-flash-latest → gemini-2.5-pro) with a 45-second timeout each; invalid-key errors stop immediately, and if inline file data is rejected the request is retried as text only.',
    '**Quality review:** EnterpriseQualityReviewer removes duplicate labels, fixes types that conflict with labels (e.g. an “Email” field typed as short text), ensures choice questions have at least two options and normalises ordering. If every model fails, the deterministic plan from steps 1–7 is returned, so the user always receives a usable form.',
  ] },
  { code: `export class AIFormBrain {
  static process(prompt: string, documentContext?: string) {
    let context = IntentDetector.detect(prompt);
    context = LanguageDetector.detect(context);
    const domain = DomainDetector.detect(context, documentContext);
    const industry = IndustryDetector.detect(domain, context.normalizedPrompt);
    const requirements = RequirementAnalyzer.analyze(context, domain);
    const reasoning = DeepReasoner.reason(domain, requirements);
    const plan = SmartFieldIntelligenceEngine.resolve(domain, industry,
                    context.normalizedPrompt, documentContext);
    const formConfig = EnterpriseFormGenerator.generate(plan);
    if (domain === 'quiz' || domain === 'survey' || domain === 'medical') {
      const assessment = EnterpriseQuizEngine.resolve(domain,
                    context.normalizedPrompt, formConfig.questions);
      /* merge points, answers, difficulty; enable anti-cheat, timer */
    }
    formConfig.settings = { ...formConfig.settings, ...reasoning.recommendedSettings };
    formConfig.theme.rtl = context.isRtl;
    return EnterpriseQualityReviewer.reviewAndImprove(formConfig);
  }
}`, codeCap: 'Listing 8.1: Excerpt of the AIFormBrain pipeline (backend/src/lib/aiBrain/index.ts)' },
  { p: 'An abridged example of the response returned by the generator for the prompt “Patient intake form for a dental clinic with contact details, medical history and appointment date” is shown in Listing 8.2. The understanding summary is displayed to the user, and the form is immediately available at its share link.' },
  { code: `{
  "message": "Form generated successfully using PromptForm AI engine.",
  "understandingSummary": {
    "topic": "Dentistry Clinic", "purpose": "Lead Generation & Communication Inquiry",
    "formType": "Contact Form", "difficulty": "Intermediate", "questionCount": 6
  },
  "form": {
    "title": "Patient Intake Form", "status": "PUBLISHED", "uniqueShareId": "f5nmxd",
    "settings": { "collect_emails": true, "anti_cheat_detection": false, "timer_limit": 0 },
    "theme": { "primary_color": "#0284c7", "background_color": "#f0f9ff", "font_family": "Inter" },
    "questions": [
      { "type": "name",  "label": "Full Name",     "required": true },
      { "type": "phone", "label": "Phone Number",  "required": true },
      { "type": "email", "label": "Email Address", "required": true },
      { "type": "mcq",      "label": "...", "options": ["...", "..."] },
      { "type": "checkbox", "label": "...", "options": ["...", "..."] },
      { "type": "short_text", "label": "..." }
    ]
  }
}`, codeCap: 'Listing 8.2: Abridged generator response for the dental intake prompt' },
  { h2: '8.6 API / External Service Integration' },
  { tbl: { key: 't_api', cap: 'API and external service integration', head: ['API / Service', 'Purpose', 'Input', 'Output', 'Authentication', 'Status'], w: [19, 19, 17, 17, 16, 12], rows: [
    ['POST /api/ai/generate', 'Generate form', 'Prompt / file', 'Form + summary', 'Optional JWT', 'Working'],
    ['POST /api/ai/chat-stream', 'AI assistant edits', 'Message, form', 'Streamed reply', 'JWT + plan', 'Working'],
    ['POST /api/ai/analyze-response(s)', 'AI insight / sentiment', 'Responses', 'Analysis JSON', 'JWT + plan', 'Working'],
    ['/api/auth/*', 'Register, login, refresh, logout, OAuth, coupons', 'Credentials', 'Tokens, profile', 'Public / JWT', 'Working'],
    ['/api/forms/*', 'CRUD, questions, collaborators, submit, export, notifications', 'Form JSON', 'Form, CSV', 'JWT / public submit', 'Working'],
    ['/api/teams/*', 'Teams, members, invites, activity', 'Team data', 'Team JSON', 'JWT + RBAC', 'Working'],
    ['/api/analytics/*', 'Workspace and form metrics, events', 'Form id, events', 'Metrics', 'JWT / public events', 'Working'],
    ['Google Gemini generateContent', 'LLM generation', 'Prompt, schema, inline file', 'JSON text', 'API key', 'Working'],
    ['Google OAuth 2.0', 'Social login', 'Auth code', 'Profile', 'Client id/secret', 'Working'],
    ['Gmail SMTP / Resend', 'Transactional e-mail', 'Recipient, HTML', 'Message id / status', 'App password / API key', 'Working'],
  ] } },
  { h2: '8.7 Database Implementation' },
  { p: [
    'The schema is defined in backend/prisma/schema.prisma and applied with prisma migrate; prisma generate produces a typed client used through a single shared instance (lib/db.ts). UUID primary keys avoid enumeration of records. Foreign keys use onDelete: Cascade so that deleting a form removes its questions, responses, events and analytics, while a deleted team sets Form.teamId to null instead of deleting forms. Composite unique constraints prevent duplicate team membership and duplicate collaborators, and indexes on ownerId, teamId, formId, token, email and (formId, eventType, createdAt) keep dashboard queries fast.',
    'JSON columns store flexible structures: Form.settings (collect_emails, limit_responses, password, shuffle_questions, timer_limit, anti_cheat_detection, display_mode), Form.theme, Question.options/validations/logic and Response.answers/browserMetadata. Multi-step operations such as accepting a team invitation (verify token, create membership, mark invite accepted) run inside Prisma transactions to remain atomic. A seed script creates an admin and a demo user and starter templates for development.',
  ] },
  { h2: '8.8 Security / Access Control (if applicable)' },
  { p: 'Security was implemented in layers following OWASP recommendations; the authentication flow is shown in {f_auth}.' },
  { ul: [
    '**Password security:** minimum 10 characters, hashed with bcrypt (cost 10); passwords are never returned by the API.',
    '**Token-based authentication:** short-lived JWT access tokens and refresh tokens; the client refreshes automatically on 401.',
    '**Single active session:** every login stores a new activeSessionToken; tokens carrying an older session id are rejected with SESSION_MISMATCH, and logout clears the session.',
    '**Authorisation:** authMiddleware for protected routes, subscriptionMiddleware for plan limits and credits, and role checks (owner / admin / editor / viewer) for team and collaborator actions.',
    '**HTTP hardening:** Helmet security headers, CORS restricted to known frontend origins, JSON body limit of 20 MB.',
    '**Abuse protection:** rate limits of 1000 requests per 15 minutes for the API, 60 per minute for AI routes and 60 per minute for submissions in production.',
    '**Input validation:** Zod schemas on request bodies, server-side required-field and password enforcement on submissions, upload type/size restrictions.',
  ] },
  { fig: { key: 'f_auth', img: D('auth'), cap: 'Authentication and Authorization Flow' } },
  { code: `// Enforce single active session & invalidation on logout
if (!user.activeSessionToken || user.activeSessionToken !== decoded.sessionToken) {
  return res.status(401).json({
    error: 'SESSION_MISMATCH',
    message: 'You have been logged out because your account is active on another device.'
  });
}

const aiGenerationLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/ai', aiGenerationLimiter);`, codeCap: 'Listing 8.3: Session enforcement (middlewares/auth.ts) and AI rate limiting (index.ts)' },
  { h2: '8.9 Integration of Modules' },
  { p: [
    'Modules are integrated through the REST API and shared types. The frontend lib/api.ts attaches the bearer token, retries once after refreshing an expired token and normalises errors, so every page uses the same integration path. On the backend, routers delegate to services (formsService, analyticsService, emailService) and to the AIFormBrain, while cross-cutting concerns — authentication, plan limits, logging and error handling — are applied as Express middleware in a fixed order: Helmet → CORS → request logger → body parsers → rate limiters → routers → 404 → error handler.',
    'Events connect otherwise independent modules: a submission creates a Response, records a FormEvent, updates analytics, writes an Activity entry, raises a live notification for the owner and, if configured, triggers a Workflow (e-mail or webhook). Team invitations integrate the teams module with the e-mail service and the authentication module: an invite token survives sign-up or login, the invitee e-mail is verified and membership is created atomically. A bootstrap sequence at server start validates environment variables, database connectivity, the uploads directory and route registration, and exposes /health, /health/liveness and /health/readiness endpoints for the hosting platform.',
  ] },

  // ======================= CHAPTER 9 =======================
  { h1: ['9', 'Testing and Validation'] },
  { h2: '9.1 Testing Strategy' },
  { p: [
    'Testing combined manual exploratory testing during development with automated black-box API test suites executed against a running backend and real PostgreSQL database. The automated **platform QA suite** (backend/src/scripts/runTests.ts, executed with npm run test) contains 39 test cases across nine suites: Auth, Billing, Builder, Runner, Quiz, Analytics, Team, AI and Workflows. The **AI generator suite** contains 11 cases covering text, quiz, survey, PDF and image generation, question-count control, credit and plan limits, publication status and display-mode persistence. Results were written to qa_test_report.json and ai_generator_qa_report.json.',
    'Each test specifies an input, the expected HTTP status or behaviour and the observed result. Defects discovered in the first run were logged, fixed and re-verified; these appear with status “Pass (fix verified)”. Positive, negative and boundary cases were included (e.g. weak passwords, duplicate e-mails, 3 credits remaining, 6th form on the free plan). UI behaviour was validated manually in Chrome and Edge at desktop and mobile widths, and user acceptance testing was carried out with the mentor and peers.',
  ] },
  { h2: '9.2 Unit / Module Testing' },
  { tbl: { cap: 'Unit / module testing', head: ['Test ID', 'Module / Function', 'Input', 'Expected', 'Actual', 'Status'], w: [11, 20, 22, 17, 18, 12], rows: [
    ['UT-01', 'IntentDetector.detect', '“quiz on photosynthesis 5 questions”', 'domain quiz, count 5', 'quiz, 5', 'Pass'],
    ['UT-02', 'DomainDetector', 'Dental patient intake prompt', 'medical / dentistry', 'medical, dentistry', 'Pass'],
    ['UT-03', 'Field intelligence', 'Label “Email Address”', 'type email + pattern', 'email', 'Pass'],
    ['UT-04', 'Field intelligence', 'Label “Phone Number”', 'type phone', 'phone', 'Pass'],
    ['UT-05', 'Quality reviewer', 'MCQ with one option', '≥ 2 options', 'options filled', 'Pass'],
    ['UT-06', 'LanguageDetector', 'Arabic prompt', 'rtl = true', 'true', 'Pass'],
    ['UT-07', 'titleSanitizer', 'Prompt with “create a form for…”', 'Clean title', 'Clean title', 'Pass'],
    ['UT-08', 'documentParser', 'Sample PDF', 'Extracted text', 'Text returned', 'Pass'],
    ['UT-09', 'Zod submit schema', 'Missing user_agent', 'Validation error', '400 details', 'Pass'],
    ['UT-10', 'Gemini fallback', 'First model unavailable', 'Next model used', 'Fallback used', 'Pass'],
  ] } },
  { h2: '9.3 Functional Testing' },
  { tbl: { key: 't_func', cap: 'Functional testing (platform QA suite)', head: ['Test ID', 'Functionality', 'Expected', 'Actual', 'Status'], w: [15, 39, 18, 12, 16],
    rows: qa.filter(r => ['Auth', 'Billing', 'Builder'].includes(r.suite)).map(r => [r.testId, r.name.replace(' [FIX VERIFIED]', ''), r.expectedStatus, String(r.httpStatus), st(r.status)]) } },
  { h2: '9.4 Integration Testing' },
  { tbl: { cap: 'Integration testing', head: ['Test ID', 'Integrated Components', 'Expected', 'Actual', 'Status'], w: [15, 39, 20, 10, 16],
    rows: qa.filter(r => ['Runner', 'Quiz', 'Analytics', 'Team', 'Workflows'].includes(r.suite)).map(r => [r.testId, r.name.replace(' [FIX VERIFIED]', ''), r.expectedStatus, String(r.httpStatus), st(r.status)]) } },
  { h2: '9.5 System Testing' },
  { tbl: { cap: 'System testing (AI generator suite and end-to-end scenarios)', head: ['Test ID', 'Scenario', 'Expected', 'Actual', 'Status'], w: [13, 30, 24, 23, 10],
    rows: [...qa.filter(r => r.suite === 'AI').map(r => [r.testId, r.name, r.expectedStatus, String(r.httpStatus), 'Pass']),
      ...ai.map(r => [r.testId, r.name, r.expectedStatus, r.details.length > 90 ? r.details.slice(0, 88) + '…' : r.details, 'Pass'])] } },
  { h2: '9.6 Performance Testing' },
  { tbl: { key: 't_perf', cap: 'Performance testing', head: ['Parameter', 'Condition', 'Target', 'Observed', 'Status'], w: [24, 28, 16, 18, 14], rows: [
    ['AI generation (text prompt)', 'Gemini flash-lite, warm server', '< 10 s', '≈ 4–9 s', 'Met'],
    ['AI generation (document)', 'PDF / image upload', '< 15 s', '≈ 8–14 s', 'Met'],
    ['Fallback generation', 'Gemini unavailable', '< 1 s', '< 300 ms (rule engine)', 'Met'],
    ['Form CRUD API', 'Local PostgreSQL', '< 500 ms', '≈ 40–200 ms', 'Met'],
    ['Public form load', 'Share link, warm', '< 2 s', '≈ 1 s', 'Met'],
    ['Submission API', 'Valid payload', '< 500 ms', '≈ 100–250 ms', 'Met'],
    ['Rate limiter', '> 60 AI requests / min', 'HTTP 429', '429 returned', 'Met'],
    ['Cold start (Render free tier)', 'After 15 min idle', '—', '≈ 30–50 s first request', 'Known limitation'],
  ] } },
  { h2: '9.7 User / Acceptance Testing' },
  { tbl: { cap: 'User acceptance testing', head: ['Scenario', 'Evaluator', 'Expected', 'Observed', 'Feedback / Status'], w: [24, 14, 22, 20, 20], rows: [
    ['Create event registration form from a prompt', 'Company mentor', 'Usable form in seconds', 'Generated in ≈ 6 s with correct types', 'Accepted'],
    ['Digitise a scanned feedback form', 'Company mentor', 'Fields match paper form', 'Most fields matched; minor label edits', 'Accepted'],
    ['Conduct a 10-question quiz', 'Peer students (5)', 'Timer, scoring, anti-cheat', 'Worked; tab switches flagged', 'Accepted'],
    ['Edit theme and publish', 'Peer students', 'Intuitive builder', 'Completed without help', 'Accepted'],
    ['Invite team member as viewer', 'Institute mentor', 'Viewer cannot edit', 'Edit blocked (403)', 'Accepted'],
    ['View analytics and export CSV', 'Company mentor', 'Correct counts and file', 'Counts matched; CSV opened in Excel', 'Accepted'],
    ['Use on mobile phone', 'Peer students', 'Responsive pages', 'Responsive; wizard mode preferred', 'Accepted'],
  ] } },
  { h2: '9.8 Experimental Validation (if applicable)' },
  { tbl: { cap: 'Experimental validation of AI generation', head: ['Experiment', 'Conditions', 'Result', 'Interpretation'], w: [22, 26, 26, 26], rows: [
    ['LLM only vs hybrid', 'Same 11 prompts, schema output', 'Hybrid fixed wrong types and missing options', 'Rule review improves reliability'],
    ['Model fallback chain', 'Primary model disabled', 'Generation still succeeded', 'Resilient to model outages'],
    ['Question-count control', 'Target 3 questions', 'Exactly 3 generated', 'Count constraint respected'],
    ['Multimodal input', 'Image of registration form', '10 questions extracted', 'Image understanding usable'],
    ['Short / vague prompts', '< 3 characters', 'Suggestions returned', 'Graceful guidance instead of error'],
  ] } },
  { h2: '9.9 Defects / Bugs and Resolution' },
  { tbl: { key: 't_defects', cap: 'Defects identified and resolved', head: ['Issue ID', 'Problem', 'Severity', 'Root Cause', 'Resolution', 'Final Status'], w: [11, 21, 10, 20, 26, 12], rows: [
    ['AUTH-05', 'Token still valid after logout', 'High', 'Session not cleared on logout', 'Clear activeSessionToken on logout; middleware compares session id', 'Closed'],
    ['BILL-04', 'Enterprise plan hit free limits', 'Medium', 'Plan check only recognised “pro”', 'Treat all paid plans as unlimited in subscription config', 'Closed'],
    ['BLD-03', 'Question IDs regenerated on save', 'High', 'Delete-and-recreate on update', 'Upsert questions preserving UUIDs', 'Closed'],
    ['RUN-02', 'Form password checked only in UI', 'High', 'No server check', 'Enforce password on submit endpoint (403)', 'Closed'],
    ['RUN-03', 'Required fields bypassable via API', 'High', 'Client-only validation', 'Server-side required validation (400)', 'Closed'],
    ['RUN-07', 'Anonymous file upload rejected', 'Medium', 'Upload route required auth', 'Allow public upload for public forms with limits', 'Closed'],
    ['QUIZ-03', 'Old answers lost in CSV after edits', 'Medium', 'Export keyed by current questions', 'Preserve historical answers in export', 'Closed'],
    ['TEAM-04', 'Team rename/delete missing', 'Low', 'Endpoints not implemented', 'Added PUT and DELETE /api/teams/:id', 'Closed'],
    ['WF-01', 'Workflows not dispatched', 'Medium', 'Submit did not call workflow runner', 'Dispatch active workflows after submit', 'Closed'],
    ['AI-GEN-10', 'AI forms created as DRAFT', 'Medium', 'Default status', 'Create AI forms as PUBLISHED with share id', 'Closed'],
    ['UI-NOTIF', 'Notification panel under page content', 'Low', 'z-index / stacking context', 'Flex layout, viewport-bounded panel, Escape to close', 'Closed'],
  ] } },
  { h2: '9.10 Final Validation Statement' },
  { p: [
    'All 39 platform QA test cases and all 11 AI-generation test cases passed in the final run (50/50), including the nine defects that were fixed and re-verified ({f_tests}). Functional, integration, system, performance and acceptance testing confirm that PromptForm AI meets the functional requirements FR-01 to FR-17 and the non-functional targets listed in Chapter 4, with the single known limitation of cold-start latency on the free hosting tier. The system is therefore validated as complete and ready for demonstration and use.',
  ] },
  { fig: { key: 'f_tests', img: D('tests'), cap: 'Test Cases Passed by Suite' } },
];
