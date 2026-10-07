// Playroom minigame: CARD DUEL — a tiny lane card battle against PartyPlanner's board-game army
// (a loving Magic: The Gathering nod: tap lands for mana, cast guests, swing). Owned by: games-d.
import { PALETTE, FONT } from '../core/theme.js';
import { finishMinigame } from '../core/flow.js';
import { text, panel, button, bar, keycap } from '../ui/widgets.js';
import { Fx } from '../art/fx.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { bark } from '../story/lines.js';
import { PARTY_CARDS, PARTY_POOL, PIECES, TRICKS, drawCard, drawToken, drawLand } from './d/cards.js';
import { readParams, drawBust, drawBubble, clamp, RAVENS } from './d/common.js';

const LANE_X = [330, 480, 630];
const FOE_Y = 168, YOU_Y = 300;
const HAND_Y = 384, CARD_W = 112, CARD_H = 150;
const END_BTN = { x: 790, y: 452, w: 140, h: 56 };
const FOE_BADGE = { x: 120, y: FOE_Y }, YOU_BADGE = { x: 120, y: YOU_Y };

const unitFrom = (def, side) => ({ id: def.id, name: def.name, atk: def.atk, hp: def.hp, maxHp: def.hp, first: !!def.first, color: def.color, side, spawn: 0, lunge: 0, flash: 0, dead: false });

export default class CardDuel {
  constructor(game) { this.game = game; }

  enter(params) {
    this.p = readParams(params);
    const { attempt, playlist } = this.p;
    this.maxRounds = 8 + (playlist ? 2 : 0) + (attempt >= 2 ? 1 : 0);
    this.maxHp = { you: 15 + (attempt >= 3 ? 3 : 0), foe: attempt >= 3 ? 11 : attempt === 2 ? 13 : 14 };
    this.hp = { ...this.maxHp };
    this.shownHp = { ...this.hp };
    this.board = { you: [null, null, null], foe: [null, null, null] };
    this.hand = [];
    this.round = 0; this.mana = 0; this.maxMana = 0;
    this.sel = -1;
    this.queue = []; this.cur = null;
    this.phase = 'intro'; this.t = 0; this.phaseT = 0;
    this.fx = new Fx();
    this.banner = null;       // { text, sub, color, t, dur }
    this.reveal = null;       // trick card reveal { trick, t }
    this.flyer = null;        // card flying to target
    this.legendGiven = false;
    this.tricksUsed = new Set();
    this.guide = true; this.placedOnce = false;
    this.mood = 'idle'; this.moodK = 0; this.say = null; this.sayT = 0;
    this.shake = 0; this.flashScreen = 0;
    this.done = false; this.overT = 0; this.success = false;
    this.denied = null;
    playMusic('minigame');
    this._enqueue(1.1, () => { this._banner('CARD DUEL!', 'Beat PartyPlanner\'s board-game army', RAVENS.goldLite, 1.1); this._bark('minigame', 3); playSfx('card'); });
    this._enqueue(0, () => this._startRound());
  }

  exit() {}

  // ------------------------------------------------------------------ helpers
  _enqueue(dur, fn) { this.queue.push({ dur, fn }); }
  _now(dur, fn) { this.queue.unshift({ dur, fn }); }
  get busy() { return !!this.cur || this.queue.length > 0; }
  _banner(text, sub, color = PALETTE.paper, dur = 1) { this.banner = { text, sub, color, t: 0, dur }; }
  _bark(ev, dur = 2.4) { const b = bark('playroom', ev, { hero: this.p.hero }); if (b?.text) { this.say = b.text; this.sayT = dur; } }
  _react(mood, k = 1) { this.mood = mood; this.moodK = k; }
  _draw() {
    const id = PARTY_POOL[Math.floor(Math.random() * PARTY_POOL.length)];
    return { ...PARTY_CARDS[id] };
  }
  handPos(i, n = this.hand.length) { const sp = n > 3 ? 122 : 128; return { x: 480 + (i - (n - 1) / 2) * sp - CARD_W / 2, y: HAND_Y }; }
  slotPos(side, lane) { return { x: LANE_X[lane], y: side === 'you' ? YOU_Y : FOE_Y }; }

