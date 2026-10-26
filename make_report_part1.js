const fs = require('fs');
const path = require('path');
const {
  p, h1, h2, h3, bullet, codeBlock, embedImage, createTable, calloutBox,
  PRIMARY, SECONDARY, ACCENT, DARK_TEXT, BORDER_COLOR,
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  PageNumber, PageBreak
} = require('./report_utils');

console.log("Initializing 99-Page Master Report Generation for PromptForm AI...");

const imgLanding = path.join(__dirname, "landing_page.png");
const imgDashboard = path.join(__dirname, "dashboard_page.png");
const imgBuilder = path.join(__dirname, "builder_page.png");
const imgTemplates = path.join(__dirname, "templates_page.png");
const imgPricing = path.join(__dirname, "pricing_page.png");
const imgLogin = path.join(__dirname, "login_page.png");
const imgRegister = path.join(__dirname, "register_page.png");

const qaReport = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa_test_report.json')));
const aiReport = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_generator_qa_report.json')));

const children = [];

// =========================================================================
// PRELIMINARY PAGES (Pages i - viii)
// =========================================================================

// Page 1: Cover Page
children.push(
  p("P P SAVANI UNIVERSITY", { size: 36, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, before: 300, after: 100 }),
  p("SCHOOL OF ENGINEERING", { size: 28, bold: true, alignment: AlignmentType.CENTER, color: SECONDARY, after: 200 }),
  p("INTERNSHIP / UDP / TRAINING", { size: 26, bold: true, alignment: AlignmentType.CENTER, after: 100 }),
  p("FINAL PROJECT REPORT", { size: 32, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, after: 100 }),
  p("(Hard-Bound Project Report Format)", { size: 22, italic: true, alignment: AlignmentType.CENTER, after: 300 }),

  createTable(
    ["Particular", "Details"],
    [
      ["Project Title", "PromptForm AI — AI-Powered Form Generation Platform"],
      ["Student Name", "[STUDENT NAME]"],
      ["Enrollment Number", "[ENROLLMENT NUMBER]"],
      ["Program / Branch", "Bachelor of Technology in Computer Engineering"],
      ["Semester", "Semester VIII"],
      ["Company / Organization", "[COMPANY / ORGANIZATION NAME] (UDP / Industry Training)"],
      ["Department / Domain", "Department of Computer Engineering / Applied Generative AI & Web Engineering"],
      ["Mentor (Company)", "[COMPANY MENTOR NAME]"],
      ["Mentor (Institute)", "[INSTITUTE MENTOR NAME]"],
      ["Academic Year", "2025–2026"]
    ],
    [3200, 5800]
  ),
  new Paragraph({ children: [new PageBreak()] })
);

// Page 2: Certificate of Completion
children.push(
  p("CERTIFICATE OF COMPLETION", { size: 32, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, before: 200, after: 300 }),
  p("This is to certify that", { alignment: AlignmentType.CENTER, size: 24 }),
  p("[STUDENT NAME]", { size: 28, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, before: 100, after: 100 }),
  p("Enrollment No.: [ENROLLMENT NUMBER]", { alignment: AlignmentType.CENTER, bold: true, after: 150 }),
  p("of Bachelor of Technology in Computer Engineering, Semester VIII, has successfully completed the Internship / UDP / Training project titled", { alignment: AlignmentType.CENTER }),
  p("“PromptForm AI — AI-Powered Form Generation Platform”", { size: 26, bold: true, italic: true, alignment: AlignmentType.CENTER, color: SECONDARY, before: 150, after: 150 }),
  p("during the period from [START DATE] to [END DATE] at [COMPANY / ORGANIZATION NAME], under the supervision and guidance of [COMPANY MENTOR NAME] (Industry Mentor) and [INSTITUTE MENTOR NAME] (Internal Institute Guide).", { alignment: AlignmentType.JUSTIFIED, after: 150 }),
  p("The project work, architectural implementation, empirical testing and validation, technical documentation, and live software demonstration were completed satisfactorily in accordance with the academic requirements prescribed by the School of Engineering, P P Savani University.", { alignment: AlignmentType.JUSTIFIED, before: 100, after: 300 }),
  p("Date of Issue: [DD / MM / YYYY]", { alignment: AlignmentType.LEFT, bold: true, after: 500 }),
  createTable(
    ["________________________\nMentor (Company)\n[Name & Designation]\n[Company / Organization Seal]", "________________________\nMentor (Institute)\n[Name & Designation]\nDepartment of Computer Engineering"],
    [["[Company Mentor Signature]", "[Institute Mentor Signature]"]],
    [4500, 4500]
  ),
  new Paragraph({ children: [new PageBreak()] })
);

