/**
 * Live Production Cloud Verification Script
 * Validates Frontend (Vercel) and Backend (Render) end-to-end
 */

const https = require('https');
const http = require('http');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;

    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json: () => {
            try { return JSON.parse(data); } catch { return null; }
          }
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runLiveVerification() {
  console.log('\n=======================================================');
  console.log(' PROMPTFORM AI - LIVE PRODUCTION VERIFICATION SUITE');
  console.log('=======================================================\n');

  const results = [];

  function record(name, pass, details) {
    const symbol = pass ? '✓ [PASS]' : '✗ [FAIL]';
    console.log(`${symbol} ${name}: ${details}`);
    results.push({ name, pass, details });
  }

  // 1. Frontend Checks (Vercel)
  try {
    const feHome = await request('https://promptform-ai-frontend.vercel.app');
    record(
      'Frontend Home Page',
      feHome.statusCode === 200 && feHome.body.includes('<html'),
      `Status ${feHome.statusCode} | Size: ${(feHome.body.length / 1024).toFixed(1)} KB`
    );
  } catch (err) {
    record('Frontend Home Page', false, err.message);
  }

  try {
    const feLogin = await request('https://promptform-ai-frontend.vercel.app/login');
    record(
      'Frontend Login Page',
      feLogin.statusCode === 200,
      `Status ${feLogin.statusCode}`
    );
  } catch (err) {
    record('Frontend Login Page', false, err.message);
  }

  // 2. Backend Infrastructure Checks (Render)
  try {
    const root = await request('https://promptform-api.onrender.com/');
    const json = root.json();
    record(
      'Backend Root & Version',
      root.statusCode === 200 && json?.version === '2.1.0' && json?.features?.includes('google-oauth'),
      `v${json?.version} | Features: ${json?.features?.join(', ')} | Frontend: ${json?.frontendUrl}`
    );
  } catch (err) {
    record('Backend Root & Version', false, err.message);
  }

  try {
    const health = await request('https://promptform-api.onrender.com/health');
    const json = health.json();
    record(
      'Backend Health Diagnostics',
      health.statusCode === 200 && json?.status === 'healthy' && json?.database === 'connected',
      `DB: ${json?.database} | Cache: ${json?.cache} | Status: ${json?.status}`
    );
  } catch (err) {
    record('Backend Health Diagnostics', false, err.message);
  }

  try {
    const liveness = await request('https://promptform-api.onrender.com/health/liveness');
    const json = liveness.json();
    record(
      'Backend Liveness Probe',
      liveness.statusCode === 200 && json?.status === 'alive',
      `Status ${liveness.statusCode} | Liveness: ${json?.status}`
    );
  } catch (err) {
    record('Backend Liveness Probe', false, err.message);
  }

  try {
    const readiness = await request('https://promptform-api.onrender.com/health/readiness');
    const json = readiness.json();
    record(
      'Backend Readiness Probe',
      readiness.statusCode === 200 && json?.status === 'ready',
      `Status ${readiness.statusCode} | Readiness: ${json?.status}`
    );
  } catch (err) {
    record('Backend Readiness Probe', false, err.message);
  }

  // 3. Google OAuth Endpoint Check
  try {
    const googleAuth = await request('https://promptform-api.onrender.com/api/auth/google?redirect=dashboard');
    record(
      'Google OAuth Endpoint Resolution',
      googleAuth.statusCode === 302,
      `Status 302 Redirect | Location: ${googleAuth.headers.location?.substring(0, 80)}...`
    );
  } catch (err) {
    record('Google OAuth Endpoint Resolution', false, err.message);
  }

  // 4. User Registration, Login & Authentication
  const testEmail = `live_verify_${Date.now()}@promptform.test`;
  const testPassword = 'Password123!';
  let authToken = null;
  let userId = null;

  try {
    const reg = await request('https://promptform-api.onrender.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: testEmail, password: testPassword, name: 'Live Cloud Tester' }
    });
    const json = reg.json();
    authToken = json?.accessToken || json?.tokens?.accessToken;
    userId = json?.user?.id;
    record(
      'User Registration API',
      reg.statusCode === 201 && Boolean(authToken),
      `Status ${reg.statusCode} | User ID: ${userId} | Plan: ${json?.user?.subscriptionPlan}`
    );
  } catch (err) {
    record('User Registration API', false, err.message);
  }

  try {
    const login = await request('https://promptform-api.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: testEmail, password: testPassword }
    });
    const json = login.json();
    authToken = json?.accessToken || json?.tokens?.accessToken || authToken;
    record(
      'User Login & JWT Issuance',
      login.statusCode === 200 && Boolean(authToken),
      `Status ${login.statusCode} | JWT Token verified for ${json?.user?.email}`
    );
  } catch (err) {
    record('User Login & JWT Issuance', false, err.message);
  }

  try {
    const me = await request('https://promptform-api.onrender.com/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = me.json();
    record(
      'Authenticated /me Profile',
      me.statusCode === 200 && json?.id === userId,
      `Status ${me.statusCode} | User: ${json?.name} (${json?.email})`
    );
  } catch (err) {
    record('Authenticated /me Profile', false, err.message);
  }

  // 5. Form Lifecycle: Creation, Customization, Submission, Analytics, Teardown
  let formId = null;
  try {
    const createForm = await request('https://promptform-api.onrender.com/api/forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: { title: 'Live Production Cloud Verification Form', category: 'verification' }
    });
    const json = createForm.json();
    formId = json?.id;
    record(
      'Form Creation API',
      createForm.statusCode === 201 && Boolean(formId),
      `Status ${createForm.statusCode} | Form ID: ${formId}`
    );
  } catch (err) {
    record('Form Creation API', false, err.message);
  }

  let questionId = null;
  let q2Id = null;

  if (formId) {
    try {
      const questionsPayload = [
        {
          type: 'short_text',
          label: 'Your Name',
          required: true,
          options: [],
          validations: {},
          logic: {}
        },
        {
          type: 'rating',
          label: 'Platform Reliability Score',
          required: true,
          options: ['1', '2', '3', '4', '5'],
          validations: {},
          logic: {}
        }
      ];

      const addQ = await request(`https://promptform-api.onrender.com/api/forms/${formId}/questions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: questionsPayload
      });
      const qJson = addQ.json();
      const isArray = Array.isArray(qJson) && qJson.length === 2;
      record(
        'Dynamic Question Config',
        addQ.statusCode === 200 && isArray,
        `Status ${addQ.statusCode} | ${qJson?.length} questions configured successfully`
      );

      questionId = qJson?.[0]?.id;
      q2Id = qJson?.[1]?.id;
    } catch (err) {
      record('Dynamic Question Config', false, err.message);
    }

    try {
      const pub = await request(`https://promptform-api.onrender.com/api/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: { status: 'PUBLISHED' }
      });
      const json = pub.json();
      record(
        'Form Publishing',
        pub.statusCode === 200 && json?.status === 'PUBLISHED',
        `Status ${pub.statusCode} | Status: ${json?.status}`
      );
    } catch (err) {
      record('Form Publishing', false, err.message);
    }

    try {
      const answers = {};
      if (questionId) answers[questionId] = 'Verified Live Cloud User';
      if (q2Id) answers[q2Id] = 5;

      const submit = await request(`https://promptform-api.onrender.com/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          answers,
          timeTaken: 8,
          browserMetadata: { user_agent: 'NodeLiveCloudVerification/2.1.0' }
        }
      });
      const sJson = submit.json();
      record(
        'Public Form Submission',
        submit.statusCode === 201 && Boolean(sJson?.responseId),
        `Status ${submit.statusCode} | Response ID: ${sJson?.responseId}`
      );
    } catch (err) {
      record('Public Form Submission', false, err.message);
    }

    try {
      const responses = await request(`https://promptform-api.onrender.com/api/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const rJson = responses.json();
      record(
        'Responses Ingestion & Query',
        responses.statusCode === 200 && Array.isArray(rJson) && rJson.length === 1,
        `Status ${responses.statusCode} | Ingested responses count: ${rJson?.length}`
      );
    } catch (err) {
      record('Responses Ingestion & Query', false, err.message);
    }

    try {
      const del = await request(`https://promptform-api.onrender.com/api/forms/${formId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      record(
        'Form Teardown & Cleanup',
        del.statusCode === 200,
        `Status ${del.statusCode} | Live test form ${formId} cleaned up successfully`
      );
    } catch (err) {
      record('Form Teardown & Cleanup', false, err.message);
    }
  }

  console.log('\n=======================================================');
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log(` SUMMARY: ${passed} / ${total} Live Production Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('=======================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runLiveVerification().catch(err => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});