  // ------------------------------------------------------------------ round flow
  _startRound() {
    this.round++;
    this.phase = 'foe';
    this.maxMana = Math.min(this.round + 1, 6);
    this.mana = this.maxMana;
    let foeMana = Math.min(this.round === 1 ? 1 : this.round + 2, 7) - (this.p.attempt >= 3 ? 2 : this.p.attempt === 2 ? 1 : 0);
    const last = this.round === this.maxRounds;
    this._enqueue(0.7, () => this._banner(last ? 'FINAL ROUND!' : `ROUND ${this.round}`, last ? 'Last chance to win the table' : null, last ? PALETTE.danger : PALETTE.paper, 0.7));
    // PartyPlanner trick cards (one-time surprises)
    const trick = this.round === 3 ? (this.board.you.filter(Boolean).length >= 2 ? 'reverse' : 'flip') : this.round === 5 ? 'monopoly' : this.round === 7 && !this.tricksUsed.has('flip') ? 'flip' : null;
    if (trick && !this.tricksUsed.has(trick)) {
      this.tricksUsed.add(trick);
      this._enqueue(1.7, () => { this.reveal = { trick: TRICKS[trick], t: 0 }; this.shake = 8; playSfx('error'); });
      this._enqueue(0.6, () => { this.reveal = null; if (trick === 'monopoly') foeMana += 2; else this._applyTrick(trick); });
    }
    // AI places pieces (telegraphed before your turn so you can answer)
    this._enqueue(0, () => this._foePlace(foeMana));
  }

  _applyTrick(id) {
    if (id === 'flip') {
      this.shake = 12;
      this.board.you.forEach((u, lane) => { if (u) this._damage(u, 3, 'you', lane); });
      this._enqueue(0.4, () => this._reap());
    } else if (id === 'reverse') {
      const b = this.board.you; this.board.you = [b[2], b[1], b[0]];
      for (const u of this.board.you) if (u) u.spawn = 0;
      playSfx('swap');
    }
  }

  _foePlace(mana) {
    const pool = this.round === 1 ? ['pawn'] : this.round <= 2 ? ['pawn', 'soldier'] : this.round <= 4 ? ['pawn', 'soldier', 'knight', 'rook'] : ['soldier', 'knight', 'rook', 'jack', 'queen'];
    let guard = 6;
    while (guard-- > 0) {
      const empty = [0, 1, 2].filter((l) => !this.board.foe[l]);
      if (!empty.length) break;
      const afford = pool.filter((id) => PIECES[id].cost <= mana);
      if (!afford.length) break;
      afford.sort((a, b) => PIECES[b].cost - PIECES[a].cost);
      const id = Math.random() < 0.7 ? afford[0] : afford[Math.floor(Math.random() * afford.length)];
      // round 1 tutorial: one pawn in the middle
      let lane;
      if (this.round === 1) lane = 1;
      else {
        // half the time block your strongest guest, otherwise go for an open lane to hit your face
        const threatened = empty.filter((l) => this.board.you[l]).sort((a, b) => this.board.you[b].atk - this.board.you[a].atk);
        const open = empty.filter((l) => !this.board.you[l]);
        if (threatened.length && (Math.random() < 0.5 || !open.length)) lane = threatened[0];
        else lane = (open.length ? open : empty)[Math.floor(Math.random() * (open.length || empty.length))];
      }
      mana -= PIECES[id].cost;
      const L = lane;
      this._enqueue(0.42, () => { this.board.foe[L] = unitFrom(PIECES[id], 'foe'); playSfx('card'); const s = this.slotPos('foe', L); this.fx.ringPulse(s.x, s.y + 40, PALETTE.frost, 50, 0.35, 3); });
      if (this.round === 1) break;
    }
    this._enqueue(0, () => this._drawUp());
  }

  _drawUp() {
    if (this.round === 1) this.hand = [{ ...PARTY_CARDS.golem }, { ...PARTY_CARDS.bolt }, { ...PARTY_CARDS.guest }];
    else while (this.hand.length < 3) this.hand.push(this._draw());
    // dramatic final turn: the legendary card shows up
    const last = this.round === this.maxRounds;
    if (!this.legendGiven && (this.hp.foe <= this.maxHp.foe / 2 || last) && this.round > 1) {
      this.legendGiven = true;
      this._enqueue(1.5, () => {
        this.hand.push({ ...PARTY_CARDS.party, fresh: 1 });
        this._banner('PARTY TIME!', 'A legendary card appeared in your hand', RAVENS.goldLite, 1.5);
        this.flashScreen = 1; this.fx.confetti(480, 420, 50); playSfx('star'); this._react('cheer');
      });
    }
    this._enqueue(0, () => { this.phase = 'you'; this.phaseT = 0; this.sel = -1; });
  }

  _endTurn() {
    if (this.phase !== 'you' || this.busy) return;
    this.phase = 'clash'; this.sel = -1; this.guide = false;
    this._enqueue(0.55, () => { this._banner('CLASH!', null, RAVENS.goldLite, 0.55); playSfx('swing'); });
    for (let lane = 0; lane < 3; lane++) this._clashLane(lane, 1);
    this._enqueue(0, () => this._afterClash());
  }

