// Card Duel data + canvas card art (a loving Magic: The Gathering nod). Owned by: games-d.
import { PALETTE } from '../../core/theme.js';

const TAU = Math.PI * 2;

// Party side (you). type: 'creature' | 'spell'.  target: 'lane' (spells aimed at a lane) | 'none'.
export const PARTY_CARDS = {
  guest:  { id: 'guest', name: 'Party Guest', type: 'creature', cost: 1, atk: 1, hp: 2, text: 'Brought chips.', color: '#e98aa8' },
  golem:  { id: 'golem', name: 'Snack Golem', type: 'creature', cost: 2, atk: 2, hp: 4, text: 'Sturdy. Crunchy.', color: '#f2c26b' },
  kid:    { id: 'kid', name: "Aaron's Karate Kid", type: 'creature', cost: 3, atk: 4, hp: 2, text: 'Hits first. Hi-yah!', first: true, color: '#7fd8a6' },
  bus:    { id: 'bus', name: 'Party Bus', type: 'creature', cost: 4, atk: 3, hp: 6, text: 'Everyone on board!', color: '#5aa4e6' },
  bolt:   { id: 'bolt', name: 'Confetti Bolt', type: 'spell', cost: 1, dmg: 3, target: 'lane', text: '3 damage to a piece (or its face).', color: '#c9a0dc' },
  snack:  { id: 'snack', name: 'Snack Break', type: 'spell', cost: 2, heal: 4, target: 'none', text: 'Heal 4. Your guests +1/+1.', color: '#ffc94a' },
  party:  { id: 'party', name: 'HOUSEWARMING!', type: 'spell', cost: 0, target: 'none', legendary: true, text: 'All your guests attack again, x2!', color: '#ffd96a' },
};
export const PARTY_POOL = ['guest', 'guest', 'golem', 'golem', 'kid', 'kid', 'bus', 'bolt', 'bolt', 'snack'];

// PartyPlanner side: board-game pieces.
export const PIECES = {
  pawn:    { id: 'pawn', name: 'Pawn', cost: 1, atk: 1, hp: 2 },
  soldier: { id: 'soldier', name: 'Card Soldier', cost: 2, atk: 2, hp: 3 },
  knight:  { id: 'knight', name: 'Knight', cost: 3, atk: 3, hp: 3 },
  rook:    { id: 'rook', name: 'Rook', cost: 3, atk: 1, hp: 6 },
  jack:    { id: 'jack', name: 'Jack-in-the-Box', cost: 4, atk: 5, hp: 3 },
  queen:   { id: 'queen', name: 'Queen', cost: 5, atk: 4, hp: 6 },
};
// PartyPlanner trick cards (one-time surprises).
export const TRICKS = {
  flip:    { id: 'flip', name: 'TABLE FLIP', text: '3 damage to all your guests!' },
  reverse: { id: 'reverse', name: 'REVERSE!', text: 'Your guests swap lanes!' },
  monopoly:{ id: 'monopoly', name: 'MONOPOLY MONEY', text: 'PartyPlanner +2 mana this turn!' },
};

function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }

/** Little icon for a card/piece id, centered at (0,0), roughly 60px box. */
export function drawIcon(c, id, t = 0) {
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  const eyes = (y, sp = 6) => { c.fillStyle = PALETTE.ink; c.beginPath(); c.arc(-sp, y, 2.4, 0, TAU); c.arc(sp, y, 2.4, 0, TAU); c.fill(); };
  switch (id) {
    case 'guest': {
      c.fillStyle = '#f2c7a5'; c.beginPath(); c.arc(0, 6, 15, 0, TAU); c.fill();
      c.fillStyle = '#e98aa8'; c.beginPath(); c.moveTo(-12, -6); c.lineTo(0, -32); c.lineTo(12, -6); c.closePath(); c.fill();
      c.fillStyle = PALETTE.sun; c.beginPath(); c.arc(0, -32, 4, 0, TAU); c.fill();
      c.fillStyle = PALETTE.paper; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-6 + i * 6, -14 + (i % 2) * 6, 2, 0, TAU); c.fill(); }
      eyes(4, 5); c.strokeStyle = PALETTE.ink; c.lineWidth = 2; c.beginPath(); c.arc(0, 9, 6, 0.2, Math.PI - 0.2); c.stroke();
      break;
    }
    case 'golem': {
      // stacked sandwich golem
      c.fillStyle = '#d9a35e'; rr(c, -22, -22, 44, 14, 7); c.fill();
      c.fillStyle = PALETTE.heal; c.fillRect(-24, -9, 48, 5);
      c.fillStyle = '#e8655a'; c.fillRect(-22, -4, 44, 6);
      c.fillStyle = '#ffd96a'; c.fillRect(-21, 2, 42, 5);
      c.fillStyle = '#d9a35e'; rr(c, -22, 7, 44, 12, 5); c.fill();
      c.fillStyle = '#c08a48'; c.fillRect(-18, 19, 10, 10); c.fillRect(8, 19, 10, 10);
      c.fillStyle = PALETTE.paper; c.beginPath(); c.arc(-8, -15, 4.5, 0, TAU); c.arc(8, -15, 4.5, 0, TAU); c.fill();
      c.fillStyle = PALETTE.ink; c.beginPath(); c.arc(-7, -15, 2, 0, TAU); c.arc(9, -15, 2, 0, TAU); c.fill();
      break;
    }
    case 'kid': {
      // karate kid: gi, black belt, headband, kicking
      c.strokeStyle = PALETTE.paper; c.lineWidth = 7;
      c.beginPath(); c.moveTo(-2, 6); c.lineTo(-10, 28); c.moveTo(2, 6); c.lineTo(24, -2); c.stroke();
      c.fillStyle = PALETTE.paper; rr(c, -11, -14, 20, 24, 6); c.fill();
      c.fillStyle = PALETTE.ink; c.fillRect(-11, 2, 20, 4); c.fillRect(-4, 5, 3, 8);
      c.strokeStyle = PALETTE.paper; c.lineWidth = 5; c.beginPath(); c.moveTo(-8, -8); c.lineTo(-22, -18); c.moveTo(6, -8); c.lineTo(16, -20); c.stroke();
      c.fillStyle = '#f2c7a5'; c.beginPath(); c.arc(0, -24, 10, 0, TAU); c.fill();
      c.fillStyle = '#c99a5b'; c.beginPath(); c.arc(0, -27, 10, Math.PI, 0); c.fill();
      c.fillStyle = PALETTE.danger; c.fillRect(-10, -28, 20, 4); c.beginPath(); c.moveTo(-10, -27); c.lineTo(-20, -22 + Math.sin(t * 8) * 3); c.lineTo(-18, -30); c.fill();
      c.fillStyle = PALETTE.ink; c.fillRect(-5, -22, 3, 2); c.fillRect(3, -22, 3, 2);
      break;
    }
    case 'bus': {
      c.fillStyle = '#5aa4e6'; rr(c, -28, -18, 56, 30, 7); c.fill();
      c.fillStyle = PALETTE.ice; for (let i = 0; i < 4; i++) { rr(c, -24 + i * 13, -13, 10, 10, 2); c.fill(); }
      c.fillStyle = PALETTE.sun; c.fillRect(-28, 2, 56, 4);
      c.fillStyle = PALETTE.ink; c.beginPath(); c.arc(-16, 13, 6, 0, TAU); c.arc(16, 13, 6, 0, TAU); c.fill();
      c.fillStyle = '#e98aa8'; c.beginPath(); c.moveTo(-6, -18); c.lineTo(0, -32); c.lineTo(6, -18); c.fill();
      break;
    }
    case 'bolt': {
      c.fillStyle = PALETTE.sun; c.strokeStyle = PALETTE.sunDeep; c.lineWidth = 2;
      c.beginPath(); c.moveTo(6, -30); c.lineTo(-12, 2); c.lineTo(0, 2); c.lineTo(-8, 30); c.lineTo(14, -6); c.lineTo(2, -6); c.closePath(); c.fill(); c.stroke();
      const cols = ['#e98aa8', PALETTE.mint, PALETTE.sky, PALETTE.paper];
      for (let i = 0; i < 10; i++) { const a = i * 0.63 + t * 2, r = 20 + (i % 3) * 5; c.fillStyle = cols[i % 4]; c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a); c.fillRect(-3, -1.5, 6, 3); c.restore(); }
      break;
    }
    case 'snack': {
      c.fillStyle = '#d9a35e'; c.beginPath(); c.moveTo(-16, 0); c.lineTo(16, 0); c.lineTo(11, 22); c.lineTo(-11, 22); c.closePath(); c.fill();
      c.fillStyle = PALETTE.mint; c.beginPath(); c.arc(-8, -4, 10, 0, TAU); c.arc(8, -4, 10, 0, TAU); c.arc(0, -12, 11, 0, TAU); c.fill();
      c.fillStyle = PALETTE.choc; for (const [x, y] of [[-8, -6], [4, -14], [9, -2], [-2, -2]]) c.fillRect(x, y, 3, 3);
      c.fillStyle = PALETTE.danger; c.beginPath(); c.arc(0, -24, 4, 0, TAU); c.fill();
      break;
    }
    case 'party': {
      c.fillStyle = '#c9a77a'; c.beginPath(); c.moveTo(-26, 0); c.lineTo(0, -24); c.lineTo(26, 0); c.closePath(); c.fill();
      c.fillStyle = '#fff6e5'; c.fillRect(-20, 0, 40, 26);
      c.fillStyle = '#a8483a'; c.fillRect(-5, 10, 10, 16);
      c.fillStyle = PALETTE.sun; c.fillRect(-16, 4, 8, 7); c.fillRect(8, 4, 8, 7);
      const cols = [PALETTE.sun, '#e98aa8', PALETTE.mint, PALETTE.sky];
      for (let i = 0; i < 7; i++) { c.fillStyle = cols[i % 4]; c.beginPath(); c.arc(-24 + i * 8, -4 + Math.sin(i + t * 3) * 2 - (i % 2) * 18 + 4, 2.6, 0, TAU); c.fill(); }
      break;
    }
    // ---- PartyPlanner pieces
    case 'pawn': {
      c.fillStyle = '#e8f8ff'; c.strokeStyle = '#4b6a8a'; c.lineWidth = 2;
      c.beginPath(); c.arc(0, -16, 8, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-6, -8); c.lineTo(6, -8); c.lineTo(11, 16); c.lineTo(-11, 16); c.closePath(); c.fill(); c.stroke();
      rr(c, -15, 16, 30, 7, 3); c.fill(); c.stroke();
      break;
    }
    case 'rook': {
      c.fillStyle = '#e8f8ff'; c.strokeStyle = '#4b6a8a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-14, -26); c.lineTo(-14, -14); c.lineTo(-10, -12); c.lineTo(-10, 16); c.lineTo(10, 16); c.lineTo(10, -12); c.lineTo(14, -14); c.lineTo(14, -26);
      c.lineTo(8, -26); c.lineTo(8, -20); c.lineTo(3, -20); c.lineTo(3, -26); c.lineTo(-3, -26); c.lineTo(-3, -20); c.lineTo(-8, -20); c.lineTo(-8, -26); c.closePath(); c.fill(); c.stroke();
      rr(c, -16, 16, 32, 8, 3); c.fill(); c.stroke();
      break;
    }
    case 'knight': {
      c.fillStyle = '#e8f8ff'; c.strokeStyle = '#4b6a8a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-10, 16); c.lineTo(-8, -6); c.lineTo(-14, -2); c.lineTo(-16, -10); c.lineTo(-4, -26); c.lineTo(4, -30); c.lineTo(6, -24); c.quadraticCurveTo(16, -12, 10, 16); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#4b6a8a'; c.beginPath(); c.arc(-4, -16, 2, 0, TAU); c.fill();
      c.fillStyle = '#e8f8ff'; rr(c, -15, 16, 30, 8, 3); c.fill(); c.stroke();
      break;
    }
    case 'queen': {
      c.fillStyle = '#e8f8ff'; c.strokeStyle = '#4b6a8a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-14, -24); c.lineTo(-7, -14); c.lineTo(0, -28); c.lineTo(7, -14); c.lineTo(14, -24); c.lineTo(10, -6); c.lineTo(12, 16); c.lineTo(-12, 16); c.lineTo(-10, -6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = PALETTE.frostDeep; for (const x of [-14, 0, 14]) { c.beginPath(); c.arc(x, x ? -25 : -29, 3, 0, TAU); c.fill(); }
      c.fillStyle = '#e8f8ff'; rr(c, -16, 16, 32, 8, 3); c.fill(); c.stroke();
      break;
    }
    case 'soldier': {
      c.fillStyle = PALETTE.paper; c.strokeStyle = '#4b6a8a'; c.lineWidth = 2;
      rr(c, -14, -20, 28, 38, 4); c.fill(); c.stroke();
      c.fillStyle = PALETTE.danger; c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 0); c.lineTo(0, 8); c.lineTo(-6, 0); c.closePath(); c.fill();
      c.font = 'bold 9px sans-serif'; c.fillText('7', -11, -10);
      c.strokeStyle = '#8a6a44'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(18, 22); c.lineTo(18, -28); c.stroke();
      c.fillStyle = '#c9ced8'; c.beginPath(); c.moveTo(14, -26); c.lineTo(18, -36); c.lineTo(22, -26); c.closePath(); c.fill();
      c.fillStyle = PALETTE.ink; c.beginPath(); c.arc(-5, -13, 1.6, 0, TAU); c.arc(5, -13, 1.6, 0, TAU); c.fill();
      break;
    }
    case 'jack': {
      c.fillStyle = '#5aa4e6'; c.strokeStyle = '#2a4a6a'; c.lineWidth = 2; rr(c, -16, 2, 32, 22, 3); c.fill(); c.stroke();
      c.fillStyle = PALETTE.sun; c.fillRect(-16, 2, 32, 4);
      c.strokeStyle = '#8d95a3'; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i < 5; i++) c.lineTo((i % 2 ? 6 : -6), 2 - i * 4); c.stroke();
      const b = Math.sin(t * 6) * 2;
      c.fillStyle = PALETTE.paper; c.beginPath(); c.arc(0, -24 + b, 10, 0, TAU); c.fill();
      c.fillStyle = PALETTE.danger; c.beginPath(); c.moveTo(-10, -28 + b); c.lineTo(-14, -40 + b); c.lineTo(-2, -32 + b); c.lineTo(4, -42 + b); c.lineTo(10, -30 + b); c.closePath(); c.fill();
      c.fillStyle = PALETTE.ink; c.beginPath(); c.arc(-4, -25 + b, 1.8, 0, TAU); c.arc(4, -25 + b, 1.8, 0, TAU); c.fill();
      c.strokeStyle = PALETTE.danger; c.beginPath(); c.arc(0, -21 + b, 4, 0.2, Math.PI - 0.2); c.stroke();
      break;
    }
  }
  c.restore();
}

