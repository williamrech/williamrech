// ☕ The coffee of "passar café" (Espresso pacote, espresso.js): one canvas behind the feed.
// - Liquid: a row of columns standing along the real "down" (the phone's gravity, felt with a short delay), with
//   shallow-water flow between neighbours. The screen is the cup: its bottom and sides are walls, its top edge is
//   the rim. Tilting turns the columns with gravity (the coffee is carried over, flow included), so it keeps
//   moving and sloshing at any angle; whatever rises past the top edge spills out, upside down it pours out.
// - Stream: a chain of drops falling from a spout at the top under the phone's gravity (curves when tilted);
//   each drop that reaches the surface adds its coffee there (that's the pour).
// - Foam: a crema layer riding the surface, thick where the stream lands, carried by the flow, squashed on the
//   crests and stretched in the troughs, with little bubbles that drift and pop. Hot: thick; cold: thin.
// The state lives in this module: it survives the layer being rebuilt, and is gone on reload.
// It only animates while something moves; then it draws one last frame and sleeps (and always in rest mode).

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const GW = 820;         // wave gravity (px/s²): how fast waves travel (a bit thick, still coffee)
const GS = 2300;        // stream gravity (px/s²)
const DX = 4;           // column width (px)
const SUB = 1 / 360;    // simulation step (s)
const FOAM = { hot: [17, 30, 1.25], warm: [9, 18, 0.7], cold: [2.5, 5, 0.12] }; // [rest thickness, max, bubbles per drop]

const C = {
  canvas: null, g: null, dpr: 1, W: 0, H: 0,
  // the frame: columns along u (across), depth along g (down); column j is the line U = U0 + j·d
  ux: 1, uy: 0, gxn: 0, gyn: 1, U0: 0, d: DX, N: 0,
  tmin: null, tmax: null, topOpen: null, floorOpen: null, // each column's segment inside the screen (t along g)
  h: null, q: null, fm: null,             // depth from the floor, flow between j and j+1, foam thickness
  drops: [], bubs: [],                    // stream drops, bubbles
  gx: 0, gy: 1,                           // phone gravity in screen coordinates (smoothed)
  lx: 0, ly: 1,                           // the gravity the coffee feels: follows gx/gy with a short delay (body)
  spilled: 0, landed: 0,
  pouring: false, poured: 0, goal: 0, rate: 0, emitAcc: 0, emitT: 0, full: null,
  kind: "warm", onFull: null, onDraw: null, raf: 0, last: 0, liveUntil: 0, resting: false, t: 0,
  listening: false, gotMotion: false, mottle: null,
};

// ---------- gravity from the phone (same reading as the varal) ----------
const toScreen = (dx, dy) => {
  const ang = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180;
  return [dx * Math.cos(ang) + dy * Math.sin(ang), -dx * Math.sin(ang) + dy * Math.cos(ang)];
};
function onMotion(e) {
  let nx, ny;
  if (e.type === "devicemotion") {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    C.gotMotion = true; [nx, ny] = toScreen(-a.x / 9.81, a.y / 9.81);
  } else {
    if (C.gotMotion || e.beta == null) return;
    const b = e.beta * Math.PI / 180, g = (e.gamma || 0) * Math.PI / 180;
    [nx, ny] = toScreen(Math.sin(g) * Math.cos(b), Math.sin(b));
  }
  const sx = nx - C.gx, sy = ny - C.gy;
  C.gx += sx * 0.2; C.gy += sy * 0.2;
  if (!C.N || Math.hypot(sx, sy) < 0.03) return;
  if (C.resting && Math.hypot(sx, sy) > 0.25) dispatchEvent(new Event("app-wake")); // a real tilt wakes the app
  if (!C.resting) wake(2500);
}
// The pull we use: flat on a table the phone barely feels "down" along the screen, so keep a gentle one.
function grav(x = C.gx, y = C.gy) {
  const m = Math.hypot(x, y);
  if (m < 0.15) return [0, 0.6];
  const k = Math.max(m, 0.6) / m;
  return [x * k, y * k];
}