  /** Queue one lane's fight. mult: damage multiplier (2 for the legendary). onlyYou: foe doesn't swing back. */
  _clashLane(lane, mult = 1, onlyYou = false) {
    this._enqueue(0, () => {
      const y = this.board.you[lane], f = this.board.foe[lane];
      if (!y && !f) return;
      if (!y && onlyYou) return;
      const steps = [];
      if (y && f) {
        if (y.first || onlyYou) {
          steps.push([y, () => this._damage(f, y.atk * mult, 'foe', lane)]);
          if (!onlyYou) steps.push([f, () => { if (!f.dead && f.hp > 0) this._damage(y, f.atk, 'you', lane); }]);
        } else steps.push([y, () => { this._damage(f, y.atk * mult, 'foe', lane); this._damage(y, f.atk, 'you', lane); }, f]);
      } else if (y) steps.push([y, () => this._face('foe', y.atk * mult, lane)]);
      else if (!onlyYou) steps.push([f, () => this._face('you', f.atk, lane)]);
      // run in order, after current item
      const items = [];
      for (const [u, hit, u2] of steps) {
        items.push({ dur: 0.16, fn: () => { u.lunge = 1; if (u2) u2.lunge = 1; playSfx('swing'); } });
        items.push({ dur: 0.34, fn: hit });
      }
      items.push({ dur: 0.05, fn: () => this._reap() });
      this.queue.unshift(...items);
    });
  }

  _damage(u, n, side, lane) {
    if (!u || n <= 0) return;
    u.hp -= n; u.flash = 1;
    const s = this.slotPos(side, lane);
    this.fx.floatText(s.x, s.y - 30, `-${n}`, PALETTE.danger, { big: n >= 4 });
    this.fx.burst(s.x, s.y, side === 'foe' ? PALETTE.frost : PALETTE.sun, 10, 140);
    this.shake = Math.max(this.shake, 3 + n);
    playSfx('hit');
    if (u.hp <= 0) u.dead = true;
  }

  _face(side, n, lane) {
    if (n <= 0) return;
    this.hp[side] = Math.max(0, this.hp[side] - n);
    const b = side === 'foe' ? FOE_BADGE : YOU_BADGE;
    this.fx.floatText(b.x + 40, b.y - 10, `-${n}`, PALETTE.danger, { big: true });
    this.fx.burst(b.x, b.y, side === 'foe' ? PALETTE.frost : PALETTE.danger, 16, 180);
    this.shake = Math.max(this.shake, 6 + n);
    playSfx(side === 'foe' ? 'kick' : 'hurt');
    if (side === 'foe') { this._react('happy'); if (n >= 3 && Math.random() < 0.5) this._bark('hit', 1.6); } else this._react('oops');
    this.faceHit = { side, lane, t: 0 };
  }

  _reap() {
    for (const side of ['you', 'foe']) this.board[side].forEach((u, lane) => {
      if (u && (u.dead || u.hp <= 0)) {
        const s = this.slotPos(side, lane);
        this.fx.snowPuff(s.x, s.y + 20, 14, PALETTE.paper);
        this.fx.burst(s.x, s.y, side === 'foe' ? PALETTE.frostDeep : '#e98aa8', 14, 160);
        this.board[side][lane] = null;
        if (side === 'foe') playSfx('squish');
      }
    });
  }

  _afterClash() {
    if (this._checkOver()) return;
    if (this.round >= this.maxRounds) { this._over(this.hp.you / this.maxHp.you > this.hp.foe / this.maxHp.foe); return; }
    this._startRound();
  }

  _checkOver() {
    if (this.hp.foe <= 0) { this._over(true); return true; }
    if (this.hp.you <= 0) { this._over(false); return true; }
    return false;
  }

  _over(win) {
    if (this.phase === 'over') return;
    this.phase = 'over'; this.overT = 0; this.success = win; this.queue = []; this.cur = null;
    const hpFrac = this.hp.you / this.maxHp.you;
    this.score = win ? clamp(0.5 + 0.35 * hpFrac + 0.15 * (1 - (this.round - 1) / this.maxRounds), 0, 1) : clamp(0.25 * (1 - this.hp.foe / this.maxHp.foe), 0, 0.25);
    if (win) { this.fx.confetti(480, 200, 70); this.fx.thaw(FOE_BADGE.x, FOE_BADGE.y, 70); playSfx('victory'); this._react('cheer'); this._bark('minigameWin', 5); }
    else { playSfx('defeat'); this._react('oops'); this._bark('minigameFail', 5); }
  }

