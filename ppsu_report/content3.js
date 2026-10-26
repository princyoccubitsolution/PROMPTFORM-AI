// Chapters 10–15, Appendices (Chapter A) and submission checklist (Chapter B).
const path = require('path');
const S = f => path.join(__dirname, 'shots', f + '.png');
const D = f => path.join(__dirname, 'diagrams', f + '.png');

module.exports = [
  // ======================= CHAPTER 10 =======================
  { h1: ['10', 'Results and Performance Analysis'] },
  { h2: '10.1 Final Results' },
  { p: [
    'The final outcome of the project is a working, deployed SaaS platform. A user can register, describe a form in one sentence or upload a document, and within seconds receive a published form with a short share link (for example /f/f5nmxd), correctly typed fields, validations and a harmonised theme. During the final demonstration the prompt “Patient intake form for a dental clinic with contact details, medical history and appointment date” produced a six-question Patient Intake Form with name, phone, e-mail, choice and checkbox fields, and the prompt “Customer satisfaction survey for a restaurant” produced a six-question Restaurant Dining Experience Form with multiple-choice and long-text feedback questions.',
    'The forms were edited in the builder, opened through the public link and filled by sample respondents; the dashboard immediately reflected 8 submissions per form with a 100% completion rate and an average time of 87 seconds, and the responses ledger listed each submission with time taken, tab switches and flag status. All 50 automated test cases passed. The application runs locally through a single command (node dev.js) and in production on Vercel and Render.',
  ] },
  { h2: '10.6 Results Discussion' },
  { p: [
    'The results confirm the central hypothesis of the project: combining deterministic domain rules with schema-constrained LLM generation produces forms that are both fast to create and reliable enough for real use. The most visible gain is time — form creation dropped from tens of minutes to seconds — but the quality gain is equally important. Because the field intelligence engine and quality reviewer enforce types and validations, AI-generated forms contained correctly typed e-mail and phone fields and complete option lists, which are frequent sources of error in manually built forms.',
    'The fallback design proved valuable in practice. During development the Gemini API occasionally returned quota or availability errors; in those cases the next model in the chain or the rule-based plan was used, so the user never saw a failed generation. The security fixes found during QA (server-side password and required-field enforcement, session invalidation on logout) show the value of testing at the API level rather than only through the UI.',
    'Two limitations were observed. First, the first request after inactivity on the free hosting tier suffers a cold start of around 30–50 seconds, which affects perceived performance but not functionality. Second, documents with heavy handwriting or complex multi-column layouts can produce partially correct field lists that need manual correction in the builder. Both are discussed further in Chapter 13.',
  ] },
  { h2: '10.2 Objective-wise Achievement' },
  { tbl: { cap: 'Objective-wise achievement', head: ['Objective', 'Achievement / Evidence', 'Status'], w: [36, 48, 16], rows: [
    ['O1 – Prompt to form in < 10 s', 'Average 4–9 s; AI-GEN-01 to 03 passed', 'Achieved'],
    ['O2 – Digitise documents', 'PDF, DOCX, XLSX, image; AI-GEN-04, 05 passed', 'Achieved'],
    ['O3 – ≥ 10 field types with validation', '11 core types + contact variants; BLD-02 passed', 'Achieved'],
    ['O4 – Visual builder', 'Three-pane builder with undo/redo and theme editor ({f_builder})', 'Achieved'],
    ['O5 – Instant publish and share', 'Unique share id; RUN-01, AI-GEN-10 passed', 'Achieved'],
    ['O6 – Graded quizzes with anti-cheat', 'QUIZ-01 to 03, RUN-06 passed', 'Achieved'],
    ['O7 – Analytics and export', 'Dashboards, CSV export; ANL-01 to 03 passed', 'Achieved'],
    ['O8 – Team collaboration', 'Roles, invites, RBAC; TEAM-01 to 04 passed', 'Achieved'],
    ['O9 – Security controls', 'JWT, single session, bcrypt, Helmet, CORS, rate limits; AUTH suite passed', 'Achieved'],
    ['O10 – ≥ 40 tests and cloud deployment', '50 tests passed; Vercel + Render deployment', 'Achieved'],
  ] } },
  { h2: '10.3 Performance Metrics' },
  { tbl: { cap: 'Performance metrics', head: ['Parameter / Metric', 'Target', 'Final Result', 'Difference / Improvement', 'Status'], w: [26, 15, 18, 27, 14], rows: [
    ['Form creation time (10 fields)', '< 60 s', '≈ 8 s (text), ≈ 12 s (document)', '≈ 99% less than ≈ 20 min manual', 'Met'],
    ['AI generation success rate', '≥ 95%', '100% (11/11 AI tests)', 'Fallback ensures a form is always returned', 'Met'],
    ['Automated test pass rate', '100%', '50 / 50', '9 defects fixed and verified', 'Met'],
    ['Correct field-type inference', '≥ 90%', 'All typed contact fields correct in tests', 'Quality reviewer repairs conflicts', 'Met'],
    ['CRUD API latency', '< 500 ms', '≈ 40–200 ms', '2.5–12× better than target', 'Met'],
    ['Submission latency', '< 500 ms', '≈ 100–250 ms', 'Within target', 'Met'],
    ['Pages implemented', '20', '29 routes', '+9 pages', 'Exceeded'],
    ['REST endpoints', '50', '73 routes', '+23 endpoints', 'Exceeded'],
  ] } },
  { h2: '10.4 Comparative Results (if applicable)' },
  { p: 'Indicative timings for producing a ready-to-share 8–10 field form were measured during the project (manual builder vs PromptForm AI); the comparison is summarised in the table below and charted in Appendix E.' },
  { tbl: { cap: 'Comparative results with existing approaches', head: ['Method / System', 'Metric 1: Creation Time', 'Metric 2: Field-type Errors', 'Metric 3: Document Import', 'Observation'], w: [24, 16, 18, 18, 24], rows: [
    ['Manual builder (Google Forms)', '≈ 15–25 min', 'Common (manual choice)', 'Not supported', 'Baseline'],
    ['Template-based (Jotform)', '≈ 5–8 min', 'Fewer, needs edits', 'Separate PDF tool', 'Faster but still manual'],
    ['PromptForm AI – text prompt', '≈ 8 s', 'Rare (auto-typed)', '—', 'Fastest, consistent'],
    ['PromptForm AI – document', '≈ 12 s', 'Rare', 'PDF, DOCX, XLSX, image', 'Unique capability'],
  ] } },
  { h2: '10.5 Final Output Screenshots' },
  { p: 'The following screenshots were captured from the running application with the demo account and demonstrate the main outputs of the system.' },
  { fig: { img: S('dashboard'), cap: 'Final Output / Result Screenshot 1 (Workspace Overview Dashboard)' } },
  { fig: { img: S('public_form'), cap: 'Final Output / Result Screenshot 2 (Public Responder)' } },
  { fig: { img: S('responses'), cap: 'Final Output / Result Screenshot 3 (Responses Ledger)' } },
  { fig: { img: S('templates'), cap: 'Final Output / Result Screenshot 4 (Template Marketplace)' } },

  // ======================= CHAPTER 11 =======================
  { h1: ['11', 'Challenges, Solutions and Improvements'] },
  { h2: '11.1 Major Challenges' },
  { tbl: { cap: 'Major challenges', head: ['Challenge', 'Phase', 'Impact', 'Solution', 'Final Outcome'], w: [22, 13, 20, 27, 18], rows: [
    ['Malformed or inconsistent LLM output', 'AI engine', 'Broken forms, wrong types', 'JSON response schema + quality reviewer', 'Consistent output'],
    ['Gemini quota / model unavailability', 'AI engine', 'Failed generations', '5-model fallback chain + rule-based plan', 'Always returns a form'],
    ['Long AI latency', 'AI engine', 'Poor UX', 'Flash-lite models first, 45 s timeout, progress UI', '≈ 4–9 s typical'],
    ['Question IDs lost on save', 'Builder', 'Responses detached', 'Upsert with preserved UUIDs', 'History intact'],
    ['Client-only validation', 'Testing', 'Security bypass', 'Server-side enforcement', 'Verified fix'],
    ['Team invite flow across sign-up', 'Teams', 'Invites lost', 'Persist pending invite, verify e-mail, atomic membership', 'Reliable invites'],
    ['Prisma client / port conflicts', 'Deployment', 'Server crashes', 'postinstall prisma generate, explicit PORT handling', 'Stable startup'],
    ['E-mail deliverability', 'Notifications', 'Silent failures', 'Resend provider with SMTP fallback, domain checks', 'Honest delivery status'],
  ] } },
  { h2: '11.2 Technical Challenges' },
  { p: [
    'The most significant technical challenge was making LLM output dependable. Early prototypes asked the model for “a form in JSON” and parsed the text; responses sometimes contained markdown fences, missing fields, unsupported types or choice questions without options. The solution was to request native JSON with a response schema, validate the result, and pass it through the quality reviewer, which repairs types based on labels and fills missing options. Prompts were also enriched with the deterministic plan so that the model refines a sensible structure instead of inventing one from scratch.',
    'A second challenge was multimodal document handling. Some models rejected certain inline file types, and large files increased latency. The implementation normalises MIME types, extracts text locally first (pdf-parse, mammoth, SheetJS) and, if a model rejects inline data, retries the request with text only. A third challenge was keeping analytics queries fast as events grew; this was addressed with a composite index on (formId, eventType, createdAt) and pre-aggregated FormDailyMetric rows.',
  ] },
  { h2: '11.3 Process / Coordination Challenges' },
  { p: [
    'Scope growth was the main process challenge: mentor feedback added document digitisation, quizzes and team collaboration to the original plan. MoSCoW prioritisation and sprint planning kept the work manageable — “must” features were completed first and “could” features were scheduled only after the core was stable. Coordinating reviews with two mentors (company and institute) required concise weekly demonstrations and written progress summaries, which later formed the basis of the four progress reports and this final report.',
  ] },
  { h2: '11.5 Lessons from Challenges' },
  { p: [
    'The challenges taught that AI features must be engineered like any other external dependency: with schemas, validation, timeouts, retries and a fallback path. They also showed that security must be enforced on the server, because API-level tests found issues that were invisible in the UI. Finally, regular demonstrations and a prioritised backlog proved essential for controlling scope while still incorporating valuable feedback.',
  ] },
  { h2: '11.4 Improvements Made During Development' },
  { tbl: { cap: 'Improvements made during development', head: ['Improvement', 'Reason', 'Implementation', 'Impact'], w: [24, 24, 30, 22], rows: [
    ['Hybrid AI engine', 'LLM-only output unreliable', 'AIFormBrain plan + Gemini + reviewer', 'Reliable, fast generation'],
    ['Display modes', 'Long forms tiring on mobile', 'Full / wizard / chat responder', 'Better completion'],
    ['Understanding summary', 'Users unsure what AI understood', 'Topic, purpose, type, difficulty shown', 'Transparency'],
    ['Single active session', 'Shared-account abuse', 'Session token in JWT and DB', 'Stronger security'],
    ['Live notifications', 'Owners missed responses', 'Notification panel + e-mail', 'Faster follow-up'],
    ['Health endpoints & bootstrap checks', 'Opaque deployment failures', '/health, readiness, env/DB validation', 'Easier operations'],
    ['Notification panel polish', 'Layering and overflow bugs', 'Flex layout, viewport bounds, Escape to close', 'Usable on mobile'],
  ] } },

  // ======================= CHAPTER 12 =======================
  { h1: ['12', 'Individual Contribution and Professional Learning'] },
  { h2: '12.1 Individual Contribution' },
  { p: 'This was an individual internship project; all modules were designed, implemented, tested and deployed by the student under the guidance of the company and institute mentors.' },
  { tbl: { cap: 'Individual contribution', head: ['Student', 'Module / Task', 'Contribution', 'Evidence', '% Contribution'], w: [16, 22, 30, 20, 12], alignCenter: false, rows: [
    ['[STUDENT NAME]', 'Requirements & design', 'FR/NFR, architecture, UML, ER schema', 'Ch. 4, 6', '100%'],
    ['[STUDENT NAME]', 'Frontend', '29 Next.js pages, components, API client', 'frontend/src', '100%'],
    ['[STUDENT NAME]', 'Backend & security', '73 routes, middlewares, services', 'backend/src', '100%'],
    ['[STUDENT NAME]', 'AI engine', 'AIFormBrain, Gemini integration, document parsing', 'lib/aiBrain', '100%'],
    ['[STUDENT NAME]', 'Testing', '50 automated tests, defect fixing', 'QA JSON reports', '100%'],
    ['[STUDENT NAME]', 'Deployment & documentation', 'Vercel/Render, reports', 'render.yaml, this report', '100%'],
  ] } },
  { h2: '12.2 Technical Skills Acquired' },
  { ul: [
    '**Programming / Development:** advanced TypeScript, React 19 hooks and component design, Node.js and Express middleware patterns.',
    '**Frameworks / Libraries:** Next.js App Router, Tailwind CSS, Zustand, React Hook Form, Zod, Recharts, Prisma.',
    '**Database / Data Handling:** relational modelling, JSON columns, indexes, cascades, transactions and migrations in PostgreSQL.',
    '**Testing / Debugging:** API-level black-box test automation, defect triage, reproducing and verifying fixes.',
    '**Deployment / Cloud:** Vercel and Render deployment, environment configuration, health checks, Docker Compose.',
    '**Domain-specific skills:** prompt engineering, structured LLM output, multimodal document understanding and fallback design.',
  ] },
  { h2: '12.3 Professional Skills Acquired' },
  { ul: [
    '**Communication:** presenting progress to technical and academic mentors and explaining design trade-offs.',
    '**Teamwork / Collaboration:** incorporating reviewer feedback and following organisational coding conventions.',
    '**Time Management:** sprint planning and MoSCoW prioritisation within a fixed internship timeline.',
    '**Problem Solving:** diagnosing failures across frontend, backend, database and external services.',
    '**Documentation:** writing progress reports, test reports and this consolidated final report.',
    '**Presentation / Technical Explanation:** live demonstrations of AI generation, analytics and security features.',
  ] },
  { h2: '12.4 Major Learning Outcomes' },
  { p: [
    'The internship provided end-to-end experience of building a production-style product: translating a business problem into requirements, designing a scalable architecture, implementing a large TypeScript codebase, integrating an external AI service, securing it, testing it systematically and deploying it to the cloud. The most important learning was how to use generative AI responsibly in software — not as a black box, but as one component surrounded by validation, deterministic rules and graceful degradation.',
    'The project also strengthened professional habits: writing meaningful commit messages, keeping the main branch deployable, documenting decisions and measuring results instead of relying on impressions. These outcomes directly support future work as a full-stack or AI application engineer.',
  ] },

  // ======================= CHAPTER 13 =======================
  { h1: ['13', 'Limitations and Future Scope'] },
  { h2: '13.1 Current Limitations' },
  { tbl: { cap: 'Current limitations', head: ['Limitation', 'Reason', 'Impact', 'Possible Improvement'], w: [24, 24, 24, 28], rows: [
    ['Dependence on Gemini API', 'Third-party LLM', 'Quota / outage reduces wording quality', 'Add second provider, caching, self-hosted model'],
    ['Cold start on free hosting', 'Render free tier sleeps', '30–50 s first request', 'Paid instance or keep-alive pings'],
    ['No real payment settlement', 'Out of scope', 'Plans recorded but not charged', 'Integrate Razorpay / Stripe'],
    ['Handwritten / complex documents', 'Model limits', 'Partial field extraction', 'Dedicated OCR and layout analysis'],
    ['Conditional logic not auto-generated', 'Complexity', 'Logic set manually', 'Generate branching rules from prompt'],
    ['Default JWT secret fallback in code', 'Developer convenience', 'Risk if env not set', 'Fail fast when JWT_SECRET missing'],
    ['Web-only client', 'Time constraint', 'No offline use', 'PWA / native apps'],
  ] } },
  { h2: '13.2 Future Scope' },
  { ul: [
    'Payment gateway integration (Razorpay / Stripe) with subscriptions, invoices and paid forms.',
    'AI-generated conditional logic, calculated fields and multi-page sections.',
    'Voice-to-form and multilingual generation with automatic translation of published forms.',
    'Integrations with Google Sheets, Slack, Microsoft Teams, Zapier and webhooks with retry queues.',
    'Advanced quiz proctoring (webcam snapshots, full-screen enforcement) and certificate generation.',
    'Accessibility (WCAG 2.2 AA) audit and improvements, including screen-reader optimised responder.',
    'Progressive Web App with offline response capture and later synchronisation.',
  ] },
  { h2: '13.3 Scalability / Extension Opportunities' },
  { p: [
    'Because the API is stateless and authenticated with JWTs, it can be scaled horizontally behind a load balancer. The existing Redis and BullMQ integration can move AI generation, e-mail sending and analytics aggregation into background workers, keeping request latency low under load. PostgreSQL read replicas and partitioning of the FormEvent table by month would support high-volume analytics, and a CDN already serves the frontend globally.',
    'The modular AIFormBrain allows new domains and industries to be added as rule modules without changing the API, and the provider-agnostic generation function can be extended to other LLMs. Multi-tenant enterprise features — SSO, audit export, data residency and custom domains for public forms — are natural extensions of the current team and activity models.',
  ] },

  // ======================= CHAPTER 14 =======================
  { h1: ['14', 'Conclusion'] },
  { p: [
    'The project began with a simple observation: building online forms is slow, repetitive and error-prone, and existing tools leave the entire authoring effort to the user. The objective was to create a platform that turns a natural-language description or an existing document into a complete, validated and shareable form in seconds, and that supports the rest of the form life cycle — responses, quizzes, analytics and collaboration.',
    'An Agile methodology with two-week sprints and four progress milestones guided the work. Requirements were captured as 17 functional and 12 non-functional requirements, and the system was designed as a three-tier architecture documented with use case, data flow, class, sequence, activity, deployment and ER diagrams. The implementation — a TypeScript monorepo with a Next.js 15 frontend, an Express REST API with 73 routes, PostgreSQL through Prisma with 16 models, and a hybrid AIFormBrain + Google Gemini engine — delivers prompt and document based generation, a visual builder, public responders in three display modes, a quiz engine with anti-cheat, analytics, teams, billing, notifications and an admin panel.',
    'Testing with 50 automated cases, all passing after nine defects were fixed and verified, together with performance measurements and acceptance testing by mentors and peers, confirms that the objectives were achieved. Form creation time fell from roughly 20 minutes to under 10 seconds while field-type accuracy improved. The final achievement is a deployed, secure and extensible product that demonstrates how generative AI can be integrated reliably into real software, and that provides a strong foundation for payments, conditional logic generation and multilingual features in the future.',
  ] },
  { h2: '14.1 Final Project Status' },
  { tbl: { cap: 'Final project status', head: ['Area', 'Final Status', 'Evidence / Remarks'], w: [28, 20, 52], rows: [
    ['Requirements', 'Complete', 'FR-01 to FR-17 and NFR-01 to NFR-12 implemented'],
    ['Design', 'Complete', 'Architecture, UML and ER diagrams (Chapter 6)'],
    ['Implementation', 'Complete', 'Frontend, backend, AI engine, database (Chapter 8)'],
    ['Testing', 'Complete', '50/50 automated tests passed (Chapter 9)'],
    ['Deployment', 'Complete', 'Vercel (frontend), Render (backend), managed PostgreSQL'],
    ['Documentation', 'Complete', 'Four progress reports and this final report'],
    ['Demonstration', 'Complete', 'Live demonstration to company and institute mentors'],
  ] } },

  // ======================= CHAPTER 15 =======================
  { h1: ['15', 'References', 'References are consistent with the progress reports and follow the APA 7th Edition style. Every listed source was used and is cited in the text. The references include:'] },
  { ul: ['Research papers / journal articles', 'Books', 'Official documentation', 'Technical websites', 'Standards', 'APIs / libraries', 'Software documentation'] },
  { h2: '15.1 References' },
  { refs: [
    '[1] Brown, T., Mann, B., Ryder, N., Subbiah, M., Kaplan, J. D., Dhariwal, P., … Amodei, D. (2020). Language models are few-shot learners. Advances in Neural Information Processing Systems, 33, 1877–1901.',
    '[2] Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30, 5998–6008.',
    '[3] Wroblewski, L. (2008). Web form design: Filling in the blanks. Rosenfeld Media.',
    '[4] Sommerville, I. (2016). Software engineering (10th ed.). Pearson.',
    '[5] Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner’s approach (9th ed.). McGraw-Hill Education.',
    '[6] OWASP Foundation. (2021). OWASP Top 10: 2021. https://owasp.org/Top10/',
    '[7] Google. (2024). Gemini API documentation: Generate structured output. Google AI for Developers. https://ai.google.dev/gemini-api/docs/structured-output',
    '[8] Vercel. (2024). Next.js documentation (App Router). https://nextjs.org/docs',
    '[9] Prisma Data. (2024). Prisma ORM documentation. https://www.prisma.io/docs',
    '[10] OpenJS Foundation. (2024). Express 4.x API reference. https://expressjs.com/en/4x/api.html',
    '[11] The PostgreSQL Global Development Group. (2024). PostgreSQL documentation. https://www.postgresql.org/docs/',
    '[12] Jones, M., Bradley, J., & Sakimura, N. (2015). JSON Web Token (JWT) (RFC 7519). Internet Engineering Task Force. https://doi.org/10.17487/RFC7519',
    '[13] Meta Open Source. (2024). React documentation. https://react.dev/',
    '[14] Schwaber, K., & Sutherland, J. (2020). The Scrum guide. https://scrumguides.org/',
  ] },
  { h2: '15.2 Citation Requirements' },
  { ul: [
    'Sources are cited in the text where external ideas, methods or technical information are used (e.g. Vaswani et al., 2017; Brown et al., 2020; Wroblewski, 2008; OWASP, 2021; Google, 2024).',
    'No fake, unrelated or unused references are included.',
    'Primary, official and reliable academic and technical sources are preferred.',
    'One consistent citation style (APA 7th Edition) is maintained.',
  ] },

  // ======================= APPENDICES =======================
  { h1: ['A', 'Appendices'] },
  { h2: 'Appendix A – Progress Report 1 Summary' },
  { p: 'Reporting 1 covered problem identification and planning. The student studied existing form builders (Google Forms, Typeform, Jotform, Microsoft Forms), measured manual form creation time, and defined the problem statement and ten objectives. An Agile methodology was selected, the technology stack (Next.js, Express, PostgreSQL, Prisma, Gemini) was proposed, and a 14-week schedule was prepared. Mentor feedback recommended adding document upload and assessment support, which were added to the backlog.' },
  { h2: 'Appendix B – Progress Report 2 Summary' },
  { p: 'Reporting 2 covered design and initial implementation. The three-tier architecture, UML diagrams and the Prisma schema were finalised. The monorepo was set up with frontend, backend and shared packages. Authentication (register, login, JWT, refresh, Google OAuth), forms CRUD, the first version of the visual builder, the public responder and the template marketplace were implemented and demonstrated. The first AI generation prototype using Gemini was also shown.' },
  { h2: 'Appendix C – Progress Report 3 Summary' },
  { p: 'Reporting 3 covered advanced implementation, testing and validation. The AIFormBrain hybrid engine, multi-model fallback, document digitisation, quiz engine with anti-cheat, analytics dashboards, teams with RBAC and invitations, billing with credits and coupons, notifications and the admin panel were completed. The 39-case platform QA suite and the 11-case AI suite were executed; nine defects were logged and fixed.' },
  { h2: 'Appendix D – Reporting 4 / Final Evaluation' },
  { p: 'Reporting 4 covered final completion and evaluation. All defects were re-verified (50/50 tests passing), performance was measured, the notification panel and team invite flow were polished, e-mail delivery was improved with the Resend provider, and the application was deployed to Vercel and Render with a managed PostgreSQL database. The system was demonstrated end-to-end to the mentors and the final report was prepared.' },
  { h2: 'Appendix E – Additional Screenshots / Outputs' },
  { fig: { img: S('login'), cap: 'Supporting Evidence — Login Page' } },
  { fig: { img: D('perf'), cap: 'Supporting Evidence — Form Creation Time Comparison' } },
  { fig: { img: S('register'), cap: 'Supporting Evidence — Registration Page' } },
  { fig: { img: S('pricing'), cap: 'Supporting Evidence — Pricing Plans' } },
  { fig: { img: S('forms'), cap: 'Supporting Evidence — Forms Library' } },
  { fig: { img: S('analytics'), cap: 'Supporting Evidence — Workspace Analytics' } },
  { fig: { img: S('team'), cap: 'Supporting Evidence — Team Workspace' } },
  { fig: { img: S('settings'), cap: 'Supporting Evidence — Account Settings' } },
  { fig: { img: S('billing'), cap: 'Supporting Evidence — Billing and Credits' } },
  { fig: { img: D('modules'), cap: 'Supporting Evidence — Module Architecture' } },
  { fig: { img: D('deployment'), cap: 'Supporting Evidence — Deployment Diagram' } },
  { h2: 'Appendix F – Certificates / Internship Evidence' },
  { p: 'Attach the internship offer letter, internship completion certificate issued by [COMPANY / ORGANIZATION NAME], attendance / timesheet records and any training certificates on the following pages before hard binding.' },
  { tbl: { cap: 'Internship evidence checklist', head: ['Document', 'Issued By', 'Attached'], w: [45, 35, 20], rows: [
    ['Internship offer / joining letter', '[COMPANY / ORGANIZATION NAME]', '[Yes / No]'],
    ['Internship completion certificate', '[COMPANY / ORGANIZATION NAME]', '[Yes / No]'],
    ['Attendance / timesheet', 'Company mentor', '[Yes / No]'],
    ['Progress report evaluations (1–4)', 'Institute mentor', '[Yes / No]'],
  ] } },
  { h2: 'Appendix G – Source Code / Repository / Deployment Evidence' },
  { tbl: { cap: 'Source code, repository and deployment evidence', head: ['Item', 'Link / Location', 'Description', 'Remarks'], w: [20, 34, 28, 18], rows: [
    ['Source repository', '[Git repository URL]', 'TypeScript monorepo (main branch, 66 commits)', 'Private / shared with mentor'],
    ['Frontend app', 'https://frontend-tau-nine-n8hxn4thl0.vercel.app', 'Next.js frontend on Vercel', 'Deployed'],
    ['Backend API', 'https://promptform-api.onrender.com', 'Express API on Render (render.yaml)', 'Deployed'],
    ['Database schema', 'backend/prisma/schema.prisma', '16 Prisma models', '—'],
    ['AI engine', 'backend/src/lib/aiBrain/', 'AIFormBrain modules', '—'],
    ['Test suites', 'backend/src/scripts/runTests.ts', 'Automated QA runner', '50/50 passed'],
    ['QA reports', 'qa_test_report.json, ai_generator_qa_report.json', 'Test evidence', '—'],
    ['Local run', 'node dev.js', 'Backend :5050, frontend :4500', 'docker-compose for DB'],
  ] } },
  { p: 'The complete REST API surface registered by the backend at start-up (73 routes, as reported by the bootstrap sequence) is catalogued below as repository evidence.' },
  { tbl: { cap: 'Complete REST API endpoint catalogue', head: ['Method', 'Endpoint', 'Purpose', 'Access'], w: [11, 39, 34, 16], rows: [
    ['GET', '/api/auth/google, /google/callback', 'Google OAuth sign-in', 'Public'],
    ['POST', '/api/auth/register', 'Create account (bcrypt, min. 10 chars)', 'Public'],
    ['POST', '/api/auth/login', 'Issue access + refresh token, new session', 'Public'],
    ['POST', '/api/auth/reset-password', 'Reset password', 'Public'],
    ['GET', '/api/auth/me, /profile', 'Current user profile', 'JWT'],
    ['POST', '/api/auth/upgrade', 'Upgrade plan, record transaction', 'JWT'],
    ['POST', '/api/auth/refresh', 'Rotate tokens', 'Refresh token'],
    ['GET', '/api/auth/transactions', 'Receipts / audit trail', 'JWT'],
    ['POST', '/api/auth/logout', 'Invalidate active session', 'JWT'],
    ['GET / POST', '/api/auth/coupons', 'List / create coupons', 'Admin'],
    ['DELETE', '/api/auth/coupons/:id', 'Delete coupon', 'Admin'],
    ['POST', '/api/auth/coupons/validate', 'Validate promo code', 'JWT'],
    ['GET / POST', '/api/forms', 'List / create forms', 'JWT'],
    ['GET', '/api/forms/notifications/live', 'Live notification feed', 'JWT'],
    ['POST', '/api/forms/notifications/live/read-all, /:id/read', 'Mark notifications read', 'JWT'],
    ['DELETE', '/api/forms/notifications/live, /:id', 'Clear notifications', 'JWT'],
    ['POST', '/api/forms/notifications/live/test, /test-email', 'Send test notification / e-mail', 'JWT'],
    ['GET', '/api/forms/notifications/live/email-status/:messageId', 'E-mail delivery status', 'JWT'],
    ['GET', '/api/forms/collaborations/shared-with-me', 'Forms shared with user', 'JWT'],
    ['GET', '/api/forms/:id', 'Get form (owner or public by share id)', 'JWT / Public'],
    ['PUT / PATCH', '/api/forms/:id', 'Update form, settings (deep merge)', 'JWT + role'],
    ['PUT', '/api/forms/:id/questions', 'Upsert questions (UUIDs preserved)', 'JWT + role'],
    ['DELETE', '/api/forms/:id', 'Delete form (cascade)', 'Owner'],
    ['GET / POST', '/api/forms/:id/collaborators', 'List / add collaborators', 'Owner'],
    ['PUT / DELETE', '/api/forms/:id/collaborators/:collaboratorId', 'Change role / remove', 'Owner'],
    ['POST', '/api/forms/:id/submit', 'Public submission (rate limited)', 'Public'],
    ['GET', '/api/forms/:id/responses', 'List responses', 'JWT + role'],
    ['GET', '/api/forms/:id/export', 'CSV export with scores', 'JWT + role'],
    ['POST', '/api/ai/generate, /generate-from-file', 'AI form generation', 'Optional JWT'],
    ['POST', '/api/ai/analyze-sentiment', 'Sentiment of text answers', 'JWT + plan'],
    ['POST', '/api/ai/analyze-response', 'AI response insights', 'JWT + plan'],
    ['POST', '/api/ai/chat-stream', 'Streaming AI assistant', 'JWT + plan'],
    ['POST', '/api/upload', 'File upload (documents, answers)', 'Public / JWT'],
    ['GET', '/api/teams/activity/recent', 'Recent activity across teams', 'JWT'],
    ['GET / POST', '/api/teams', 'List / create teams', 'JWT'],
    ['GET', '/api/teams/invitations/verify/:token', 'Verify invite token', 'Public'],
    ['POST', '/api/teams/invitations/accept/:token', 'Accept invite (atomic)', 'JWT'],
    ['GET', '/api/teams/:id, /:id/forms, /:id/activity', 'Team details, forms, activity', 'Member'],
    ['GET / DELETE', '/api/teams/:id/invitations[/:inviteId]', 'List / revoke invitations', 'Team admin'],
    ['POST', '/api/teams/:id/members', 'Invite member', 'Team admin'],
    ['PUT / DELETE', '/api/teams/:id/members/:memberId', 'Change role / remove member', 'Team admin'],
    ['PUT / DELETE', '/api/teams/:id', 'Rename / delete team', 'Owner'],
    ['GET', '/api/workflows/form/:formId', 'List workflows of a form', 'JWT'],
    ['POST / PUT / DELETE', '/api/workflows[/:id]', 'Manage workflows', 'JWT'],
    ['GET', '/api/analytics/workspace', 'Workspace KPIs and trends', 'JWT'],
    ['GET', '/api/analytics/form/:formId', 'Form metrics and funnel', 'JWT'],
    ['POST', '/api/analytics/form/:formId/view, /event', 'Record view / event', 'Public'],
    ['GET / POST', '/api/templates[/:id]', 'Template marketplace', 'Public / JWT'],
    ['GET', '/health, /health/liveness, /health/readiness', 'Health checks', 'Public'],
  ] } },
  { p: 'Selected source excerpts that are referenced in the report are reproduced below; the complete code is available in the repository.' },
  { code: `for (const model of candidateModels) {          // flash-lite → flash → pro
  const payload = {
    contents: [...history, { role: 'user', parts: currentParts }],
    generationConfig: { responseMimeType: 'application/json',
                        ...(responseSchema ? { responseSchema } : {}) },
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(\`\${GEMINI_URL}/\${model}:generateContent?key=\${apiKey}\`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal });
    if (!res.ok) { /* invalid key → stop; inline data rejected → retry text-only;
                     otherwise continue with next model */ continue; }
    return JSON.parse(await extractText(res));
  } finally { clearTimeout(timeoutId); }
}
// all models failed → caller falls back to AIFormBrain.process(prompt)`, codeCap: 'Listing G.1: Gemini call with model fallback chain (backend/src/routes/ai.ts, simplified)' },
  { code: `const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api/', apiLimiter);
const submissionLimiter = rateLimit({ windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 60 : 1000 });
app.use('/api/forms/:id/submit', submissionLimiter);

app.use('/api/auth', authRouter);       app.use('/api/forms', formsRouter);
app.use('/api/ai', aiRouter);           app.use('/api/upload', uploadRouter);
app.use('/api/teams', teamsRouter);     app.use('/api/workflows', workflowsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/templates', templatesRouter);
app.use(errorHandler);`, codeCap: 'Listing G.2: Router mounting and rate limiting (backend/src/index.ts)' },
  { code: `model Form {
  id            String     @id @default(uuid())
  title         String
  status        String     @default("DRAFT")   // DRAFT | PUBLISHED | CLOSED
  settings      Json       // collect_emails, password, timer_limit, anti_cheat …
  theme         Json       // primary_color, background_color, font_family
  ownerId       String
  owner         User       @relation("UserForms", fields: [ownerId],
                                    references: [id], onDelete: Cascade)
  teamId        String?
  uniqueShareId String?    @unique
  questions     Question[]
  responses     Response[]
  events        FormEvent[]
  @@index([ownerId])
  @@index([teamId])
}`, codeCap: 'Listing G.3: Form model (backend/prisma/schema.prisma, abridged)' },
  { fig: { img: S('landing_full'), cap: 'Supporting Evidence — Landing Page (full length)', w: 520, h: 760 } },
  { h2: 'Appendix H – Mentor / Evaluator Remarks' },
  { tbl: { cap: 'Mentor / evaluator remarks', head: ['Evaluator', 'Remarks', 'Signature / Date'], w: [25, 50, 25], rows: [
    ['Mentor (Company)\n[COMPANY MENTOR NAME]', '\n\n\n\n', '\n\n'],
    ['Mentor (Institute)\n[INSTITUTE MENTOR NAME]', '\n\n\n\n', '\n\n'],
    ['External Evaluator', '\n\n\n\n', '\n\n'],
  ] } },

  { h1: ['B', 'Final Hard-Bound Submission Checklist'] },
  { tbl: { cap: 'Final hard-bound submission checklist', head: ['Check', 'Requirement', 'Status / Remarks'], w: [10, 50, 40], rows: [
    ['☑', 'Cover page', 'Included'], ['☑', 'Certificate', 'Included – signatures pending'], ['☑', 'Declaration', 'Included – signature pending'],
    ['☑', 'Acknowledgement', 'Included'], ['☑', 'Abstract / Executive Summary', 'Included with keywords'], ['☑', 'Table of Contents updated', 'Page references updated'],
    ['☑', 'List of Figures updated', 'Included'], ['☑', 'List of Tables updated', 'Included'], ['☑', 'All chapters completed', 'Chapters 1–15'],
    ['☑', 'Figures/diagrams captioned and referenced', 'Chapter-wise numbering'], ['☑', 'Tables captioned and referenced', 'Chapter-wise numbering'],
    ['☑', 'Testing evidence', 'Chapter 9, Appendix G'], ['☑', 'Final results and performance analysis', 'Chapter 10'], ['☑', 'APA 7th references', 'Chapter 15'],
    ['☑', 'Appendices/supporting evidence', 'Appendices A–H'], ['☐', 'Mentor/Institute evaluation and signatures', 'To be completed before binding'],
  ] } },

  { h1: ['C', 'Formatting and Submission Guidelines'] },
  { ul: [
    'Paper size: A4.',
    'Body font: Cambria, 12 pt; headings should be consistent.',
    'Line spacing: 1.5 for body text; single spacing may be used in tables, captions and references where appropriate.',
    'Margins: approximately 1 inch left/right/top and 0.75 inch bottom; institutional binding rules may override these values.',
    'Body text should be justified.',
    'Start each chapter on a new page.',
    'Number figures and tables chapter-wise, e.g., Figure 6.1 and Table 9.1.',
    'Provide meaningful captions and refer to every important figure/table in the text.',
    'Use genuine, readable screenshots and high-resolution architecture/UML/workflow diagrams.',
    'Do not paste complete source code into the main report; use important excerpts and/or appendices/repository evidence.',
    "Where a section is not applicable, write 'Not Applicable' rather than leaving it blank.",
    'The hard-bound report must be a consolidated final document, not four progress reports pasted together.',
    'Update the Table of Contents, List of Figures and List of Tables before printing and hard binding.',
    'Ensure consistent project title, module names, technology names, terminology and numbering throughout.',
  ] },
];