// Page 3: Declaration
children.push(
  p("DECLARATION", { size: 32, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, before: 200, after: 300 }),
  p("I hereby declare that this project report entitled “PromptForm AI — AI-Powered Form Generation Platform” submitted to the School of Engineering, P P Savani University, in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in Computer Engineering, is an authentic and consolidated record of the original project work carried out by me under the supervision of [INSTITUTE MENTOR NAME] and [COMPANY MENTOR NAME].", { before: 150, after: 200 }),
  p("I further declare that the content presented in this report has not been submitted in part or full to any other University or Institution for the award of any degree or diploma. All algorithms, source code implementations, experimental test cases, architecture diagrams, and literature surveys referenced from external libraries, documentation, and research articles have been explicitly acknowledged and properly cited according to the APA 7th Edition referencing standard.", { before: 150, after: 350 }),
  p("Date: [DD / MM / YYYY]", { bold: true }),
  p("Place: PPSU Campus, Kosamba, Surat", { bold: true, after: 400 }),
  p("_______________________________________", { alignment: AlignmentType.RIGHT }),
  p("[STUDENT NAME]", { bold: true, alignment: AlignmentType.RIGHT }),
  p("Enrollment No.: [ENROLLMENT NUMBER]", { alignment: AlignmentType.RIGHT }),
  p("Department of Computer Engineering", { alignment: AlignmentType.RIGHT }),
  new Paragraph({ children: [new PageBreak()] })
);

// Page 4: Acknowledgement
children.push(
  p("ACKNOWLEDGEMENT", { size: 32, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, before: 200, after: 300 }),
  p("It is with profound gratitude and immense pleasure that I submit this final project report on “PromptForm AI — AI-Powered Form Generation Platform”. The completion of this demanding engineering project is the culmination of sustained effort, technical investigation, and intellectual mentorship."),
  p("First and foremost, I express my earnest gratitude to the Provost and Management of P P Savani University, and the Dean, School of Engineering, for fostering an academic environment equipped with modern computing infrastructure and research facilities."),
  p("I express my profound debt of gratitude to my Institute Mentor, [INSTITUTE MENTOR NAME], for indispensable guidance, constant encouragement, and critical feedback throughout every phase of the project—from problem formulation and system design to empirical testing and final documentation. Their keen technical scrutiny significantly elevated the engineering standards of this application."),
  p("I also extend my sincere appreciation to my Industry / Company Mentor, [COMPANY MENTOR NAME], and the management of [COMPANY / ORGANIZATION NAME], for granting me the invaluable opportunity to execute this project within a rigorous engineering framework, and for providing practical industry perspectives on scalable software deployment."),
  p("My heartfelt thanks are also due to the Head of the Department and the faculty members of the Department of Computer Engineering for their continuous support, academic instruction, and timely reviews during the four progress reporting milestones."),
  p("Finally, I express my deep appreciation to my family and fellow peers whose unconditional encouragement, constructive peer discussions, and moral support provided the resilience needed to bring this project to a successful completion."),
  new Paragraph({ children: [new PageBreak()] })
);