// ---------- the frame ----------
// Column at U: the points U·u + t·g; returns [tmin, tmax, top edge is its upper end, top edge is its floor].
function clip(U, ux, uy, gx, gy, W, H) {
  let lo = -1e9, hi = 1e9, loTop = false, hiTop = false;
  const axis = (uc, gc, max, isY) => {
    const base = U * uc;
    if (Math.abs(gc) < 1e-6) { if (base < 0 || base > max) { lo = 1; hi = 0; } return; }
    const a = (0 - base) / gc, b = (max - base) / gc; // t where this coordinate is 0 and max
    const [t1, top1, t2, top2] = a < b ? [a, isY, b, false] : [b, false, a, isY];
    if (t1 > lo) { lo = t1; loTop = top1; }
    if (t2 < hi) { hi = t2; hiTop = top2; }
  };
  axis(ux, gx, W, false); axis(uy, gy, H, true);
  if (hi < lo) return [0, 0, false, false];
  return [lo, hi, loTop, hiTop];
}
function makeFrame(gx, gy, W, H) {
  const m = Math.hypot(gx, gy) || 1, g1 = gx / m, g2 = gy / m, u1 = g2, u2 = -g1;
  const us = [0, W * u1, H * u2, W * u1 + H * u2], U0 = Math.min(...us), U1 = Math.max(...us);
  const N = Math.max(8, Math.round((U1 - U0) / DX) + 1), d = (U1 - U0) / (N - 1);
  const F = { ux: u1, uy: u2, gxn: g1, gyn: g2, U0, d, N, tmin: new Float32Array(N), tmax: new Float32Array(N), topOpen: new Uint8Array(N), floorOpen: new Uint8Array(N) };
  for (let j = 0; j < N; j++) {
    const [a, b, at, bt] = clip(U0 + j * d + (j === 0 ? 0.01 : j === N - 1 ? -0.01 : 0), u1, u2, g1, g2, W, H);
    F.tmin[j] = a; F.tmax[j] = b; F.topOpen[j] = at ? 1 : 0; F.floorOpen[j] = bt ? 1 : 0;
  }
  return F;
}
// Where a screen point is in the frame: [column (fractional), t].
const toFrame = (x, y) => [((x * C.ux + y * C.uy) - C.U0) / C.d, x * C.gxn + y * C.gyn];
const ptAt = (j, t) => { const U = C.U0 + j * C.d; return [U * C.ux + t * C.gxn, U * C.uy + t * C.gyn]; };
function lerpA(a, s) { const n = a.length, k = clamp(Math.floor(s), 0, n - 1), f = clamp(s - k, 0, 1); return a[k] * (1 - f) + a[Math.min(k + 1, n - 1)] * f; }
const surfT = (j) => C.tmax[j] - C.h[j];
function volume() { let v = 0; for (let j = 0; j < C.N; j++) v += C.h[j]; return v * C.d; }

