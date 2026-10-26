// Captures high-resolution screenshots of the running local app (frontend :4500, backend :5050)
// using headless Edge over the Chrome DevTools Protocol. Logs in with the seeded demo account.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = path.join(__dirname, 'shots');
const FRONT = 'http://localhost:4500';
const API = 'http://127.0.0.1:5050/api';
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const prof = path.join(process.env.TEMP, 'ppsu_edge_profile');
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
    '--hide-scrollbars', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 40; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(500); }
  }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = {};
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1.5, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

  async function shot(name, url, { wait = 6000, full = false, before } = {}) {
    await send('Page.navigate', { url });
    await sleep(wait);
    if (before) { await evaluate(before); await sleep(2500); }
    const params = { format: 'png' };
    if (full) {
      const h = Math.min(await evaluate('document.documentElement.scrollHeight'), 2600);
      params.clip = { x: 0, y: 0, width: 1440, height: h, scale: 1 };
      params.captureBeyondViewport = true;
    }
    const r = await send('Page.captureScreenshot', params);
    if (!r.result) { console.log('FAIL', name, JSON.stringify(r.error)); return; }
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64'));
    console.log('saved', name);
  }

  // Public pages
  await shot('landing', FRONT + '/', { wait: 15000 });
  await shot('landing_full', FRONT + '/', { wait: 6000, full: true });
  await shot('login', FRONT + '/login', { wait: 8000 });
  await shot('register', FRONT + '/register', { wait: 8000 });
  await shot('pricing', FRONT + '/pricing', { wait: 8000 });
  await shot('templates', FRONT + '/templates', { wait: 8000 });

  // Authenticate with the seeded demo account
  const login = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'user@promptform.ai', password: 'password123' }) })).json();
  const d = login.data || login;
  const access = d.accessToken || d.token || d.access_token;
  const refresh = d.refreshToken || d.refresh_token || '';
  const user = d.user || {};
  if (!access) { console.log('login keys', Object.keys(d)); }
  await evaluate(`(()=>{localStorage.setItem('promptform_access_token',${JSON.stringify(access)});
    localStorage.setItem('promptform_refresh_token',${JSON.stringify(refresh)});
    localStorage.setItem('promptform_user_email',${JSON.stringify(user.email || 'user@promptform.ai')});
    localStorage.setItem('promptform_user_name',${JSON.stringify(user.name || 'Demo User')});
    localStorage.removeItem('promptform_needs_onboarding');return true})()`);

  const forms = await (await fetch(API + '/forms', { headers: { authorization: 'Bearer ' + access } })).json();
  const list = forms.data || forms.forms || forms;
  const arr = Array.isArray(list) ? list : (list.forms || []);
  console.log('forms', arr.length, arr.slice(0, 8).map(f => `${f.id}|${f.title}|${f.uniqueShareId}|${f._count ? JSON.stringify(f._count) : ''}`));
  fs.writeFileSync(path.join(OUT, 'forms.json'), JSON.stringify(arr.map(f => ({ id: f.id, title: f.title, share: f.uniqueShareId, status: f.status })), null, 1));

  await shot('dashboard', FRONT + '/dashboard', { wait: 12000 });
  await shot('dashboard_ai', FRONT + '/dashboard/ai', { wait: 10000 });
  await shot('forms', FRONT + '/forms', { wait: 9000 });
  await shot('responses_all', FRONT + '/responses', { wait: 9000 });
  await shot('analytics', FRONT + '/analytics', { wait: 10000 });
  await shot('team', FRONT + '/team', { wait: 9000 });
  await shot('settings', FRONT + '/settings', { wait: 9000 });
  await shot('billing', FRONT + '/billing', { wait: 9000 });
  await shot('workspace', FRONT + '/workspace', { wait: 9000 });
  const f = arr.find(x => x.uniqueShareId) || arr[0];
  if (f) {
    await shot('builder', `${FRONT}/builder/${f.id}`, { wait: 12000 });
    await shot('form_analytics', `${FRONT}/analytics/${f.id}`, { wait: 10000 });
    await shot('responses', `${FRONT}/responses/${f.id}`, { wait: 10000 });
    if (f.uniqueShareId) await shot('public_form', `${FRONT}/f/${f.uniqueShareId}`, { wait: 10000 });
  }
  ws.close(); edge.kill();
}
main().catch(e => { console.error(e); process.exit(1); });
