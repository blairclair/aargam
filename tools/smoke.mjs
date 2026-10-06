#!/usr/bin/env node
// Headless-Chrome smoke test. Owned by: supervisor. Zero deps (uses Node's global WebSocket + CDP).
//   node tools/smoke.mjs [--port 8101] [--shots dir] [extra query strings...]
// Starts a static server on --port, loads each scene URL, simulates a little input,
// and fails on uncaught exceptions, console.error, or the engine crash screen.
//   ONLY="scene=camp" node tools/smoke.mjs --port 8101      test a single URL
// Example: node tools/smoke.mjs --port 8101 "scene=level&region=summit&kind=boss&difficulty=5"
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const port = Number(opt('--port', 8100));
const shots = opt('--shots', null);
const cdpPort = port + 1000;

const urls = process.env.ONLY ? [process.env.ONLY] : [
  '',
  'scene=overworld',
  'scene=camp',
  ...['lakeside', 'oldcity', 'summit'].flatMap((r) => ['skirmish', 'rescue', 'defend'].map((k) => `scene=level&region=${r}&kind=${k}&difficulty=2&seed=3`)),
  'scene=level&region=summit&kind=boss&difficulty=5&seed=1&bossId=baron_brrr',
  'scene=ending&victory=1',
  ...args,
];

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('smoke: no Chrome found; skipping'); process.exit(0); }

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'smoke-'))}`, '--window-size=960,540', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { server.kill(); } catch {} };
process.on('exit', cleanup);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${cdpPort}/json`); const j = await r.json(); const p = j.find((t) => t.type === 'page'); if (p) return p; } catch {}
    await sleep(200);
  }
  throw new Error('chrome did not start');
}

const page = await targets();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const problems = [];
let current = '';
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') problems.push(`[${current}] uncaught: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(`[${current}] console.error: ${m.params.args.map((a) => a.description ?? a.value).join(' ')}`);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/.test(m.params.entry.url || '')) problems.push(`[${current}] ${m.params.entry.text} ${m.params.entry.url ?? ''}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const key = async (code, k, ms = 120) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k }); await sleep(ms); await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k }); };

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await sleep(500);
if (shots && !existsSync(shots)) mkdirSync(shots, { recursive: true });

for (const [i, q] of urls.entries()) {
  current = q || 'title';
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html${q ? '?' + q : ''}` });
  await sleep(1200);
  await evaluate('localStorage.clear()');
  // poke it: move, attack, ability, swap, special, click center
  await key('KeyD', 'd', 400); await key('KeyW', 'w', 300);
  await key('KeyJ', 'j'); await key('ShiftLeft', 'Shift'); await key('KeyQ', 'q'); await key('KeyE', 'e'); await key('KeyJ', 'j');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 600, y: 300 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 600, y: 300, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 600, y: 300, button: 'left', clickCount: 1 });
  await sleep(1500);
  const crashed = await evaluate('window.__game && window.__game.crashed ? JSON.stringify(window.__game.crashed) : null');
  if (crashed) problems.push(`[${current}] engine crash: ${crashed}`);
  const alive = await evaluate('!!window.__game');
  if (!alive) problems.push(`[${current}] game never booted (window.__game missing)`);
  if (shots) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(shots, `${String(i).padStart(2, '0')}-${current.replace(/[^\w]+/g, '_').slice(0, 60)}.png`), Buffer.from(shot.result.data, 'base64'));
  }
  console.log(`smoke: ${current} ... ${problems.some((p) => p.startsWith(`[${current}]`)) ? 'PROBLEMS' : 'ok'}`);
}

ws.close(); cleanup();
if (problems.length) { console.error(`\nsmoke: ${problems.length} problem(s):\n - ` + [...new Set(problems)].join('\n - ')); process.exit(1); }
console.log('smoke: all ok');
process.exit(0);