// Turn the columns to a new gravity (or a new screen size), carrying the coffee, its flow and its foam over.
function reframe(gx, gy, W, H) {
  const F = makeFrame(gx, gy, W, H);
  const h1 = new Float32Array(F.N), v1 = new Float32Array(F.N), f1 = new Float32Array(F.N);
  if (C.h && C.N) {
    const old = { ux: C.ux, uy: C.uy, gxn: C.gxn, gyn: C.gyn, U0: C.U0, d: C.d, N: C.N, tmax: C.tmax, h: C.h, q: C.q, fm: C.fm };
    const ts = new Float32Array(old.N); for (let j = 0; j < old.N; j++) ts[j] = old.tmax[j] - old.h[j];
    const sOld = (x, y) => ((x * old.ux + y * old.uy) - old.U0) / old.d;
    const wet = (x, y) => { const s = sOld(x, y); if (s < -0.5 || s > old.N - 0.5) return false; return x * old.gxn + y * old.gyn >= lerpA(ts, s) - 0.01; };
    const vel = new Float32Array(old.N);
    for (let j = 0; j < old.N; j++) { const a = j > 0 ? old.q[j - 1] : 0, b = j < old.N - 1 ? old.q[j] : 0; vel[j] = old.h[j] > 1 ? (a + b) / 2 / old.h[j] : 0; }
    let v0 = 0; for (let j = 0; j < old.N; j++) v0 += old.h[j]; v0 *= old.d;
    let vn = 0;
    for (let j = 0; j < F.N; j++) {
      const U = F.U0 + j * F.d, lo = F.tmin[j], hi = F.tmax[j];
      if (hi - lo < 0.5) continue;
      const P = (t) => [U * F.ux + t * F.gxn, U * F.uy + t * F.gyn];
      let [x, y] = P(hi - 0.3);
      if (!wet(x, y)) continue;
      [x, y] = P(lo + 0.3);
      let depth;
      if (wet(x, y)) depth = hi - lo;
      else { let a = lo, b = hi; for (let k = 0; k < 14; k++) { const m = (a + b) / 2, [px, py] = P(m); if (wet(px, py)) b = m; else a = m; } depth = hi - (a + b) / 2; }
      h1[j] = depth; vn += depth;
      const [mx, my] = P(hi - depth / 2), [sx, sy] = P(hi - depth);
      const vo = lerpA(vel, sOld(mx, my)); // the old flow, as a direction on the screen, seen from the new columns
      v1[j] = vo * (old.ux * F.ux + old.uy * F.uy);
      f1[j] = lerpA(old.fm, sOld(sx, sy));
    }
    vn *= F.d;
    if (vn > 0 && v0 > 0) { const k = v0 / vn; for (let j = 0; j < F.N; j++) h1[j] *= k; } // keep every drop
    for (const b of C.bubs) { // bubbles ride along
      const [x, y] = ptAt(b.j, surfT(clamp(Math.round(b.j), 0, C.N - 1)));
      b.j = ((x * F.ux + y * F.uy) - F.U0) / F.d;
    }
  }
  Object.assign(C, F);
  C.h = h1; C.fm = f1; C.q = new Float32Array(F.N - 1);
  for (let j = 0; j < F.N - 1; j++) C.q[j] = 0.5 * (v1[j] + v1[j + 1]) * 0.5 * (h1[j] + h1[j + 1]);
  C.fx = gx; C.fy = gy;
}

// ---------- size ----------
function fit() {
  const W = C.canvas.clientWidth || innerWidth, H = C.canvas.clientHeight || innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  if (W === C.W && H === C.H && dpr === C.dpr) return;
  C.canvas.width = Math.round(W * dpr); C.canvas.height = Math.round(H * dpr); C.dpr = dpr;
  C.W = W; C.H = H;
  const [gx, gy] = grav(C.lx, C.ly);
  reframe(gx, gy, W, H);
}