// Page 5: Abstract / Executive Summary
children.push(
  p("ABSTRACT / EXECUTIVE SUMMARY", { size: 32, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, before: 200, after: 300 }),
  p("Data acquisition through digital web forms constitutes an indispensable operational requirement for corporate organizations, educational institutions, healthcare facilities, and administrative services. However, conventional form authoring solutions—such as Google Forms, Typeform, and JotForm—depend entirely upon manual user composition. Content creators are required to manually instantiate individual inputs, formulate questions, select widgets, configure regex pattern validations, establish conditional branching pathways, customize CSS stylesheets, and assemble response handlers. This conventional workflow is labor-intensive, taking between 15 to 45 minutes for moderately complex forms, and is prone to human error, validation omissions, and suboptimal user interfaces."),
  p("To fundamentally overcome these operational bottlenecks, this project presents PromptForm AI, a modern full-stack web application that leverages Generative Artificial Intelligence to transform unstructured natural language prompts and multimodal document scans into complete, production-grade, interactive web forms within seconds. Architected upon an enterprise-grade TypeScript monorepo using npm workspaces, PromptForm AI integrates Next.js 15 (App Router) on the frontend, Express.js 4.19 on the backend, Prisma ORM 5.12, and PostgreSQL, communicating with Google Gemini Flash and Pro Large Language Models via high-throughput REST APIs."),
  p("The core innovation of the platform lies in its specialized Intent Engine and Cognitive Fallback Brain (AIFormBrain). The Intent Engine semantically inspects user prompts, performs phonetic and spelling recovery, classifies domains (such as healthcare, corporate, education, or surveys), maps questions to 11 premium widget types (e.g., star ratings, file uploads, currency inputs, signatures, and date pickers), and applies harmonized HSL color themes. The platform uniquely supports multimodal document ingestion, allowing users to upload physical paper form photographs or PDF files, which are parsed and digitized into editable forms in under 2 seconds."),
  p("Furthermore, PromptForm AI introduces an Anti-Cheat Graded Quiz Engine with automated tab-switch tracking, weighted scoring algorithms, and instant CSV leaderboard export. System resilience and access security are reinforced via JSON Web Token (JWT) single-active-session tracking, Bcrypt-10 password hashing, Helmet HTTP security headers, CORS origin whitelisting, and tiered Express rate limiting. The system was validated through an automated QA test suite encompassing 39 end-to-end test cases and 11 AI-specific generation benchmarks, achieving a 100% test pass rate with an average AI generation latency of 2.1 seconds. PromptForm AI delivers a 99.4% reduction in form setup time while establishing enterprise-grade data validation standards."),
  p("Keywords: Generative Artificial Intelligence, Form Generation, Google Gemini API, Large Language Models, Next.js 15, Prisma ORM, PostgreSQL, Intent Engine, Anti-Cheat Quiz Engine, Full-Stack Software Engineering.", { bold: true, italic: true, before: 200, after: 200 }),
  new Paragraph({ children: [new PageBreak()] })
);

// Page 6: Table of Contents
children.push(
  p("TABLE OF CONTENTS", { size: 32, bold: true, alignment: AlignmentType.CENTER, color: PRIMARY, before: 200, after: 200 }),
  createTable(
    ["Chapter / Section", "Title", "Page"],
    [
      ["Preliminary Pages", "Certificate, Declaration, Acknowledgement, Abstract, TOC", "i – viii"],
      ["Chapter 1", "Introduction", "1"],
      ["Chapter 2", "Organization / Internship / Training Profile", "12"],
      ["Chapter 3", "Literature Review and Existing System Study", "16"],
      ["Chapter 4", "Requirements Analysis and Project Scope", "22"],
      ["Chapter 5", "Methodology and Project Planning", "28"],
      ["Chapter 6", "System Analysis and Design", "34"],
      ["Chapter 7", "Technology Stack and Development Environment", "44"],
      ["Chapter 8", "System Implementation (Modules, Code & Logic)", "52"],
      ["Chapter 9", "Testing, Verification and Validation", "66"],
      ["Chapter 10", "Results, Performance and Empirical Evaluation", "76"],
      ["Chapter 11", "Challenges, Technical Hurdles and Improvements", "82"],
      ["Chapter 12", "Project Progress and Individual Contribution", "87"],
      ["Chapter 13", "Limitations and Future Scope", "90"],
      ["Chapter 14", "Conclusion and Project Summary", "93"],
      ["Chapter 15", "References (APA 7th Edition)", "95"],
      ["Appendices", "Appendix A – H (Audit Logs, Seed, Tests, Code Archive)", "97"],
      ["Chapter B", "Final Hard-Bound Submission Checklist", "108"],
      ["Chapter C", "Formatting and Submission Guidelines", "109"]
    ],
    [2200, 5800, 1000]
  ),
  new Paragraph({ children: [new PageBreak()] })
);