/** Full card face (hand / reveal). (x,y) = top-left; w x h. o: { glow, dim, t, lift } */
export function drawCard(c, card, x, y, w = 112, h = 156, o = {}) {
  const k = w / 112;
  c.save();
  c.translate(x, y);
  if (o.glow) { c.shadowColor = o.glowColor ?? PALETTE.sun; c.shadowBlur = 18 * o.glow; }
  const spell = card.type === 'spell';
  const frame = card.legendary ? '#ffd96a' : spell ? '#7b55d6' : '#c9a77a';
  c.fillStyle = '#1b1528'; rr(c, 0, 0, w, h, 9 * k); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = frame; rr(c, 3, 3, w - 6, h - 6, 7 * k); c.fill();
  // art box
  const g = c.createLinearGradient(0, 22 * k, 0, 92 * k);
  g.addColorStop(0, card.color ?? '#888'); g.addColorStop(1, '#2b2350');
  c.fillStyle = g; rr(c, 8 * k, 24 * k, w - 16 * k, 66 * k, 4); c.fill();
  c.save(); c.translate(w / 2, 58 * k); c.scale(k, k); drawIcon(c, card.id, o.t ?? 0); c.restore();
  // name bar
  c.fillStyle = PALETTE.paper; rr(c, 6 * k, 6 * k, w - 12 * k, 16 * k, 4); c.fill();
  c.fillStyle = PALETTE.ink; c.font = `bold ${Math.round((card.name.length > 14 ? 9 : 11) * k)}px "Trebuchet MS", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(card.name, w / 2 + 6 * k, 14.5 * k, w - 34 * k);
  // text box
  c.fillStyle = 'rgba(255,246,229,0.92)'; rr(c, 8 * k, 94 * k, w - 16 * k, 38 * k, 4); c.fill();
  c.fillStyle = PALETTE.ink; c.font = `${Math.round(10 * k)}px "Trebuchet MS", sans-serif`;
  wrap(c, card.text, w / 2, 106 * k, w - 22 * k, 12 * k);
  // cost gem (mana)
  c.fillStyle = '#26124d'; c.beginPath(); c.arc(12 * k, 12 * k, 11 * k, 0, TAU); c.fill();
  c.fillStyle = PALETTE.sun; c.beginPath(); c.arc(12 * k, 12 * k, 9 * k, 0, TAU); c.fill();
  c.fillStyle = PALETTE.ink; c.font = `bold ${Math.round(13 * k)}px "Trebuchet MS", sans-serif`; c.fillText(String(card.cost), 12 * k, 13 * k);
  if (card.type === 'creature') statBadges(c, card.atk, card.hp, w, h, k);
  else { c.fillStyle = PALETTE.paper; c.font = `bold ${Math.round(9 * k)}px "Trebuchet MS", sans-serif`; c.fillText(card.legendary ? 'LEGENDARY SPELL' : 'SPELL', w / 2, h - 12 * k); }
  if (o.dim) { c.fillStyle = 'rgba(16,19,31,0.55)'; rr(c, 0, 0, w, h, 9 * k); c.fill(); }
  c.restore();
}

function statBadges(c, atk, hp, w, h, k) {
  c.font = `bold ${Math.round(13 * k)}px "Trebuchet MS", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  // sword
  c.fillStyle = '#e8655a'; c.beginPath(); c.arc(16 * k, h - 13 * k, 11 * k, 0, TAU); c.fill();
  c.fillStyle = PALETTE.paper; c.fillText(String(atk), 16 * k, h - 12 * k);
  // heart
  c.fillStyle = '#3fa874'; c.beginPath(); c.arc(w - 16 * k, h - 13 * k, 11 * k, 0, TAU); c.fill();
  c.fillStyle = PALETTE.paper; c.fillText(String(hp), w - 16 * k, h - 12 * k);
}

