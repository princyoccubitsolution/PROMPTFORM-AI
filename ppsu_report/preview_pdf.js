// Screenshots selected pages of the generated PDF in headless Edge for visual QA.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const pages = process.argv.slice(2).map(Number);
const pdf = 'file:///F:/PROMPTFROM/PromptForm_AI_PPSU_Final_Report.pdf';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--remote-debugging-port=9334',
    `--user-data-dir=${path.join(process.env.TEMP, 'ppsu_edge_pdf')}`, 'about:blank'], { stdio: 'ignore' });
  let t; for (let i = 0; i < 40; i++) { try { t = await (await fetch('http://127.0.0.1:9334/json')).json(); break; } catch { await sleep(500); } }
  const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const p = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (p[m.id]) { p[m.id](m); delete p[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; p[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1250, deviceScaleFactor: 1, mobile: false });
  fs.mkdirSync(path.join(__dirname, 'preview'), { recursive: true });
  for (const n of pages) {
    await send('Page.navigate', { url: `${pdf}#page=${n}&toolbar=0&view=FitH` }); await sleep(3500);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'preview', `p${n}.png`), Buffer.from(r.result.data, 'base64'));
    await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
  }
  ws.close(); edge.kill(); console.log('ok');
})();
