// Private art gallery for the presentation team (not used by the game).
import { Assets, MANIFEST } from '../core/assets.js';
import * as S from './sprites.js';
import { Fx } from './fx.js';
import { Dialog } from '../ui/dialog.js';
import * as W from '../ui/widgets.js';

const q = new URLSearchParams(location.search);
const page = q.get('page') ?? 'heroes';
const T = Number(q.get('t') ?? 0.3);
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const assets = new Assets();
const man = Object.fromEntries(Object.entries(MANIFEST).map(([k, v]) => [k, '../../' + v]));
const game = { assets, time: T, width: 960, height: 540, input: { mouse: { x: -1, y: -1 }, pressed: () => false, down: () => false } };

function label(s, x, y) { ctx.fillStyle = '#fff6e5'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s, x, y); }
function bg(x, y, w, h, c = '#d8c79a') { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

const pages = {
  dialog() {
    const conv = [
      { who: 'aaron', text: 'I wrote PartyPlanner.exe to automate the prep. What could go wrong?', expr: 'happy' },
      { who: 'partyplanner', text: 'make_snacks(): sourdough starter granted sentience. You are welcome.' },
      { who: 'victoria', text: 'Aaron. ¿Qué hiciste?', expr: 'annoyed' },
      { who: 'narrator', text: 'Meanwhile, the sourdough starter began to grow.' },
    ];
    const steps = [0, 1, 2, 3];
    steps.forEach((st, n) => {
      const ox = (n % 2) * 700, oy = Math.floor(n / 2) * 400;
      ctx.save(); ctx.translate(ox, oy); ctx.scale(0.72, 0.72);
      ctx.beginPath(); ctx.rect(0, 0, 960, 540); ctx.clip();
      const gg = ctx.createLinearGradient(0, 0, 0, 540); gg.addColorStop(0, '#c98a5a'); gg.addColorStop(1, '#6e4a2c');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, 960, 540);
      const d = new Dialog(game); d.open(conv);
      for (let k = 0; k < st; k++) { d.i = k + 1; d._noteSpeaker(); }
      for (const c of Object.values(d.cast)) c.inT = 1;
      d.inT = 1; d.chars = n === 1 ? 30 : 999; d.t = 0.15; d.clock = T;
      d.render(ctx);
      ctx.restore();
    });
  },
  busts() {
    const g = ctx.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, '#f2c26b'); g.addColorStop(1, '#5a3a2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1400, 1000);
    ctx.fillStyle = '#1b2238'; ctx.fillRect(700, 0, 700, 500);
    const ex = ['smile', 'neutral', 'happy', 'surprised', 'annoyed', 'determined', 'worried', 'thinking'];
    ex.forEach((e, i) => {
      const x = 90 + i * 170;
      S.drawBust(ctx, game, 'aaron', e, x, 300, 260, { t: T, exprT: 0.12, talking: true });
      label('aaron ' + e, x, 320);
      S.drawBust(ctx, game, 'victoria', e, x, 640, 260, { t: T, exprT: 0.12, side: -1 });
      label('victoria ' + e, x, 660);
    });
    S.drawBust(ctx, game, 'aaron', 'smile', 200, 990, 300, { t: T, dim: 1 }); label('dim', 200, 985);
    S.drawBust(ctx, game, 'victoria', 'smile', 500, 990, 300, { t: T }); 
    S.drawBust(ctx, game, 'victoria', 'neutral', 800, 990, 300, { t: T, enter: 0.5 }); label('enter 0.5', 800, 985);
    S.drawBust(ctx, game, 'aaron', 'smile', 1100, 990, 90, { t: T }); label('small', 1100, 985);
    S.drawBust(ctx, game, 'victoria', 'smile', 1250, 990, 90, { t: T });
  },
  grid() {
    bg(0, 0, 1400, 1000, '#ffffff');
    const keys = (q.get('keys') ?? 'bust.aaron.smile,bust.victoria.smile,bust.victoria.neutral').split(',');
    let x = 10;
    for (const k of keys) {
      const im = assets.image(k); if (!im) continue;
      const sc = Number(q.get('sc') ?? 0.9);
      ctx.drawImage(im, x, 10, im.naturalWidth * sc, im.naturalHeight * sc);
      ctx.strokeStyle = 'rgba(255,0,0,0.35)'; ctx.fillStyle = 'red'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
      for (let v = 0; v <= im.naturalHeight; v += 25) { const yy = 10 + v * sc; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + im.naturalWidth * sc, yy); ctx.stroke(); if (v % 50 === 0) ctx.fillText(v, x + 1, yy - 1); }
      for (let u = 0; u <= im.naturalWidth; u += 25) { const xx = x + u * sc; ctx.beginPath(); ctx.moveTo(xx, 10); ctx.lineTo(xx, 10 + im.naturalHeight * sc); ctx.stroke(); if (u % 50 === 0) ctx.fillText(u, xx + 1, 20); }
      x += im.naturalWidth * sc + 20;
    }
  },
  ui() {
    bg(0, 0, 1400, 1000, '#4f8fb3');
    const lines = [
      { who: 'aaron', text: 'Is that... a Frostling? It is SO small. And so angry.' },
      { who: 'baron', text: 'Mwa-ha-brrr! Summer is CANCELLED, peasants. Bring me your sprinkles.' },
      { who: 'narrator', text: 'Meanwhile, at the lakeside camp, the last scoop of mint chip began to tremble.' },
      { who: 'townsfolk', text: 'Thank you! I thought I would be a popsicle forever!' },
    ];
    lines.forEach((l, i) => {
      const d = new Dialog(game); d.open([l, l]); d.inT = 1; d.chars = 999; d.t = T;
      ctx.save(); ctx.translate(0, -400 + i * 170); d.render(ctx); ctx.restore();
    });
    W.panel(ctx, 980, 40, 380, 300, { style: 'paper' });
    W.button(ctx, game, 'New Game', 1010, 70, 200, 46, { primary: true, sub: 'Start a fresh summer' });
    W.button(ctx, game, 'Continue', 1010, 130, 200, 44, { hotkey: 'C' });
    W.button(ctx, game, 'Disabled', 1010, 190, 200, 44, { disabled: true });
    W.button(ctx, game, 'Selected', 1010, 250, 200, 44, { selected: true, style: 'ice' });
    W.bar(ctx, 1010, 310, 200, 12, 0.6, '#8cff9e', 'rgba(0,0,0,0.5)', { ghost: 0.8 });
    W.ring(ctx, 1250, 100, 20, 0.4); W.ring(ctx, 1300, 100, 20, 0);
    W.chip(ctx, 'NEW', 1250, 150); W.keycap(ctx, 'Q', 1320, 150);
    W.drawScoopIcon(ctx, 1250, 200); W.drawSunIcon(ctx, 1290, 200);
  },
  heroes() {
    bg(0, 0, 1400, 1000, '#cdbb8c');
    const anims = ['idle', 'walk', 'attack', 'dash', 'hurt', 'down'];
    ['aaron', 'victoria'].forEach((id, r) => {
      anims.forEach((a, i) => {
        [0, Math.PI].forEach((f, k) => {
          const x = 70 + i * 220 + k * 100, y = 160 + r * 230;
          S.drawHero(ctx, game, id, x, y, { anim: a, facing: f + (a === 'attack' ? 0.3 : 0), t: T, progress: a === 'attack' ? 0.55 : a === 'hurt' ? 0.2 : undefined, scale: 1.6 });
          label(`${a} ${k ? 'L' : 'R'}`, x, y + 30);
        });
      });
    });
    // flash, shield, small scale, walk frames
    S.drawHero(ctx, game, 'aaron', 100, 720, { flash: 0.8, scale: 1.6 }); label('flash', 100, 750);
    S.drawHero(ctx, game, 'victoria', 250, 720, { shield: 1, facing: 0, scale: 1.6 }); label('shield', 250, 750);
    S.drawHero(ctx, game, 'victoria', 400, 720, { flash: 0.8, scale: 1.6 }); label('flash', 400, 750);
    for (let i = 0; i < 6; i++) { S.drawHero(ctx, game, 'aaron', 520 + i * 50, 720, { anim: 'walk', t: i * 0.1 }); S.drawHero(ctx, game, 'victoria', 520 + i * 50, 820, { anim: 'walk', t: i * 0.1 }); }
    for (let i = 0; i < 5; i++) { S.drawHero(ctx, game, 'aaron', 860 + i * 100, 720, { anim: 'attack', progress: i / 4, facing: 0, scale: 1.4 }); S.drawHero(ctx, game, 'victoria', 860 + i * 100, 900, { anim: 'attack', progress: i / 4, facing: -0.4, scale: 1.4 }); }
    S.drawPortrait(ctx, game, 'aaron', 100, 900, 50, { ring: '#ffc94a' });
    S.drawPortrait(ctx, game, 'victoria', 230, 900, 50);
  },
  enemies() {
    bg(0, 0, 1400, 1000, '#cdbb8c');
    const types = ['frostling', 'brainfreezer', 'popsicle_knight', 'slush_golem', 'baron_brrr'];
    const anims = ['idle', 'move', 'attack', 'hurt'];
    types.forEach((ty, r) => {
      anims.forEach((a, i) => {
        const x = 80 + i * 260, y = 120 + r * 170 + (r > 2 ? (r - 2) * 30 : 0);
        S.drawEnemy(ctx, game, ty, x, y, { anim: a, t: T, facing: 0, progress: 0.5, hpFrac: 0.6 });
        S.drawEnemy(ctx, game, ty, x + 110, y, { anim: a, t: T + 0.2, facing: Math.PI, progress: 0.7, flash: a === 'hurt' ? 0.7 : 0, phase: a === 'hurt' ? 3 : undefined });
        label(`${ty} ${a}`, x + 55, y + 22);
      });
    });
    S.drawEnemy(ctx, game, 'popsicle_knight', 1150, 120, { facing: Math.PI / 2 }); label('kn down', 1150, 140);
    S.drawEnemy(ctx, game, 'popsicle_knight', 1250, 120, { facing: -Math.PI / 2 }); label('kn up', 1250, 140);
    for (let i = 0; i < 6; i++) S.drawNPC(ctx, game, 'townsfolk', 1110 + (i % 3) * 90, 280 + Math.floor(i / 3) * 90, { seed: i + 1, frozen: i === 0 ? true : i === 1 ? 0.5 : false, freed: i === 2 ? 0.3 : 0, t: T });
  },
  world() {
    const regs = ['lakeside', 'oldcity', 'summit'];
    regs.forEach((rg, i) => {
      ctx.save(); ctx.beginPath(); ctx.rect(0, i * 330, 1400, 320); ctx.clip(); ctx.translate(0, i * 330);
      S.drawGround(ctx, game, rg, 300 + i * 777, 200, 700, 320);
      ctx.save(); ctx.beginPath(); ctx.rect(700, 0, 700, 320); ctx.clip(); ctx.translate(700, 0);
      S.drawGround(ctx, game, rg, 300 + i * 777, 200, 700, 320, { frost: 0.7 });
      ctx.restore();
      const kinds = S.PROP_KINDS ?? [];
      kinds.forEach((k, j) => {
        const x = 50 + (j % 12) * 112, y = 150 + Math.floor(j / 12) * 150;
        S.drawProp(ctx, game, k, x, y, { region: rg, frost: x > 700 ? 0.7 : 0, seed: j, t: T });
        label(k, x, y + 14);
      });
      ctx.restore();
    });
  },
  fx() {
    bg(0, 0, 1400, 1000, '#7aa36b');
    const kinds = ['mintscoop', 'slush', 'icicle', 'shout'];
    kinds.forEach((k, i) => { S.drawProjectile(ctx, game, k, 100 + i * 150, 100, { r: k === 'shout' ? 50 : undefined, angle: 0.4, t: T, life: 0.5 }); label(k, 100 + i * 150, 170); });
    (S.ZONE_KINDS ?? []).forEach((k, i) => { S.drawZone?.(ctx, game, k, 120 + i * 220, 330, 70, { t: T, life: 0.5 }); label(k, 120 + i * 220, 420); });
    (S.PICKUP_KINDS ?? []).forEach((k, i) => { S.drawPickup?.(ctx, game, k, 100 + i * 100, 520, { t: T }); label(k, 100 + i * 100, 540); });
    const fx = new Fx();
    fx.burst(200, 750, '#bfe9ff', 20, 120); fx.floatText(400, 750, '-18', '#ff5d5d'); fx.floatText(500, 750, '+3 scoops', '#7fd8a6');
    fx.sparkle?.(700, 750); fx.snowPuff?.(850, 750); fx.splat?.(1000, 750, '#7fd8a6'); fx.thaw?.(1200, 750);
    for (let i = 0; i < 8; i++) fx.update(0.03);
    fx.render(ctx);
  },
};

assets.loadAll(man).then(() => {
  (pages[page] ?? pages.heroes)();
  window.__ready = true;
});
