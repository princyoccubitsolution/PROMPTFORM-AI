const {
  p, h1, h2, h3, bullet, codeBlock, embedImage, createTable, calloutBox,
  PRIMARY, SECONDARY, ACCENT, DARK_TEXT, BORDER_COLOR,
  Paragraph, PageBreak
} = require('./report_utils');

function getChapters1to5() {
  const c = [];

  // =========================================================================
  // CHAPTER 1: INTRODUCTION
  // =========================================================================
  c.push(
    h1("CHAPTER 1: INTRODUCTION"),
    h2("1.1 Background of the Project"),
    p("The transition from manual physical record-keeping to cloud-native data collection has transformed organizational workflows globally. Across corporate enterprises, educational institutions, government bodies, healthcare networks, and non-profit organizations, digital forms represent the primary gateway for acquiring structured customer, patient, student, and employee data. Whether registering participants for academic conferences, gathering feedback from retail consumers, admitting patients into clinical records systems, conducting compliance audits, or evaluating student competencies via academic quizzes, structured web forms serve as the foundation of modern data engineering pipelines."),
    p("Despite the universal requirement for web forms, conventional web form creation paradigms remain cumbersome, time-consuming, and technically demanding. The first generation of web forms necessitated manual HTML, CSS, and PHP programming, demanding technical software engineering competencies simply to collect tabular survey records. The subsequent second generation of visual drag-and-drop form builders—pioneered by applications such as Google Forms, Typeform, Wufoo, and JotForm—democratized the field by enabling non-programmers to construct web forms using graphical user interfaces. However, visual builders introduced new operational bottlenecks: the content creator is burdened with manually conceptualizing every single question, selecting appropriate UI widgets, typing labels, crafting placeholder instructions, specifying option lists for multiple-choice elements, setting up validation patterns (such as email regular expressions or phone number masks), configuring conditional branching rules, manually designing stylesheets to match corporate branding, and provisioning email notification triggers."),
    p("For an administrator, educator, or healthcare professional preparing a comprehensive 20-field patient intake form or a 30-question diagnostic quiz, manual form configuration routinely demands between 20 to 60 minutes of tedious manual labor. Furthermore, non-technical form creators frequently misconfigure field semantics—such as selecting plain single-line text inputs for dates, currencies, or email addresses—which leads to malformed user submissions, high user abandonment rates, and significant data cleansing overhead downstream."),
    p("The emergence of modern Large Language Models (LLMs) and Generative Artificial Intelligence (GenAI), exemplified by models such as Google Gemini 2.5 Flash and Gemini 2.5 Pro, presents an unprecedented opportunity to redefine digital document composition. LLMs possess exceptional capabilities in natural language understanding, semantic classification, zero-shot structured JSON synthesis, and domain context inference. PromptForm AI was conceptualized and developed to bridge the chasm between raw generative intelligence and production web applications. By allowing users to express their data collection objectives in plain, conversational human language—or simply upload photographs of pre-existing paper forms or PDF documents—PromptForm AI synthesizes complete, validated, beautifully styled web forms within seconds."),

    h2("1.2 Problem Statement"),
    p("Traditional digital form authoring tools and existing experimental AI form builders suffer from critical architectural and user-experience deficiencies that severely hinder organizational productivity:"),
    bullet("High Cognitive and Manual Authoring Overhead: Creating comprehensive digital forms manually requires formulating individual questions, manually adding options, configuring validation constraints, and setting up branching rules, taking up to 45 minutes per form."),
    bullet("Inability to Digitize Physical and PDF Documents Rapidly: Organizations possessing legacy paper questionnaires, printed admission sheets, clinical intake clipboards, or static PDF registration documents must re-type every field manually into digital form builders, causing administrative bottlenecks."),
    bullet("Validation Inconsistencies and Semantics Mismatch: Non-technical form creators frequently choose incorrect widget types (such as plain text fields instead of email, rating, date, phone, or upload widgets), resulting in malformed responses and high respondent dropout rates."),
    bullet("Unreliable Raw LLM JSON Outputs: Naive implementations connecting web apps directly to LLMs suffer from schema hallucinations, unescaped syntax errors, invalid JSON payloads, and mismatched data types that crash frontend rendering engines."),
    bullet("Lack of Academic Assessment Integrity: Existing form platforms either lack native grading keys or fail to provide anti-cheat surveillance, rendering them vulnerable to academic dishonesty during remote tests and quizzes."),
    bullet("Absence of Integrated Collaboration and Analytics: Most entry-level form platforms lack granular role-based access control (RBAC), preventing collaborative editing between administrators, editors, and read-only viewers, while response metrics remain superficial."),
    p("PromptForm AI directly resolves these challenges by providing an intelligent, self-validating, multimodal form generation platform capable of parsing natural language and document scans into schema-validated, responsive web forms with integrated anti-cheat quiz mechanics and real-time response analytics."),

    h2("1.3 Need / Motivation"),
    p("The primary motivation for developing PromptForm AI stems from both practical industry needs and advanced software engineering opportunities:"),
    p("1. Dramatic Productivity Acceleration: In corporate, educational, and medical settings, time spent configuring web forms is unproductive administrative overhead. Automating form synthesis from a 5-word prompt reduces setup time by over 95%, allowing professionals to focus on data analysis rather than widget configuration."),
    p("2. Accessibility for Non-Technical Domain Experts: Doctors, teachers, event organizers, and researchers understand their domain requirements intimately but should not be required to learn complex UI builders or regular expressions. PromptForm AI allows them to communicate naturally with an AI agent that automatically implements software best practices."),
    p("3. Seamless Digitization of Legacy Systems: Across developing nations and traditional organizations, millions of operational workflows still depend on physical printed paper forms. PromptForm AI’s multimodal OCR and visual LLM ingestion pipeline enables instant digital transformation by converting camera photographs of paper forms into live interactive web applications."),
    p("4. Academic Integrity in Remote Education: Following the global expansion of digital learning, educational institutions require secure diagnostic assessment tools. Incorporating active tab-switch monitoring, automated weighted question grading, and instant CSV leaderboard export satisfies this urgent educational need."),

    h2("1.4 Aim of the Project"),
    p("The overarching aim of the PromptForm AI project is to design, develop, test, and deploy a robust, enterprise-grade, AI-driven form generation platform that transforms conversational natural language prompts, PDF documents, and physical document photographs into fully functional, schema-validated, styled, and responsive digital web forms with live editing, anti-cheat quiz capabilities, and response analytics."),

    h2("1.5 Objectives of the Project"),
    p("To accomplish this aim, the project established the following measurable engineering objectives:"),
    bullet("Objective 1: Architect and implement a high-performance monorepo web platform utilizing Next.js 15 (App Router), React 19, TypeScript, Node.js Express 4.19, Prisma ORM 5.12, and PostgreSQL."),
    bullet("Objective 2: Engineer a direct REST-based Google Gemini AI integration pipeline capable of generating structured form JSON schemas from natural language prompts in under 3.0 seconds."),
    bullet("Objective 3: Develop an intelligent Intent Engine that categorizes prompts into 13 business domains, performs spelling and phonetic recovery, maps fields to 11 specialized widget types, and automatically applies topic-harmonized HSL color palettes."),
    bullet("Objective 4: Build a multimodal ingestion pipeline utilizing Multer, pdf-parse, and Gemini Vision capabilities to extract and digitize form structures from uploaded PDF and image documents."),
    bullet("Objective 5: Implement an interactive visual form builder featuring client-side drag-and-drop reordering, question property manipulation, conditional branching logic, and real-time mobile/desktop preview rendering."),
    bullet("Objective 6: Develop an anti-cheat graded quiz engine featuring client-side visibility-change event monitoring, automated weighted score calculation, response flagging, and CSV grade export."),
    bullet("Objective 7: Establish enterprise security protocols including single-active-session JWT management, Bcrypt-10 password hashing, Helmet HTTP security headers, CORS origin whitelisting, and tiered rate limiting."),
    bullet("Objective 8: Validate system reliability through an automated QA testing suite comprising 39 end-to-end test cases and 11 AI-specific generation benchmarks, achieving a 100% test pass rate."),

    h2("1.6 Scope of the Project"),
    p("The project scope encompasses the complete software development lifecycle (SDLC) from domain research and requirements elicitation to architectural design, backend API engineering, frontend UI implementation, automated QA validation, and production cloud deployment on Render and Vercel."),
    createTable(
      ["In Scope", "Out of Scope", "System Constraints"],
      [
        [
          "• Natural language prompt-to-form generation via Google Gemini API\n• Multimodal document parsing (PDF and Image files up to 100MB)\n• Live interactive form builder with drag-and-drop reordering\n• 11 premium widget types (ratings, signatures, file uploads, etc.)\n• Conditional branching logic stored in PostgreSQL JSONB\n• Anti-cheat quiz engine with tab tracking and automated scoring\n• Role-based access control (RBAC: Owner, Editor, Viewer)\n• Real-time workspace analytics and CSV response export\n• Single-active-session JWT authentication & rate limiting",
          "• Native offline desktop installation client\n• Native iOS and Android mobile app binaries (PWA/Responsive web provided)\n• Direct payment processing integration (Stripe/Razorpay UI simulated)\n• Direct SMS OTP gateway integration\n• Blockchain-based immutable storage",
          "• Requires active internet connectivity for cloud Gemini API calls\n• Free tier accounts restricted to 5 active forms and 100 AI credits\n• Backend upload size constrained to 100MB per file\n• Modern web browser supporting HTML5 Canvas and CSS Grid required"
        ]
      ],
      [3000, 3000, 3000]
    ),

    h2("1.7 Expected Outcomes vs Final Outcomes"),
    p("A comparison between planned academic milestones and final software deliverables demonstrates complete fulfillment of all initial project expectations:"),
    bullet("Planned: Basic text-to-form generation with simple text fields. Delivered: Advanced Intent Engine with 11 specialized widget types, domain-aware HSL themes, and automated option synthesis."),
    bullet("Planned: Text-only prompt input. Delivered: Full multimodal ingestion pipeline supporting PDF document parsing and photographic image scan OCR extraction."),
    bullet("Planned: Static form preview. Delivered: Real-time interactive visual form builder with drag-and-drop reordering, device toggles, and live client-side validation."),
    bullet("Planned: Basic survey data collection. Delivered: Comprehensive response management with anti-cheat tab-switch detection, automated weighted scoring, and CSV export."),
    bullet("Planned: Manual verification. Delivered: Comprehensive automated test suite comprising 39 end-to-end integration test cases and 11 AI-specific generation tests with 100% pass rate."),

    h2("1.8 Report Organization"),
    p("This final project report is structured into 15 cohesive chapters and supplementary appendices following the official P P Savani University format:"),
    p("Chapter 1 introduces the project background, problem statement, objectives, and scope. Chapter 2 presents the organization and internship profile. Chapter 3 reviews existing literature and comparative form builder systems. Chapter 4 details functional and non-functional requirements. Chapter 5 describes the Agile development methodology and timeline. Chapter 6 details system architecture, workflows, and UML diagrams. Chapter 7 documents the technology stack. Chapter 8 provides an exhaustive system implementation walkthrough with source code. Chapter 9 presents the comprehensive testing and verification results. Chapter 10 analyzes system performance and output screenshots. Chapter 11 details technical challenges and solutions. Chapter 12 summarizes individual contributions and professional skills. Chapter 13 outlines system limitations and future enhancements. Chapter 14 concludes the report. Chapter 15 provides APA 7th Edition references, followed by Appendices A through H, Chapter B (Submission Checklist), and Chapter C (Formatting Guidelines)."),
    new Paragraph({ children: [new PageBreak()] })
  );

  // =========================================================================
  // CHAPTER 2: ORGANIZATION / INTERNSHIP PROFILE
  // =========================================================================
  c.push(
    h1("CHAPTER 2: ORGANIZATION / INTERNSHIP PROFILE"),
    h2("2.1 Organization / Company Overview"),
    p("The project work was undertaken in fulfillment of the Undergraduate Development Project (UDP) / Industry Internship requirements prescribed by the School of Engineering, P P Savani University. The software development lifecycle was executed in accordance with professional software engineering standards, adopting modern Agile sprint workflows, continuous integration principles, automated QA auditing, and cloud deployment pipelines."),
    p("The project host environment provided advanced technical infrastructure, high-speed networking, collaborative code repositories, and access to modern cloud platforms (Render, Vercel, Supabase, and Google AI Studio). Development was conducted under the direct supervision of both an Industry Technical Mentor and an Internal Institute Project Guide from the Department of Computer Engineering."),

    h2("2.2 Department / Domain"),
    p("The project was carried out within the domain of Software Engineering, Full-Stack Web Application Development, Cloud Infrastructure, and Applied Artificial Intelligence. The development environment reflects industry-standard monorepo setups, leveraging TypeScript across both client and server tiers to guarantee end-to-end type safety, reliable JSON schema validation, and seamless cloud containerization."),

    h2("2.3 Role and Responsibilities"),
    p("As the lead full-stack software engineer on PromptForm AI, primary individual responsibilities encompassed:"),
    bullet("System Architecture Design: Formulating the monorepo architecture, establishing module boundaries between frontend, backend, and shared libraries, and configuring npm workspace scripts."),
    bullet("Database Engineering: Designing the relational PostgreSQL schema using Prisma ORM, authoring migrations, establishing foreign key cascading behaviors, and indexing query pathways."),
    bullet("AI Pipeline Engineering: Implementing direct REST API integrations with Google Gemini LLMs, engineering robust system instructions, and creating the AIFormBrain cognitive fallback engine."),
    bullet("Intent Engine Development: Authoring algorithmic rules for spelling recovery, domain classification, semantic field matching, and HSL color palette synthesis."),
    bullet("Frontend Development: Building the Next.js 15 App Router pages, client-side interactive builder canvas, dynamic question renderers, and responsive user dashboards."),
    bullet("Security & Middleware Implementation: Engineering single-active-session JWT tracking, Bcrypt password hashing, CORS whitelist guards, and tiered Express rate limiting."),
    bullet("Quality Assurance & Testing: Authoring and executing automated end-to-end test suites comprising 39 core integration test cases and 11 AI-specific generation tests."),

    h2("2.4 Development / Work Environment"),
    p("The development ecosystem consisted of high-performance multi-core workstations running Windows 11 and Ubuntu Linux, VS Code as the primary IDE, Node.js 24 runtime, Git version control hosted on GitHub, Render cloud hosting for Express REST services, Vercel for Next.js frontend deployments, Supabase PostgreSQL database instances, and Postman/PowerShell automated testing runners."),

    h2("2.5 Internship Details Table"),
    createTable(
      ["Particular", "Details"],
      [
        ["Project Title", "PromptForm AI — AI-Powered Form Generation Platform"],
        ["Host Academic Institution", "School of Engineering, P P Savani University"],
        ["Program & Semester", "Bachelor of Technology in Computer Engineering, Semester VIII"],
        ["Development Methodology", "Agile / Scrum Framework (2-Week Iterative Sprints)"],
        ["Engineering Domain", "Full-Stack Web Engineering, Applied AI, Cloud Computing"],
        ["Project Type", "Undergraduate Development Project (UDP) / Industry Training"],
        ["Supervision", "Joint Technical Mentorship (Industry Mentor & Institute Guide)"],
        ["Execution Status", "100% Implemented, Empirically Tested, and Cloud Deployed"]
      ],
      [3000, 6000]
    ),
    new Paragraph({ children: [new PageBreak()] })
  );

  // =========================================================================
  // CHAPTER 3: LITERATURE REVIEW
  // =========================================================================
  c.push(
    h1("CHAPTER 3: LITERATURE REVIEW / BACKGROUND STUDY"),
    h2("3.1 Domain Background"),
    p("The historical evolution of digital data capture systems can be categorized into three distinct generations:"),
    p("First Generation (Programmatic Forms - 1990s to 2005): Early web applications relied on manual HTML `<form>` tags, table-based layouts, and server-side CGI/PHP processing scripts. Creating a basic survey required software engineering expertise, database administration skills, and manual validation coding. Forms were static, lacked client-side interactivity, and could not adapt to user inputs dynamically."),
    p("Second Generation (Visual Drag-and-Drop Builders - 2006 to 2022): Platforms such as Google Forms, SurveyMonkey, JotForm, and Typeform revolutionized the industry by introducing visual canvas builders. These tools allowed non-programmers to assemble questions using graphical interfaces. Typeform advanced the user experience further by pioneering the single-question wizard format, significantly increasing survey completion rates. However, visual builders placed the entire authoring burden on the human creator, requiring manual question typing, manual option input, manual branching logic setup, and manual stylesheet configuration."),
    p("Third Generation (AI-Augmented Generative Form Platforms - 2023 to Present): With the advent of transformer-based Large Language Models, experimental AI form assistants began to emerge (e.g., Fillout AI, MakeForms AI). While these early generative tools demonstrated the viability of prompt-to-form synthesis, existing solutions suffer from significant technical limitations: they rely on fragile JSON generation that frequently breaks frontend parsers, lack domain-aware semantic widget matching, fail to offer multimodal document parsing from physical scans, and omit academic assessment features such as anti-cheat monitoring."),

    h2("3.2 Existing Approaches / Related Work"),
    createTable(
      ["Source / Platform", "Core Architectural Approach", "Key Strengths", "Identified Critical Limitations", "Relevance to Project"],
      [
        ["Google Forms (Google LLC)", "Manual visual canvas builder backed by Google Drive cloud ecosystem.", "Extremely simple UI, zero financial cost, seamless Google Sheets sync.", "Zero AI generation, no multimodal ingestion, no anti-cheat tracking, rigid styling options.", "Establishes baseline functional expectations for mass-market data collection."],
        ["Typeform (Typeform SL)", "Proprietary single-question conversational wizard interface.", "Visually elegant, engaging micro-interactions, high respondent completion rates.", "Prohibitive subscription pricing, completely manual question authoring, no document OCR ingestion.", "Serves as architectural benchmark for PromptForm AI's 'Wizard' display mode."],
        ["JotForm (JotForm Inc.)", "Comprehensive visual builder with extensive widget marketplace and logic.", "Rich feature set, PDF form generator, e-signature integrations.", "Complex, cluttered interface, steep learning curve, manual form configuration.", "Informs widget requirements (e-signature, ratings, file uploads)."],
        ["Fillout AI (Fillout Inc.)", "Prompt-driven AI form synthesizer utilizing OpenAI API endpoints.", "Fast initial form generation from basic conversational prompts.", "Requires paid subscription, lacks multimodal paper scan ingestion, no academic anti-cheat grading.", "Direct competitive analysis benchmark for prompt latency and UX."]
      ],
      [1800, 1800, 1800, 1800, 1800]
    ),

    h2("3.3 Comparative Analysis"),
    createTable(
      ["Evaluation Parameter", "Conventional Manual Builders (Google Forms / Typeform)", "First-Gen AI Form Builders (Fillout / Formless)", "PromptForm AI (Proposed Platform)", "Observed Engineering Benefit"],
      [
        ["Form Authoring Duration", "15 to 45 minutes of manual clicking and typing.", "30 to 60 seconds (text prompt only).", "2.1 seconds average prompt generation latency.", "95% to 99% reduction in end-to-end authoring time."],
        ["Multimodal Document Digestion", "Not Supported (manual transcription required).", "Rare or limited to plain text copy-pasting.", "Native PDF extraction and Image photograph OCR via Gemini Vision.", "Instant digitization of legacy physical paperwork."],
        ["Field Semantics & Widget Matching", "Manual selection by user; prone to choosing plain text fields.", "Basic input generation; limited widget variety.", "Intent Engine automatically maps questions to 11 premium widget types.", "Eliminates validation errors and data cleansing overhead."],
        ["Theme & Styling Synthesis", "Manual color picker selection or generic templates.", "Generic unstyled form layouts.", "Automated topic-based HSL color theme application.", "Professional visual coherence tailored to domain."],
        ["Academic Assessment & Anti-Cheat", "Basic auto-grading (Google Forms); no anti-cheat.", "Not Supported (strictly commercial surveys).", "Active tab-switch tracking, weighted scoring, and CSV leaderboard export.", "Maintains academic integrity for remote exams."],
        ["Session Security & Concurrency", "Standard cookie sessions; multi-login permitted.", "Standard session tokens.", "Single-active-session token enforcement in PostgreSQL DB & JWT.", "Prevents credential sharing and concurrent account abuse."]
      ],
      [1800, 1800, 1800, 1800, 1800]
    ),

    h2("3.4 Research Gap / Project Justification"),
    p("The literature and market analysis reveals a distinct research and technological gap: existing tools represent either fully manual visual editors lacking artificial intelligence, or superficial AI wrappers that output unvalidated static forms without domain intelligence, document parsing, or assessment security. PromptForm AI bridges this gap by engineering an integrated platform that pairs high-speed LLM generation with strict schema validation, multimodal document ingestion, automated semantic widget matching, and anti-cheat quiz mechanics."),
    new Paragraph({ children: [new PageBreak()] })
  );

  // =========================================================================
  // CHAPTER 4: REQUIREMENTS ANALYSIS AND PROJECT SCOPE
  // =========================================================================
  c.push(
    h1("CHAPTER 4: REQUIREMENTS ANALYSIS AND PROJECT SCOPE"),
    h2("4.1 Functional Requirements"),
    p("Functional requirements define the core software capabilities, workflows, and system interactions provided by PromptForm AI:"),
    createTable(
      ["Req. ID", "Functional Requirement Description", "Priority", "Verification Basis", "Implementation Status"],
      [
        ["FR-01", "User Authentication: Secure registration, login, JWT token issuance, and password hashing.", "High", "Security Best Practices", "Verified (AUTH-01, AUTH-02)"],
        ["FR-02", "Single Active Session: Immediate invalidation of prior sessions upon new user login.", "High", "Enterprise Security", "Verified (AUTH-03)"],
        ["FR-03", "Text-to-Form Generation: Convert natural language prompts into complete structured forms.", "High", "Core Project Aim", "Verified (AI-01, AI-GEN-01)"],
        ["FR-04", "Multimodal Ingestion: Extract form fields from uploaded PDF documents and image scans.", "High", "System Innovation", "Verified (AI-GEN-04, AI-GEN-05)"],
        ["FR-05", "Intent Engine Normalization: Automatic spelling recovery, domain classification, and theme assignment.", "High", "Data Semantics", "Verified (AI-GEN-01, AI-GEN-08)"],
        ["FR-06", "Credit Tracking: Deduct 5 credits per AI generation; block generation when balance < 5.", "High", "Resource Governance", "Verified (AI-02, AI-GEN-07)"],
        ["FR-07", "Interactive Visual Builder: Drag-and-drop question reordering, editing, and deletion.", "High", "User Experience", "Verified (BLD-01, BLD-02, BLD-03)"],
        ["FR-08", "Support for 11 Widget Types: Short text, long text, MCQ, checkbox, dropdown, rating, date, time, file upload, payment, signature.", "High", "Form Schema Specs", "Verified (BLD-02, AI-GEN-03)"],
        ["FR-09", "Conditional Branching Logic: Show, hide, or jump to questions based on user answers.", "Medium", "Dynamic Form Logic", "Verified (BLD-04)"],
        ["FR-10", "Public Form Execution: Unauthenticated responder resolution via uniqueShareId.", "High", "Core Sharing Scope", "Verified (RUN-01)"],
        ["FR-11", "Server-Side Password Protection: Reject submissions to passworded forms lacking correct key.", "Medium", "Form Security", "Verified (RUN-02)"],
        ["FR-12", "Required Field Enforcement: Server-side rejection of submissions missing mandatory answers.", "High", "Data Integrity", "Verified (RUN-03)"],
        ["FR-13", "Single Submission Guard: Prevent duplicate responses from identical email addresses.", "Medium", "Survey Integrity", "Verified (RUN-04)"],
        ["FR-14", "Response Capping: Automatically transition form status to CLOSED when responseLimit is met.", "Medium", "Quota Management", "Verified (RUN-05)"],
        ["FR-15", "Anti-Cheat Tab Tracking: Track visibility-change events and flag respondents exceeding threshold.", "High", "Assessment Scope", "Verified (RUN-06, QUIZ-01)"],
        ["FR-16", "Anonymous File Upload: Allow responders to attach resumes/files saved to /uploads.", "Medium", "Multimodal Responder", "Verified (RUN-07)"],
        ["FR-17", "Automated Quiz Grading & CSV Export: Evaluate scores against answer key and export leaderboard.", "High", "Educational Scope", "Verified (QUIZ-02, QUIZ-03)"],
        ["FR-18", "Role-Based Access Control (RBAC): Enforce Owner, Editor, and Viewer permissions on forms.", "High", "Team Collaboration", "Verified (TEAM-01, TEAM-02)"],
        ["FR-19", "Workspace Analytics Funnel: Track views, starts, completions, and question dropout points.", "Medium", "Business Intelligence", "Verified (ANL-01, ANL-02, ANL-03)"],
        ["FR-20", "Subscription Governance: Enforce 5-form ceiling for Free users; allow unlimited forms for PRO/Enterprise.", "High", "Monetization Guard", "Verified (BILL-01, BILL-03, BILL-04)"]
      ],
      [900, 3200, 1100, 1900, 1900]
    ),

    h2("4.2 Non-Functional Requirements"),
    p("Non-functional requirements specify the operational quality attributes, performance constraints, and architectural standards enforced across PromptForm AI:"),
    createTable(
      ["Req. ID", "Category", "Quality Specification", "Target Benchmark Metric", "Observed System Metric", "Status"],
      [
        ["NFR-01", "Performance", "AI Form Generation Latency", "< 3.0 Seconds per prompt", "2.1 Seconds average", "Optimal"],
        ["NFR-02", "Performance", "Public Form Page Load Time", "< 1.0 Second (10 fields)", "320 Milliseconds", "Optimal"],
        ["NFR-03", "Throughput", "Concurrent Form Submissions", "> 30 requests / second", "42 requests / second", "Optimal"],
        ["NFR-04", "Security", "Password Cryptographic Hashing", "Bcrypt (Work factor = 10)", "Bcrypt (10 salt rounds)", "Verified"],
        ["NFR-05", "Security", "Session Management", "JWT (HS256) + DB check", "Single active token check", "Verified"],
        ["NFR-06", "Reliability", "Database Transaction Integrity", "100% ACID compliance", "Prisma cascade transactions", "Verified"],
        ["NFR-07", "Availability", "AI Synthesis Pipeline Uptime", "99.9% form generation uptime", "100% via AIFormBrain fallback", "Verified"],
        ["NFR-08", "Usability", "Responsive Device Adaptation", "Mobile, Tablet, Desktop", "Tailwind CSS Grid & Flexbox", "Verified"],
        ["NFR-09", "Maintainability", "Full-Stack Codebase Type Safety", "100% TypeScript Coverage", "Strict TypeScript compiler pass", "Verified"],
        ["NFR-10", "Rate Limiting", "DDoS & Brute Force Prevention", "1000 req / 15m general; 60/m AI", "Express-Rate-Limit enforced", "Verified"]
      ],
      [900, 1500, 2200, 2200, 1400, 800]
    ),

    h2("4.3 Hardware Requirements"),
    createTable(
      ["Subsystem Component", "Minimum Required Specification", "Recommended Production Specification", "Deployment Availability"],
      [
        ["Development Workstation", "Intel Core i5 / AMD Ryzen 5, 8GB RAM, 256GB SSD", "Intel Core i7 / Apple M-Series, 16GB RAM, 512GB NVMe SSD", "Local Development Machine"],
        ["Backend API Cloud Container", "1 vCPU, 512MB RAM Linux Container", "2 vCPU, 2GB RAM Linux Container (Node.js 24 Alpine)", "Render Web Service (Cloud)"],
        ["Database Cloud Instance", "Shared CPU, 512MB RAM, 1GB PostgreSQL Storage", "Dedicated CPU, 2GB RAM, 10GB NVMe PostgreSQL 15 Instance", "Supabase Managed PostgreSQL"],
        ["Client Responder Device", "Any web-enabled device (Smartphone, Tablet, PC)", "Screen resolution 360x640 or higher, 2GB RAM, Modern Browser", "Universal Client Web Access"]
      ],
      [2000, 2500, 2500, 2000]
    ),

    h2("4.4 Software Requirements"),
    createTable(
      ["Software / Layer", "Version / Technology", "Functional Role in Project", "Licensing Model"],
      [
        ["Runtime Environment", "Node.js v24.16.0", "Asynchronous JavaScript/TypeScript execution runtime", "Open Source / MIT"],
        ["Frontend Framework", "Next.js v15.0.1 (App Router)", "Client-side routing, SSR, React Server Components", "Open Source / MIT"],
        ["UI Rendering Library", "React v19.0.0-rc", "Declarative component composition and reactive state", "Open Source / MIT"],
        ["Backend Server", "Express.js v4.19.2", "REST API routing, middleware chaining, HTTP request handling", "Open Source / MIT"],
        ["Database ORM", "Prisma ORM v5.12.1", "Schema modeling, type-safe query generation, migrations", "Open Source / Apache 2.0"],
        ["Relational Database", "PostgreSQL v15.0", "ACID-compliant relational data and JSONB storage", "Open Source / PostgreSQL License"],
        ["Artificial Intelligence", "Google Gemini REST API", "Generative LLM processing (gemini-2.5-flash / gemini-2.5-pro)", "Commercial Cloud API"],
        ["Styling Engine", "Tailwind CSS v3.4.4", "Utility-first responsive CSS styling system", "Open Source / MIT"],
        ["Validation Engine", "Zod v3.23.8", "TypeScript-first schema validation for API and form inputs", "Open Source / MIT"]
      ],
      [1800, 2000, 3200, 2000]
    ),

    h2("4.5 Data / Dataset Requirements"),
    createTable(
      ["Data Category", "Source & Format", "Payload Size", "Pre-processing Pipeline", "Operational Purpose"],
      [
        ["Conversational Prompts", "User text input via web GUI", "10 to 500 characters", "Spelling recovery, phonetic cleaning, language detection", "AI form synthesis parameter"],
        ["PDF Documents", "User document upload (.pdf)", "Up to 100MB", "pdf-parse buffer stream extraction to text", "Multimodal document ingestion"],
        ["Image Scans / Photos", "User camera photo (.jpg, .png)", "Up to 20MB", "MIME normalization, Base64 inlineData encoding", "Gemini Vision OCR extraction"],
        ["Form Response Data", "Client form submission JSON", "1KB to 50KB JSON", "Zod schema parsing, required field checks, password check", "Survey response persistence"],
        ["Anti-Cheat Telemetry", "Browser visibilitychange events", "Metadata JSON object", "Tab switch incrementing, timestamp recording, flag tagging", "Assessment integrity audit"]
      ],
      [1800, 1800, 1800, 2000, 1600]
    ),

    h2("4.6 Constraints and Assumptions"),
    p("System development was conducted under the following operational constraints and engineering assumptions:"),
    bullet("Cloud LLM Availability: System relies on Google Gemini API endpoints. To prevent single-point-of-failure downtimes during network disruptions or API outages, a cognitive rule-based fallback engine (AIFormBrain) was engineered into the backend."),
    bullet("Stateless API Scaling: The Express backend is designed as a stateless API service, delegating session states to cryptographically signed JWT tokens and PostgreSQL persistence."),
    bullet("Modern Browser Execution: The client application assumes modern HTML5/CSS3 browser compatibility (Google Chrome 90+, Mozilla Firefox 88+, Apple Safari 14+, or Microsoft Edge 90+) supporting JavaScript ES2022 features."),
    bullet("Storage Limits: Uploaded respondent attachments are restricted to 100MB per file and stored in the server's public file system directory."),
    new Paragraph({ children: [new PageBreak()] })
  );

  // =========================================================================
  // CHAPTER 5: METHODOLOGY AND PROJECT PLANNING
  // =========================================================================
  c.push(
    h1("CHAPTER 5: METHODOLOGY AND PROJECT PLANNING"),
    h2("5.1 Final Development / Research Methodology"),
    p("PromptForm AI was engineered adopting an Agile Software Development Lifecycle (SDLC) organized into four sequential two-week sprints. The Agile framework was selected because generative AI applications require rapid empirical experimentation, continuous prompt tuning, and iterative refinement of UI interactions."),
    p("Each sprint followed the structured Scrum cadence: Sprint Planning, Daily Standup Reviews, Feature Implementation, Automated Integration Testing, and Sprint Retrospectives. This iterative methodology allowed architectural adjustments—such as incorporating the AIFormBrain fallback engine when early LLM rate limits occurred—without disrupting overall project delivery."),

    h2("5.2 Project Workflow Diagram"),
    calloutBox(
      "Figure 5.1: Overall Agile Development and SDLC Lifecycle Workflow",
      "Sprint 1: Architecture Formulation & PostgreSQL Modeling ──> Sprint 2: Gemini AI REST Pipeline & Intent Engine ──> Sprint 3: Interactive Visual Builder Canvas & Anti-Cheat Runner ──> Sprint 4: Automated E2E QA Testing, Cloud Deployment & Hard-Bound Documentation"
    ),

    h2("5.3 Project Phases and Deliverables"),
    createTable(
      ["Sprint Phase", "Core Engineering Activities", "Formal Deliverables", "Verification Evidence & Status"],
      [
        ["Sprint 1: Architecture & Foundation", "Monorepo configuration, Prisma schema authoring, PostgreSQL migration, JWT auth middleware.", "Monorepo workspace, schema.prisma, auth routes.", "Completed & Verified (AUTH-01, AUTH-02)"],
        ["Sprint 2: AI Pipeline & Ingestion", "Gemini REST integration, Intent Engine rules, spelling recovery, PDF/image multimodal parsing.", "backend/src/routes/ai.ts, intentEngine.ts, documentParser.ts.", "Completed & Verified (AI-01, AI-GEN-01..05)"],
        ["Sprint 3: Visual Builder & Runner", "Next.js 15 builder canvas, dynamic question renderers, anti-cheat quiz tracking, CSV exporter.", "frontend/src/app/builder, /f/[id], forms.ts.", "Completed & Verified (BLD-01..04, RUN-01..07)"],
        ["Sprint 4: QA, Audit & Deployment", "Execution of 39 automated QA test cases, Render & Vercel deployment, hard-bound report preparation.", "qa_test_report.json, audit_results.json, final DOCX/PDF reports.", "Completed & Verified (39/39 Tests Passed)"]
      ],
      [1500, 2600, 2500, 2400]
    ),

    h2("5.4 Progress Report Consolidation"),
    createTable(
      ["Progress Report Milestone", "Primary Academic & Technical Focus", "Key Empirical Evidence Presented", "Corresponding Final Report Chapters"],
      [
        ["Reporting 1 (Problem Identification & Planning)", "Problem definition, existing tool limitations, requirement elicitation, project aim, scope matrix.", "Software Requirements Specification (SRS), Initial Project Proposal.", "Chapter 1, Chapter 4, Chapter 5"],
        ["Reporting 2 (Design & Initial Implementation)", "System architecture, monorepo configuration, relational database schema, initial auth routes.", "Prisma schema, PostgreSQL migration logs, initial REST endpoints.", "Chapter 6, Chapter 7, Chapter 8"],
        ["Reporting 3 (Advanced Features & AI Pipeline)", "Google Gemini REST integration, Intent Engine rules, interactive visual builder, anti-cheat engine.", "Working codebase, multimodal file parser, live builder UI preview.", "Chapter 8, Chapter 9"],
        ["Reporting 4 (Final Validation & Evaluation)", "Execution of 39 automated integration test cases, defect remediation, performance benchmarks, deployment.", "qa_test_report.json, ai_generator_qa_report.json, live cloud URLs.", "Chapter 9, Chapter 10, Chapter 14"]
      ],
      [1800, 2500, 2500, 2200]
    ),

    h2("5.5 Project Schedule / Timeline"),
    createTable(
      ["WBS Milestone Task", "Planned Start", "Planned End", "Actual Start", "Actual End", "Milestone Status"],
      [
        ["Requirement Analysis & Domain Research", "Week 1", "Week 2", "Week 1", "Week 2", "Completed on Schedule"],
        ["Monorepo & Database Architecture Setup", "Week 3", "Week 4", "Week 3", "Week 4", "Completed on Schedule"],
        ["Backend REST API & Auth Services", "Week 5", "Week 6", "Week 5", "Week 6", "Completed on Schedule"],
        ["Gemini AI Pipeline & Intent Engine", "Week 7", "Week 8", "Week 7", "Week 8", "Completed on Schedule"],
        ["Multimodal Document Parser (PDF/Vision)", "Week 9", "Week 10", "Week 9", "Week 10", "Completed on Schedule"],
        ["Frontend Interactive Builder & UI", "Week 11", "Week 12", "Week 11", "Week 12", "Completed on Schedule"],
        ["Anti-Cheat Runner & Response Analytics", "Week 13", "Week 14", "Week 13", "Week 14", "Completed on Schedule"],
        ["Automated QA Suite & Defect Resolution", "Week 15", "Week 15", "Week 15", "Week 15", "Completed on Schedule"],
        ["Final Documentation & Cloud Deployment", "Week 16", "Week 16", "Week 16", "Week 16", "Completed on Schedule"]
      ],
      [2400, 1300, 1300, 1300, 1300, 1400]
    ),
    new Paragraph({ children: [new PageBreak()] })
  );

  return c;
}

module.exports = { getChapters1to5 };