// ---------- physics ----------
function stepFluid(dt) {
  const { h, q, N, tmax } = C, d = C.d;
  // gravity in the columns' own terms: along them (gN) and across them (gU, a small tilt since the last turn)
  const [gx, gy] = grav(C.lx, C.ly), gN = gx * C.gxn + gy * C.gyn, gU = gx * C.ux + gy * C.uy;
  for (let s = 0, n = Math.ceil(dt / SUB), sdt = dt / n; s < n; s++) {
    for (let i = 0; i < N - 1; i++) {
      const e0 = h[i] - tmax[i], e1 = h[i + 1] - tmax[i + 1]; // surface height against gravity
      const ha = Math.max(0, Math.max(e0, e1) - Math.max(-tmax[i], -tmax[i + 1])); // depth over the higher floor
      if (ha <= 0) { q[i] = 0; continue; }
      q[i] += sdt * GW * ha * (gN * (e0 - e1) / d + gU);
      q[i] *= 1 - 1.5 * sdt;
    }
    for (let i = 1; i < N - 2; i++) q[i] += (q[i - 1] + q[i + 1] - 2 * q[i]) * 0.1; // viscosity: no jagged ripples, a little body
    for (let i = 0; i < N; i++) { // never take more than a column holds
      const outR = i < N - 1 && q[i] > 0 ? q[i] : 0, outL = i > 0 && q[i - 1] < 0 ? -q[i - 1] : 0, out = (outR + outL) * sdt;
      if (out > h[i] * d && out > 0) { const k = (h[i] * d) / out; if (outR) q[i] *= k; if (outL) q[i - 1] *= k; }
    }
    for (let i = 0; i < N; i++) h[i] = Math.max(0, h[i] - (sdt * ((i < N - 1 ? q[i] : 0) - (i > 0 ? q[i - 1] : 0))) / d);
    for (let i = 0; i < N - 1; i++) { // surface tension (keeps the volume), only between wet neighbours
      if (h[i] < 1 || h[i + 1] < 1) continue;
      const m = ((h[i + 1] - tmax[i + 1]) - (h[i] - tmax[i])) * 0.015;
      const mm = m > 0 ? Math.min(m, h[i + 1]) : -Math.min(-m, h[i]);
      h[i] += mm; h[i + 1] -= mm;
    }
  }
}
// The top edge of the screen is the cup's rim: coffee that rises past it is gone. Upside down, it pours out.
function spill(dt) {
  const { h, N } = C;
  let lost = 0;
  for (let j = 0; j < N; j++) {
    if (!h[j]) continue;
    if (C.floorOpen[j]) { const k = Math.min(h[j], h[j] * 3 * dt + 2 * dt * 60); lost += k; h[j] -= k; continue; }
    const cap = C.tmax[j] - C.tmin[j];
    if (C.topOpen[j] && h[j] > cap) { lost += h[j] - cap; h[j] = cap; }
  }
  if (lost > 0) { C.spilled += lost * C.d; wake(1500); }
}
function flowAt(i) { const a = i > 0 ? C.q[i - 1] : 0, b = i < C.N - 1 ? C.q[i] : 0; return (a + b) / 2 / Math.max(C.h[i], 4); }
function stepFoam(dt) {
  const { fm, N, h } = C, d = C.d, [rest, max] = FOAM[C.kind];
  const nf = new Float32Array(N);
  for (let i = 0; i < N; i++) { // carried by the flow (a bit slower than the coffee)
    const src = clamp(i - (flowAt(i) * dt * 0.7) / d, 0, N - 1), k = Math.floor(src), f = src - k;
    nf[i] = fm[k] * (1 - f) + fm[Math.min(k + 1, N - 1)] * f;
  }
  for (let i = 0; i < N; i++) {
    const l = h[i > 0 ? i - 1 : i] >= 1 ? nf[i > 0 ? i - 1 : i] : nf[i], r = h[i < N - 1 ? i + 1 : i] >= 1 ? nf[i < N - 1 ? i + 1 : i] : nf[i];
    let v = nf[i] + (l + r - 2 * nf[i]) * 0.18; // it spreads out by itself
    if (v > rest) v -= (v - rest) * Math.min(1, 0.35 * dt); // settles to the cup's crema
    fm[i] = h[i] < 1 ? 0 : Math.min(v, max);
  }
}
// A drop lands in column s: its coffee goes into the columns around it, with foam and bubbles.
function land(s, speed, mass) {
  const k = clamp(Math.round(s), 0, C.N - 1), d = C.d, spread = 7, [, max, bub] = FOAM[C.kind];
  let wsum = 0; for (let j = -spread; j <= spread; j++) if (k + j >= 0 && k + j < C.N) wsum += Math.exp(-(j * j) / 14);
  for (let j = -spread; j <= spread; j++) {
    const i = k + j; if (i < 0 || i >= C.N) continue;
    const w = Math.exp(-(j * j) / 14) / wsum;
    C.h[i] += (mass * w) / d;
    C.fm[i] = Math.min(max * 1.3, C.fm[i] + (mass * w) / d * (C.kind === "cold" ? 0.15 : 1.1));
  }
  C.landed += mass;
  const push = mass * Math.min(speed, 1600) * 0.006; // the impact: a dent and a ring of waves
  if (k > 0) C.q[k - 1] -= push; if (k < C.N - 1) C.q[k] += push;
  if (Math.random() < bub) addBubble(k + rnd(-3, 3));
}
function addBubble(j, big) {
  if (C.bubs.length >= 170) return;
  const hot = C.kind === "hot";
  C.bubs.push({ j: clamp(j, 0, C.N - 1), d: rnd(0.15, 0.85), r: big ? rnd(3, 4.6) : Math.random() < 0.15 ? rnd(2.4, 3.6) : rnd(0.7, 2.2), life: rnd(1.5, hot ? 9 : 5), pop: 0, ph: rnd(0, 6.28) });
}
function stepStream(dt) {
  const [ex, ey] = grav();
  if (C.pouring) { // the spout: a steady trickle with a slight wobble
    C.emitT += dt;
    C.emitAcc += dt * 110;
    while (C.emitAcc >= 1) {
      C.emitAcc--;
      if (C.poured >= C.goal) { C.pouring = false; break; }
      const m = C.rate / 110;
      C.poured += m;
      C.drops.push({ x: C.W / 2 + Math.sin(C.emitT * 5.1) * 1.2, y: -6, vx: Math.sin(C.emitT * 2.3) * 3, vy: 70, m, age: 0 });
    }
  }
  const keep = [];
  for (const p of C.drops) {
    p.vx += ex * GS * dt; p.vy += ey * GS * dt;
    p.vx *= 1 - 0.25 * dt; p.vy *= 1 - 0.25 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
    if (p.x < 2) { p.x = 2; p.vx = Math.abs(p.vx) * 0.2; }
    if (p.x > C.W - 2) { p.x = C.W - 2; p.vx = -Math.abs(p.vx) * 0.2; }
    if (p.y > C.H - 2) { p.y = C.H - 2; p.vy = -Math.abs(p.vy) * 0.2; }
    const [s, t] = toFrame(p.x, p.y), j = clamp(Math.round(s), 0, C.N - 1);
    const inside = p.y >= 0 && s >= 0 && s <= C.N - 1;
    if ((inside && t >= surfT(j) - Math.min(C.fm[j], 8) - 3) || p.age > 4) {
      if (inside) land(s, Math.hypot(p.vx, p.vy), p.m); else C.landed += p.m;
    } else keep.push(p);
  }
  C.drops = keep;
}
function stepBubbles(dt) {
  const keep = [];
  for (const b of C.bubs) {
    if (b.pop) { b.pop += dt; if (b.pop < 0.18) keep.push(b); continue; }
    const i = clamp(Math.round(b.j), 0, C.N - 1);
    b.j = clamp(b.j + (flowAt(i) * dt * 0.7 + Math.sin((C.t + b.ph) * 1.7) * 2 * dt) / C.d, 0, C.N - 1);
    b.d = Math.max(0.05, b.d - dt * 0.03);
    b.life -= dt;
    if (b.life <= 0 || C.fm[i] < b.r * 0.9) { b.pop = 1e-6; if (b.r > 2.5) C.fm[i] = Math.max(0, C.fm[i] - 0.5); }
    keep.push(b);
  }
  C.bubs = keep;
  if (!C.pouring && C.kind === "hot" && performance.now() < C.liveUntil && Math.random() < dt * 5) { // a hot crema keeps fizzing a little
    const j = Math.floor(rnd(0, C.N)); if (C.h[j] > 1) addBubble(j);
  }
}
function energy() { let e = 0; for (let i = 0; i < C.N - 1; i++) e += Math.abs(C.q[i]); return e / C.N; }

