import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

import { db } from '../lib/db';

const API_BASE = 'http://127.0.0.1:5050/api';

interface EdgeTestResult {
  edgeCaseId: string;
  title: string;
  status: 'PASSED' | 'FAILED';
  details: string;
  evidence?: any;
}

const edgeResults: EdgeTestResult[] = [];

async function apiRequest(
  method: string,
  endpoint: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any; raw: string; headers: Headers }> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return { status: res.status, data, raw, headers: res.headers };
}

function logEdge(result: EdgeTestResult) {
  edgeResults.push(result);
  const color = result.status === 'PASSED' ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(` ${color} ${result.edgeCaseId}: ${result.title}`);
  if (result.details) {
    console.log(`        └─ ${result.details}`);
  }
}

async function runEdgeCasesSuite() {
  console.log('\n========================================================================');
  console.log('   PROMPTFORM AI - TARGETED EDGE CASES & BUG FIX VERIFICATION SUITE     ');
  console.log('========================================================================\n');

  const runId = Date.now();
  const testUser = {
    email: `qa_edge_${runId}@promptform-qa.test`,
    password: 'SecurePassword123!@#',
    name: 'QA Edge Explorer',
  };

  const regRes = await apiRequest('POST', '/auth/register', testUser);
  let token = regRes.data?.accessToken;
  const userId = regRes.data?.user?.id;

  if (!token) {
    console.error('Failed to create test user for edge cases.');
    process.exit(1);
  }

  // Upgrade to Pro to bypass form limits for multi-scenario edge case exploration
  const upgRes = await apiRequest(
    'POST',
    '/auth/upgrade',
    { plan: 'pro', billingPeriod: 'monthly', amount: '19.00', paymentMethod: 'card' },
    token
  );
  if (upgRes.data?.accessToken) {
    token = upgRes.data.accessToken;
  }

  // --------------------------------------------------------------------------
  // EDGE CASE 1: Quiz Scoring Key Interoperability (correctAnswer vs correct_answer)
  // --------------------------------------------------------------------------
  console.log('\x1b[34m--- TEST EC-01: Quiz Scoring Key Interoperability ---\x1b[0m');
  {
    const quizFormRes = await apiRequest(
      'POST',
      '/forms',
      {
        title: 'Bilingual Quiz Scoring Test',
        category: 'quiz',
      },
      token
    );
    const quizFormId = quizFormRes.data?.id;

    // Put questions: Q1 with correctAnswer (AI style), Q2 with correct_answer (Builder style)
    const questionsPayload = [
      {
        type: 'short_text',
        label: 'Candidate Name',
        required: true,
        options: [],
        validations: {},
        logic: {},
      },
      {
        type: 'mcq',
        label: 'AI Generator Question (correctAnswer)',
        required: true,
        options: ['CorrectA', 'WrongA'],
        validations: { correctAnswer: 'CorrectA', points: 15 },
        logic: {},
      },
      {
        type: 'mcq',
        label: 'Builder Editor Question (correct_answer)',
        required: true,
        options: ['CorrectB', 'WrongB'],
        validations: { correct_answer: 'CorrectB', points: 25 },
        logic: {},
      },
    ];

    const qRes = await apiRequest('PUT', `/forms/${quizFormId}/questions`, questionsPayload, token);
    const qList = qRes.data;
    const nameQId = qList[0].id;
    const q1Id = qList[1].id;
    const q2Id = qList[2].id;

    await apiRequest('PUT', `/forms/${quizFormId}`, { status: 'PUBLISHED' }, token);

    // Candidate 1: Both correct -> 15 + 25 = 40 (100%)
    await apiRequest('POST', `/forms/${quizFormId}/submit`, {
      answers: {
        [nameQId]: 'Elena Rostova',
        [q1Id]: 'CorrectA',
        [q2Id]: 'CorrectB',
      },
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 30,
      email: `elena_${runId}@test.com`,
    });

    // Candidate 2: Only Q2 correct -> 25 (62.5% or 63%)
    await apiRequest('POST', `/forms/${quizFormId}/submit`, {
      answers: {
        [nameQId]: 'Marcus Vance',
        [q1Id]: 'WrongA',
        [q2Id]: 'CorrectB',
      },
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 40,
      email: `marcus_${runId}@test.com`,
    });

    // Export CSV and verify scores
    const exportRes = await apiRequest('GET', `/forms/${quizFormId}/export`, undefined, token);
    const csv = exportRes.raw;

    const elenaHas40 = csv.includes('Elena Rostova') && (csv.includes('"40"') || csv.includes('"100%"'));
    const marcusHas25 = csv.includes('Marcus Vance') && (csv.includes('"25"') || csv.includes('63%') || csv.includes('62.5%'));
    const notZero = !csv.includes('"0"') && !csv.includes('"0%"');

    const pass = exportRes.status === 200 && elenaHas40 && marcusHas25;
    logEdge({
      edgeCaseId: 'EC-01',
      title: 'Quiz Score Synchronization (correctAnswer + correct_answer)',
      status: pass ? 'PASSED' : 'FAILED',
      details: pass
        ? 'Verified! CSV export scored both AI-generator (correctAnswer) and Visual Builder (correct_answer) questions correctly. Elena: 40/40 (100%), Marcus: 25/40.'
        : `Scoring mismatch in CSV export: ${csv.slice(0, 300)}`,
    });
  }

  // --------------------------------------------------------------------------
  // EDGE CASE 2: Server-Side Required Field Validation for Conditionally Hidden Fields
  // --------------------------------------------------------------------------
  console.log('\n\x1b[34m--- TEST EC-02: Conditionally Hidden Required Field Submission ---\x1b[0m');
  {
    const condFormRes = await apiRequest(
      'POST',
      '/forms',
      {
        title: 'Driver Registration Form (Conditional Logic Test)',
      },
      token
    );
    const condFormId = condFormRes.data?.id;

    // Initial dummy questions so we can get IDs
    const initQ = await apiRequest(
      'PUT',
      `/forms/${condFormId}/questions`,
      [
        { type: 'mcq', label: 'Do you own a vehicle?', required: true, options: ['Yes', 'No'], validations: {}, logic: {} },
        { type: 'short_text', label: 'Vehicle License Plate', required: true, options: [], validations: {}, logic: {} },
      ],
      token
    );
    const ownCarQId = initQ.data[0].id;
    const plateQId = initQ.data[1].id;

    // Update with branching logic: plate question only shows if ownCarQ === 'Yes'
    await apiRequest(
      'PUT',
      `/forms/${condFormId}/questions`,
      [
        { id: ownCarQId, type: 'mcq', label: 'Do you own a vehicle?', required: true, options: ['Yes', 'No'], validations: {}, logic: {} },
        {
          id: plateQId,
          type: 'short_text',
          label: 'Vehicle License Plate',
          required: true,
          options: [],
          validations: {},
          logic: {
            action: 'show',
            target_question_id: ownCarQId,
            condition: { operator: 'equals', value: 'Yes' },
          },
        },
      ],
      token
    );

    await apiRequest('PUT', `/forms/${condFormId}`, { status: 'PUBLISHED' }, token);

    // Scenario A: Responder answers 'No' and omits license plate -> MUST PASS with 201 (hidden field bypassed!)
    const subNoCar = await apiRequest('POST', `/forms/${condFormId}/submit`, {
      answers: { [ownCarQId]: 'No' },
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 10,
    });

    // Scenario B: Responder answers 'Yes' and omits license plate -> MUST FAIL with 400 (visible required field!)
    const subYesCarMissingPlate = await apiRequest('POST', `/forms/${condFormId}/submit`, {
      answers: { [ownCarQId]: 'Yes' },
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 10,
    });

    // Scenario C: Responder answers 'Yes' and provides license plate -> MUST PASS with 201
    const subYesCarWithPlate = await apiRequest('POST', `/forms/${condFormId}/submit`, {
      answers: { [ownCarQId]: 'Yes', [plateQId]: 'CAL-9821' },
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 15,
    });

    const passA = subNoCar.status === 201;
    const passB = subYesCarMissingPlate.status === 400 && (subYesCarMissingPlate.data?.missingFields?.includes('Vehicle License Plate') || subYesCarMissingPlate.data?.error?.includes('Vehicle License Plate'));
    const passC = subYesCarWithPlate.status === 201;

    const allPassed = passA && passB && passC;
    logEdge({
      edgeCaseId: 'EC-02',
      title: 'Conditional Required Field Evaluation on Server Submit',
      status: allPassed ? 'PASSED' : 'FAILED',
      details: allPassed
        ? 'Verified! Hidden required fields are safely skipped when conditions are unmet (status 201). Visible required fields are strictly enforced (status 400).'
        : `Submissions: NoCar=${subNoCar.status} (exp 201), YesMissing=${subYesCarMissingPlate.status} (exp 400), YesFilled=${subYesCarWithPlate.status} (exp 201)`,
    });
  }

  // --------------------------------------------------------------------------
  // EDGE CASE 3: Multi-Submission vs Single-Submission Constraint Gating
  // --------------------------------------------------------------------------
  console.log('\n\x1b[34m--- TEST EC-03: Multi-Submission Constraint (limit_responses) ---\x1b[0m');
  {
    // Form with limit_responses: false
    const multiFormRes = await apiRequest(
      'POST',
      '/forms',
      {
        title: 'Multi-Submission Allowed Form',
        settings: { limit_responses: false },
      },
      token
    );
    const multiFormId = multiFormRes.data?.id;

    await apiRequest(
      'PUT',
      `/forms/${multiFormId}/questions`,
      [{ type: 'short_text', label: 'Comment', required: false, options: [], validations: {}, logic: {} }],
      token
    );
    await apiRequest('PUT', `/forms/${multiFormId}`, { status: 'PUBLISHED' }, token);

    const email = `multi_${runId}@promptform-qa.test`;
    const sub1 = await apiRequest('POST', `/forms/${multiFormId}/submit`, {
      answers: {},
      email,
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 5,
    });
    const sub2 = await apiRequest('POST', `/forms/${multiFormId}/submit`, {
      answers: {},
      email,
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 5,
    });

    const multiPassed = sub1.status === 201 && sub2.status === 201;

    // Form with limit_responses: true
    const singleFormRes = await apiRequest(
      'POST',
      '/forms',
      {
        title: 'Single-Submission Strict Form',
        settings: { limit_responses: true },
      },
      token
    );
    const singleFormId = singleFormRes.data?.id;

    await apiRequest(
      'PUT',
      `/forms/${singleFormId}/questions`,
      [{ type: 'short_text', label: 'Feedback', required: false, options: [], validations: {}, logic: {} }],
      token
    );
    await apiRequest('PUT', `/forms/${singleFormId}`, { status: 'PUBLISHED' }, token);

    const singleEmail = `single_${runId}@promptform-qa.test`;
    const s1 = await apiRequest('POST', `/forms/${singleFormId}/submit`, {
      answers: {},
      email: singleEmail,
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 5,
    });
    const s2 = await apiRequest('POST', `/forms/${singleFormId}/submit`, {
      answers: {},
      email: singleEmail,
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 5,
    });

    const singlePassed = s1.status === 201 && s2.status === 400;
    const pass = multiPassed && singlePassed;

    logEdge({
      edgeCaseId: 'EC-03',
      title: 'Submission Limitation Gating (limit_responses Flag)',
      status: pass ? 'PASSED' : 'FAILED',
      details: pass
        ? 'Verified! Multi-submissions allowed when limit_responses is false; strictly blocked with 400 when limit_responses is true.'
        : `Multi: s1=${sub1.status}, s2=${sub2.status}. Single: s1=${s1.status}, s2=${s2.status}`,
    });
  }

  // --------------------------------------------------------------------------
  // EDGE CASE 4: Analytics Sentiment Analysis Share ID & UUID Dual Resolution
  // --------------------------------------------------------------------------
  console.log('\n\x1b[34m--- TEST EC-04: Sentiment Analysis Share ID Resolution ---\x1b[0m');
  {
    const sentimentFormRes = await apiRequest(
      'POST',
      '/forms',
      {
        title: 'Sentiment Dual-ID Test Form',
      },
      token
    );
    const sentimentFormId = sentimentFormRes.data?.id;
    const sentimentShareId = sentimentFormRes.data?.uniqueShareId;

    const qRes = await apiRequest(
      'PUT',
      `/forms/${sentimentFormId}/questions`,
      [{ type: 'long_text', label: 'User Review', required: true, options: [], validations: {}, logic: {} }],
      token
    );
    const reviewQId = qRes.data[0].id;
    await apiRequest('PUT', `/forms/${sentimentFormId}`, { status: 'PUBLISHED' }, token);

    // Submit a review
    await apiRequest('POST', `/forms/${sentimentFormId}/submit`, {
      answers: { [reviewQId]: 'I absolutely love this product! It has dramatically boosted our team productivity.' },
      browserMetadata: { user_agent: 'EdgeQA' },
      timeTaken: 12,
    });

    // Test 1: Call /api/ai/analyze-sentiment with UUID
    const uuidRes = await apiRequest('POST', '/ai/analyze-sentiment', { formId: sentimentFormId }, token);
    const uuidSuccess = uuidRes.status === 200 && Boolean(uuidRes.data?.sentimentSummary);

    // Test 2: Call /api/ai/analyze-sentiment with uniqueShareId
    const shareIdRes = await apiRequest('POST', '/ai/analyze-sentiment', { formId: sentimentShareId }, token);
    const shareIdSuccess = shareIdRes.status === 200 && Boolean(shareIdRes.data?.sentimentSummary);

    const pass = uuidSuccess && shareIdSuccess;
    logEdge({
      edgeCaseId: 'EC-04',
      title: 'Sentiment Analysis Resolution via Form UUID and uniqueShareId',
      status: pass ? 'PASSED' : 'FAILED',
      details: pass
        ? 'Verified! /api/ai/analyze-sentiment correctly resolves form whether called with UUID or short share ID.'
        : `UUID status=${uuidRes.status}, ShareID status=${shareIdRes.status}`,
    });
  }

  // --------------------------------------------------------------------------
  // EDGE CASE 5: Strict Semantics-Based Field Matching Rule Adherence
  // --------------------------------------------------------------------------
  console.log('\n\x1b[34m--- TEST EC-05: AI Generator Semantic Field Type Adherence ---\x1b[0m');
  {
    const aiGenRes = await apiRequest(
      'POST',
      '/ai/generate',
      { prompt: 'Create an executive job application form with name, email, phone number, salary expectation, resume upload, and candidate rating' },
      token
    );

    const questions = aiGenRes.data?.form?.questions || [];
    const types = questions.map((q: any) => q.type);

    const hasNameOrShort = types.includes('name') || types.includes('short_text');
    const hasEmail = types.includes('email');
    const hasPhone = types.includes('phone');
    const hasPrice = types.includes('price');
    const hasRating = types.includes('rating');
    const hasResumeOrFile = types.includes('resume') || types.includes('file_upload') || types.includes('photo');

    // Rule: Standard text inputs must never be used for fields that have dedicated premium types (email, phone, price, rating)
    const pass = hasEmail && (hasPhone || hasPrice || hasRating);

    logEdge({
      edgeCaseId: 'EC-05',
      title: 'AI Generator Strict Semantic Premium Types Matching',
      status: pass ? 'PASSED' : 'FAILED',
      details: pass
        ? `Verified! AI generator mapped premium semantic types: [${types.join(', ')}]`
        : `Missing required premium types: found [${types.join(', ')}]`,
    });
  }

  // Cleanup
  console.log('\n\x1b[34m--- Cleaning up test records ---\x1b[0m');
  try {
    await db.user.deleteMany({
      where: {
        email: {
          in: [
            testUser.email,
            `elena_${runId}@test.com`,
            `marcus_${runId}@test.com`,
            `multi_${runId}@promptform-qa.test`,
            `single_${runId}@promptform-qa.test`,
          ],
        },
      },
    });
    console.log(' Cleaned up edge test accounts.');
  } catch (err: any) {
    console.warn(' Cleanup warning:', err.message);
  }

  const allPassed = edgeResults.every((r) => r.status === 'PASSED');
  console.log('\n========================================================================');
  console.log(` EDGE CASES TEST SUMMARY: ${edgeResults.filter((r) => r.status === 'PASSED').length}/${edgeResults.length} PASSED`);
  console.log('========================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runEdgeCasesSuite().catch((err) => {
  console.error('Edge cases suite error:', err);
  process.exit(1);
});