  // ------------------------------------------------------------------ casting
  _tryCard(i) {
    const c = this.hand[i];
    if (!c) return;
    if (c.cost > this.mana) {
      this.denied = { i, t: 0.45 }; playSfx('error');
      return;
    }
    if (c.target === 'none') { this._cast(i, null); return; }
    this.sel = this.sel === i ? -1 : i;
    playSfx('click');
  }

  _validLane(card, lane) {
    if (!card) return false;
    if (card.type === 'creature') return !this.board.you[lane];
    return true; // bolt: piece or face in that lane
  }

  _cast(i, lane) {
    const c = this.hand[i];
    if (!c || c.cost > this.mana) return;
    if (lane != null && !this._validLane(c, lane)) { playSfx('error'); return; }
    this.mana -= c.cost;
    this.hand.splice(i, 1);
    this.sel = -1;
    const from = this.handPos(i, this.hand.length + 1);
    const to = lane != null ? this.slotPos(c.type === 'creature' ? 'you' : 'foe', lane) : { x: 480, y: 250 };
    this.flyer = { card: c, fx: from.x + CARD_W / 2, fy: from.y + CARD_H / 2, tx: to.x, ty: to.y, t: 0, dur: 0.28 };
    playSfx('card');
    this._enqueue(0.28, () => {});
    this._enqueue(0.12, () => { this.flyer = null; this._resolve(c, lane); });
  }

  _resolve(c, lane) {
    if (c.type === 'creature') {
      const u = unitFrom(c, 'you');
      this.board.you[lane] = u;
      const s = this.slotPos('you', lane);
      this.fx.ringPulse(s.x, s.y + 40, c.color, 60, 0.4, 4);
      this.fx.sparkle(s.x, s.y, PALETTE.sun, 10, 30);
      this.placedOnce = true;
      this._react('happy', 0.8);
    } else if (c.id === 'bolt') {
      const f = this.board.foe[lane], s = this.slotPos('foe', lane);
      this.fx.confetti(s.x, s.y + 20, 36);
      this.flashScreen = 0.5;
      if (f) { this._damage(f, c.dmg, 'foe', lane); this._enqueue(0.3, () => this._reap()); }
      else this._face('foe', c.dmg, lane);
      this._enqueue(0, () => this._checkOver());
    } else if (c.id === 'snack') {
      this.hp.you = Math.min(this.maxHp.you, this.hp.you + c.heal);
      this.fx.floatText(YOU_BADGE.x + 40, YOU_BADGE.y - 10, `+${c.heal}`, PALETTE.heal, { big: true });
      this.fx.sparkle(YOU_BADGE.x, YOU_BADGE.y, PALETTE.heal, 12, 30);
      this.board.you.forEach((u, l) => { if (u) { u.atk++; u.hp++; u.maxHp++; const s = this.slotPos('you', l); this.fx.sparkle(s.x, s.y, PALETTE.sun, 8, 26); this.fx.floatText(s.x, s.y - 40, '+1/+1', PALETTE.sun); } });
      playSfx('pickup'); this._react('happy');
    } else if (c.id === 'party') {
      this.flashScreen = 1; this.shake = 10;
      this._banner('HOUSEWARMING!', 'Every guest swings twice as hard!', RAVENS.goldLite, 1.2);
      for (let i = 0; i < 5; i++) this.fx.confetti(200 + i * 140, 360, 30);
      playSfx('victory'); this._react('cheer'); this._bark('hit', 1.6);
      this._enqueue(0.9, () => {});
      for (let l = 0; l < 3; l++) this._clashLane(l, 2, true);
      this._enqueue(0, () => this._checkOver());
    }
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    this.t += dt; this.phaseT += dt;
    const g = this.game, inp = g.input, m = inp.mouse;
    // run the action queue
    let guard = 20;
    while (guard-- > 0) {
      if (this.cur) { this.cur.t -= dt; if (this.cur.t > 0) break; this.cur = null; dt = 0; continue; }
      if (!this.queue.length) break;
      const it = this.queue.shift();
      this.cur = it; it.t = it.dur; it.fn?.();
      if (this.cur === it && it.dur <= 0) this.cur = null;
    }
    dt = 1 / 60;
    // animations
    for (const side of ['you', 'foe']) for (const u of this.board[side]) if (u) { u.spawn = Math.min(1, u.spawn + dt * 4); u.lunge = Math.max(0, u.lunge - dt * 3.2); u.flash = Math.max(0, u.flash - dt * 4); }
    for (const k of ['you', 'foe']) this.shownHp[k] += (this.hp[k] - this.shownHp[k]) * Math.min(1, dt * 8);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.reveal) this.reveal.t += dt;
    if (this.flyer) this.flyer.t += dt;
    if (this.denied) { this.denied.t -= dt; if (this.denied.t <= 0) this.denied = null; }
    for (const c of this.hand) if (c.fresh) c.fresh = Math.max(0, c.fresh - dt * 0.5);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flashScreen = Math.max(0, this.flashScreen - dt * 2.5);
    this.moodK = Math.max(0, this.moodK - dt * 1.4);
    this.sayT = Math.max(0, this.sayT - dt);
    this.fx.update(dt);

