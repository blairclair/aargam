// Photo-cutout busts + in-world cutout heads. Owned by: art.
// Rule: faces are never distorted, recolored or mirrored. Expressions come only from motion and
// overlays (bounce, shake, lean, sweat drop, sparkle, steam puff, motion lines, "!").
import { HEROES, PALETTE } from '../core/theme.js';
import { cached, makeCanvas, rgba } from './util.js';

const TAU = Math.PI * 2;

// Per-cutout metadata in SOURCE pixels: headTop (top of hair), chin, cx (face centre x).
// Used to normalise head size so swapping busts mid-conversation never makes a face jump.
const BUST_META = {
  'bust.aaron.smile': { headTop: 4, chin: 396, cx: 282, cy: 225 },
  'bust.victoria.smile': { headTop: 0, chin: 300, cx: 132, cy: 170 },
  'bust.victoria.neutral': { headTop: 0, chin: 192, cx: 132, cy: 105 },
};

/** expr -> which real photo to use + how to animate it. */
export const BUST_EXPRS = ['smile', 'neutral', 'happy', 'surprised', 'annoyed', 'determined', 'worried', 'sheepish', 'sad', 'thinking', 'nod'];
// Story-script aliases (motion words) -> canonical expressions.
export const EXPR_ALIAS = { bounce: 'happy', sparkle: 'happy', lean: 'determined', shake: 'annoyed', surprise: 'surprised', sweat: 'worried', nod: 'nod', glad: 'happy', angry: 'annoyed', mad: 'annoyed', shocked: 'surprised', confused: 'thinking' };
export function normExpr(expr) { return EXPR_ALIAS[expr] ?? expr ?? 'smile'; }
const EXPR_BUST = {
  aaron: { default: 'smile' },
  victoria: { smile: 'smile', happy: 'smile', sheepish: 'smile', nod: 'smile', default: 'neutral' },
};

/** Which image key drawBust will use for hero+expr (exported so other teams can preload/check). */
export function bustKey(hero, expr = 'smile') {
  const H = HEROES[hero];
  if (!H?.busts) return null;
  const map = EXPR_BUST[hero] ?? { default: 'smile' };
  const want = map[normExpr(expr)] ?? map.default;
  return H.busts[want] ?? H.busts.smile ?? Object.values(H.busts)[0];
}

function ready(img) { return img && img.complete && img.naturalWidth > 0; }

/**
 * Cached cutout with a soft outline + rim glow, scaled to a height bucket, bottom faded out.
 * Canvas has .ax/.ay = where the face centre-x / chin lands, and .s = source->canvas scale.
 */
function bustCanvas(img, key, H, rim, fade) {
  const m = BUST_META[key] ?? { headTop: 0, chin: img.naturalHeight * 0.6, cx: img.naturalWidth / 2 };
  const s = (0.62 * H) / (m.chin - m.headTop);
  const pad = Math.ceil(H * 0.03) + 4;
  const iw = img.naturalWidth * s, ih = Math.min(img.naturalHeight * s, H - (-m.headTop * s));
  const W = Math.ceil(iw + pad * 2), HH = Math.ceil(H + pad);
  return cached(`bust:${key}:${H}:${rim}:${fade}`, W, HH, (g, c) => {
    const ox = pad, oy = pad - m.headTop * s;
    // 1) silhouette (for outline + rim), tinted
    const sil = makeCanvas(W, HH), sg = sil.getContext('2d');
    sg.imageSmoothingQuality = 'high';
    sg.drawImage(img, ox, oy, img.naturalWidth * s, img.naturalHeight * s);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = rim; sg.fillRect(0, 0, W, HH);
    // 2) outer glow + crisp outline ring from offset silhouettes
    g.save();
    g.filter = `blur(${Math.max(2, H * 0.012)}px)`;
    g.globalAlpha = 0.85;
    const r1 = Math.max(2, H * 0.012);
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; g.drawImage(sil, Math.cos(a) * r1, Math.sin(a) * r1); }
    g.restore();
    g.filter = 'none';
    const r2 = Math.max(1.2, H * 0.005);
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; g.drawImage(sil, Math.cos(a) * r2, Math.sin(a) * r2); }
    // 3) the photo itself
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, ox, oy, img.naturalWidth * s, img.naturalHeight * s);
    // 4) warm rim light kiss along the top-left edge (screen-blended, very light, does not recolor the face)
    // (skipped deliberately: faces must not be recolored)
    // 5) fade the hard bottom crop edge
    if (fade > 0) {
      g.globalCompositeOperation = 'destination-out';
      const y1 = Math.min(HH - pad, oy + img.naturalHeight * s), y0 = y1 - H * fade;
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = gr; g.fillRect(0, y0, W, HH - y0);
      g.fillStyle = '#000'; g.fillRect(0, y1, W, HH);
      g.globalCompositeOperation = 'source-over';
    }
    c.ax = ox + m.cx * s; c.ay = HH - pad; c.s = s; c.faceY = oy + (m.cy ?? (m.headTop + m.chin) / 2) * s; c.topY = oy + m.headTop * s;
  });
}