// ---------- drawing ----------
function mottle() { // a soft speckled texture for the crema (made once)
  if (C.mottle) return C.mottle;
  const c = document.createElement("canvas"); c.width = c.height = 160;
  const g = c.getContext("2d");
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 160, y = Math.random() * 160, r = rnd(2, 11), light = Math.random() < 0.45;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, light ? "rgba(255,236,200,.5)" : "rgba(70,30,10,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    for (const ox of [-160, 0, 160]) for (const oy of [-160, 0, 160]) { g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
  }
  return (C.mottle = c);
}
const COLORS = {
  hot: ["#f0c08a", "#c98646", "#7d431f"], warm: ["#d9a46c", "#ad6c38", "#5f3218"], cold: ["#a08b7b", "#6b5444", "#3a2418"],
};
function draw() {
  const { g, W, H, N, h, fm, dpr, tmax } = C;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const vol = volume();
  // the surface on the screen, and how high it sits (for the steam)
  const sx = new Float32Array(N), sy = new Float32Array(N);
  let tTop = 1e9, tBot = -1e9, ySum = 0, yN = 0;
  for (let j = 0; j < N; j++) {
    const t = tmax[j] - h[j], [x, y] = ptAt(j, t); sx[j] = x; sy[j] = y;
    if (h[j] > 1) { tTop = Math.min(tTop, t); ySum += y; yN++; }
    tBot = Math.max(tBot, tmax[j]);
  }
  if (C.onDraw) C.onDraw((vol / (W * H)) * 100, yN ? ((H - ySum / yN) / H) * 100 : 0, C.goal > 0 ? clamp(C.landed / C.goal, 0, 1) : 1);
  if (vol > W * 0.3 && yN) {
    const gx = C.gxn, gy = C.gyn, mid = (N - 1) / 2;
    const [ax, ay] = ptAt(mid, tTop - 30), [bx, by] = ptAt(mid, tBot);
    // the coffee
    g.beginPath();
    for (let j = 0; j < N; j++) g.lineTo(sx[j], sy[j]);
    for (let j = N - 1; j >= 0; j--) { const [x, y] = ptAt(j, tmax[j]); g.lineTo(x, y); }
    g.closePath();
    const body = g.createLinearGradient(ax, ay, bx, by);
    body.addColorStop(0, C.kind === "cold" ? "#2e1b12" : "#4d2912"); body.addColorStop(0.12, "#311709");
    body.addColorStop(0.5, "#170904"); body.addColorStop(1, "#090301");
    g.fillStyle = body; g.fill();
    g.save(); g.clip(); // warm light moving slowly inside it
    const depth = tBot - tTop;
    for (const [pj, pt, r, a] of [[0.3 + Math.sin(C.t * 0.23) * 0.12, 0.25, 0.6, 0.14], [0.72 + Math.cos(C.t * 0.17) * 0.1, 0.45, 0.45, 0.08]]) {
      const [cx, cy] = ptAt(pj * (N - 1), tTop + depth * pt), rr = W * r, gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, `rgba(201,139,79,${a})`); gr.addColorStop(1, "rgba(201,139,79,0)");
      g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
    g.lineWidth = 14; g.strokeStyle = "rgba(10,4,1,.35)"; // the shade just under the crema
    g.beginPath(); for (let j = 0; j < N; j++) if (h[j] > 1) g.lineTo(sx[j] + gx * 7, sy[j] + gy * 7); g.stroke();
    g.restore();
    // the crema: squashed on crests, stretched in troughs
    const fv = new Float32Array(N);
    for (let j = 0; j < N; j++) {
      const e = (k) => h[k] - tmax[k], a = j > 0 ? j - 1 : j, b = j < N - 1 ? j + 1 : j;
      fv[j] = h[j] < 1 ? 0 : Math.min(h[j], fm[j] * clamp(1 + (e(a) + e(b) - 2 * e(j)) * 0.07, 0.5, 1.7));
    }
    g.beginPath();
    for (let j = 0; j < N; j++) g.lineTo(sx[j] - gx * fv[j], sy[j] - gy * fv[j]);
    for (let j = N - 1; j >= 0; j--) g.lineTo(sx[j] + gx * 0.5, sy[j] + gy * 0.5);
    g.closePath();
    const [c0, c1, c2] = COLORS[C.kind], fmax = FOAM[C.kind][1];
    const [fx0, fy0] = ptAt(mid, tTop - fmax), [fx1, fy1] = ptAt(mid, tTop + 2);
    const cg = g.createLinearGradient(fx0, fy0, fx1, fy1);
    cg.addColorStop(0, c0); cg.addColorStop(0.45, c1); cg.addColorStop(1, c2);
    g.fillStyle = cg; g.fill();
    if (C.kind !== "cold") {
      g.save(); g.clip();
      g.globalAlpha = 0.5;
      g.fillStyle = g.createPattern(mottle(), "repeat");
      const off = (C.t * 6) % 160;
      g.translate(off, 0); g.fillRect(-off - 10, -10, W + 180, H + 20);
      g.restore();
    }
    // its top edge catches the light
    g.beginPath(); for (let j = 0; j < N; j++) if (h[j] > 1) g.lineTo(sx[j] - gx * fv[j], sy[j] - gy * fv[j]);
    if (C.kind === "cold") {
      const a = 0.55 + Math.sin(C.t * 2) * 0.25;
      g.strokeStyle = `rgba(127,200,248,${0.12 * a})`; g.lineWidth = 14; g.stroke();
      g.strokeStyle = `rgba(127,200,248,${0.3 * a})`; g.lineWidth = 5; g.stroke();
      g.strokeStyle = "rgba(200,236,255,.85)"; g.lineWidth = 1.4; g.stroke();
    } else {
      g.strokeStyle = "rgba(255,238,210,.55)"; g.lineWidth = 1.2; g.stroke();
    }
    // bubbles
    for (const b of C.bubs) {
      const j = clamp(Math.round(b.j), 0, N - 1); if (h[j] < 1) continue;
      const x = sx[j] - gx * fv[j] * (1 - b.d), y = sy[j] - gy * fv[j] * (1 - b.d);
      if (b.pop) { g.strokeStyle = `rgba(255,240,215,${0.6 * (1 - b.pop / 0.18)})`; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, b.r * (1 + b.pop * 8), 0, 7); g.stroke(); continue; }
      g.fillStyle = "rgba(255,244,225,.14)"; g.strokeStyle = "rgba(255,240,215,.5)"; g.lineWidth = 0.7;
      g.beginPath(); g.arc(x, y, b.r, 0, 7); g.fill(); g.stroke();
      if (b.r > 1.6) { g.fillStyle = "rgba(255,250,240,.75)"; g.beginPath(); g.arc(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.22, 0, 7); g.fill(); }
    }
  }
  // the stream: thick at the spout, thinner as it speeds up
  const D = C.drops;
  if (D.length > 1) {
    g.lineCap = "round";
    for (const [col0, wk, ox] of [["rgba(201,139,79,.18)", 1.9, 0], ["#6b3617", 1, 0], ["#a35f2c", 0.55, -0.12], ["rgba(255,214,160,.55)", 0.2, -0.28]]) {
      g.strokeStyle = col0;
      for (let i = 1; i < D.length; i++) {
        const a = D[i - 1], b = D[i];
        if (Math.hypot(b.x - a.x, b.y - a.y) > 46) continue; // broken off
        const w = clamp(10 - b.age * 7, 4.5, 10);
        g.lineWidth = w * wk;
        g.beginPath(); g.moveTo(a.x + ox * w, a.y); g.lineTo(b.x + ox * w, b.y); g.stroke();
      }
    }
  }
}