    if (this.phase === 'over') {
      this.overT += dt;
      if (this.overT > 0.4 && Math.random() < dt * 2 && this.success) this.fx.confetti(200 + Math.random() * 560, 120, 16);
      if (this.overT > 1.4 && (inp.pressed('confirm') || m.pressed)) this._finish();
      if (this.overT > 9) this._finish();
      return;
    }
    if (this.phase !== 'you' || this.busy) return;

    // ---- player input
    const keyLane = ['Digit1', 'Digit2', 'Digit3'].findIndex((k) => inp.pressed(k));
    if (keyLane >= 0) {
      if (this.sel >= 0) this._cast(this.sel, keyLane);
      else this._tryCard(keyLane);
    }
    if (inp.pressed('Digit4') && this.sel < 0 && this.hand[3]) this._tryCard(3);
    if (inp.pressed('back')) this.sel = -1;
    if (m.pressed) {
      const hi = this._handAt(m.x, m.y);
      if (hi >= 0) this._tryCard(hi);
      else if (this.sel >= 0) {
        const lane = this._laneAt(m.x, m.y);
        if (lane >= 0) this._cast(this.sel, lane); else this.sel = -1;
      }
    }
    const endClicked = button(null, g, 'End Turn', END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    if ((endClicked || (inp.pressed('confirm') && this.sel < 0)) && this.phaseT > 0.6) this._endTurn();
  }

  _handAt(x, y) {
    for (let i = this.hand.length - 1; i >= 0; i--) { const p = this.handPos(i); if (x >= p.x && x <= p.x + CARD_W && y >= p.y - 20 && y <= p.y + CARD_H) return i; }
    return -1;
  }
  _laneAt(x, y) {
    if (y < 100 || y > 370) return -1;
    return LANE_X.findIndex((lx) => Math.abs(x - lx) < 70);
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    finishMinigame(this.game, { roomId: this.p.roomId ?? 'playroom', success: this.success, score: this.score ?? 0, attempt: this.p.attempt });
  }

  // ------------------------------------------------------------------ render
  render(ctx) {
    const g = this.game, W = g.width, H = g.height;
    this._drawTable(ctx, W, H);
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this._drawLanes(ctx);
    this._drawBadges(ctx);
    for (const side of ['foe', 'you']) this.board[side].forEach((u, lane) => {
      if (!u) return;
      const s = this.slotPos(side, lane), dir = side === 'you' ? -1 : 1;
      const lungeK = Math.sin(Math.min(1, 1 - u.lunge) * Math.PI) * (u.lunge > 0 ? 1 : 0);
      const drop = (1 - easeOut(u.spawn)) * -60;
      drawToken(ctx, u, s.x, s.y + drop + dir * lungeK * 34, { flash: u.flash, t: this.t, alpha: Math.min(1, u.spawn * 2), scale: 1 + lungeK * 0.08 });
    });
    this.fx.render(ctx);
    ctx.restore();
    this._drawHand(ctx);
    this._drawMana(ctx);
    this._drawEnd(ctx);
    this._drawGuide(ctx);
    if (this.flyer) {
      const f = this.flyer, k = easeOut(clamp(f.t / f.dur, 0, 1));
      const x = f.fx + (f.tx - f.fx) * k, y = f.fy + (f.ty - f.fy) * k, s = 1 - 0.45 * k;
      ctx.save(); ctx.translate(x, y); ctx.rotate((1 - k) * 0.3); ctx.scale(s, s);
      drawCard(ctx, f.card, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, { glow: 1, t: this.t });
      ctx.restore();
    }
    if (this.reveal) this._drawReveal(ctx);
    if (this.banner) this._drawBanner(ctx);
    if (this.flashScreen > 0) { ctx.fillStyle = `rgba(255,236,170,${0.45 * this.flashScreen})`; ctx.fillRect(0, 0, W, H); }
    drawBust(ctx, g, this.p.hero, 64, 474, { size: 104, k: this.moodK, mood: this.moodK > 0.05 ? this.mood : 'idle', beat: (this.t * 1.5) % 1 });
    if (this.sayT > 0) drawBubble(ctx, this.say, 126, 432, { alpha: Math.min(1, this.sayT * 3), maxW: 120, font: 'bold 12px "Trebuchet MS", sans-serif' });
    if (this.phase === 'over') this._drawOver(ctx);
  }

