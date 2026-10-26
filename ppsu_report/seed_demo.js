// Creates local demo data (AI-generated form + sample responses) for the seeded demo user.
const API = 'http://127.0.0.1:5050/api';
(async () => {
  const j = async (url, opt = {}) => { const r = await fetch(API + url, opt); const t = await r.text(); try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t }; } };
  const login = await j('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'user@promptform.ai', password: 'password123' }) });
  const d = login.b.data || login.b; const tok = d.accessToken || d.token;
  const H = { 'content-type': 'application/json', authorization: 'Bearer ' + tok };
  const prompts = ['Customer satisfaction survey for a restaurant with rating, visit date and feedback', 'Patient intake form for a dental clinic with contact details, medical history and appointment date'];
  for (const prompt of prompts) {
    const g = await j('/ai/generate', { method: 'POST', headers: H, body: JSON.stringify({ prompt, save: true }) });
    console.log('generate', g.s, JSON.stringify(g.b).slice(0, 300));
  }
  const forms = await j('/forms', { headers: H });
  console.log('forms', forms.s, JSON.stringify(forms.b).slice(0, 600));
})();
