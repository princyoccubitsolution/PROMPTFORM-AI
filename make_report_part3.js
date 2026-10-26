const path = require('path');
const {
  p, h1, h2, h3, bullet, codeBlock, embedImage, createTable, calloutBox,
  PRIMARY, SECONDARY, ACCENT, DARK_TEXT, BORDER_COLOR,
  Paragraph, PageBreak
} = require('./report_utils');

function getChapters6to7() {
  const c = [];

  const imgLanding = path.join(__dirname, "landing_page.png");
  const imgDashboard = path.join(__dirname, "dashboard_page.png");
  const imgBuilder = path.join(__dirname, "builder_page.png");

  // =========================================================================
  // CHAPTER 6: SYSTEM ANALYSIS AND DESIGN
  // =========================================================================
  c.push(
    h1("CHAPTER 6: SYSTEM ANALYSIS AND DESIGN"),
    h2("6.1 Existing System / Current Practice"),
    p("In conventional practice across organizational and educational settings, the creation of web-based data collection forms relies predominantly on manual visual canvas builders (e.g., Google Forms, Microsoft Forms, Typeform, and JotForm). In this legacy workflow, the user must:"),
    bullet("1. Manually identify each required field and its input format."),
    bullet("2. Drag individual input controls onto an editing canvas."),
    bullet("3. Type out labels, descriptions, and placeholder texts manually."),
    bullet("4. Configure option lists for dropdowns, radio buttons, and checkboxes."),
    bullet("5. Construct regular expression patterns or validation rules to ensure valid email addresses, telephone numbers, and date formats."),
    bullet("6. Set up branching logic rules (such as 'skip to section 3 if answer is No') through complex conditional menus."),
    bullet("7. Manually adjust color palettes, header images, and typography."),
    p("This manual process typically consumes 20 to 60 minutes for forms containing 15 or more fields. Furthermore, non-technical creators frequently select inappropriate widget types—such as using plain text inputs instead of date pickers, rating scales, or validated email inputs—resulting in corrupted responses and high respondent dropout rates."),

    h2("6.2 Proposed System"),
    p("PromptForm AI introduces an automated, AI-driven form synthesis paradigm. Instead of manual assembly, users provide a concise natural language prompt (e.g., 'Create a comprehensive dentistry patient intake quiz with anti-cheat detection') or upload an existing PDF form or paper form photograph. The proposed system automatically:"),
    bullet("1. Analyzes user intent, domain category, difficulty level, and required question count via a specialized Intent Engine."),
    bullet("2. Communicates with Google Gemini Large Language Models via direct REST calls to synthesize a structured JSON form definition."),
    bullet("3. Validates the generated structure against strict Zod schemas, falling back to a deterministic rule-based Cognitive Brain (AIFormBrain) if necessary to guarantee 100% synthesis success."),
    bullet("4. Maps fields to 11 specialized widget types (such as ratings, file uploads, signatures, and date pickers) rather than generic text boxes."),
    bullet("5. Applies domain-harmonized HSL color palettes and typography automatically."),
    bullet("6. Persists the form into PostgreSQL via Prisma ORM and generates an immediate shareable public URL."),
    bullet("7. Provides a live visual editor for drag-and-drop adjustments, anti-cheat quiz tracking, and response analytics."),

    h2("6.3 System Architecture"),
    p("PromptForm AI is architected as a modular, type-safe monorepo utilizing npm workspaces across three packages: frontend, backend, and shared libraries."),
    calloutBox(
      "Figure 6.1: Monorepo Architecture & Tiered Client-Server Cloud Deployment",
      "Client Tier: Next.js 15 (App Router, React 19, Tailwind CSS, Zustand, Framer Motion) on Vercel CDN ──HTTPS/REST──> API Tier: Node.js Express 4.19 (TypeScript, Helmet, CORS, Rate Limit, Multer, Zod) on Render Linux Container ──SQL / TCP──> Data Tier: PostgreSQL 15 on Supabase + Redis Caching. Backend calls Google Gemini REST API via outbound HTTPS."
    ),
    p("The architecture strictly separates concerns:"),
    bullet("1. Presentation Tier (Frontend): Built with Next.js 15, providing Server-Side Rendering (SSR) for static landing pages and Client Components for the interactive form builder, live form runner, and analytics dashboards."),
    bullet("2. Application Tier (Backend): Express.js REST server handling authentication, AI generation pipelines, document parsing, rate limiting, and business logic."),
    bullet("3. Persistence Tier (Database): PostgreSQL managed relational database accessed via Prisma ORM for type-safe queries, relational integrity, and JSONB document storage."),
    bullet("4. AI Cognitive Tier: Google Gemini Flash and Pro models accessed via direct REST endpoints with prompt engineering, MIME normalization, and fallback heuristics."),

    h2("6.4 Workflow / Process Flow"),
    calloutBox(
      "Figure 6.2: End-to-End AI Prompt-to-Form Transformation & Validation Pipeline",
      "Step 1: User submits prompt/file ──> Step 2: Auth check & 5-credit deduction ──> Step 3: Intent Engine spelling recovery & domain classification ──> Step 4: Multimodal document extraction (if PDF/image) ──> Step 5: Gemini REST API call with system prompt ──> Step 6: Zod schema validation & fallback to AIFormBrain ──> Step 7: Prisma DB persistence & uniqueShareId generation ──> Step 8: Return form JSON to client"
    ),

    h2("6.5 UML / Design Diagrams"),
    h3("6.5.1 Use Case Diagram"),
    calloutBox(
      "Figure 6.3: Comprehensive System UML Use Case Diagram",
      "Actors: Form Creator, Form Respondent, Team Member, System Administrator. Use Cases: Register/Login (with Google OAuth), Generate Form via AI Prompt, Upload PDF/Image Document, Edit Form in Visual Canvas, Reorder Questions via Drag-and-Drop, Configure Branching Logic, Publish Form, Submit Response, Take Graded Quiz (with Anti-Cheat Tab Tracking), Upload Attachment, Export Responses to CSV, Manage Team Members (RBAC), View Analytics Funnel."
    ),

    h3("6.5.2 Class Diagram"),
    calloutBox(
      "Figure 6.4: System Class Diagram Illustrating Domain Entities and Relations",
      "Classes: User (id, email, password, role, credits, activeSessionToken), Form (id, title, description, status, settings, theme, ownerId, uniqueShareId), Question (id, formId, type, label, required, orderIndex, options, validations, logic), Response (id, formId, answers, browserMetadata, timeTaken, email), Team (id, name, ownerId), TeamMember (id, teamId, userId, role), Workflow (id, formId, trigger, action, config), Analytics (id, formId, views, submissions, deviceStats, dropoutRates), FormEvent (id, formId, eventType, device, country)."
    ),

    h3("6.5.3 Sequence Diagram for AI Form Generation"),
    calloutBox(
      "Figure 6.5: End-to-End Multimodal Sequence Diagram for AI Form Generation",
      "User ──[1. Submit Prompt/File]──> Next.js Client ──[2. POST /api/ai/generate (JWT)]──> Express Router ──[3. Check Credits >= 5]──> DB (Prisma) ──[4. Balance Confirmed]──> Express ──[5. IntentEngine.detectIntent()]──> IntentEngine ──[6. Build System Instruction]──> Express ──[7. HTTPS POST (models/gemini-2.5-flash)]──> Gemini API ──[8. Raw JSON]──> Express ──[9. Zod Validate / AIFormBrain Fallback]──> Express ──[10. Deduct 5 Credits & Save Form]──> DB (Prisma) ──[11. Form Object + Share Link]──> Next.js Client ──[12. Render Live in Builder]──> User"
    ),

    h3("6.5.4 Entity-Relationship (ER) Schema Diagram"),
    calloutBox(
      "Figure 6.6: Entity-Relationship (ER) Relational Schema Diagram",
      "User (1) ──owns──> (0..*) Form; User (1) ──owns──> (0..*) Team; User (1) ──belongs_to──> (0..*) TeamMember; Team (1) ──contains──> (0..*) TeamMember; Team (1) ──groups──> (0..*) Form; Form (1) ──contains──> (1..*) Question; Form (1) ──receives──> (0..*) Response; Form (1) ──triggers──> (0..*) Workflow; Form (1) ──tracks──> (0..*) Analytics; Form (1) ──records──> (0..*) FormEvent; Form (1) ──shares_with──> (0..*) FormCollaborator."
    ),

    h3("6.5.5 Activity Diagram for Form Submission & Anti-Cheat"),
    calloutBox(
      "Figure 6.7: Complete State Transition Activity Diagram for Form Submission",
      "Start ──> Responder navigates to /f/:shareId ──> Resolve Form (Check Status == PUBLISHED) ──> If password required, prompt password ──> Render questions in Full/Wizard mode ──> Responder answers questions ──> [Concurrent Thread: Monitor visibilitychange; if document.hidden == true, increment tabSwitches] ──> Responder clicks Submit ──> Server validates required questions & password ──> If quiz, evaluate correct_answer & compute weighted score ──> If tabSwitches > threshold, mark IS_FLAGGED ──> Save Response in PostgreSQL ──> Dispatch active Workflows (Webhooks/Email) ──> Update FormDailyMetric ──> Return Success Confirmation ──> End"
    ),

    h2("6.6 Module-wise Architectural Design"),
    createTable(
      ["Subsystem Module", "Primary Functional Responsibility", "Input Parameters / Payloads", "Core Processing Logic", "Generated Outputs", "Inter-Module Dependencies"],
      [
        ["Authentication & Session Subsystem", "User registration, credential verification, JWT issuance, and single-active-session tracking.", "User credentials (email, name, password) or Google OAuth idToken.", "Bcrypt hashing (10 rounds), JWT signing with HS256, activeSessionToken comparison on every request.", "JWT access token, sanitized user object, session state.", "jsonwebtoken, bcryptjs, Prisma User model, authMiddleware."],
        ["AI Synthesis & Multimodal Subsystem", "Transform natural language and documents into validated form JSON schemas.", "Text prompt string, optional formId, or multipart uploaded PDF/Image files.", "Credit verification, Intent Engine processing, Gemini REST invocation, JSON schema validation, fallback brain.", "Structured form JSON schema, title, description, questions, theme.", "Google Gemini API, Multer, pdf-parse, Zod, intentEngine.ts, aiBrain.ts."],
        ["Visual Form Builder Subsystem", "Interactive visual manipulation of form fields, ordering, themes, and logic.", "User canvas interactions: drag-and-drop events, property updates, theme selections.", "Client-side state synchronization via Zustand, optimistic UI updates, debounced PUT API persistence.", "Updated form database records, real-time client preview.", "Next.js 15, React 19, Zustand, Framer Motion, forms API routes."],
        ["Form Runner & Anti-Cheat Subsystem", "Render published forms for responders, validate answers, and track exam integrity.", "Respondent answers JSON, browser metadata (tab switches, time taken, user agent).", "Server-side password verification, required fields validation, answer key grading, anti-cheat threshold check.", "Created Response record, computed score, flagged status.", "Prisma Response model, express-rate-limit, formsService.ts."],
        ["Response Analytics & Workflow Subsystem", "Compile submission trends, analyze dropouts, export CSVs, and trigger notifications.", "Form identifier, response records, filter parameters.", "Aggregation queries across Response and FormEvent tables, weighted score CSV formatting, webhook dispatch.", "Analytics JSON payload, downloadable CSV files, outbound HTTP webhooks.", "Prisma Analytics/FormEvent models, analyticsService.ts, nodemailer."]
      ],
      [1400, 1600, 1500, 1600, 1400, 1500]
    ),

    h2("6.7 Database / Data Design"),
    p("The database is implemented in PostgreSQL 15 and managed through Prisma ORM. The schema comprises 14 interconnected relational models:"),
    createTable(
      ["Relational Entity", "Primary & Foreign Keys", "Core Data Attributes & Column Types", "Relational Associations", "Database Purpose"],
      [
        ["User", "id (UUID, PK)", "email (VARCHAR, Unique), name (VARCHAR), password (VARCHAR), role (VARCHAR), subscriptionPlan (VARCHAR), credits (INT), activeSessionToken (VARCHAR)", "1-to-Many: Form, Team, TeamMember, Transaction, Activity, FormCollaborator", "Stores registered user credentials, RBAC role, subscription status, and active session tokens."],
        ["Form", "id (UUID, PK), ownerId (FK -> User), teamId (FK -> Team)", "title (VARCHAR), description (TEXT), status (VARCHAR), isTemplate (BOOLEAN), category (VARCHAR), settings (JSONB), theme (JSONB), uniqueShareId (VARCHAR, Unique), publicUrl (VARCHAR), responseLimit (INT)", "Belongs to User; Belongs to Team; 1-to-Many: Question, Response, Workflow, Analytics, FormEvent, FormDailyMetric, FormCollaborator", "Central entity storing form configuration, display settings, HSL themes, and access identifiers."],
        ["Question", "id (UUID, PK), formId (FK -> Form, Cascade)", "type (VARCHAR), label (TEXT), required (BOOLEAN), orderIndex (INT), options (JSONB), validations (JSONB), logic (JSONB)", "Belongs to Form (onDelete: Cascade)", "Stores individual question definitions, field widget types, validation constraints, and conditional branching rules."],
        ["Response", "id (UUID, PK), formId (FK -> Form, Cascade)", "answers (JSONB), browserMetadata (JSONB), timeTaken (INT), submittedBy (VARCHAR), email (VARCHAR), completedAt (TIMESTAMP)", "Belongs to Form (onDelete: Cascade)", "Stores submitted respondent answers, anti-cheat tab-switch telemetry, completion time, and respondent email."],
        ["Team", "id (UUID, PK), ownerId (FK -> User, Cascade)", "name (VARCHAR), description (TEXT)", "Belongs to User; 1-to-Many: TeamMember, Form, Activity", "Enables multi-user workspace collaboration and organization-wide form sharing."],
        ["TeamMember", "id (UUID, PK), teamId (FK), userId (FK)", "role (VARCHAR: 'admin', 'editor', 'viewer')", "Unique([teamId, userId]); Belongs to Team; Belongs to User", "Defines granular Role-Based Access Control (RBAC) permissions within a workspace team."],
        ["Workflow", "id (UUID, PK), formId (FK -> Form, Cascade)", "trigger (VARCHAR), action (VARCHAR), config (JSONB), active (BOOLEAN)", "Belongs to Form (onDelete: Cascade)", "Configures automated event dispatches (email notifications, webhooks, Slack alerts) on form submission."],
        ["Analytics", "id (UUID, PK), formId (FK -> Form, Cascade)", "views (INT), submissions (INT), deviceStats (JSONB), countryStats (JSONB), dropoutRates (JSONB), sentimentSummary (JSONB)", "Belongs to Form (onDelete: Cascade)", "Stores aggregated form performance statistics, device distributions, and question drop-off funnels."],
        ["FormEvent", "id (UUID, PK), formId (FK -> Form, Cascade)", "eventType (VARCHAR: 'VIEW','START','SUBMIT','DROPOUT'), questionId (VARCHAR), device (VARCHAR), country (VARCHAR), ipAddress (VARCHAR)", "Belongs to Form (onDelete: Cascade); Index([formId, eventType, createdAt])", "High-resolution telemetry event log recording every interaction for drop-off and conversion analysis."]
      ],
      [1400, 1800, 2200, 1800, 1800]
    ),

    h2("6.8 Interface / UI Design"),
    p("The user interface was crafted in accordance with modern human-computer interaction (HCI) standards, ensuring responsive adaptation across mobile (360px+), tablet (768px+), and desktop (1024px+) viewports:"),
    ...embedImage(imgLanding, "Figure 6.8 (a): Live Application Landing Page & AI Prompt Submission Interface", 450, 260),
    p("The landing page presents an uncluttered hero interface featuring a natural language prompt textarea, quick-start topic badges, multimodal file upload buttons, and live credit balance counters."),
    ...embedImage(imgBuilder, "Figure 6.8 (b): Live Interactive Form Builder Canvas with Element Sidebar", 450, 260),
    p("The builder canvas provides visual manipulation: questions can be added from an 11-element sidebar, dragged to reorder, edited in-place, and configured with validation rules and branching pathways."),
    ...embedImage(imgDashboard, "Figure 6.8 (c): User Workspace Analytics Dashboard with Response Funnels", 450, 260),
    p("The workspace dashboard provides centralized governance, displaying form cards, response counts, completion rates, template shortcuts, and team collaboration controls."),
    new Paragraph({ children: [new PageBreak()] })
  );

  // =========================================================================
  // CHAPTER 7: TECHNOLOGY STACK AND DEVELOPMENT ENVIRONMENT
  // =========================================================================
  c.push(
    h1("CHAPTER 7: TECHNOLOGY STACK AND DEVELOPMENT ENVIRONMENT"),
    h2("7.1 Programming Languages"),
    createTable(
      ["Technology / Language", "Standardized Version", "Architectural Role", "Engineering Justification & Usage"],
      [
        ["TypeScript", "v5.5.2", "Primary Full-Stack Language", "Provides end-to-end type safety across Next.js frontend components, Express backend routes, and shared Zod schemas, eliminating runtime type errors."],
        ["JavaScript (ECMAScript 2024)", "Node.js 24 Execution Engine", "Server Runtime & Build Automation", "Executes asynchronous I/O, build scripts, development server orchestrators (dev.js), and database seeding routines."],
        ["SQL (PostgreSQL Dialect)", "PostgreSQL 15 Standard", "Relational Data Querying & Storage", "Executes ACID-compliant relational transactions, index lookups, and JSONB document queries via Prisma ORM."]
      ],
      [1800, 1400, 2400, 3400]
    ),

    h2("7.2 Frameworks / Libraries / APIs"),
    createTable(
      ["Framework / Library / API", "Exact Version", "Functional Domain", "Implementation Purpose & Usage"],
      [
        ["Next.js", "v15.0.1", "Frontend Web Framework", "Implements App Router architecture, Server-Side Rendering (SSR), React Server Components, and optimized client bundle delivery."],
        ["React", "v19.0.0-rc", "UI Component Composition", "Provides declarative reactive state management, hooks (useState, useEffect, useMemo), and DOM reconciliation."],
        ["Express.js", "v4.19.2", "Backend REST API Server", "Manages HTTP routing, middleware pipeline chaining, CORS negotiation, and JSON request/response handling."],
        ["Prisma ORM", "v5.12.1", "Object-Relational Mapping", "Generates type-safe database clients, manages declarative schema definitions, and executes automated database migrations."],
        ["Google Gemini API", "v1 REST Endpoints", "Generative AI Intelligence", "Provides Large Language Model capabilities (gemini-2.5-flash and gemini-2.5-pro) for prompt synthesis and multimodal vision parsing."],
        ["Tailwind CSS", "v3.4.4", "Design System & Styling", "Enables rapid, responsive UI composition through utility classes with native dark mode support."],
        ["Zod", "v3.23.8", "Schema Validation Engine", "Enforces strict runtime data validation on API request bodies, user registration payloads, and AI JSON outputs."],
        ["Zustand", "v5.0.0", "Client-Side State Management", "Manages form builder state, active question selections, and undo/redo operations with zero boilerplate."],
        ["Framer Motion", "v11.11.11", "Animation & Transitions", "Delivers smooth micro-interactions, drag-and-drop animations, and wizard transition effects."],
        ["Multer", "v1.4.5-lts.1", "Multipart File Handling", "Manages memory-buffer streaming for uploaded PDF documents and image scans up to 100MB."],
        ["pdf-parse", "v2.4.5", "PDF Text Extraction", "Parses binary PDF document buffers into plain text strings for downstream LLM form field extraction."],
        ["Bcrypt.js", "v2.4.3", "Cryptographic Security", "Computes salted Blowfish password hashes (10 rounds) to secure stored user credentials."],
        ["JSON Web Token (jsonwebtoken)", "v9.0.2", "Stateless Authentication", "Signs and verifies cryptographically secure JWT tokens (HS256) containing user identity and active session IDs."],
        ["Helmet", "v7.1.0", "HTTP Security Headers", "Hardens Express server against web vulnerabilities by configuring Content Security Policy, X-Frame-Options, and HSTS."]
      ],
      [1600, 1100, 2000, 4300]
    ),

    h2("7.3 Database / Storage"),
    createTable(
      ["Database / Storage Tier", "Engine & Version", "Architectural Role", "Data Stored & Managed"],
      [
        ["Primary Relational Database", "PostgreSQL 15.0", "Persistent ACID Storage", "All structured relational entities: Users, Forms, Questions, Responses, Teams, Analytics, and Events."],
        ["Caching & Volatile Storage", "Redis 4.6.13 / Memory Cache", "High-Speed Key-Value Cache", "API response caching, health check diagnostics, and rate-limiting sliding window counters."],
        ["File System Storage", "Node.js Local Disk / Cloud Volume", "Binary File Storage", "Uploaded responder attachments, candidate resumes, and extracted form assets stored in /public/uploads."]
      ],
      [2200, 1800, 2200, 2800]
    ),

    h2("7.4 Hardware / Cloud / Deployment Environment"),
    createTable(
      ["Infrastructure Component", "Cloud Provider & Tier", "Hardware / Resource Specs", "Current Deployment Status"],
      [
        ["Backend REST API Service", "Render Cloud (Web Service)", "Linux Container, 1 vCPU, 512MB RAM, Node.js 24", "Live Production (Active)"],
        ["Frontend Web Application", "Vercel Edge Network", "Global Anycast Edge CDN, Node.js Serverless Functions", "Live Production (Active)"],
        ["Managed Relational Database", "Supabase PostgreSQL 15", "Shared Compute, 500MB RAM, 1GB NVMe SSD Storage", "Live Production (Active)"],
        ["Local Development Host", "Windows 11 Workstation", "Intel Core i7-12700H, 16GB RAM, 512GB NVMe SSD", "Local Verification Environment"]
      ],
      [2200, 2200, 2600, 2000]
    ),

    h2("7.5 Development Tools"),
    createTable(
      ["Engineering Tool", "Category", "Operational Role in Project"],
      [
        ["Visual Studio Code (VS Code)", "Integrated Development Environment (IDE)", "Primary full-stack TypeScript editing, linting, and debugging environment."],
        ["Git & GitHub", "Distributed Version Control System (DVCS)", "Codebase version tracking, feature branching, pull request reviews, and remote backup."],
        ["Prisma Studio", "Database Management GUI", "Visual inspection and real-time editing of PostgreSQL tables and relational records."],
        ["Postman & PowerShell", "API Testing & Automation Tooling", "Crafting automated HTTP requests, executing end-to-end QA suites, and running regression checks."],
        ["npm Workspaces", "Monorepo Package Manager", "Coordinating multi-package dependencies, running unified dev scripts, and sharing TypeScript modules."]
      ],
      [2200, 2400, 4400]
    ),

    h2("7.6 Technology Selection Rationale"),
    p("The architectural selection of Next.js 15, Express.js 4.19, Prisma ORM, and PostgreSQL was governed by several strategic software engineering principles:"),
    bullet("End-to-End TypeScript Type Safety: Sharing Zod schemas between client and server via an npm workspace eliminated impedance mismatch and data contract synchronization bugs."),
    bullet("Direct REST API Integration over Heavy SDKs: Interfacing directly with Google Gemini REST endpoints via Node.js native fetch reduced bundle overhead, eliminated transitive dependency conflicts, and provided granular control over retry logic, MIME normalization, and timeout handling."),
    bullet("Relational Robustness with JSONB Flexibility: Utilizing PostgreSQL via Prisma provided strict relational integrity for users, teams, and foreign-key cascades, while PostgreSQL JSONB columns accommodated dynamic, evolving structures such as branching logic rules, question options, and respondent telemetry."),
    bullet("Sub-3-Second AI Latency: Google Gemini 2.5 Flash was chosen for primary form generation due to its state-of-the-art inference speed, returning 15-question structured schemas in an average of 2.1 seconds—substantially faster than competing models."),
    new Paragraph({ children: [new PageBreak()] })
  );

  return c;
}

module.exports = { getChapters6to7 };
