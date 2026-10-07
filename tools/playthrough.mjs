#!/usr/bin/env node
// Full-campaign integration test. Owned by: supervisor.
//   node tools/playthrough.mjs [--port 8100] [--shots dir]
// Drives the real game in headless Chrome (muted) through the flow API: new game → for each room
// (picking available rooms in order) enterRoom → intro cutscene → select → launchRoom → room →
// finishAction → minigame → finishMinigame → results → finishRoom → outro (+ midgame/prefinale) → hub,
// then the pond → party ending. Each scene is actually entered and rendered for a moment so runtime errors
// surface. Asserts: no crash/console error, 1–3 rooms available at every hub stop (2–3 when ≥2 remain),
// clock 10→19, skills granted per room, ultimates at prefinale, expected cutscene beats, party ending reached.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const port = Number(opt('--port', 8100)), shots = opt('--shots', null), cdpPort = port + 1000;
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('playthrough: no Chrome'); process.exit(0); }
if (shots && !existsSync(shots)) mkdirSync(shots, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--mute-audio', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pt-'))}`, '--window-size=960,540', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { server.kill(); } catch {} };
process.on('exit', cleanup);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let page;
for (let i = 0; i < 50 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json()).find((t) => t.type === 'page'); } catch {} if (!page) await sleep(200); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const problems = []; let where = 'boot';
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') problems.push(`[${where}] uncaught: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(`[${where}] console.error: ${m.params.args.map((a) => a.description ?? a.value).join(' ')}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(`[${where}] eval: ${r.result.exceptionDetails.exception?.description}`); return r.result?.result?.value; };
let shotN = 0;
const snap = async (name) => { if (!shots) return; const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(shots, `${String(shotN++).padStart(2, '0')}-${name}.png`), Buffer.from(s.result.data, 'base64')); };
const assert = (cond, msg) => { if (!cond) problems.push(`[${where}] ASSERT: ${msg}`); };
const settle = async (ms = 700) => { await sleep(ms); const c = await ev('return window.__game?.crashed ? JSON.stringify(window.__game.crashed) : null'); if (c) problems.push(`[${where}] crash: ${c}`); };
const scene = () => ev('return __game.sceneKey');

await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
await sleep(1500);
await ev('localStorage.clear(); return 1');
await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
await sleep(1500);
where = 'title'; await settle(); await snap('title');
const F = "const F = await import('/src/core/flow.js'); const S = await import('/src/core/state.js'); const T = await import('/src/core/theme.js');";

// follow cutscene chain without keypresses, recording ids
async function followCutscenes() {
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const k = await scene();
    if (k !== 'cutscene') break;
    const p = await ev('const p = __game.scene.p ?? __game.scene.params ?? {}; return { id: p.id, next: p.next };');
    seen.push(p?.id);
    where = `cutscene:${p?.id}`; await settle(500);
    if (['opening', 'midgame', 'prefinale'].includes(p?.id) || String(p?.id).startsWith('party')) await snap(`cutscene-${p?.id}`);
    const nx = p?.next ?? { scene: 'hub' };
    await ev(`__game.switchScene(${JSON.stringify(nx.scene)}, ${JSON.stringify(nx.params ?? {})}); return 1;`);
  }
  return seen;
}

where = 'newgame';
await ev(`${F} F.startNewGame(__game); return 1;`);
let seen = await followCutscenes();
assert(seen[0] === 'opening', `expected opening cutscene, got ${seen}`);
assert(await scene() === 'hub', 'expected hub after opening');
where = 'hub:start'; await settle(); await snap('hub-start');

const order = [];
for (let step = 0; step < 9; step++) {
  const st = await ev(`${F} const s=__game.state; return { avail: S.availableRooms(s, T.ROOMS), clock: s.clock, skills: s.skills, done: T.ROOM_IDS.filter(r=>s.rooms[r].done).length };`);
  const remaining = 9 - st.done;
  where = `hub#${step}`;
  assert(st.avail.length >= 1 && st.avail.length <= 3, `available rooms out of range: ${st.avail}`);
  if (remaining >= 3 && st.done > 0) assert(st.avail.length >= 2, `only ${st.avail.length} choice(s) with ${remaining} rooms left: ${st.avail}`);
  assert(st.clock === 10 + step, `clock ${st.clock} != ${10 + step}`);
  // prefer the deepest-first room except pond until last
  const roomId = st.avail.find((r) => r !== 'pond') ?? st.avail[0];
  order.push(`${roomId}(${st.avail.length})`);
  const hero = step % 2 ? 'victoria' : 'aaron';
  where = `${roomId}:intro`;
  const ok = await ev(`${F} return F.enterRoom(__game, ${JSON.stringify(roomId)});`);
  assert(ok, `enterRoom refused ${roomId}`);
  seen = await followCutscenes();
  assert(seen.includes(`${roomId}.intro`), `missing ${roomId}.intro (saw ${seen})`);
  assert(await scene() === 'select', `expected select after intro, got ${await scene()}`);
  where = `${roomId}:select`; await settle(); if (step < 2) await snap(`${roomId}-select`);
  const loadout = await ev(`${F} return __game.state.skills[${JSON.stringify(hero)}].filter(id => T.SKILLS[id]?.slot==='skill').slice(-2);`);
  where = `${roomId}:room`;
  await ev(`${F} F.launchRoom(__game, { roomId: ${JSON.stringify(roomId)}, hero: ${JSON.stringify(hero)}, loadout: ${JSON.stringify(loadout || [])} }); return 1;`);
  assert(await scene() === 'room', 'expected room scene');
  await settle(1500); await snap(`${roomId}-room-${hero}`);
  where = `${roomId}:minigame`;
  await ev(`${F} F.finishAction(__game, { roomId: ${JSON.stringify(roomId)}, hero: ${JSON.stringify(hero)}, victory: true, hpFrac: 0.7, timeSec: 60, enemiesDefeated: 10 }); return 1;`);
  assert(await scene() === 'minigame', 'expected minigame');
  await settle(1500); await snap(`${roomId}-minigame`);
  where = `${roomId}:results`;
  await ev(`${F} F.finishMinigame(__game, { roomId: ${JSON.stringify(roomId)}, success: true, score: 0.85, attempt: 1 }); return 1;`);
  assert(await scene() === 'results', 'expected results');
  await settle(1200); if (step < 2) await snap(`${roomId}-results`);
  const stars = await ev('return __game.scene.p?.stars ?? 2');
  where = `${roomId}:finish`;
  await ev(`${F} F.finishRoom(__game, ${JSON.stringify(roomId)}, ${Number(stars) || 2}); return 1;`);
  seen = await followCutscenes();
  assert(seen[0] === `${roomId}.outro`, `expected ${roomId}.outro first, saw ${seen}`);
  if (step === 3) assert(seen.includes('midgame'), `midgame beat missing after 4th room (saw ${seen})`);
  if (step === 7) assert(seen.includes('prefinale'), `prefinale beat missing after 8th room (saw ${seen})`);
  if (roomId === 'pond') { assert(seen.some((x) => String(x).startsWith('party')), `party ending missing (saw ${seen})`); }
  const after = await ev(`${F} const s=__game.state; return { done: s.rooms[${JSON.stringify(roomId)}].done, sk: s.skills, room: T.ROOMS[${JSON.stringify(roomId)}].skills };`);
  assert(after.done, `${roomId} not marked done`);
  for (const [h, sid] of Object.entries(after.room || {})) assert(after.sk[h].includes(sid), `${roomId}: ${h} did not get skill ${sid}`);
  if (step === 7) assert(after.sk.aaron.includes('pull_aggro') && after.sk.victoria.includes('boundaries'), 'ultimates not granted at prefinale');
}
where = 'end';
const endScene = await scene();
assert(['title', 'hub', 'cutscene'].includes(endScene), `unexpected end scene ${endScene}`);
const final = await ev(`${F} const s=__game.state; return { clock: s.clock, pp: s.partyPoints, done: T.ROOM_IDS.filter(r=>s.rooms[r].done).length, score: F.partyScore(s) };`);
assert(final.done === 9, `only ${final.done}/9 rooms done`);
assert(final.clock === 19, `final clock ${final.clock} != 19`);
await settle(); await snap('end');

ws.close(); cleanup();
console.log(`playthrough order: ${order.join(' → ')}`);
console.log(`final: ${JSON.stringify(final)}`);
if (problems.length) { console.error(`\nplaythrough: ${problems.length} problem(s):\n - ` + [...new Set(problems)].join('\n - ')); process.exit(1); }
console.log('playthrough: all ok');
process.exit(0);