function wrap(c, str, cx, y, maxW, lh) {
  const words = String(str).split(' '); let line = ''; let yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, cx, yy); line = w; yy += lh; } else line = t; }
  c.fillText(line, cx, yy);
}

/** Board token for a creature/piece centered at (x,y). unit: {id, atk, hp, maxHp, side}. */
export function drawToken(c, unit, x, y, o = {}) {
  const w = 96, h = 104, enemy = unit.side === 'enemy';
  c.save(); c.translate(x, y);
  if (o.scale) c.scale(o.scale, o.scale);
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  c.fillStyle = 'rgba(0,0,0,0.3)'; rr(c, -w / 2 + 3, -h / 2 + 5, w, h, 10); c.fill();
  c.fillStyle = enemy ? '#2a3d5c' : '#4a3360'; rr(c, -w / 2, -h / 2, w, h, 10); c.fill();
  c.strokeStyle = enemy ? PALETTE.frost : (unit.color ?? PALETTE.sun); c.lineWidth = 3; rr(c, -w / 2, -h / 2, w, h, 10); c.stroke();
  if (o.flash > 0) { c.fillStyle = `rgba(255,255,255,${0.7 * o.flash})`; rr(c, -w / 2, -h / 2, w, h, 10); c.fill(); }
  c.save(); c.translate(0, -6); drawIcon(c, unit.id, o.t ?? 0); c.restore();
  c.fillStyle = PALETTE.paper; c.font = 'bold 10px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(unit.name, 0, -h / 2 + 10, w - 8);
  c.translate(-w / 2, -h / 2);
  statBadges(c, unit.atk, unit.hp, w, h + 4, 1);
  c.restore();
}

/** A small "land" mana card; tapped = turned sideways (spent). */
export function drawLand(c, x, y, tapped, o = {}) {
  c.save(); c.translate(x, y); c.rotate(tapped ? Math.PI / 2 : 0);
  c.globalAlpha *= tapped ? 0.55 : 1;
  if (!tapped && o.glow) { c.shadowColor = PALETTE.sun; c.shadowBlur = 10 * o.glow; }
  c.fillStyle = '#26124d'; rr(c, -13, -18, 26, 36, 4); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = tapped ? '#6a6478' : PALETTE.sun; rr(c, -10, -15, 20, 30, 3); c.fill();
  // tiny party popper
  c.fillStyle = '#e98aa8'; c.beginPath(); c.moveTo(-5, 9); c.lineTo(3, -3); c.lineTo(6, 2); c.closePath(); c.fill();
  c.fillStyle = PALETTE.paper; c.fillRect(2, -9, 2, 2); c.fillRect(6, -6, 2, 2); c.fillRect(-1, -10, 2, 2);
  c.restore();
}