// ------------------------------------------------------------- overlays
function sweatDrop(c, x, y, s, a = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  c.fillStyle = '#9fd8ff'; c.strokeStyle = '#2f6f9a'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(0, -10); c.bezierCurveTo(5, -2, 7, 3, 0, 7); c.bezierCurveTo(-7, 3, -5, -2, 0, -10); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(-1.8, 1, 1.4, 2.4, -0.3, 0, TAU); c.fill();
  c.restore();
}
function sparkleStar(c, x, y, s, a = 1, col = '#fff6c2') {
  c.save(); c.globalAlpha *= a; c.fillStyle = col;
  c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
  c.restore();
}
function steamPuff(c, x, y, s, t, a = 1) {
  c.save(); c.globalAlpha *= a;
  for (let i = 0; i < 3; i++) {
    const k = (t * 1.4 + i / 3) % 1;
    c.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`;
    c.strokeStyle = `rgba(120,130,150,${0.5 * (1 - k)})`; c.lineWidth = 1.2;
    const px = x + Math.sin(i * 2.1 + t * 3) * s * 0.3 + i * s * 0.35, py = y - k * s * 1.4;
    c.beginPath(); c.arc(px, py, s * (0.28 + k * 0.35), 0, TAU); c.fill(); c.stroke();
  }
  c.restore();
}
function angerMark(c, x, y, s, a = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  c.strokeStyle = PALETTE.danger; c.lineWidth = 2.6; c.lineCap = 'round';
  for (let q = 0; q < 4; q++) {
    c.save(); c.rotate(q * Math.PI / 2);
    c.beginPath(); c.moveTo(2, -7); c.quadraticCurveTo(2, -2, 7, -2); c.stroke();
    c.restore();
  }
  c.restore();
}
function exclaim(c, x, y, s, a = 1, ch = '!') {
  c.save(); c.globalAlpha *= a;
  c.font = `900 ${Math.round(s)}px "Trebuchet MS", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = s * 0.18; c.strokeStyle = PALETTE.ink; c.lineJoin = 'round'; c.strokeText(ch, x, y);
  c.fillStyle = PALETTE.sun; c.fillText(ch, x, y);
  c.restore();
}
function motionLines(c, x, y, len, n, t, a = 1, col = 'rgba(255,246,229,0.8)') {
  c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const yy = y + (i - (n - 1) / 2) * len * 0.22;
    const off = ((t * 3 + i * 0.37) % 1) * len * 0.3;
    c.lineWidth = Math.max(1.5, len * 0.035);
    c.beginPath(); c.moveTo(x - off, yy); c.lineTo(x - off - len * (0.5 + 0.3 * ((i * 0.61) % 1)), yy); c.stroke();
  }
  c.restore();
}
function thinkDots(c, x, y, s, t, a = 1) {
  c.save(); c.globalAlpha *= a;
  for (let i = 0; i < 3; i++) {
    const on = (Math.floor(t * 3) % 4) > i;
    c.fillStyle = on ? PALETTE.paper : 'rgba(255,246,229,0.3)';
    c.beginPath(); c.arc(x + i * s * 0.9, y - i * s * 0.5, s * (0.25 + i * 0.1), 0, TAU); c.fill();
  }
  c.restore();
}