  _drawTable(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a2a40'); g.addColorStop(1, '#22182a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // wooden table
    ctx.fillStyle = '#7a4e33'; rrect(ctx, 200, 70, 560, 312, 22); ctx.fill();
    ctx.fillStyle = '#8f5d3e'; rrect(ctx, 206, 76, 548, 300, 18); ctx.fill();
    // felt playmat
    const f = ctx.createLinearGradient(0, 84, 0, 368);
    f.addColorStop(0, '#2c5a7a'); f.addColorStop(0.5, '#335f6e'); f.addColorStop(1, '#4b3a6a');
    ctx.fillStyle = f; rrect(ctx, 216, 84, 528, 284, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,106,0.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(226, 234); ctx.lineTo(734, 234); ctx.stroke(); ctx.setLineDash([]);
    // toy clutter for flavor
    for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#e98aa8', PALETTE.sun, PALETTE.mint, PALETTE.sky][i % 4]; ctx.beginPath(); ctx.arc(30 + i * 28, 30 + (i % 2) * 10, 7, 0, Math.PI * 2); ctx.fill(); }
  }

  _drawLanes(ctx) {
    const selCard = this.sel >= 0 ? this.hand[this.sel] : null;
    for (let l = 0; l < 3; l++) {
      const x = LANE_X[l];
      const ok = selCard && this._validLane(selCard, l);
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
      ctx.save();
      ctx.fillStyle = ok ? `rgba(255,217,106,${0.14 + 0.12 * pulse})` : 'rgba(255,255,255,0.05)';
      rrect(ctx, x - 62, 104, 124, 260, 12); ctx.fill();
      if (ok) { ctx.strokeStyle = RAVENS.goldLite; ctx.lineWidth = 3; rrect(ctx, x - 62, 104, 124, 260, 12); ctx.stroke(); }
      // empty slot outlines
      for (const [side, y] of [['foe', FOE_Y], ['you', YOU_Y]]) {
        if (this.board[side][l]) continue;
        ctx.strokeStyle = 'rgba(255,246,229,0.22)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        rrect(ctx, x - 46, y - 50, 92, 100, 10); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
      keycap(ctx, String(l + 1), x - 52, 234, { small: true });
      if (ok && selCard.id === 'bolt') { ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * pulse; drawCrosshair(ctx, x, FOE_Y); ctx.restore(); }
    }
  }

  _drawBadges(ctx) {
    // PartyPlanner
    const fb = FOE_BADGE, yb = YOU_BADGE;
    panel(ctx, fb.x - 100, fb.y - 46, 180, 92, { radius: 12, style: 'ice' });
    ctx.save(); ctx.fillStyle = '#0d1a14'; rrect(ctx, fb.x - 90, fb.y - 36, 44, 36, 5); ctx.fill();
    ctx.fillStyle = PALETTE.mint; ctx.font = 'bold 12px monospace'; ctx.fillText('>_', fb.x - 82, fb.y - 14);
    ctx.restore();
    text(ctx, 'PartyPlanner', fb.x - 40, fb.y - 22, { font: 'bold 13px "Trebuchet MS", sans-serif', color: PALETTE.mint });
    text(ctx, '.exe', fb.x - 40, fb.y - 7, { font: FONT.small, color: PALETTE.frost });
    heartBar(ctx, fb.x - 90, fb.y + 12, 160, this.shownHp.foe, this.hp.foe, this.maxHp.foe, PALETTE.frostDeep);
    // You (the party)
    panel(ctx, yb.x - 100, yb.y - 46, 180, 92, { radius: 12, stroke: PALETTE.sun });
    text(ctx, 'The Party', yb.x - 88, yb.y - 16, { font: 'bold 16px "Trebuchet MS", sans-serif', color: PALETTE.sun });
    heartBar(ctx, yb.x - 90, yb.y + 6, 160, this.shownHp.you, this.hp.you, this.maxHp.you, PALETTE.heal);
    // round pips
    text(ctx, `ROUND ${Math.max(1, this.round)}/${this.maxRounds}`, 480, 40, { align: 'center', font: 'bold 18px "Trebuchet MS", sans-serif', color: this.round === this.maxRounds ? PALETTE.danger : PALETTE.paper });
    text(ctx, 'CARD DUEL', 480, 20, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: RAVENS.goldLite });
  }

  _drawHand(ctx) {
    const m = this.game.input.mouse;
    const canAct = this.phase === 'you' && !this.busy;
    this.hand.forEach((c, i) => {
      const p = this.handPos(i);
      const hover = canAct && this._handAt(m.x, m.y) === i;
      const sel = this.sel === i;
      const lift = sel ? 26 : hover ? 14 : 0;
      const afford = c.cost <= this.mana;
      let dx = 0;
      if (this.denied?.i === i) dx = Math.sin(this.denied.t * 60) * 6;
      const glow = sel ? 1 : c.legendary ? 0.6 + 0.4 * Math.sin(this.t * 5) : (canAct && afford ? 0.35 : 0);
      drawCard(ctx, c, p.x + dx, p.y - lift, CARD_W, CARD_H, { glow, glowColor: c.legendary ? '#ffd96a' : PALETTE.sun, dim: canAct && !afford, t: this.t });
      if (canAct) keycap(ctx, String(i + 1), p.x + CARD_W / 2, p.y - lift - 10, { small: true });
      if (this.denied?.i === i) text(ctx, 'Not enough mana', p.x + CARD_W / 2, p.y - 18, { align: 'center', font: 'bold 13px "Trebuchet MS", sans-serif', color: PALETTE.danger, outline: PALETTE.ink });
    });
  }

  _drawMana(ctx) {
    const x0 = 806, y0 = 400;
    text(ctx, 'MANA', x0 - 16, y0 - 26, { font: 'bold 12px "Trebuchet MS", sans-serif', color: PALETTE.sun });
    for (let i = 0; i < this.maxMana; i++) drawLand(ctx, x0 + i * 22, y0, i >= this.mana, { glow: this.phase === 'you' ? 0.7 : 0 });
  }

  _drawEnd(ctx) {
    const g = this.game, can = this.phase === 'you' && !this.busy;
    const nothingLeft = can && !this.hand.some((c) => c.cost <= this.mana);
    button(ctx, g, 'End Turn', END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h, { primary: can, disabled: !can, sub: 'Enter \u00b7 all attack' });
    if (nothingLeft) { ctx.save(); ctx.strokeStyle = RAVENS.goldLite; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 6); ctx.lineWidth = 3; rrect(ctx, END_BTN.x - 6, END_BTN.y - 6, END_BTN.w + 12, END_BTN.h + 12, 16); ctx.stroke(); ctx.restore(); }
  }

