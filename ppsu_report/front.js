// Acknowledgement, abstract and abbreviation list.
exports.ack = M => [
  `I express my sincere gratitude to ${M.company} for giving me the opportunity to carry out the project “${M.title}” as part of my Internship / UDP / Training, and for providing the development environment, tools and real-world problem context that shaped this work.`,
  `I am deeply thankful to my company mentor, ${M.mentorCompany}, for continuous technical guidance, code reviews and practical advice on architecture, deployment and product quality throughout the project. Their feedback during each progress review helped convert an initial prototype into a production-ready platform.`,
  `I am equally grateful to my institute mentor, ${M.mentorInstitute}, School of Engineering, P P Savani University, for academic supervision, for reviewing the four progress reports, and for valuable suggestions on documentation, testing methodology and report presentation.`,
  'I thank the Head of the Department, the faculty members of the School of Engineering and the Training and Placement cell of P P Savani University for the structured internship framework, timely evaluations and constant encouragement.',
  'I also acknowledge the open-source communities behind Next.js, React, Express, Prisma, PostgreSQL and the Google Gemini API, whose documentation and tools made this project possible. Finally, I thank my family and friends for their patience, motivation and support during the entire internship period.',
];

exports.abstract = () => ({
  body: [
    'Online forms are the most common way for organisations to collect registrations, feedback, quiz answers, patient intake details and survey data. Existing form builders such as Google Forms, Microsoft Forms, Typeform and Jotform require the author to add every field manually, choose input types, write options, configure validation and design the theme. For a typical 8–10 question form this takes 15–30 minutes and frequently produces inconsistent field types, missing validations and poor respondent experience. Paper forms that already exist in an organisation must also be retyped by hand.',
    'This project presents **PromptForm AI**, a full-stack Software-as-a-Service (SaaS) platform that generates complete, editable and shareable web forms from a natural-language prompt or from an uploaded document (PDF, DOCX, spreadsheet or image). The objectives were to reduce form creation time to seconds, select correct field types and validations automatically, support quizzes with scoring and anti-cheat controls, and provide response analytics and team collaboration in one product.',
    'The system follows a three-tier architecture developed in a TypeScript monorepo using an Agile, sprint-based methodology. The presentation tier is built with Next.js 15, React 19, Tailwind CSS and Zustand; the application tier is an Express 4 REST API secured by JWT authentication, bcrypt password hashing, Helmet, CORS and rate limiting; the data tier uses PostgreSQL through Prisma ORM with 16 relational models. Generation is handled by a hybrid engine: a deterministic rule-based “AIFormBrain” (intent, language, domain and industry detection, field intelligence, quiz engine and quality reviewer) combined with Google Gemini large language models through a five-model fallback chain with JSON-schema output.',
    'The platform was verified with 50 automated test cases — 39 platform QA tests covering authentication, forms, submissions, teams, analytics and security, and 11 AI-generation tests covering text, quiz, survey, PDF and image inputs, credit limits and plan limits. All tests passed after nine defects identified during QA were fixed and re-verified. A form that takes about 20 minutes to build manually is produced by PromptForm AI in under 10 seconds, published immediately with a unique share link, and can be refined in a drag-and-drop visual builder.',
    'The project demonstrates that combining deterministic domain rules with LLM generation yields reliable, structured output suitable for production use. The platform was deployed on Vercel (frontend) and Render (backend) with a managed PostgreSQL database, and it provides a strong foundation for future features such as payments, conditional-logic generation and multilingual voice input.',
  ],
  keywords: 'Generative AI, Form Builder, Large Language Models, Google Gemini, Next.js, Express, Prisma ORM, PostgreSQL, SaaS, Prompt Engineering',
});

exports.abbreviations = [
  ['AI', 'Artificial Intelligence'], ['API', 'Application Programming Interface'], ['APA', 'American Psychological Association (citation style)'],
  ['CDN', 'Content Delivery Network'], ['CORS', 'Cross-Origin Resource Sharing'], ['CRUD', 'Create, Read, Update, Delete'], ['CSV', 'Comma-Separated Values'],
  ['CSS', 'Cascading Style Sheets'], ['DB', 'Database'], ['DFD', 'Data Flow Diagram'], ['DOCX', 'Microsoft Word Open XML Document'], ['ER', 'Entity–Relationship'],
  ['FR', 'Functional Requirement'], ['HTML', 'HyperText Markup Language'], ['HTTP(S)', 'HyperText Transfer Protocol (Secure)'], ['IDE', 'Integrated Development Environment'],
  ['JSON', 'JavaScript Object Notation'], ['JWT', 'JSON Web Token'], ['LLM', 'Large Language Model'], ['MCQ', 'Multiple Choice Question'], ['NFR', 'Non-Functional Requirement'],
  ['NLP', 'Natural Language Processing'], ['OCR', 'Optical Character Recognition'], ['ORM', 'Object–Relational Mapping'], ['PDF', 'Portable Document Format'],
  ['QA', 'Quality Assurance'], ['REST', 'Representational State Transfer'], ['RTL', 'Right-to-Left (text direction)'], ['SaaS', 'Software as a Service'], ['SDLC', 'Software Development Life Cycle'],
  ['SMTP', 'Simple Mail Transfer Protocol'], ['SQL', 'Structured Query Language'], ['SSR', 'Server-Side Rendering'], ['UAT', 'User Acceptance Testing'], ['UDP', 'University Defined Project'],
  ['UI / UX', 'User Interface / User Experience'], ['UML', 'Unified Modeling Language'], ['URL', 'Uniform Resource Locator'], ['UUID', 'Universally Unique Identifier'], ['XLSX', 'Microsoft Excel Open XML Spreadsheet'],
];
