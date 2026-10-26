// Submits sample responses to the demo user's forms (local test data only).
const API = 'http://127.0.0.1:5050/api';
(async () => {
  const j = async (url, opt = {}) => { const r = await fetch(API + url, opt); const t = await r.text(); try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t }; } };
  const login = await j('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'user@promptform.ai', password: 'password123' }) });
  const d = login.b.data || login.b; const H = { 'content-type': 'application/json', authorization: 'Bearer ' + (d.accessToken || d.token) };
  const forms = (await j('/forms', { headers: H })).b;
  const names = ['Aarav Patel', 'Diya Shah', 'Rohan Mehta', 'Isha Desai', 'Kabir Joshi', 'Ananya Rao', 'Vihaan Nair', 'Meera Iyer'];
  const texts = ['Great service and friendly staff.', 'Food was good but waiting time was long.', 'Excellent experience, will visit again!', 'Average, could improve cleanliness.'];
  for (const f of forms) {
    const full = (await j('/forms/' + f.id, { headers: H })).b; const form = full.data || full.form || full;
    const qs = form.questions || [];
    for (let i = 0; i < names.length; i++) {
      const answers = {};
      for (const q of qs) {
        const o = Array.isArray(q.options) ? q.options : [];
        let v;
        switch (q.type) {
          case 'email': v = names[i].split(' ')[0].toLowerCase() + '@example.com'; break;
          case 'phone': v = '98765' + String(43210 + i); break;
          case 'number': v = 20 + i * 3; break;
          case 'rating': v = [5, 4, 5, 3, 4, 5, 2, 4][i]; break;
          case 'date': v = `2026-10-0${(i % 9) + 1}`; break;
          case 'time': v = '1' + (i % 9) + ':30'; break;
          case 'mcq': case 'dropdown': v = o[i % Math.max(o.length, 1)]; break;
          case 'checkbox': v = o.length ? [o[i % o.length]] : []; break;
          case 'long_text': case 'feedback': v = texts[i % texts.length]; break;
          case 'file_upload': case 'signature': case 'payment': v = undefined; break;
          default: v = /name/i.test(q.label) ? names[i] : texts[i % texts.length];
        }
        if (v !== undefined && v !== null) answers[q.id] = v;
      }
      const r = await j(`/forms/${f.id}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers, timeTaken: 45 + i * 12, email: names[i].split(' ')[0].toLowerCase() + '@example.com', browserMetadata: { user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', ip_address: '127.0.0.1', tab_switches: 0, is_flagged: false } }) });
      if (r.s >= 300) console.log(f.title, r.s, JSON.stringify(r.b).slice(0, 200));
    }
    console.log('done', f.title, qs.map(q => q.type).join(','));
  }
})();

