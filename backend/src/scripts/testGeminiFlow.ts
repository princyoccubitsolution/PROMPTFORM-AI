import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BASE_URL = 'http://127.0.0.1:5050/api';

async function runTest() {
  console.log('--- Testing Gemini Integration on PromptForm AI ---');

  // 1. Register or Login test user
  const email = `gemini_tester_${Date.now()}@test.com`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Gemini Tester',
      email,
      password: 'SecurePassword123!'
    })
  });
  const regData = await regRes.json() as any;
  const token = regData.accessToken;
  console.log('Test user registered, token acquired:', !!token);

  // 2. Test prompt generation with quiz
  console.log('\n[TEST 1] Generating Quiz from Prompt via Gemini 3.6 Flash...');
  const promptRes = await fetch(`${BASE_URL}/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt: 'Generate a 3-question MCQ quiz on Python Data Structures with options A, B, C, D, points, and correct answers'
    })
  });
  console.log('Prompt Gen HTTP Status:', promptRes.status);
  const promptData = await promptRes.json() as any;
  if (promptRes.status === 200) {
    const form = promptData.form;
    console.log('Form Title:', form.title);
    console.log('Form Settings:', form.settings);
    console.log('Questions count:', form.questions?.length);
    console.log('Question 1 Sample:', JSON.stringify(form.questions?.[0], null, 2));
  } else {
    console.error('Prompt Gen Error:', promptData);
  }

  // 3. Test PDF generation with an assignment PDF
  console.log('\nWaiting 3s for API rate limit window...');
  await new Promise(r => setTimeout(r, 3000));
  console.log('[TEST 2] Generating Quiz from Assignment PDF via Multimodal Gemini...');
  const pdfPath = path.join(__dirname, '../../public/uploads/1783580654215-407892306-Assignment_15999_Content_Document_20260205030155PM_0155953.pdf');
  if (fs.existsSync(pdfPath)) {
    const fileBytes = fs.readFileSync(pdfPath);
    const blob = new Blob([fileBytes], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, 'Assignment.pdf');
    formData.append('prompt', 'WEEK 8 Assignment quiz questions');

    const pdfRes = await fetch(`${BASE_URL}/ai/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    console.log('PDF Gen HTTP Status:', pdfRes.status);
    const pdfData = await pdfRes.json() as any;
    if (pdfRes.status === 200) {
      const form = pdfData.form;
      console.log('PDF Form Title:', form.title);
      console.log('Questions count:', form.questions?.length);
      console.log('Question 1 Sample:', JSON.stringify(form.questions?.[0], null, 2));
    } else {
      console.error('PDF Gen Error:', pdfData);
    }
  } else {
    console.log('Assignment PDF file not found for Test 2');
  }
}

runTest();