/**
 * Big photo-cutout bust (real face + real hair, transparent, no circle).
 * (x, y) = bottom-centre of the bust (face centre-x sits on x); h = total height in px.
 * expr: 'smile'|'neutral'|'happy'|'surprised'|'annoyed'|'determined' (+ 'worried','sheepish','sad','thinking').
 * o: { t? (seconds, drives the animation), exprT? (seconds since expr began; plays the "beat"),
 *      alpha?, dim?: 0..1 (non-speaking: darkened + slightly smaller), talking?: bool (gentle talk bob),
 *      rim?: color (outline/glow, default warm paper), fade?: 0..1 (bottom fade fraction, default 0.16),
 *      overlays?: bool (default true), bust?: 'smile'|'neutral' (force a photo), enter?: 0..1 (slide/fade in),
 *      side?: -1|1 (which way it leans/slides in from; default 1 = enters from the left) }
 * Returns { faceX, faceY, top } in screen space (useful for placing bubbles), or null if the image is missing.
 */
export function drawBust(ctx, game, hero, expr = 'smile', x, y, h, o = {}) {
  expr = normExpr(expr);
  const key = o.bust ? HEROES[hero]?.busts?.[o.bust] ?? bustKey(hero, expr) : bustKey(hero, expr);
  const img = key ? game?.assets?.image?.(key) : null;
  if (!ready(img)) return drawBustFallback(ctx, game, hero, x, y, h, o);
  const t = o.t ?? game?.time ?? 0;
  const et = o.exprT ?? 99; // time since this expression started (beats play once)
  const side = o.side ?? 1;
  const dim = Math.max(0, Math.min(1, o.dim ?? 0));
  const enter = o.enter == null ? 1 : Math.max(0, Math.min(1, o.enter));
  const ee = 1 - Math.pow(1 - enter, 3);

  // ---- motion per expression (applied to the whole bust; never to the face pixels)
  let dx = 0, dy = 0, rot = 0, sc = 1;
  const breathe = Math.sin(t * 2.1) * 0.006;
  sc += breathe;
  if (o.talking) dy += -Math.abs(Math.sin(t * 9)) * h * 0.008;
  const beat = Math.max(0, 1 - et / 0.5); // 1 -> 0 over the first half second
  switch (expr) {
    case 'happy': dy += -Math.abs(Math.sin(t * 6)) * h * 0.025 - beat * h * 0.05; rot = Math.sin(t * 6) * 0.015; break;
    case 'surprised': dy += -Math.sin(Math.min(1, et / 0.25) * Math.PI) * h * 0.07; sc += beat * 0.04; rot = -side * 0.02 * beat; break;
    case 'annoyed': dx += Math.sin(et * 50) * h * 0.012 * beat + Math.sin(t * 1.5) * h * 0.003; rot = side * 0.025; break;
    case 'determined': sc += 0.035 + beat * 0.03; dx += side * h * 0.025; rot = side * 0.035; dy += h * 0.01; break;
    case 'worried': case 'sad': dy += h * 0.015; rot = -side * 0.02 + Math.sin(t * 1.7) * 0.008; break;
    case 'sheepish': rot = -side * 0.04 + Math.sin(t * 2) * 0.01; dx -= side * h * 0.01; break;
    case 'nod': dy += Math.sin(Math.min(1, et / 0.6) * Math.PI * 2) * h * 0.018 * (et < 0.6 ? 1 : 0); rot = side * 0.01; break;
    case 'thinking': rot = side * 0.03 + Math.sin(t * 1.2) * 0.01; break;
    default: break;
  }
  sc *= 1 - dim * 0.06;
  dx += -side * (1 - ee) * h * 0.25;

  // cache bucket by on-screen height
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
  const scr = h * Math.hypot(m.a, m.b) * sc;
  const HB = scr <= 140 ? 140 : scr <= 260 ? 260 : scr <= 420 ? 420 : 620;
  const c = bustCanvas(img, key, HB, o.rim ?? 'rgba(255,246,229,0.95)', o.fade ?? 0.16);
  const k = (h / HB) * sc;

  if (expr === 'determined' && o.overlays !== false && dim < 0.5) { // speed streaks BEHIND the bust
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.globalAlpha *= ee;
    const u = h / 260, cx0 = x + dx, cy0 = y + dy - h * 0.5;
    ctx.strokeStyle = 'rgba(255,201,74,0.8)'; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const yy = cy0 + (i - 2.5) * 26 * u, off = ((t * 2.5 + i * 0.37) % 1) * 30 * u;
      const x0 = cx0 - side * (h * 0.32 + off), len = (50 + 40 * ((i * 0.61) % 1)) * u;
      ctx.lineWidth = Math.max(2, 5 * u);
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - side * len, yy); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.globalAlpha *= ee;
  ctx.translate(x + dx, y + dy);
  ctx.rotate(rot);
  ctx.scale(k, k);
  ctx.drawImage(c, -c.ax, -c.ay);
  if (dim > 0) { // darken without recoloring: draw the same cutout multiplied by a dark veil
    ctx.globalCompositeOperation = 'source-atop';
    ctx.restore(); ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.globalAlpha *= ee * dim * 0.45;
    ctx.translate(x + dx, y + dy); ctx.rotate(rot); ctx.scale(k, k);
    ctx.filter = 'brightness(0)';
    ctx.drawImage(c, -c.ax, -c.ay);
    ctx.filter = 'none';
  }
  ctx.restore();

  // face position in screen space (for overlays / bubbles)
  const fx = x + dx + (0) * k, fy = y + dy + (c.faceY - c.ay) * k;
  const top = y + dy + (c.topY - c.ay) * k;
  const hw = h * 0.22; // approx half head width
  if (o.overlays !== false && dim < 0.5) {
    const u = h / 260; // overlay unit
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.globalAlpha *= ee;
    switch (expr) {
      case 'happy':
        for (let i = 0; i < 4; i++) {
          const a = t * 1.3 + i * TAU / 4, tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 2);
          sparkleStar(ctx, fx + Math.cos(a) * hw * 1.6, fy - h * 0.05 + Math.sin(a) * hw * 1.2, (6 + 6 * tw) * u, 0.5 + 0.5 * tw);
        }
        break;
      case 'surprised': {
        const pop = Math.min(1, et / 0.15);
        exclaim(ctx, fx + side * hw * 1.25, top + h * 0.02 - pop * 8 * u, 46 * u * (0.6 + 0.4 * pop), pop);
        motionLines(ctx, fx - side * hw * 1.3, top + h * 0.1, 30 * u, 3, t, 0.8 * beat + 0.2, PALETTE.paper);
        break;
      }
      case 'annoyed':
        steamPuff(ctx, fx + side * hw * 1.05, top + h * 0.06, 24 * u, t, 0.95);
        angerMark(ctx, fx - side * hw * 0.8, top + h * 0.08, 1.4 * u, 0.9);
        break;
      case 'determined': {
        const g2 = 0.5 + 0.5 * Math.sin(t * 4);
        sparkleStar(ctx, fx + side * hw * 0.9, fy - h * 0.12, (7 + 7 * g2) * u, 0.9);
        break;
      }
      case 'worried': case 'sheepish': case 'sad': {
        const k2 = ((et * 0.6) % 1);
        sweatDrop(ctx, fx + side * hw * 1.0, top + h * 0.14 + k2 * 8 * u, 1.6 * u, 1 - Math.max(0, k2 - 0.7) * 3);
        if (expr === 'sad') { ctx.fillStyle = 'rgba(80,110,170,0.18)'; ctx.fillRect(fx - hw * 1.5, top, hw * 3, 4 * u); }
        break;
      }
      case 'thinking': thinkDots(ctx, fx + side * hw * 1.2, top + h * 0.05, 14 * u, t); break;
      default: break;
    }
    ctx.restore();
  }
  return { faceX: fx, faceY: fy, top };
}