  _drawGuide(ctx) {
    if (!this.guide || this.round !== 1 || this.phase !== 'you' || this.busy) return;
    let msg, hx, hy;
    const golemIdx = this.hand.findIndex((c) => c.id === 'golem');
    if (this.sel >= 0) { msg = 'Now tap a lane to put it there'; hx = LANE_X[1] + 10; hy = YOU_Y + 10; }
    else if (!this.placedOnce && golemIdx >= 0) { const p = this.handPos(golemIdx); msg = 'Tap a card to cast it (cost = mana)'; hx = p.x + CARD_W / 2 + 6; hy = p.y + 40; }
    else { msg = 'End turn: pieces hit straight ahead'; hx = END_BTN.x + END_BTN.w / 2 + 6; hy = END_BTN.y + 30; }
    const w = 330;
    panel(ctx, 480 - w / 2, 56, w, 36, { radius: 10, stroke: RAVENS.goldLite });
    text(ctx, msg, 480, 79, { align: 'center', font: 'bold 15px "Trebuchet MS", sans-serif', color: RAVENS.goldLite });
    const b = Math.abs(Math.sin(this.t * 5)) * 10;
    drawPointer(ctx, hx, hy + b);
  }

  _drawBanner(ctx) {
    const b = this.banner, k = b.t / b.dur;
    const inK = easeOut(clamp(b.t / 0.18, 0, 1)), out = clamp((b.dur - b.t) / 0.2, 0, 1);
    ctx.save();
    ctx.globalAlpha = out;
    ctx.fillStyle = 'rgba(16,19,31,0.65)'; ctx.fillRect(0, 200, 960, b.sub ? 96 : 72);
    ctx.translate(480 + (1 - inK) * -300, 0);
    text(ctx, b.text, 0, 252, { align: 'center', font: 'bold 46px "Trebuchet MS", sans-serif', color: b.color, outline: RAVENS.purpleDeep, outlineWidth: 8 });
    if (b.sub) text(ctx, b.sub, 0, 282, { align: 'center', font: 'bold 16px "Trebuchet MS", sans-serif', color: PALETTE.paper });
    ctx.restore();
    void k;
  }

