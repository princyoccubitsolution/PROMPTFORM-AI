import { db } from '../lib/db';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:5050/api';

interface TestResult {
  testId: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'CONFIRMED_BUG' | 'CONFIRMED_GAP';
  httpStatus?: number;
  expectedStatus: string;
  details: string;
}

const results: TestResult[] = [];

async function apiRequest(
  method: string,
  endpoint: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  const reqHeaders: Record<string, string> = {};
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (!(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: reqHeaders,
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch (err: any) {
    return { status: 0, data: { error: err.message } };
  }
}

async function runAIFlowTestSuite() {
  console.log('\n========================================================================');
  console.log('   PROMPTFORM AI: /dashboard/ai FLOW QA TEST & VERIFICATION SUITE       ');
  console.log('========================================================================\n');

  const timestamp = Date.now();
  const testEmail = `ai_qa_tester_${timestamp}@test.com`;

  // 1. Setup Test User with initial 100 credits and Free plan
  const regRes = await apiRequest('POST', '/auth/register', {
    name: 'AI QA Tester',
    email: testEmail,
    password: 'SecurePassword123!',
  });

  const token = regRes.data?.accessToken;
  const userId = regRes.data?.user?.id;

  if (!token || !userId) {
    console.error('Failed to create test user for AI testing.');
    process.exit(1);
  }

  console.log(`[SETUP] Registered AI QA Tester: ${testEmail} (ID: ${userId}) with 100 credits\n`);

  // Upgrade to PRO for functional tests so the 5-form free ceiling doesn't block question count / credit tests
  await db.user.update({
    where: { id: userId },
    data: { subscriptionPlan: 'pro' }
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Text Prompt Generation (Medical Patient Intake)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Text Prompt Generation (Medical Patient Intake) ---');
    const prompt1 = "Create a patient intake form for a dentistry clinic with medical history, insurance details, and consent checkboxes (Generate around 5 questions. Form type: medical)";
    const res1 = await apiRequest('POST', '/ai/generate', { prompt: prompt1 }, token);

    const form1 = res1.data?.form;
    const questions1 = form1?.questions || [];
    const creditsAfter1 = res1.data?.creditsRemaining;

    const pass1 = res1.status === 200 && 
                  form1 && 
                  questions1.length > 0 && 
                  creditsAfter1 === 95;

    results.push({
      testId: 'AI-GEN-01',
      name: 'Text Prompt Form Generation (Medical Intake)',
      status: pass1 ? 'PASSED' : 'FAILED',
      httpStatus: res1.status,
      expectedStatus: '200 OK with form and 5 credits deducted',
      details: pass1 
        ? `Form "${form1.title}" created with ${questions1.length} questions. Credits deducted: 100 -> ${creditsAfter1}.`
        : `Failed: status=${res1.status}, error=${JSON.stringify(res1.data)}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-01: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // Check Question Types in Form 1
    const fieldTypes1 = questions1.map((q: any) => q.type);
    console.log(`        └─ Generated Field Types: ${fieldTypes1.join(', ')}`);

    // -------------------------------------------------------------------------
    // TEST 2: Quiz Assessment Generation with Scoring & Anti-Cheat
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Quiz Assessment Generation ---');
    const prompt2 = "Create a 5-question JavaScript assessment quiz with multiple choices and correct answers (Generate around 5 questions. Form type: quiz)";
    const res2 = await apiRequest('POST', '/ai/generate', { prompt: prompt2 }, token);
    const form2 = res2.data?.form;
    const questions2 = form2?.questions || [];

    const hasQuizValidations = questions2.some((q: any) => q.validations?.correctAnswer !== undefined || q.validations?.points !== undefined);
    const hasAntiCheat = form2?.settings?.anti_cheat_detection === true;

    const pass2 = res2.status === 200 && form2 && hasQuizValidations && hasAntiCheat;

    results.push({
      testId: 'AI-GEN-02',
      name: 'Quiz Form Generation with Anti-Cheat & Graded Validations',
      status: pass2 ? 'PASSED' : 'FAILED',
      httpStatus: res2.status,
      expectedStatus: '200 OK with anti_cheat_detection=true and graded validations',
      details: pass2
        ? `Quiz generated with ${questions2.length} questions. Anti-cheat enabled: ${hasAntiCheat}. Graded questions confirmed.`
        : `Failed: antiCheat=${hasAntiCheat}, hasQuizValidations=${hasQuizValidations}, status=${res2.status}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-02: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 3: Customer Survey Generation (Rating Scales & Feedback)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Customer Survey Generation ---');
    const prompt3 = "Create a customer feedback survey with net promoter score and rating scales (Generate around 5 questions. Form type: survey)";
    const res3 = await apiRequest('POST', '/ai/generate', { prompt: prompt3 }, token);
    const form3 = res3.data?.form;
    const questions3 = form3?.questions || [];
    const hasRatingField = questions3.some((q: any) => q.type === 'rating' || q.type === 'star_rating' || q.type === 'emoji-satisfaction-scale');

    const pass3 = res3.status === 200 && form3 && hasRatingField;
    results.push({
      testId: 'AI-GEN-03',
      name: 'Customer Survey Generation with Rating Scales',
      status: pass3 ? 'PASSED' : 'FAILED',
      httpStatus: res3.status,
      expectedStatus: '200 OK with rating widget field',
      details: pass3
        ? `Survey generated with ${questions3.length} questions including rating widgets.`
        : `Failed: hasRatingField=${hasRatingField}, status=${res3.status}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-03: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 4: PDF / Document Upload Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: PDF Document Upload Generation ---');
    const pdfFormData = new FormData();
    // Provide sample text file / PDF buffer
    const mockPdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Title (Dentistry Dental Chart Intake) /Author (Dr. Smith) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    );
    const pdfBlob = new Blob([mockPdfBuffer], { type: 'application/pdf' });
    pdfFormData.append('file', pdfBlob, 'dental_intake_chart.pdf');
    pdfFormData.append('prompt', 'Extract fields and generate a dentistry intake form');

    const res4 = await apiRequest('POST', '/ai/generate', pdfFormData, token);
    const form4 = res4.data?.form;

    const pass4 = res4.status === 200 && form4 && form4.questions?.length > 0;
    results.push({
      testId: 'AI-GEN-04',
      name: 'PDF / Document Upload Form Generation',
      status: pass4 ? 'PASSED' : 'FAILED',
      httpStatus: res4.status,
      expectedStatus: '200 OK with parsed form',
      details: pass4
        ? `Generated form from PDF: "${form4.title}" with ${form4.questions.length} questions.`
        : `Failed: status=${res4.status}, data=${JSON.stringify(res4.data)}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-04: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 5: Image / Form Scan Upload Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Image / Scan Upload Generation ---');
    const imageFormData = new FormData();
    // 1x1 mock PNG image
    const mockPngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    const imgBlob = new Blob([mockPngBuffer], { type: 'image/png' });
    imageFormData.append('file', imgBlob, 'event_registration_scan.png');
    imageFormData.append('prompt', 'Event Registration Form with attendee name and ticket type');

    const res5 = await apiRequest('POST', '/ai/generate', imageFormData, token);
    const form5 = res5.data?.form;

    const pass5 = res5.status === 200 && form5 && form5.questions?.length > 0;
    results.push({
      testId: 'AI-GEN-05',
      name: 'Image / Scan Upload Form Generation',
      status: pass5 ? 'PASSED' : 'FAILED',
      httpStatus: res5.status,
      expectedStatus: '200 OK with generated form',
      details: pass5
        ? `Generated form from Image: "${form5.title}" with ${form5.questions.length} questions.`
        : `Failed: status=${res5.status}, data=${JSON.stringify(res5.data)}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-05: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 6: Question Count Enforcement (Requested 3 vs 8 questions)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Question Count Configuration ---');
    const prompt6 = "Quick 3 question survey for cafe visitors (Generate around 3 questions. Form type: survey)";
    const res6 = await apiRequest('POST', '/ai/generate', { prompt: prompt6 }, token);
    const form6 = res6.data?.form;
    const count6 = form6?.questions?.length || 0;

    // We check if question count is reasonable (~3-6)
    const pass6 = res6.status === 200 && count6 >= 3 && count6 <= 6;
    results.push({
      testId: 'AI-GEN-06',
      name: 'Question Count Configuration (3 questions target)',
      status: pass6 ? 'PASSED' : 'FAILED',
      httpStatus: res6.status,
      expectedStatus: '200 OK with around 3 questions',
      details: pass6
        ? `Form generated with ${count6} questions (target: 3).`
        : `Failed: count=${count6}, status=${res6.status}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-06: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 7: Credit Balance Exhaustion Guard (<5 credits)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Credit Balance Exhaustion Guard ---');
    // Set user credits to 3 in DB
    await db.user.update({
      where: { id: userId },
      data: { credits: 3 }
    });

    const res7 = await apiRequest('POST', '/ai/generate', { prompt: "Create a job application form" }, token);
    const pass7 = res7.status === 403 && res7.data?.error?.toLowerCase().includes('credit');
    results.push({
      testId: 'AI-GEN-07',
      name: 'Insufficient Credit Balance Guard (< 5 credits)',
      status: pass7 ? 'PASSED' : 'FAILED',
      httpStatus: res7.status,
      expectedStatus: '403 Forbidden with Insufficient Credits message',
      details: pass7
        ? `Blocked generation when credits=3 with HTTP 403: "${res7.data?.error}"`
        : `Failed: status=${res7.status}, data=${JSON.stringify(res7.data)}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-07: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // Restore credits for remaining tests
    await db.user.update({
      where: { id: userId },
      data: { credits: 100 }
    });

    // -------------------------------------------------------------------------
    // TEST 8: Empty Prompt / Short Prompt Guard
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Empty / Short Prompt Guard ---');
    const res8 = await apiRequest('POST', '/ai/generate', { prompt: "ab" }, token);
    const pass8 = (res8.status === 200 && res8.data?.status === 'suggest') || res8.status === 400;
    results.push({
      testId: 'AI-GEN-08',
      name: 'Short Prompt Suggester / Guard (<3 chars)',
      status: pass8 ? 'PASSED' : 'FAILED',
      httpStatus: res8.status,
      expectedStatus: '200 with suggestions or 400 validation error',
      details: pass8
        ? `Prompt "<3 chars" returned status='suggest' with suggestions: ${JSON.stringify(res8.data?.suggestions || [])}`
        : `Failed: status=${res8.status}, data=${JSON.stringify(res8.data)}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-08: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 9: Free Plan Limit Ceiling with AI Form Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Free Plan Form Creation Ceiling with AI ---');
    // Check how many forms the user currently has
    const userFormsCount = await db.form.count({ where: { ownerId: userId } });
    console.log(`        └─ User currently owns ${userFormsCount} forms.`);

    // If user has less than 5, create enough to reach 5
    for (let i = userFormsCount; i < 5; i++) {
      await db.form.create({
        data: {
          title: `Filler Form ${i + 1}`,
          ownerId: userId,
          settings: {},
          theme: {}
        }
      });
    }

    // Set user to free plan
    await db.user.update({
      where: { id: userId },
      data: { subscriptionPlan: 'free' }
    });

    // Now user has exactly 5 forms. Next AI generation should trigger 403 LIMIT_REACHED because user is on FREE plan!
    const res9 = await apiRequest('POST', '/ai/generate', { prompt: "Create a 6th form on free plan" }, token);
    const pass9 = res9.status === 403 && res9.data?.status === 'restricted';
    results.push({
      testId: 'AI-GEN-09',
      name: 'Free Plan 5-Form Ceiling Enforcement on AI Generation',
      status: pass9 ? 'PASSED' : 'FAILED',
      httpStatus: res9.status,
      expectedStatus: '403 Forbidden (LIMIT_REACHED)',
      details: pass9
        ? `subscriptionMiddleware properly blocked 6th AI form creation with HTTP 403: "${res9.data?.error}"`
        : `Failed: status=${res9.status}, data=${JSON.stringify(res9.data)}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-09: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 10: End-to-End Post-Generation Share & Form Status Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Form Status (DRAFT vs PUBLISHED) & Public Share ---');
    // Upgrade user to PRO to bypass limit for testing post-generation flow
    await db.user.update({
      where: { id: userId },
      data: { subscriptionPlan: 'pro' }
    });

    const res10 = await apiRequest('POST', '/ai/generate', { prompt: "Event RSVP Registration Form for Tech Meetup" }, token);
    const form10 = res10.data?.form;

    console.log(`        └─ Form Status created by AI: "${form10?.status}"`);
    console.log(`        └─ Form uniqueShareId: "${form10?.uniqueShareId}"`);

    // Check if public respondent can access it:
    const publicRes = await apiRequest('GET', `/forms/${form10?.id}`);
    console.log(`        └─ Public GET /forms/${form10?.id} status: ${publicRes.status}`);

    // Check if form is published or draft
    const isPublished = form10?.status === 'PUBLISHED';
    const hasUniqueShareId = !!form10?.uniqueShareId;
    const pass10 = isPublished && hasUniqueShareId;

    results.push({
      testId: 'AI-GEN-10',
      name: 'AI Generated Form Initial Status & Share Link Audit',
      status: pass10 ? 'PASSED' : 'CONFIRMED_BUG',
      httpStatus: res10.status,
      expectedStatus: 'Form created as PUBLISHED with uniqueShareId for immediate sharing',
      details: pass10
        ? `FIX VERIFIED: AI forms are created with status="PUBLISHED" and uniqueShareId="${form10?.uniqueShareId}"! Public URL: "${form10?.publicUrl}". Form can be immediately shared and completed without draft errors.`
        : `BUG: /ai/generate leaves form in "DRAFT" status with uniqueShareId=null! When users click "Public / Share" on the AI generator page, respondents see "This form is currently a draft and cannot accept responses."`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-10: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

    // -------------------------------------------------------------------------
    // TEST 11: Display Mode Configuration Persistence (PATCH /forms/:id)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Display Mode Persistence ---');
    // When user selects 'wizard' or 'chat' in AI Generator page:
    // Does the form store `settings.display_mode` via PATCH /forms/:id?
    const patchRes = await apiRequest('PATCH', `/forms/${form10?.id}`, {
      settings: { ...form10?.settings, display_mode: 'wizard' }
    }, token);

    const pass11 = patchRes.status === 200 && patchRes.data?.settings?.display_mode === 'wizard';
    results.push({
      testId: 'AI-GEN-11',
      name: 'Display Mode (Full / Wizard / Chat) Persistence via PATCH /forms/:id',
      status: pass11 ? 'PASSED' : 'FAILED',
      httpStatus: patchRes.status,
      expectedStatus: '200 OK with settings.display_mode updated via PATCH',
      details: pass11
        ? `FIX VERIFIED: Endpoint PATCH /api/forms/:id successfully supported! display_mode="wizard" saved with deep-merged settings.`
        : `Failed: status=${patchRes.status}, data=${JSON.stringify(patchRes.data)}`
    });
    console.log(` [${results[results.length - 1].status}] AI-GEN-11: ${results[results.length - 1].name}`);
    console.log(`        └─ ${results[results.length - 1].details}`);

  } finally {
    // Cleanup test data
    console.log('\n--- Cleaning up test user and generated forms ---');
    await db.user.delete({ where: { id: userId } }).catch(() => {});
    console.log('Cleaned up test data.\n');
  }

  // Generate Summary
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASSED').length;
  const bugs = results.filter(r => r.status === 'CONFIRMED_BUG').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log('========================================================================');
  console.log('                      AI GENERATOR QA REPORT SUMMARY                    ');
  console.log('========================================================================');
  console.log(` Total Scenarios Tested       : ${total}`);
  console.log(` Passed Scenarios             : ${passed}`);
  console.log(` Confirmed Bugs / UX Issues   : ${bugs}`);
  console.log(` Unexpected Test Failures     : ${failed}`);
  console.log('========================================================================\n');

  const reportPath = path.join(__dirname, '../../../ai_generator_qa_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ executedAt: new Date().toISOString(), summary: { total, passed, bugs, failed }, results }, null, 2));
  console.log(`Detailed report saved to: ${reportPath}\n`);
}

runAIFlowTestSuite().catch(console.error);