function drawBustFallback(ctx, game, hero, x, y, h, o) {
  // Image not loaded (yet): a soft silhouette in the hero's colours so layout never jumps.
  const H = HEROES[hero];
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.fillStyle = rgba(H?.look?.shirt ?? PALETTE.tee, 0.9);
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.32, h * 0.22, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = H?.look?.hair ?? '#c99a5b';
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.55, h * 0.2, h * 0.25, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = H?.look?.skin ?? '#f2c7a5';
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, h * 0.15, h * 0.2, 0, 0, TAU); ctx.fill();
  ctx.restore();
  return { faceX: x, faceY: y - h * 0.5, top: y - h * 0.8 };
}

// ------------------------------------------------------------- in-world cutout heads
// Tight head crops from the smile cutouts: real hair silhouette, neck/shirt masked off.
// Polygons are in SOURCE pixels (keep-region). box = crop rect [x, y, w, h].
const HEAD_CROP = {
  aaron: {
    key: 'bust.aaron.smile', box: [100, 0, 335, 404],
    keep: [[100, 0], [435, 0], [435, 300], [385, 350], [335, 392], [298, 404], [250, 366], [200, 322], [156, 288], [100, 276]],
  },
  victoria: {
    key: 'bust.victoria.smile', box: [0, 0, 350, 372],
    keep: [[0, 0], [350, 0], [350, 372], [232, 372], [228, 262], [196, 288], [130, 308], [70, 286], [44, 252], [44, 372], [0, 372]],
  },
};