// ---------- loop ----------
function frame(now) {
  C.raf = 0;
  if (!C.canvas || !C.canvas.isConnected) return;
  const dt = Math.min(0.033, (now - (C.last || now)) / 1000 || 0.016);
  C.last = now; C.t += dt;
  fit();
  { // the coffee follows the phone's gravity with a short delay (~0.3 s): it has some body
    const [ex, ey] = grav(), k = Math.min(1, dt * 3.5);
    C.lx += (ex - C.lx) * k; C.ly += (ey - C.ly) * k;
    const [gx, gy] = grav(C.lx, C.ly), m = Math.hypot(gx, gy);
    const nx = gx / m, ny = gy / m;
    // Turned for real (> ~11°): turn the columns. Small wobbles (a hand) stay a sideways pull in stepFluid —
    // rebuilding the columns for every wobble added energy each time and the coffee went wild (18.11).
    if (Math.abs(Math.atan2(nx * C.gyn - ny * C.gxn, nx * C.gxn + ny * C.gyn)) > 0.2) reframe(gx, gy, C.W, C.H);
  }
  stepStream(dt); stepFluid(dt); spill(dt); stepFoam(dt); stepBubbles(dt);
  draw();
  if (!C.pouring && !C.drops.length && C.full === false) { C.full = true; if (C.onFull) C.onFull(); }
  const [ex, ey] = grav(), turning = Math.hypot(ex - C.lx, ey - C.ly) > 0.01;
  const busy = C.pouring || C.drops.length || turning || energy() > 3 || performance.now() < C.liveUntil || C.bubs.some((b) => b.pop);
  if (busy && !C.resting && !document.hidden) { if (!C.raf) C.raf = requestAnimationFrame(frame); } // (a wake() during this frame may have asked already)
  else if (!C.raf) C.last = 0;
}
function wake(ms = 4000) {
  C.liveUntil = Math.max(C.liveUntil, performance.now() + ms);
  if (!C.raf && !C.resting && C.canvas && C.canvas.isConnected) { C.last = 0; C.raf = requestAnimationFrame(frame); }
}