  _drawReveal(ctx) {
    const r = this.reveal, k = easeOut(clamp(r.t / 0.3, 0, 1));
    ctx.save();
    ctx.fillStyle = `rgba(8,20,14,${0.6 * k})`; ctx.fillRect(0, 0, 960, 540);
    // glitch stripes
    for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(127,216,166,${0.08 + Math.random() * 0.1})`; ctx.fillRect(0, Math.random() * 540, 960, 2 + Math.random() * 6); }
    ctx.translate(480, 270); ctx.scale(k, k); ctx.rotate(Math.sin(r.t * 30) * 0.02 * (1 - k));
    ctx.fillStyle = '#0d1a14'; rrect(ctx, -150, -110, 300, 220, 16); ctx.fill();
    ctx.strokeStyle = PALETTE.mint; ctx.lineWidth = 4; rrect(ctx, -150, -110, 300, 220, 16); ctx.stroke();
    text(ctx, '> TRICK CARD', 0, -76, { align: 'center', font: 'bold 14px monospace', color: PALETTE.mint });
    text(ctx, r.trick.name, 0, -26, { align: 'center', font: 'bold 34px "Trebuchet MS", sans-serif', color: PALETTE.paper, outline: '#1a3a2a', outlineWidth: 6 });
    text(ctx, r.trick.text, 0, 20, { align: 'center', font: 'bold 16px "Trebuchet MS", sans-serif', color: PALETTE.sun });
    text(ctx, 'PartyPlanner.exe plays a surprise!', 0, 72, { align: 'center', font: FONT.small, color: PALETTE.frost });
    ctx.restore();
  }

  _drawOver(ctx) {
    const k = easeOut(clamp(this.overT / 0.4, 0, 1));
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(16,19,31,0.5)'; ctx.fillRect(0, 0, 960, 540);
    const w = 380, h = 190, x = 480 - w / 2, y = 150 - (1 - k) * 30;
    panel(ctx, x, y, w, h, { radius: 16, stroke: this.success ? RAVENS.gold : PALETTE.danger });
    text(ctx, this.success ? 'You win the table!' : 'PartyPlanner wins this hand', 480, y + 50, { align: 'center', font: 'bold 26px "Trebuchet MS", sans-serif', color: this.success ? RAVENS.goldLite : PALETTE.paper });
    text(ctx, `Party HP ${this.hp.you}/${this.maxHp.you}   ·   Round ${this.round}`, 480, y + 96, { align: 'center' });
    if (this.success) bar(ctx, x + 60, y + 114, w - 120, 12, this.score, PALETTE.sun);
    if (this.overT > 1.4) text(ctx, this.success ? 'Click or Enter to continue' : 'Click or Enter to shuffle up and try again', 480, y + 160, { align: 'center', font: FONT.small, color: RAVENS.goldLite, alpha: 0.6 + 0.4 * Math.sin(this.overT * 5) });
    ctx.restore();
  }
}

// ------------------------------------------------------------------ small drawing utils
function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
function heartBar(ctx, x, y, w, shown, hp, max, color) {
  bar(ctx, x + 22, y + 4, w - 22, 14, shown / max, color, 'rgba(0,0,0,0.5)', { ghost: Math.max(shown, hp) / max });
  ctx.save(); ctx.fillStyle = PALETTE.danger; ctx.translate(x + 9, y + 11); ctx.beginPath();
  ctx.moveTo(0, 6); ctx.bezierCurveTo(-10, -2, -6, -10, 0, -5); ctx.bezierCurveTo(6, -10, 10, -2, 0, 6); ctx.fill(); ctx.restore();
  text(ctx, `${Math.max(0, Math.round(hp))} / ${max}`, x + w / 2 + 11, y + 16, { align: 'center', font: 'bold 13px "Trebuchet MS", sans-serif', outline: PALETTE.ink, outlineWidth: 3 });
}
function drawCrosshair(ctx, x, y) {
  ctx.strokeStyle = PALETTE.danger; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.moveTo(x - 40, y); ctx.lineTo(x - 20, y); ctx.moveTo(x + 20, y); ctx.lineTo(x + 40, y);
  ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 20); ctx.moveTo(x, y + 20); ctx.lineTo(x, y + 40); ctx.stroke();
}
function drawPointer(ctx, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35);
  ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2;
  rrect(ctx, -4, -28, 10, 26, 5); ctx.fill(); ctx.stroke();
  rrect(ctx, -10, -6, 26, 24, 8); ctx.fill(); ctx.stroke();
  ctx.restore();
}