/**
 * Cached in-world head (cutout crop with a thin ink outline). Returns canvas with .ax/.ay = chin point,
 * .fx/.fy face centre, or null if the cutout isn't loaded. px = height bucket.
 */
export function headCanvas(game, hero, px) {
  const spec = HEAD_CROP[hero];
  const img = spec ? game?.assets?.image?.(spec.key) : null;
  if (!ready(img)) return null;
  const [bx, by, bw, bh] = spec.box;
  const s = px / bh, pad = 3;
  const W = Math.ceil(bw * s + pad * 2), H = Math.ceil(px + pad * 2);
  return cached(`head:${hero}:${px}`, W, H, (g, c) => {
    const tmp = makeCanvas(W, H), tg = tmp.getContext('2d');
    tg.imageSmoothingQuality = 'high';
    tg.save();
    tg.translate(pad - bx * s, pad - by * s);
    tg.beginPath();
    spec.keep.forEach(([x, y], i) => (i ? tg.lineTo(x * s, y * s) : tg.moveTo(x * s, y * s)));
    tg.closePath(); tg.clip();
    tg.drawImage(img, 0, 0, img.naturalWidth * s, img.naturalHeight * s);
    tg.restore();
    // soft fade at the very bottom of Victoria's side hair so it melts into the drawn hair
    if (hero === 'victoria') {
      tg.globalCompositeOperation = 'destination-out';
      const y1 = pad + px, y0 = y1 - px * 0.12;
      const gr = tg.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      tg.fillStyle = gr; tg.fillRect(0, y0, W, y1 - y0 + pad);
      tg.globalCompositeOperation = 'source-over';
    }
    // outline
    const sil = makeCanvas(W, H), sg = sil.getContext('2d');
    sg.drawImage(tmp, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(52,36,30,0.6)'; sg.fillRect(0, 0, W, H);
    const r = Math.max(0.6, px / 110);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; g.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
    g.drawImage(tmp, 0, 0);
    const meta = BUST_META[spec.key];
    c.ax = pad + (meta.cx - bx) * s; c.ay = pad + (meta.chin - by) * s;
    c.fx = c.ax; c.fy = pad + (meta.cy - by) * s; c.top = pad + (meta.headTop - by) * s;
    c.k = s;
  });
}

/**
 * Draw an in-world cutout head with its CHIN at (x, y), total head height h (hair top to chin).
 * Returns false if the cutout isn't available (caller falls back to the round face crop).
 */
export function drawCutoutHead(ctx, game, hero, x, y, h, o = {}) {
  const spec = HEAD_CROP[hero];
  if (!spec) return false;
  const meta = BUST_META[spec.key];
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
  // head height (hair top -> chin) in source px
  const srcH = meta.chin - meta.headTop;
  const scrH = h * Math.hypot(m.a, m.b) * (spec.box[3] / srcH);
  const px = scrH <= 64 ? 64 : scrH <= 128 ? 128 : 256;
  const c = headCanvas(game, hero, px);
  if (!c) return false;
  const k = h / (srcH * c.k);
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(k, k);
  if (o.grey) ctx.filter = 'saturate(0.55)';
  ctx.drawImage(c, -c.ax, -c.ay);
  ctx.filter = 'none';
  ctx.restore();
  return true;
}
