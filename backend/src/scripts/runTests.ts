import http from 'http';
import { db } from '../lib/db';
import { cache } from '../lib/cache';

// Import environment variables first
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TEST_PORT = 5055;
const TEST_HOST = '127.0.0.1';
const BASE_URL = `http://${TEST_HOST}:${TEST_PORT}`;

const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  status?: number;
  error?: string;
}

const results: TestResult[] = [];

function request(
  method: 'GET' | 'POST',
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
      ...headers,
    };

    const req = http.request(
      {
        hostname: TEST_HOST,
        port: TEST_PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 500, body: responseData }));
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log(`${COLORS.CYAN}==================================================${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}       PROMPTFORM AI INTEGRATION TESTS RUNNER     ${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}==================================================${COLORS.RESET}`);

  // Test 1: Welcome Route
  try {
    const res = await request('GET', '/');
    const isOk = res.status === 200 && res.body.includes('REST API Server is running');
    results.push({ name: 'GET Welcome Route (/)', passed: isOk, status: res.status });
  } catch (err: any) {
    results.push({ name: 'GET Welcome Route (/)', passed: false, error: err.message });
  }

  // Test 2: Liveness Probe
  try {
    const res = await request('GET', '/health/liveness');
    const isOk = res.status === 200 && JSON.parse(res.body).status === 'alive';
    results.push({ name: 'GET Liveness (/health/liveness)', passed: isOk, status: res.status });
  } catch (err: any) {
    results.push({ name: 'GET Liveness (/health/liveness)', passed: false, error: err.message });
  }

  // Test 3: Readiness Probe
  try {
    const res = await request('GET', '/health/readiness');
    const isOk = res.status === 200 && JSON.parse(res.body).status === 'ready';
    results.push({ name: 'GET Readiness (/health/readiness)', passed: isOk, status: res.status });
  } catch (err: any) {
    results.push({ name: 'GET Readiness (/health/readiness)', passed: false, error: err.message });
  }

  // Generate a random email for user tests
  const testEmail = `test_runner_${Date.now()}@test.com`;
  const testPassword = 'Password123!';
  let jwtToken = '';

  // Test 4: Auth Register Endpoint
  try {
    const res = await request('POST', '/api/auth/register', {
      email: testEmail,
      name: 'Integration Test Bot',
      password: testPassword,
    });
    const data = JSON.parse(res.body);
    const isOk = res.status === 201 && !!data.accessToken && !!data.user;
    results.push({ name: 'POST User Registration (/api/auth/register)', passed: isOk, status: res.status });
  } catch (err: any) {
    results.push({ name: 'POST User Registration (/api/auth/register)', passed: false, error: err.message });
  }

  // Test 5: Auth Login Endpoint
  try {
    const res = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    const data = JSON.parse(res.body);
    const isOk = res.status === 200 && !!data.accessToken;
    if (isOk) jwtToken = data.accessToken;
    results.push({ name: 'POST User Login (/api/auth/login)', passed: isOk, status: res.status });
  } catch (err: any) {
    results.push({ name: 'POST User Login (/api/auth/login)', passed: false, error: err.message });
  }

  // Test 6: Authenticated Profile Endpoint
  try {
    if (!jwtToken) throw new Error('Skipped: Login token missing');
    const res = await request('GET', '/api/auth/me', undefined, {
      Authorization: `Bearer ${jwtToken}`,
    });
    const data = JSON.parse(res.body);
    const isOk = res.status === 200 && data.email === testEmail;
    results.push({ name: 'GET User Profile (/api/auth/me)', passed: isOk, status: res.status });
  } catch (err: any) {
    results.push({ name: 'GET User Profile (/api/auth/me)', passed: false, error: err.message });
  }

  // Test 7: Multilingual Sifter Unit Tests
  try {
    const { detectLanguage, detectTranslationIntent, translateFormConfig } = require('../lib/intentEngine');
    
    // Check 7.1: Language Detection
    const langEng = detectLanguage("Create customer feedback form");
    const langGuj = detectLanguage("મને ગુજરાતી રિવ્યૂ ફોર્મ બનાવી આપો");
    const langHin = detectLanguage("हॉस्पिटल रजिस्ट्रेशन फॉर्म बनाओ");
    const langAra = detectLanguage("نموذج تعليقات العملاء");
    
    const detectionPassed = 
      langEng.lang === 'english' && !langEng.isRtl &&
      langGuj.lang === 'gujarati' && !langGuj.isRtl &&
      langHin.lang === 'hindi' && !langHin.isRtl &&
      langAra.lang === 'arabic' && langAra.isRtl;

    results.push({ name: 'Unit Check: Language & Script Detection', passed: detectionPassed, status: 200 });

    // Check 7.2: Translation Intent
    const transIntent = detectTranslationIntent("Translate this form to Hindi please");
    const transPassed = transIntent.isTranslation && transIntent.targetLang === 'hindi';
    
    results.push({ name: 'Unit Check: Translation Intent Recognition', passed: transPassed, status: 200 });

    // Check 7.3: Fallback Translation Dictionary
    const testConfig = {
      title: "Customer Feedback Form",
      description: "Please share details",
      questions: [
        { label: "Full Name", type: "short_text", required: true, options: [] },
        { label: "Email Address", type: "short_text", required: false, options: [] }
      ]
    };
    const translatedGuj = translateFormConfig(testConfig, "gujarati");
    const dictPassed = 
      translatedGuj.title === "ગ્રાહક પ્રતિસાદ ફોર્મ" &&
      translatedGuj.questions[0].label === "પૂરેપૂરું નામ" &&
      translatedGuj.questions[1].label === "ઈમેલ એડ્રેસ";

    results.push({ name: 'Unit Check: Dictionary Translation Fallback', passed: dictPassed, status: 200 });

    // Check 7.4: Greeting/Help Detection Check
    const { isGreetingOrHelp } = require('../lib/intentEngine');
    const greet1 = isGreetingOrHelp("hyyy");
    const greet2 = isGreetingOrHelp("hello!");
    const greet3 = isGreetingOrHelp("how are you?");
    const greet4 = isGreetingOrHelp("yo");
    const nonGreet = isGreetingOrHelp("Create hospital registration form");
    
    const greetingsPassed = greet1 && greet2 && greet3 && greet4 && !nonGreet;
    results.push({ name: 'Unit Check: Greeting & Help Intent Bypass', passed: greetingsPassed, status: 200 });

    // Check 7.5: Modular Knowledge Engine & DI Check
    const { KnowledgeEngine, LocalStaticKnowledgeProvider } = require('../lib/aiBrain/knowledgeEngine');
    const engine = new KnowledgeEngine([new LocalStaticKnowledgeProvider()]);
    const metadata = await engine.getDomainMetadata("quiz");
    const diPassed = 
      metadata.domain === "quiz" &&
      metadata.bestPracticeRules.length > 0 &&
      metadata.standardFields.length > 0;
    results.push({ name: 'Unit Check: DI & Provider Domain Metadata sifting', passed: diPassed, status: 200 });

    // Check 7.6: Smart Field Intelligence Engine Check
    const { SmartFieldIntelligenceEngine } = require('../lib/aiBrain/fieldIntelligence/fieldResolver');
    const fieldPlan = SmartFieldIntelligenceEngine.resolve("medical", "Healthcare", "Create hospital admission form");
    const intellectualPassed = 
      fieldPlan.domain === "medical" &&
      fieldPlan.sections.length > 0 &&
      fieldPlan.sections[0].fields.some((f: any) => f.label === "Patient Full Name") &&
      fieldPlan.sections[0].fields.some((f: any) => f.label === "Age" && f.readOnly === true) &&
      fieldPlan.suggestedAdditions.length > 0;
    results.push({ name: 'Unit Check: Smart Field Intelligence Engine & Skip Logic', passed: intellectualPassed, status: 200 });

    // Check 7.7: Enterprise Form Generation Engine Check
    const { EnterpriseFormGenerator } = require('../lib/aiBrain/formGeneration/formGenerator');
    const compiledForm = EnterpriseFormGenerator.generate(fieldPlan);
    const compilationPassed = 
      compiledForm.title.includes("Healthcare") &&
      compiledForm.layoutConfig.type === "stepper" &&
      compiledForm.questions.length > 0 &&
      compiledForm.questions.every((q: any) => q.accessibilityLabel !== undefined);
    results.push({ name: 'Unit Check: Enterprise Form Generation & Layout Steppers', passed: compilationPassed, status: 200 });

    // Check 7.8: Enterprise Quiz & Assessment Intelligence Engine Check
    const { EnterpriseQuizEngine } = require('../lib/aiBrain/quizEngine/index');
    const quizPlanResult = EnterpriseQuizEngine.resolve("quiz", "Create JavaScript programming certification quiz", compiledForm.questions);
    const quizEnginePassed = 
      quizPlanResult.domain === "quiz" &&
      quizPlanResult.questions.length > 0 &&
      quizPlanResult.questions[0].correctAnswer !== undefined &&
      quizPlanResult.questions[0].explanation !== undefined &&
      quizPlanResult.questions[0].bloomsTaxonomy === "understanding" &&
      quizPlanResult.certificateConfig.eligible === true &&
      quizPlanResult.leaderboardReady === true;
    results.push({ name: 'Unit Check: Enterprise Quiz & Assessment Cognitive mapping', passed: quizEnginePassed, status: 200 });

    // Check 7.9: Enterprise Document Intelligence Engine Check
    const { EnterpriseDocumentIntelligenceEngine } = require('../lib/aiBrain/documentIntelligence/index');
    const docParsed = EnterpriseDocumentIntelligenceEngine.resolveDocument(Buffer.from("dummy"), "patient_form.pdf");
    const docPassed = 
      docParsed.title === "Intelligent Mapped Form" &&
      docParsed.fields.length > 0 &&
      docParsed.fields.some((f: any) => f.label === "Patient Intake Form" || f.label === "Full Name") &&
      docParsed.workflow.complianceVerified === true;
    results.push({ name: 'Unit Check: Enterprise Document OCR & Workflow extracting', passed: docPassed, status: 200 });

    // Check 7.10: Enterprise AI Form Editing Engine Check
    const { EnterpriseFormEditor } = require('../lib/aiBrain/formEditor/index');
    const beforeEditForm = {
      title: "Before Edit Form",
      questions: [
        { type: "short_text", label: "Email Address", required: true, options: [] },
        { type: "short_text", label: "Old Phone", required: true, options: [] }
      ],
      theme: { primary_color: "#6366f1" }
    };
    const step1 = EnterpriseFormEditor.applyEdit(beforeEditForm, "Rename email to Work Email").formConfig;
    const step2 = EnterpriseFormEditor.applyEdit(step1, "Add GST Number");
    const editPassed = 
      step2.formConfig.questions.some((q: any) => q.label === "Work Email") &&
      step2.formConfig.questions.some((q: any) => q.label === "GST Number") &&
      step2.suggestions.length > 0;
    results.push({ name: 'Unit Check: Enterprise AI Form Surgical Editing & suggestions', passed: editPassed, status: 200 });

    // Check 7.11: Enterprise AI Quality Assurance & Self-Review Engine Check
    const { EnterpriseQualityReviewer } = require('../lib/aiBrain/qualityEngine/index');
    const dirtyForm = {
      title: "Dirty Hospital Registration Form",
      questions: [
        { type: "short_text", label: "Patient Name", required: true, options: [], accessibilityLabel: "" },
        { type: "short_text", label: "Patient Name", required: true, options: [] },
        { type: "short_text", label: "Contact Phone", required: true, options: [], validations: { pattern: "invalid(regex" } }
      ]
    };
    const reviewedForm = EnterpriseQualityReviewer.reviewAndImprove(dirtyForm);
    const qaPassed = 
      reviewedForm.qualityReport !== undefined &&
      reviewedForm.qualityReport.scores.overall > 0 &&
      reviewedForm.questions.some((q: any) => q.label === "Patient Name (Copy)") &&
      reviewedForm.questions.every((q: any) => q.accessibilityLabel !== "") &&
      reviewedForm.questions.some((q: any) => q.label === "Contact Phone" && q.validations.pattern === undefined);
    results.push({ name: 'Unit Check: AI Quality Self-Review Score & Self-Correction', passed: qaPassed, status: 200 });

    // Check 7.12: BullMQ Queue and Redis-based Cache parsing test
    try {
      const { enqueueDocumentParsing, getOrParseDocument } = require('../lib/queue');
      const fs = require('fs');
      const path = require('path');

      // Create a small test file
      const testDocPath = path.join(__dirname, 'test-doc.txt');
      fs.writeFileSync(testDocPath, 'This is a test document content for queue verification.');

      // Check fallback or queueing
      const disableRedis = process.env.DISABLE_REDIS === 'true';
      if (disableRedis) {
        const text = await getOrParseDocument(
          fs.readFileSync(testDocPath),
          'text/plain',
          'test-doc.txt',
          50
        );
        const passed = text && text.includes('This is a test document');
        results.push({ name: 'Integration Check: Queue Graceful Offline Fallback', passed, status: 200 });
      } else {
        // Redis active, test active enqueueing
        const jobId = await enqueueDocumentParsing(testDocPath, 'text/plain', 'test-doc.txt', 50);
        const passed = !!jobId && jobId.startsWith('parse:test-doc.txt:50');
        results.push({ name: 'Integration Check: BullMQ Job Enqueueing & Redis Connection', passed, status: 200 });
      }

      // Cleanup test file
      try { fs.unlinkSync(testDocPath); } catch (e) {}
    } catch (err: any) {
      results.push({ name: 'Integration Check: BullMQ & Redis queues', passed: false, error: err.message });
    }
  } catch (err: any) {
    results.push({ name: 'Unit Check: Multilingual Sifter Engine', passed: false, error: err.message });
  }

  // Cleanup Database Test Account
  try {
    await db.user.deleteMany({ where: { email: testEmail } });
    console.log(`${COLORS.YELLOW}Cleaned up integration test account from database.${COLORS.RESET}`);
  } catch (e) {}

  // Output test summary report
  console.log('\n==================================================');
  console.log('                 TEST RESULTS REPORT              ');
  console.log('==================================================');
  
  let allPassed = true;
  results.forEach((r) => {
    const statusText = r.passed 
      ? `${COLORS.GREEN}PASSED [HTTP ${r.status}]${COLORS.RESET}` 
      : `${COLORS.RED}FAILED (${r.error || `HTTP ${r.status}`})${COLORS.RESET}`;
    
    console.log(`- ${r.name.padEnd(50)}: ${statusText}`);
    if (!r.passed) allPassed = false;
  });
  console.log('==================================================');

  if (allPassed) {
    console.log(`${COLORS.GREEN}SUCCESS: All integration tests passed successfully!${COLORS.RESET}\n`);
    process.exit(0);
  } else {
    console.error(`${COLORS.RED}FAILURE: One or more integration tests failed!${COLORS.RESET}\n`);
    process.exit(1);
  }
}

// Dynamically start backend and run tests
process.env.PORT = '5055';
import '../index'; 

// Override port and trigger startup validation
setTimeout(runTests, 3500); // Wait for bootstrapper connections to finalize
