// Card Duel data + canvas card art (a loving Magic: The Gathering nod). Owned by: games-d.
import { PALETTE } from '../../core/theme.js';

const TAU = Math.PI * 2;

// Party side (you). type: 'creature' | 'spell'.  target: 'lane' (spells aimed at a foe lane) | 'ally' (one of your
// guests) | 'none'. Creatures may have enter: 'rally' | 'heal' | 'aoe' | 'mend' | 'ping' | 'buffall' (n = amount).
// The duel deals from a shuffled deck of one of each, so a card never repeats (user ask: variety, no repetition).
export const PARTY_CARDS = {
  // ---- guests (creatures)
  guest:    { id: 'guest', name: 'Party Guest', type: 'creature', cost: 1, atk: 1, hp: 2, text: 'Brought chips.', color: '#e98aa8' },
  neighbor: { id: 'neighbor', name: 'Nosy Neighbor', type: 'creature', cost: 1, atk: 2, hp: 1, text: 'Just popping by!', color: '#8fcf9a' },
  critter:  { id: 'critter', name: 'Crochet Critter', type: 'creature', cost: 1, atk: 1, hp: 3, text: 'Made by Victoria. Hugs back.', color: '#ff8fb1' },
  golem:    { id: 'golem', name: 'Snack Golem', type: 'creature', cost: 2, atk: 2, hp: 4, text: 'Sturdy. Crunchy.', color: '#f2c26b' },
  raven:    { id: 'raven', name: 'Raven Mascot', type: 'creature', cost: 2, atk: 3, hp: 1, first: true, text: 'Swoops in. Hits first.', color: '#4b2a7a' },
  drummer:  { id: 'drummer', name: 'Marching Drummer', type: 'creature', cost: 2, atk: 2, hp: 3, enter: 'rally', n: 1, text: 'Enter: your other guests +1 attack.', color: '#6b4aa8' },
  pizza:    { id: 'pizza', name: 'Pizza Delivery', type: 'creature', cost: 2, atk: 1, hp: 3, enter: 'heal', n: 3, text: 'Enter: heal 3.', color: '#e8655a' },
  kid:      { id: 'kid', name: "Aaron's Karate Kid", type: 'creature', cost: 3, atk: 4, hp: 2, text: 'Hits first. Hi-yah!', first: true, color: '#7fd8a6' },
  raider:   { id: 'raider', name: 'WoW Raid Leader', type: 'creature', cost: 3, atk: 3, hp: 3, enter: 'aoe', n: 1, text: 'Enter: 1 damage to every enemy piece.', color: '#3f7fc4' },
  fixer:    { id: 'fixer', name: 'Victoria the Fixer', type: 'creature', cost: 3, atk: 2, hp: 4, enter: 'mend', text: 'Enter: heal your guests to full.', color: '#ffd96a' },
  bouncer:  { id: 'bouncer', name: 'Bouncer', type: 'creature', cost: 3, atk: 1, hp: 7, text: "You're not on the list.", color: '#7d8494' },
  grill:    { id: 'grill', name: 'Grill Master', type: 'creature', cost: 3, atk: 3, hp: 4, enter: 'ping', n: 2, text: 'Enter: 2 damage to the piece across.', color: '#ff8a3d' },
  bus:      { id: 'bus', name: 'Party Bus', type: 'creature', cost: 4, atk: 3, hp: 6, text: 'Everyone on board!', color: '#5aa4e6' },
  dj:       { id: 'dj', name: 'Party DJ', type: 'creature', cost: 4, atk: 2, hp: 5, enter: 'buffall', n: 1, text: 'Enter: your other guests +1/+1.', color: '#c9a0dc' },
  sensei:   { id: 'sensei', name: 'Sensei Aaron', type: 'creature', cost: 5, atk: 5, hp: 5, first: true, text: 'Black belt. Hits first.', color: '#e8e2d4' },
  // ---- spells
  bolt:     { id: 'bolt', name: 'Confetti Bolt', type: 'spell', cost: 1, dmg: 3, target: 'lane', text: '3 damage to a piece (or its face).', color: '#c9a0dc' },
  flare:    { id: 'flare', name: 'Grill Flare', type: 'spell', cost: 3, dmg: 5, target: 'lane', text: '5 damage to a piece (or its face).', color: '#ff7a3a' },
  boxed:    { id: 'boxed', name: 'Back in the Box', type: 'spell', cost: 3, destroy: true, target: 'lane', text: 'Remove a piece. Empty lane: 2 to face.', color: '#7b55d6' },
  cannon:   { id: 'cannon', name: 'Confetti Cannon', type: 'spell', cost: 2, aoe: 1, target: 'none', text: '1 damage to every piece and its face.', color: '#e98aa8' },
  snack:    { id: 'snack', name: 'Snack Break', type: 'spell', cost: 2, heal: 4, target: 'none', text: 'Heal 4. Your guests +1/+1.', color: '#ffc94a' },
  growth:   { id: 'growth', name: 'Giant Growth', type: 'spell', cost: 1, buffAtk: 3, buffHp: 3, target: 'ally', text: 'A guest gets +3/+3.', color: '#7fd8a6' },
  pep:      { id: 'pep', name: 'Pep Talk', type: 'spell', cost: 0, buffAtk: 2, target: 'ally', text: 'Victoria cheers! A guest +2 attack.', color: '#ffc94a' },
  blanket:  { id: 'blanket', name: 'Crochet Blanket', type: 'spell', cost: 1, buffHp: 4, mendOne: true, target: 'ally', text: 'Heal a guest fully, +0/+4.', color: '#ff8fb1' },
  coffee:   { id: 'coffee', name: 'Coffee Run', type: 'spell', cost: 0, mana: 2, target: 'none', text: '+2 mana this turn.', color: '#a8744a' },
  gamenight:{ id: 'gamenight', name: 'Game Night', type: 'spell', cost: 1, draw: 2, target: 'none', text: 'Draw 2 cards.', color: '#5aa4e6' },
  party:    { id: 'party', name: 'HOUSEWARMING!', type: 'spell', cost: 0, target: 'none', legendary: true, text: 'All your guests attack again, x2!', color: '#ffd96a' },
};
/** One of every non-legendary card: the deck the duel shuffles and deals from. */
export const PARTY_POOL = Object.keys(PARTY_CARDS).filter((id) => !PARTY_CARDS[id].legendary);