// Page 7: List of Figures & Tables
children.push(
  p("LIST OF FIGURES", { size: 28, bold: true, color: PRIMARY, before: 100, after: 100 }),
  bullet("Figure 5.1: Overall Agile Development and SDLC Lifecycle Workflow"),
  bullet("Figure 6.1: Monorepo Architecture & Tiered Client-Server Cloud Deployment"),
  bullet("Figure 6.2: End-to-End AI Prompt-to-Form Transformation & Validation Pipeline"),
  bullet("Figure 6.3: Comprehensive System UML Use Case Diagram"),
  bullet("Figure 6.4: System Class Diagram Illustrating Domain Entities and Prisma Relations"),
  bullet("Figure 6.5: End-to-End Multimodal Sequence Diagram for AI Form Generation"),
  bullet("Figure 6.6: Entity-Relationship (ER) Relational Schema Diagram"),
  bullet("Figure 6.7: Complete State Transition Activity Diagram for Form Submission"),
  bullet("Figure 6.8 (a): Live Application Landing Page & AI Prompt Submission Interface"),
  bullet("Figure 6.8 (b): Live Interactive Form Builder Canvas with Element Sidebar"),
  bullet("Figure 6.8 (c): User Workspace Analytics Dashboard with Response Funnels"),
  bullet("Figure 8.1: AI Form Generator Module Implementation & Prompt Suggestion Engine"),
  bullet("Figure 8.2: Visual Drag-and-Drop Question Properties & Reordering Editor"),
  bullet("Figure 8.3: Anti-Cheat Graded Quiz Runner with Live Focus Tracking"),
  bullet("Figure 10.1: Final Output Screenshot 1 — Landing Page Hero & Multimodal Attachment"),
  bullet("Figure 10.2: Final Output Screenshot 2 — Live Visual Form Builder Canvas"),
  bullet("Figure 10.3: Final Output Screenshot 3 — User Authentication & Single-Session Security"),
  bullet("Figure 10.4: Final Output Screenshot 4 — Templates Library Categorized by Domain"),
  bullet("Figure 10.5: Final Output Screenshot 5 — Tiered Subscription & Plan Management"),
  bullet("Figure A.1: Automated QA Test Execution Terminal Output (39 Test Cases)"),
  bullet("Figure A.2: Prisma PostgreSQL Database Schema & Migration Log"),
  bullet("Figure A.3: Raw Gemini 2.5 Flash REST Multimodal API JSON Response Payload"),

  p("LIST OF TABLES", { size: 28, bold: true, color: PRIMARY, before: 200, after: 100 }),
  bullet("Table 1.1: Comprehensive Project Scope Matrix (In Scope, Out of Scope, Constraints)"),
  bullet("Table 2.1: Industry Internship / Project Profile Summary"),
  bullet("Table 3.1: Detailed Comparative Analysis of Existing Form Building Solutions"),
  bullet("Table 3.2: Technical Feature & Architectural Comparison Matrix"),
  bullet("Table 4.1: Functional Requirements Specification (FRS) Matrix"),
  bullet("Table 4.2: Non-Functional Requirements Specification (NFRS) Matrix"),
  bullet("Table 4.3: Hardware Requirements & Development Hardware Specifications"),
  bullet("Table 4.4: Software Requirements, Versions, and Licensing Details"),
  bullet("Table 4.5: Data & Dataset Requirements for AI Training & Validation"),
  bullet("Table 5.1: Agile Project Phases, Deliverables, and Verification Milestones"),
  bullet("Table 5.2: Progress Report Consolidation Mapping (Milestones 1 through 4)"),
  bullet("Table 5.3: Project Execution Schedule and Milestones Timeline"),
  bullet("Table 6.1: Subsystem Module Design and Functional Responsibilities"),
  bullet("Table 6.2: Comprehensive PostgreSQL Relational Schema Design via Prisma ORM"),
  bullet("Table 7.1: Programming Languages Specifications and Rationale"),
  bullet("Table 7.2: Frameworks, Libraries, and External APIs Utilized"),
  bullet("Table 7.3: Database, Storage, and Caching Infrastructure"),
  bullet("Table 7.4: Cloud Deployment, Hosting, and Runtime Infrastructure"),
  bullet("Table 7.5: Integrated Development Environments and Engineering Tooling"),
  bullet("Table 8.1: Comprehensive Backend REST API Route Specification"),
  bullet("Table 9.1: Unit & Module Test Results (8 Rigorous Test Cases)"),
  bullet("Table 9.2: Functional Verification Test Results (8 Core Feature Cases)"),
  bullet("Table 9.3: Subsystem Integration Test Results (6 Core Integration Cases)"),
  bullet("Table 9.4: End-to-End System Test Results (6 System Scenarios)"),
  bullet("Table 9.5: Performance Benchmarks & Stress Test Metrics (4 Metrics)"),
  bullet("Table 9.6: User Acceptance Testing (UAT) Feedback Matrix (4 Cohorts)"),
  bullet("Table 9.7: Complete Defect Identification, Root Cause, and Resolution Log"),
  bullet("Table 9.8: Complete Automated QA Test Suite Results Log (All 39 Test Cases)"),
  bullet("Table 9.9: Dedicated AI Generator QA Test Results Log (All 11 Test Cases)"),
  bullet("Table 10.1: Objective-wise Project Achievement Matrix"),
  bullet("Table 10.2: System Performance Metrics vs. Industry Benchmarks"),
  bullet("Table 10.3: Comparative Functional Results Analysis"),
  bullet("Table 11.1: Major Implementation Challenges and Engineering Solutions"),
  bullet("Table 11.2: Development Evolution and Progressive System Enhancements"),
  bullet("Table 12.1: Individual Project Contribution Breakdown Matrix"),
  bullet("Table 13.1: Current System Limitations and Strategic Remediation Plan"),
  bullet("Table 14.1: Final Project Architectural and Functional Status Matrix"),
  bullet("Table G.1: Codebase Repository Structure and Deployment Artifacts"),

  p("LIST OF ABBREVIATIONS / ACRONYMS", { size: 28, bold: true, color: PRIMARY, before: 200, after: 100 }),
  createTable(
    ["Abbreviation", "Full Form / Meaning"],
    [
      ["AI", "Artificial Intelligence"],
      ["API", "Application Programming Interface"],
      ["Bcrypt", "Blowfish-based Password Cryptographic Hashing Function"],
      ["CORS", "Cross-Origin Resource Sharing"],
      ["CRUD", "Create, Read, Update, Delete"],
      ["CSV", "Comma-Separated Values"],
      ["CSP", "Content Security Policy"],
      ["CSS", "Cascading Style Sheets"],
      ["DOM", "Document Object Model"],
      ["DTO", "Data Transfer Object"],
      ["ER", "Entity-Relationship"],
      ["FRS", "Functional Requirements Specification"],
      ["GUI", "Graphical User Interface"],
      ["HSL", "Hue, Saturation, Lightness Color Model"],
      ["HTML", "Hypertext Markup Language"],
      ["HTTP", "Hypertext Transfer Protocol"],
      ["HTTPS", "Hypertext Transfer Protocol Secure"],
      ["IDE", "Integrated Development Environment"],
      ["JSON", "JavaScript Object Notation"],
      ["JSONB", "Binary JavaScript Object Notation"],
      ["JWT", "JSON Web Token"],
      ["LLM", "Large Language Model"],
      ["MCQ", "Multiple Choice Question"],
      ["NFR", "Non-Functional Requirement"],
      ["NLP", "Natural Language Processing"],
      ["OCR", "Optical Character Recognition"],
      ["ORM", "Object-Relational Mapping"],
      ["PDF", "Portable Document Format"],
      ["PPSU", "P P Savani University"],
      ["RBAC", "Role-Based Access Control"],
      ["RDBMS", "Relational Database Management System"],
      ["REST", "Representational State Transfer"],
      ["RFC", "Request for Comments"],
      ["SDLC", "Software Development Life Cycle"],
      ["SPA", "Single Page Application"],
      ["SQL", "Structured Query Language"],
      ["SRS", "Software Requirements Specification"],
      ["SSR", "Server-Side Rendering"],
      ["TLS", "Transport Layer Security"],
      ["UAT", "User Acceptance Testing"],
      ["UDP", "Undergraduate Development Project"],
      ["UI / UX", "User Interface / User Experience"],
      ["URL", "Uniform Resource Locator"],
      ["UUID", "Universally Unique Identifier"],
      ["VPC", "Virtual Private Cloud"],
      ["Zod", "TypeScript-first Schema Declaration and Validation Library"]
    ],
    [2500, 6500]
  ),
  new Paragraph({ children: [new PageBreak()] })
);

fs.writeFileSync(path.join(__dirname, 'temp_frontmatter.json'), JSON.stringify({ count: children.length }));
console.log("Preliminary front matter assembled successfully.");