// ---------- the outside ----------
export const coffee = {
  // Put the canvas in `box` (again after the layer is rebuilt; the coffee stays as it was).
  // onDraw(amount %, surface height % from the bottom, brew progress 0..1)
  attach(box, { onFull, onDraw } = {}) {
    C.onFull = onFull; C.onDraw = onDraw;
    if (!C.canvas) { C.canvas = document.createElement("canvas"); C.canvas.className = "esp-canvas"; C.g = C.canvas.getContext("2d"); }
    box.prepend(C.canvas);
    C.W = C.H = 0; fit();
    if (!C.listening) { C.listening = true; addEventListener("devicemotion", onMotion); addEventListener("deviceorientation", onMotion); }
    C.last = 0; draw(); wake(1500);
  },
  detach() {
    if (C.listening) { C.listening = false; removeEventListener("devicemotion", onMotion); removeEventListener("deviceorientation", onMotion); }
    cancelAnimationFrame(C.raf); C.raf = 0;
  },
  // Pour until the coffee fills `frac` of the screen; temp 0..100 decides the crema. What's there stays in.
  pour(frac, temp, still) {
    fit();
    C.kind = temp > 66 ? "hot" : temp < 33 ? "cold" : "warm";
    C.goal = Math.max(0, frac * C.W * C.H - volume());
    C.poured = 0; C.landed = 0; C.emitAcc = 0;
    C.rate = Math.max(C.goal / 14, 0.06 * C.W * C.H); // ~6% of the screen a second (at most 14 s)
    C.full = false;
    if (still) { // reduced motion: just there, level with gravity
      const want = frac * C.W * C.H; let a = -2 * (C.W + C.H), b = 2 * (C.W + C.H);
      for (let k = 0; k < 40; k++) { const L = (a + b) / 2; let v = 0; for (let j = 0; j < C.N; j++) v += clamp(L + C.tmax[j], 0, C.tmax[j] - C.tmin[j]); if (v * C.d < want) a = L; else b = L; }
      for (let j = 0; j < C.N; j++) { C.h[j] = clamp(a + C.tmax[j], 0, C.tmax[j] - C.tmin[j]); C.fm[j] = C.h[j] > 1 ? FOAM[C.kind][0] : 0; }
      C.landed = C.goal; C.pouring = false; draw(); C.full = true; if (C.onFull) C.onFull(); return;
    }
    C.pouring = true; wake();
  },
  // A finger on the coffee: a dent where it touches, its coffee pushed into a ring around it; dragging pushes along.
  poke(x, y, mx = 0, my = 0) {
    if (!C.N || volume() < 1) return;
    const [s, t] = toFrame(x, y), k = clamp(Math.round(s), 0, C.N - 1);
    const near = clamp(1 - Math.abs(t - surfT(k)) / 260, 0.25, 1);
    const tap = !mx && !my, depth = (tap ? 34 : Math.min(26, 6 + Math.hypot(mx, my) * 1.2)) * near;
    let moved = 0;
    for (let j = -6; j <= 6; j++) { const i = k + j; if (i < 0 || i >= C.N) continue; const take = Math.min(C.h[i], depth * Math.exp(-(j * j) / 10)); C.h[i] -= take; moved += take; }
    const ring = []; for (let j = 7; j <= 13; j++) for (const i of [k - j, k + j]) if (i >= 0 && i < C.N && C.h[i] > 0.5) ring.push(i);
    if (ring.length) for (const i of ring) C.h[i] += moved / ring.length; else C.h[k] += moved;
    const along = mx * C.ux + my * C.uy; // the drag, across the columns
    if (along) for (let j = -5; j <= 5; j++) { const i = k + j; if (i >= 0 && i < C.N - 1) C.q[i] += along * C.h[i] * 1.5; }
    if (tap && C.kind !== "cold" && Math.random() < 0.6) addBubble(k, true);
    wake();
  },
  // How much coffee there is, as a share of the screen.
  amount() { return C.N ? volume() / (C.W * C.H) : 0; },
  rest(on) { C.resting = on; if (on) { cancelAnimationFrame(C.raf); C.raf = 0; } else wake(1500); },
};