// PartyPlanner side: board-game pieces.
export const PIECES = {
  pawn:    { id: 'pawn', name: 'Pawn', cost: 1, atk: 1, hp: 2 },
  soldier: { id: 'soldier', name: 'Card Soldier', cost: 2, atk: 2, hp: 3 },
  bishop:  { id: 'bishop', name: 'Bishop', cost: 2, atk: 3, hp: 2 },
  knight:  { id: 'knight', name: 'Knight', cost: 3, atk: 3, hp: 3 },
  rook:    { id: 'rook', name: 'Rook', cost: 3, atk: 1, hp: 6 },
  jack:    { id: 'jack', name: 'Jack-in-the-Box', cost: 4, atk: 5, hp: 3 },
  queen:   { id: 'queen', name: 'Queen', cost: 5, atk: 4, hp: 6 },
  king:    { id: 'king', name: 'King', cost: 6, atk: 3, hp: 9 },
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
    case 'neighbor': { // peeking over a fence with binoculars
      c.fillStyle = '#c99a5b'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 12 - 5, 30); c.lineTo(i * 12 - 5, 4); c.lineTo(i * 12, -2); c.lineTo(i * 12 + 5, 4); c.lineTo(i * 12 + 5, 30); c.fill(); }
      c.fillStyle = '#f2c7a5'; c.beginPath(); c.arc(0, -12, 14, Math.PI, 0); c.fill(); c.fillRect(-14, -12, 28, 12);
      c.fillStyle = '#8a8a8a'; c.beginPath(); c.arc(0, -22, 14, Math.PI, 0); c.fill();
      c.fillStyle = PALETTE.ink; rr(c, -13, -14, 11, 9, 3); c.fill(); rr(c, 2, -14, 11, 9, 3); c.fill();
      c.fillStyle = PALETTE.sky; c.beginPath(); c.arc(-7.5, -9.5, 3, 0, TAU); c.arc(7.5, -9.5, 3, 0, TAU); c.fill();
      break;
    }
    case 'critter': { // crocheted pink bunny with stitch texture
      c.fillStyle = '#ff8fb1';
      c.beginPath(); c.ellipse(-8, -24, 5, 12, -0.2, 0, TAU); c.ellipse(8, -24, 5, 12, 0.2, 0, TAU); c.fill();
      c.beginPath(); c.arc(0, -4, 15, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 20, 14, 10, 0, 0, TAU); c.fill();
      c.strokeStyle = '#e06a92'; c.lineWidth = 1.2;
      for (let y = -14; y <= 26; y += 5) { c.beginPath(); for (let x = -12; x <= 12; x += 4) c.arc(x, y, 1.6, 0, Math.PI); c.stroke(); }
      eyes(-6, 5); c.fillStyle = PALETTE.ink; c.beginPath(); c.moveTo(-2, 0); c.lineTo(2, 0); c.lineTo(0, 2.5); c.fill();
      break;
    }
    case 'raven': { // purple raven, wings spread
      const f = Math.sin(t * 8) * 6;
      c.fillStyle = '#3a2266';
      c.beginPath(); c.moveTo(-4, -4); c.quadraticCurveTo(-24, -16 - f, -30, -2 - f); c.quadraticCurveTo(-18, 0, -4, 8); c.fill();
      c.beginPath(); c.moveTo(4, -4); c.quadraticCurveTo(24, -16 - f, 30, -2 - f); c.quadraticCurveTo(18, 0, 4, 8); c.fill();
      c.fillStyle = '#4b2a7a'; c.beginPath(); c.ellipse(0, 6, 10, 15, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(0, -14, 9, 0, TAU); c.fill();
      c.fillStyle = PALETTE.sun; c.beginPath(); c.moveTo(-3, -12); c.lineTo(3, -12); c.lineTo(0, -4); c.fill();
      c.fillStyle = '#ffd96a'; c.beginPath(); c.arc(-4, -16, 2, 0, TAU); c.arc(4, -16, 2, 0, TAU); c.fill();
      break;
    }
    case 'drummer': { // marching snare + shako
      c.fillStyle = '#e8e2d4'; rr(c, -22, 2, 44, 22, 5); c.fill();
      c.strokeStyle = '#4b2a7a'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-20 + i * 10, 4); c.lineTo(-15 + i * 10, 22); c.stroke(); }
      c.fillStyle = '#4b2a7a'; rr(c, -24, -1, 48, 5, 2); c.fill(); rr(c, -24, 22, 48, 5, 2); c.fill();
      c.fillStyle = '#4b2a7a'; rr(c, -9, -32, 18, 22, 3); c.fill(); c.fillStyle = PALETTE.sun; c.beginPath(); c.arc(0, -21, 4, 0, TAU); c.fill();
      c.fillStyle = PALETTE.paper; c.beginPath(); c.ellipse(0, -38, 4, 7, 0, 0, TAU); c.fill();
      const hit = Math.abs(Math.sin(t * 8)) * 6;
      c.strokeStyle = '#c99a5b'; c.lineWidth = 3; c.beginPath(); c.moveTo(-26, -14 + hit); c.lineTo(-6, -2); c.moveTo(26, -8 - hit); c.lineTo(8, -2); c.stroke();
      break;
    }
    case 'pizza': { // slice with pepperoni
      c.fillStyle = '#d9a35e'; c.beginPath(); c.moveTo(-24, -22); c.quadraticCurveTo(0, -32, 24, -22); c.lineTo(0, 28); c.closePath(); c.fill();
      c.fillStyle = '#ffd96a'; c.beginPath(); c.moveTo(-19, -18); c.quadraticCurveTo(0, -26, 19, -18); c.lineTo(0, 22); c.closePath(); c.fill();
      c.fillStyle = '#d9343f'; for (const [x, y] of [[-8, -12], [7, -10], [0, 4], [-2, -18]]) { c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); }
      c.fillStyle = '#ffd96a'; c.beginPath(); c.moveTo(4, 14); c.quadraticCurveTo(6, 24, 3, 30); c.lineTo(1, 16); c.fill();
      break;
    }
    case 'raider': { // horned helm + glowing sword
      c.fillStyle = '#9aa3b2'; c.beginPath(); c.arc(-4, -6, 15, Math.PI, 0); c.fill(); c.fillRect(-19, -6, 30, 14);
      c.fillStyle = PALETTE.ink; c.fillRect(-14, -2, 20, 4);
      c.fillStyle = '#f8efe6'; c.beginPath(); c.moveTo(-18, -10); c.quadraticCurveTo(-28, -18, -24, -32); c.quadraticCurveTo(-20, -20, -12, -16); c.fill();
      c.beginPath(); c.moveTo(10, -10); c.quadraticCurveTo(20, -18, 16, -32); c.quadraticCurveTo(12, -20, 4, -16); c.fill();
      c.shadowColor = PALETTE.sky; c.shadowBlur = 10; c.strokeStyle = '#bfe6ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(18, 28); c.lineTo(26, -20); c.stroke(); c.shadowBlur = 0;
      c.strokeStyle = PALETTE.sun; c.lineWidth = 3; c.beginPath(); c.moveTo(13, 18); c.lineTo(25, 20); c.stroke();
      break;
    }
    case 'fixer': { // Victoria: blonde, toolbox wrench, warm smile
      c.fillStyle = '#f2d27a'; c.beginPath(); c.arc(0, -10, 17, Math.PI * 0.9, Math.PI * 2.1); c.fill(); c.fillRect(-17, -10, 8, 26); c.fillRect(9, -10, 8, 26);
      c.fillStyle = '#f2c7a5'; c.beginPath(); c.arc(0, -6, 12, 0, TAU); c.fill();
      c.fillStyle = '#f2d27a'; c.beginPath(); c.arc(-2, -15, 11, Math.PI, Math.PI * 1.9); c.fill();
      eyes(-7, 4.5); c.strokeStyle = PALETTE.ink; c.lineWidth = 2; c.beginPath(); c.arc(0, -2, 5, 0.2, Math.PI - 0.2); c.stroke();
      c.fillStyle = '#5aa4e6'; rr(c, -14, 8, 28, 20, 6); c.fill();
      c.strokeStyle = '#c8d0dc'; c.lineWidth = 5; c.beginPath(); c.moveTo(14, 26); c.lineTo(26, 6); c.stroke();
      c.beginPath(); c.arc(27, 3, 5, 0.9, TAU - 0.9 + Math.PI); c.stroke();
      break;
    }
    case 'bouncer': { // big shades, black tee, arms crossed
      c.fillStyle = PALETTE.ink; rr(c, -24, 2, 48, 28, 10); c.fill();
      c.fillStyle = '#b07d5a'; c.beginPath(); c.arc(0, -12, 14, 0, TAU); c.fill(); rr(c, -20, 8, 40, 9, 4); c.fill();
      c.fillStyle = PALETTE.ink; rr(c, -12, -16, 11, 6, 2); c.fill(); rr(c, 1, -16, 11, 6, 2); c.fill(); c.fillRect(-2, -15, 4, 2);
      c.strokeStyle = PALETTE.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -3); c.lineTo(5, -3); c.stroke();
      c.fillStyle = PALETTE.paper; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText('STAFF', 0, 27);
      break;
    }
    case 'grill': { // kettle grill with flames and tongs
      const fl = Math.sin(t * 10) * 3;
      c.fillStyle = PALETTE.sunDeep; c.beginPath(); c.moveTo(-14, -8); c.quadraticCurveTo(-10, -30 - fl, -4, -12); c.quadraticCurveTo(0, -34 + fl, 6, -12); c.quadraticCurveTo(12, -28 - fl, 14, -8); c.fill();
      c.fillStyle = PALETTE.sun; c.beginPath(); c.moveTo(-8, -8); c.quadraticCurveTo(-4, -22 + fl, 0, -10); c.quadraticCurveTo(4, -22 - fl, 8, -8); c.fill();
      c.fillStyle = '#2b2232'; c.beginPath(); c.arc(0, -6, 22, 0, Math.PI); c.fill();
      c.strokeStyle = '#8d95a3'; c.lineWidth = 2; c.beginPath(); c.moveTo(-22, -6); c.lineTo(22, -6); c.stroke();
      c.strokeStyle = '#2b2232'; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 12); c.lineTo(-16, 30); c.moveTo(10, 12); c.lineTo(16, 30); c.moveTo(0, 16); c.lineTo(0, 30); c.stroke();
      break;
    }
    case 'dj': { // headphones + turntable
      c.fillStyle = '#2b2232'; rr(c, -28, 8, 56, 20, 4); c.fill();
      c.save(); c.translate(-10, 18); c.rotate(t * 4); c.fillStyle = PALETTE.ink; c.beginPath(); c.ellipse(0, 0, 13, 7, 0, 0, TAU); c.fill(); c.fillStyle = PALETTE.danger; c.fillRect(-2, -1, 4, 2); c.restore();
      c.fillStyle = PALETTE.mint; c.fillRect(10, 14, 12, 3); c.fillStyle = PALETTE.sun; c.fillRect(10, 20, 8, 3);
      c.strokeStyle = '#c9a0dc'; c.lineWidth = 5; c.beginPath(); c.arc(0, -12, 16, Math.PI, 0); c.stroke();
      c.fillStyle = '#c9a0dc'; rr(c, -22, -16, 9, 14, 4); c.fill(); rr(c, 13, -16, 9, 14, 4); c.fill();
      c.fillStyle = PALETTE.paper; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('♪', -2 + Math.sin(t * 5) * 3, -24);
      break;
    }
    case 'sensei': { // gi with black belt, mid-kick
      c.strokeStyle = PALETTE.paper; c.lineWidth = 7;
      c.beginPath(); c.moveTo(0, 8); c.lineTo(-8, 30); c.moveTo(2, 6); c.lineTo(28, -8); c.stroke();
      c.fillStyle = PALETTE.paper; rr(c, -11, -14, 22, 24, 6); c.fill();
      c.strokeStyle = '#d8d2c4'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -14); c.lineTo(2, 0); c.moveTo(6, -14); c.lineTo(-2, 0); c.stroke();
      c.fillStyle = PALETTE.ink; c.fillRect(-11, 2, 22, 5); c.fillRect(-6, 6, 3, 10); c.fillRect(1, 6, 3, 9);
      c.fillStyle = '#f2c7a5'; c.beginPath(); c.arc(0, -24, 10, 0, TAU); c.fill();
      c.fillStyle = '#5a3a24'; c.beginPath(); c.arc(0, -27, 10, Math.PI, 0); c.fill();
      c.fillStyle = PALETTE.ink; c.fillRect(-5, -23, 3, 2); c.fillRect(3, -23, 3, 2);
      c.strokeStyle = PALETTE.sun; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(30, -12 + i * 4); c.lineTo(36 + i * 2, -14 + i * 5); c.stroke(); }
      break;
    }
    case 'flare': { // big fireball
      c.fillStyle = PALETTE.danger; c.beginPath(); c.arc(4, 4, 18, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-10, -8); c.quadraticCurveTo(-26, -28 + Math.sin(t * 9) * 4, -30, -30); c.quadraticCurveTo(-14, -26, 0, -12); c.fill();
      c.fillStyle = PALETTE.sunDeep; c.beginPath(); c.arc(4, 4, 12, 0, TAU); c.fill();
      c.fillStyle = PALETTE.sun; c.beginPath(); c.arc(6, 6, 7, 0, TAU); c.fill();
      break;
    }
    case 'boxed': { // toy box, lid slamming on a pawn
      c.fillStyle = '#a8744a'; rr(c, -24, -2, 48, 30, 4); c.fill(); c.fillStyle = '#7b55d6'; c.fillRect(-24, 8, 48, 6);
      const lid = Math.abs(Math.sin(t * 3)) * 0.5;
      c.save(); c.translate(-24, -2); c.rotate(-lid); c.fillStyle = '#c08a58'; rr(c, 0, -8, 48, 8, 3); c.fill(); c.restore();
      c.fillStyle = '#e8f8ff'; c.strokeStyle = '#4b6a8a'; c.lineWidth = 1.5; c.beginPath(); c.arc(4, -6 - lid * 14, 6, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = PALETTE.paper; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('BYE', 0, 24);
      break;
    }
    case 'cannon': { // confetti cannon firing up
      c.save(); c.rotate(-0.5); c.fillStyle = '#e98aa8'; rr(c, -8, -6, 18, 34, 4); c.fill(); c.fillStyle = PALETTE.sun; c.fillRect(-8, 0, 18, 4); c.fillRect(-8, 12, 18, 4); c.restore();
      const cols = [PALETTE.sun, PALETTE.mint, PALETTE.sky, '#e98aa8', PALETTE.paper];
      for (let i = 0; i < 14; i++) { const a = -2.3 + (i % 7) * 0.22, r = 18 + ((t * 40 + i * 9) % 22); c.fillStyle = cols[i % 5]; c.fillRect(Math.cos(a) * r - 6, Math.sin(a) * r - 8, 4, 4); }
      break;
    }
    case 'growth': { // big green flexing arm + leaf
      c.fillStyle = '#3fa874'; c.beginPath(); c.ellipse(-4, 8, 14, 18, 0.3, 0, TAU); c.fill();
      c.beginPath(); c.arc(8, -14, 12, 0, TAU); c.fill();
      c.fillStyle = PALETTE.mint; c.beginPath(); c.ellipse(-8, 2, 5, 9, 0.3, 0, TAU); c.fill();
      c.fillStyle = PALETTE.heal; c.beginPath(); c.moveTo(14, -26); c.quadraticCurveTo(30, -34, 28, -16); c.quadraticCurveTo(20, -18, 14, -26); c.fill();
      c.fillStyle = PALETTE.paper; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('+3', 16, 26);
      break;
    }
    case 'pep': { // megaphone with hearts
      c.fillStyle = PALETTE.sun; c.beginPath(); c.moveTo(-20, -6); c.lineTo(14, -20); c.lineTo(14, 20); c.lineTo(-20, 6); c.closePath(); c.fill();
      c.fillStyle = PALETTE.sunDeep; rr(c, -26, -7, 8, 14, 3); c.fill(); c.fillRect(-14, 6, 5, 12);
      c.fillStyle = '#e98aa8';
      for (let i = 0; i < 3; i++) { const x = 22 + i * 4, y = -16 + i * 14 + Math.sin(t * 5 + i) * 2; c.beginPath(); c.arc(x - 2, y, 3, 0, TAU); c.arc(x + 2, y, 3, 0, TAU); c.moveTo(x - 5, y + 1); c.lineTo(x, y + 6); c.lineTo(x + 5, y + 1); c.fill(); }
      break;
    }
    case 'blanket': { // granny-square blanket
      const cols = ['#ff8fb1', PALETTE.sun, PALETTE.mint, PALETTE.sky];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { c.fillStyle = cols[(i + j) % 4]; rr(c, -26 + i * 18, -24 + j * 16, 16, 14, 3); c.fill(); c.fillStyle = PALETTE.paper; c.beginPath(); c.arc(-18 + i * 18, -17 + j * 16, 2.5, 0, TAU); c.fill(); }
      c.strokeStyle = '#e06a92'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(-26 + i * 6.5, 26 + (i % 2) * 4); c.stroke();
      break;
    }
    case 'coffee': { // to-go cup with steam
      c.strokeStyle = 'rgba(255,246,229,0.7)'; c.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 7, -22); c.quadraticCurveTo(i * 7 + 5 * Math.sin(t * 4 + i), -30, i * 7, -38); c.stroke(); }
      c.fillStyle = PALETTE.paper; c.beginPath(); c.moveTo(-14, -14); c.lineTo(14, -14); c.lineTo(10, 28); c.lineTo(-10, 28); c.closePath(); c.fill();
      c.fillStyle = '#5a3a24'; rr(c, -16, -20, 32, 7, 3); c.fill();
      c.fillStyle = '#a8744a'; c.fillRect(-12, 0, 24, 12);
      break;
    }
    case 'gamenight': { // two dice + cards
      c.save(); c.rotate(-0.25); c.fillStyle = PALETTE.paper; rr(c, -26, -8, 22, 22, 4); c.fill(); c.fillStyle = PALETTE.ink; for (const [x, y] of [[-20, -2], [-10, 8], [-15, 3]]) { c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); } c.restore();
      c.save(); c.rotate(0.3); c.fillStyle = PALETTE.danger; rr(c, 4, -14, 22, 22, 4); c.fill(); c.fillStyle = PALETTE.paper; for (const [x, y] of [[9, -9], [21, -9], [9, 3], [21, 3]]) { c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); } c.restore();
      c.fillStyle = '#7b55d6'; rr(c, -14, 14, 18, 22, 3); c.fill(); c.fillStyle = PALETTE.sky; rr(c, -2, 12, 18, 22, 3); c.fill();
      break;
    }
    // ---- PartyPlanner pieces
    case 'bishop': {
      c.fillStyle = '#e8f8ff'; c.strokeStyle = '#4b6a8a'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, -12, 9, 13, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -28, 3.5, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = '#4b6a8a'; c.beginPath(); c.moveTo(-4, -18); c.lineTo(5, -9); c.stroke(); c.strokeStyle = '#4b6a8a';
      c.beginPath(); c.moveTo(-7, 0); c.lineTo(7, 0); c.lineTo(11, 16); c.lineTo(-11, 16); c.closePath(); c.fill(); c.stroke();
      rr(c, -15, 16, 30, 7, 3); c.fill(); c.stroke();
      break;
    }
    case 'king': {
      c.fillStyle = '#e8f8ff'; c.strokeStyle = '#4b6a8a'; c.lineWidth = 2;
      c.fillRect(-2.5, -36, 5, 14); c.strokeRect(-2.5, -36, 5, 14); c.fillRect(-7, -32, 14, 4); c.strokeRect(-7, -32, 14, 4);
      c.beginPath(); c.moveTo(-12, -22); c.lineTo(12, -22); c.lineTo(9, -6); c.lineTo(12, 16); c.lineTo(-12, 16); c.lineTo(-9, -6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = PALETTE.frostDeep; c.fillRect(-10, -8, 20, 3);
      c.fillStyle = '#e8f8ff'; rr(c, -17, 16, 34, 8, 3); c.fill(); c.stroke();
      break;
    }
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
