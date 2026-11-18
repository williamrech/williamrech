// ☕ The coffee of "passar café" (Espresso pacote, espresso.js): one canvas behind the feed.
// Done the way the classic "beer" apps do it, which can't blow up:
// - The coffee is everything below a straight surface line that stays level with gravity. The line's angle
//   follows the phone's tilt through a damped spring (it lags, overshoots a little and settles: the slosh).
//   Its height is solved exactly from the amount of coffee and the screen's shape (the screen is the cup).
// - On top of that line, a few standing waves (damped springs, amplitude capped) for the pour, taps and
//   tilts. They always die out, whatever the sensor does.
// - The top edge of the screen is the rim: when the surface reaches it, coffee flows out there.
// - Stream: drops falling from a spout at the top under the phone's gravity (curves when tilted); each drop
//   that reaches the surface adds its coffee there.
// - Crema along the surface (thick where the stream lands, settles, squashed on crests), bubbles that pop.
// The state lives in this module: it survives the layer being rebuilt, and is gone on reload.
// It only animates while something moves; then it draws one last frame and sleeps (and always in rest mode).

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const GS = 2300;          // stream gravity (px/s²)
const GW = 900;           // wave gravity (px/s²): sets the waves' frequencies
const MODES = 5;          // standing waves on the surface
const TILT_K = 13;        // the surface's spring towards level (rad/s²/rad): ~0.57 Hz slosh
const TILT_D = 2.6;       // its damping (coffee with crema: settles in ~2 s)
const FN = 48;            // crema samples along the surface
const FOAM = { hot: [17, 30, 1.25], warm: [9, 18, 0.7], cold: [2.5, 5, 0.12] }; // [rest thickness, max, bubbles per drop]

const C = {
  canvas: null, g: null, dpr: 1, W: 0, H: 0,
  V: 0,                                 // coffee, px² of screen
  th: 0, om: 0, aim: 0,                 // surface angle (0 = phone upright), its speed, the (filtered) gravity angle
  a: new Float32Array(MODES), v: new Float32Array(MODES), // waves: amplitude (px, up = positive), speed
  fm: new Float32Array(FN),             // crema thickness along the surface (0..1 from one wall to the other)
  drops: [], bubs: [],
  gx: 0, gy: 1,                         // phone gravity on the screen (smoothed)
  spilled: 0, landed: 0,
  pouring: false, poured: 0, goal: 0, rate: 0, emitAcc: 0, emitT: 0, full: null,
  kind: "warm", onFull: null, onDraw: null, raf: 0, last: 0, liveUntil: 0, resting: false, t: 0,
  listening: false, gotMotion: false, mottle: null, still: false,
  geo: null,                            // the surface line this frame: n, u, c, s0, s1
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
  if (Math.hypot(sx, sy) < 0.03) return;
  if (C.resting && Math.hypot(sx, sy) > 0.25) dispatchEvent(new Event("app-wake")); // a real tilt wakes the app
  if (!C.resting) wake(2500);
}
// Down on the screen. Flat on a table the phone barely feels it along the screen: keep a gentle one.
function grav() {
  const m = Math.hypot(C.gx, C.gy);
  if (m < 0.15) return [0, 0.6];
  const k = Math.max(m, 0.6) / m;
  return [C.gx * k, C.gy * k];
}
const gravAngle = () => { const [x, y] = grav(); return Math.atan2(x, y); };

// ---------- geometry: the screen is the cup ----------
// Area of the screen where p·n ≥ c (n = down).
function areaBelow(nx, ny, c) {
  const pts = [[0, 0], [C.W, 0], [C.W, C.H], [0, C.H]], out = [];
  for (let i = 0; i < 4; i++) {
    const p = pts[i], q = pts[(i + 1) % 4], dp = p[0] * nx + p[1] * ny - c, dq = q[0] * nx + q[1] * ny - c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  let A = 0; for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; A += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(A) / 2;
}
// The surface line for the current angle and amount: n (down), u (along), c (its depth), s0..s1 (wall to wall).
function solve() {
  const nx = Math.sin(C.th), ny = Math.cos(C.th), ux = ny, uy = -nx;
  const proj = [0, C.W * nx, C.H * ny, C.W * nx + C.H * ny];
  let lo = Math.min(...proj), hi = Math.max(...proj);
  let c = hi;
  if (C.V >= C.W * C.H) c = lo;
  else if (C.V > 0) { for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (areaBelow(nx, ny, m) > C.V) lo = m; else hi = m; } c = (lo + hi) / 2; }
  let s0 = -1e9, s1 = 1e9; // where the line crosses the screen (along u)
  const axis = (base, uc, max) => {
    if (Math.abs(uc) < 1e-6) { if (base < 0 || base > max) { s0 = 1; s1 = 0; } return; }
    const a = (0 - base) / uc, b = (max - base) / uc; s0 = Math.max(s0, Math.min(a, b)); s1 = Math.min(s1, Math.max(a, b));
  };
  axis(c * nx, ux, C.W); axis(c * ny, uy, C.H);
  if (!(s1 > s0)) { s0 = -1; s1 = 1; }
  C.geo = { nx, ny, ux, uy, c, s0, s1, L: Math.max(20, s1 - s0), deep: Math.max(...proj) };
  return C.geo;
}
// Wave height (up) at 0..1 along the surface, and its curvature.
function eta(f) { f = clamp(f, 0, 1); let e = 0; for (let k = 0; k < MODES; k++) e += C.a[k] * Math.cos((k + 1) * Math.PI * f); return e; }
function curv(f) { f = clamp(f, 0, 1); let e = 0; for (let k = 0; k < MODES; k++) { const w = (k + 1) * Math.PI; e -= C.a[k] * w * w * Math.cos(w * f); } return e / (C.geo.L * C.geo.L); }
const along = (x, y) => { const G = C.geo; return ((x * G.ux + y * G.uy) - G.s0) / G.L; };
function foamAt(f) { const s = clamp(f, 0, 1) * (FN - 1), k = Math.floor(s), r = s - k; return C.fm[k] * (1 - r) + C.fm[Math.min(k + 1, FN - 1)] * r; }

// ---------- physics ----------
function stepTilt(dt) {
  // the gravity angle, lightly filtered (a hand's jitter and sensor spikes don't reach the coffee)
  C.aim += wrap(gravAngle() - C.aim) * Math.min(1, dt * 8);
  if (C.still) { C.th = C.aim; C.om = 0; return; }
  const acc = TILT_K * wrap(C.aim - C.th) - TILT_D * C.om;
  C.om = clamp(C.om + acc * dt, -6, 6);
  C.th = wrap(C.th + C.om * dt);
  const G = C.geo; // a quick turn also kicks the first waves (bounded)
  if (G) { C.v[0] += clamp(-acc * G.L * 0.06, -600, 600) * dt; C.v[1] += clamp(-acc * G.L * 0.02, -300, 300) * dt; }
}
function stepWaves(dt) {
  const G = C.geo; if (!G) return;
  const depth = clamp(C.V / G.L, 4, 2000), lim = Math.min(60, G.L * 0.12);
  for (let k = 0; k < MODES; k++) {
    const kk = ((k + 1) * Math.PI) / G.L, w = Math.sqrt(GW * kk * Math.tanh(kk * depth)), z = 0.07 + 0.03 * k + (C.kind === "hot" ? 0.04 : 0);
    C.v[k] += (-w * w * C.a[k] - 2 * z * w * C.v[k]) * dt;
    C.a[k] = clamp(C.a[k] + C.v[k] * dt, -lim, lim);
    if (Math.abs(C.a[k]) >= lim) C.v[k] *= 0.5;
  }
  if (C.V < 1) { C.a.fill(0); C.v.fill(0); }
}
// The top edge is the rim: where the surface reaches past it, coffee flows out (faster the deeper).
function spill(dt) {
  const G = C.geo; if (!G || C.V <= 0) return;
  const d0 = -G.c, d1 = C.W * G.nx - G.c, dmax = Math.max(d0, d1); // depth below the surface at the two top corners
  if (dmax <= 0) return;
  const len = d0 > 0 && d1 > 0 ? C.W : (C.W * dmax) / Math.abs(d1 - d0 || 1);
  const out = Math.min(C.V, 2.2 * len * dmax * dt);
  C.V -= out; C.spilled += out;
  wake(1500);
}
function stepFoam(dt) {
  const [rest] = FOAM[C.kind], f = C.fm, n = new Float32Array(FN);
  for (let i = 0; i < FN; i++) {
    const l = f[i > 0 ? i - 1 : i], r = f[i < FN - 1 ? i + 1 : i];
    let v = f[i] + (l + r - 2 * f[i]) * 0.25;
    if (v > rest) v -= (v - rest) * Math.min(1, 0.35 * dt);
    n[i] = C.V < 1 ? 0 : v;
  }
  C.fm = n;
}
function addFoam(f, amount) {
  const [, max] = FOAM[C.kind], c = clamp(f, 0, 1) * (FN - 1);
  for (let i = Math.max(0, Math.floor(c - 5)); i <= Math.min(FN - 1, Math.ceil(c + 5)); i++) C.fm[i] = Math.min(max * 1.3, C.fm[i] + amount * Math.exp(-((i - c) ** 2) / 6));
}
function addBubble(f, big) {
  if (C.bubs.length >= 150) return;
  C.bubs.push({ f: clamp(f, 0.01, 0.99), d: rnd(0.15, 0.85), r: big ? rnd(3, 4.6) : Math.random() < 0.15 ? rnd(2.4, 3.6) : rnd(0.7, 2.2), life: rnd(1.5, C.kind === "hot" ? 9 : 5), pop: 0, ph: rnd(0, 6.28) });
}
// A drop lands at 0..1 along the surface: its coffee, a dent (waves), foam, a bubble.
function land(f, speed, mass) {
  C.V += mass; C.landed += mass;
  const imp = clamp(mass * Math.min(speed, 1600) * 0.00003, 0, 6); // a small dimple per drop, not a crater
  for (let k = 0; k < MODES; k++) C.v[k] -= (imp * Math.cos((k + 1) * Math.PI * clamp(f, 0, 1))) / (k + 1);
  const [, , bub] = FOAM[C.kind];
  addFoam(f, (mass / Math.max(40, C.geo.L)) * (C.kind === "cold" ? 0.15 : 1.4));
  if (Math.random() < bub) addBubble(f + rnd(-0.03, 0.03));
}
function stepStream(dt) {
  const [ex, ey] = grav();
  if (C.pouring) {
    C.emitT += dt; C.emitAcc += dt * 110;
    while (C.emitAcc >= 1) {
      C.emitAcc--;
      if (C.poured >= C.goal) { C.pouring = false; break; }
      const m = C.rate / 110; C.poured += m;
      C.drops.push({ x: C.W / 2 + Math.sin(C.emitT * 5.1) * 1.2, y: -6, vx: Math.sin(C.emitT * 2.3) * 3, vy: 70, m, age: 0 });
    }
  }
  const G = C.geo, keep = [];
  for (const p of C.drops) {
    p.vx += ex * GS * dt; p.vy += ey * GS * dt; p.vx *= 1 - 0.25 * dt; p.vy *= 1 - 0.25 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
    if (p.x < 2) { p.x = 2; p.vx = Math.abs(p.vx) * 0.2; }
    if (p.x > C.W - 2) { p.x = C.W - 2; p.vx = -Math.abs(p.vx) * 0.2; }
    if (p.y > C.H - 2) { p.y = C.H - 2; p.vy = -Math.abs(p.vy) * 0.2; }
    const f = along(p.x, p.y), depth = p.x * G.nx + p.y * G.ny, surf = G.c - (C.V > 1 ? eta(f) + Math.min(foamAt(f), 8) : 0);
    const corner = depth >= G.deep - 3; // empty cup: the lowest corner
    if ((p.y >= 0 && depth >= surf - 3) || corner || p.age > 4) land(f, Math.hypot(p.vx, p.vy), p.m); else keep.push(p);
  }
  C.drops = keep;
}
function stepBubbles(dt) {
  const keep = [];
  for (const b of C.bubs) {
    if (b.pop) { b.pop += dt; if (b.pop < 0.18) keep.push(b); continue; }
    b.f = clamp(b.f + Math.sin((C.t + b.ph) * 1.7) * 0.004 * dt, 0.01, 0.99);
    b.d = Math.max(0.05, b.d - dt * 0.03); b.life -= dt;
    if (b.life <= 0 || foamAt(b.f) < b.r * 0.9) b.pop = 1e-6;
    keep.push(b);
  }
  C.bubs = keep;
  if (!C.pouring && C.kind === "hot" && C.V > 1 && performance.now() < C.liveUntil && Math.random() < dt * 5) addBubble(rnd(0.02, 0.98));
}
function moving() {
  let e = 0; for (let k = 0; k < MODES; k++) e += Math.abs(C.a[k]) + Math.abs(C.v[k]) * 0.1;
  return e > 0.4 || Math.abs(wrap(C.aim - C.th)) > 0.003 || Math.abs(C.om) > 0.003 || Math.abs(wrap(gravAngle() - C.aim)) > 0.003;
}

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
const COLORS = { hot: ["#f0c08a", "#c98646", "#7d431f"], warm: ["#d9a46c", "#ad6c38", "#5f3218"], cold: ["#a08b7b", "#6b5444", "#3a2418"] };
const SAMPLES = 90;
function draw() {
  const { g, W, H, dpr } = C, G = C.geo;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const P = (s, d) => [s * G.ux + d * G.nx, s * G.uy + d * G.ny]; // along, depth → screen
  const sx = [], sy = [], fv = [];
  let ySum = 0, yN = 0;
  for (let i = 0; i <= SAMPLES; i++) { // the surface, wall to wall (a little past them so the edges are clean)
    const s = G.s0 - 30 + ((G.L + 60) * i) / SAMPLES, f = (s - G.s0) / G.L, [x, y] = P(s, G.c - eta(f));
    sx.push(x); sy.push(y);
    fv.push(foamAt(f) * clamp(1 - curv(f) * 60, 0.5, 1.7));
    if (f >= 0 && f <= 1) { ySum += y; yN++; }
  }
  if (C.onDraw) C.onDraw((C.V / (W * H)) * 100, yN ? ((H - ySum / yN) / H) * 100 : 0, C.goal > 0 ? clamp(C.landed / C.goal, 0, 1) : 1);
  if (C.V > W * 0.3) {
    const far = 4000, [lx, ly] = P(G.s0 - far, G.c - eta(0)), [rx, ry] = P(G.s1 + far, G.c - eta(1));
    g.beginPath(); // the surface, carried on far past both walls, then everything below it
    g.moveTo(lx, ly);
    for (let i = 0; i <= SAMPLES; i++) g.lineTo(sx[i], sy[i]);
    g.lineTo(rx, ry); g.lineTo(rx + G.nx * far, ry + G.ny * far); g.lineTo(lx + G.nx * far, ly + G.ny * far);
    g.closePath();
    const mid = (G.s0 + G.s1) / 2, [ax, ay] = P(mid, G.c - 40), [bx, by] = P(mid, G.deep);
    const body = g.createLinearGradient(ax, ay, bx, by);
    body.addColorStop(0, C.kind === "cold" ? "#2e1b12" : "#4d2912"); body.addColorStop(0.12, "#311709");
    body.addColorStop(0.5, "#170904"); body.addColorStop(1, "#090301");
    g.fillStyle = body; g.fill();
    g.save(); g.clip(); // warm light moving slowly inside it
    const depth = Math.max(40, G.deep - G.c);
    for (const [pj, pt, r, a] of [[0.3 + Math.sin(C.t * 0.23) * 0.12, 0.25, 0.6, 0.14], [0.72 + Math.cos(C.t * 0.17) * 0.1, 0.45, 0.45, 0.08]]) {
      const [cx, cy] = P(G.s0 + G.L * pj, G.c + depth * pt), rr = W * r, gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, `rgba(201,139,79,${a})`); gr.addColorStop(1, "rgba(201,139,79,0)");
      g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
    g.lineWidth = 14; g.strokeStyle = "rgba(10,4,1,.35)"; // the shade just under the crema
    g.beginPath(); for (let i = 0; i <= SAMPLES; i++) g.lineTo(sx[i] + G.nx * 7, sy[i] + G.ny * 7); g.stroke();
    g.restore();
    g.beginPath(); // the crema
    for (let i = 0; i <= SAMPLES; i++) g.lineTo(sx[i] - G.nx * fv[i], sy[i] - G.ny * fv[i]);
    for (let i = SAMPLES; i >= 0; i--) g.lineTo(sx[i] + G.nx * 0.5, sy[i] + G.ny * 0.5);
    g.closePath();
    const [c0, c1, c2] = COLORS[C.kind], fmax = FOAM[C.kind][1];
    const [fx0, fy0] = P(mid, G.c - fmax), [fx1, fy1] = P(mid, G.c + 2);
    const cg = g.createLinearGradient(fx0, fy0, fx1, fy1);
    cg.addColorStop(0, c0); cg.addColorStop(0.45, c1); cg.addColorStop(1, c2);
    g.fillStyle = cg; g.fill();
    if (C.kind !== "cold") {
      g.save(); g.clip(); g.globalAlpha = 0.5;
      g.fillStyle = g.createPattern(mottle(), "repeat");
      const off = (C.t * 6) % 160;
      g.translate(off, 0); g.fillRect(-off - 10, -10, W + 180, H + 20);
      g.restore();
    }
    g.beginPath(); for (let i = 0; i <= SAMPLES; i++) g.lineTo(sx[i] - G.nx * fv[i], sy[i] - G.ny * fv[i]);
    if (C.kind === "cold") {
      const a = 0.55 + Math.sin(C.t * 2) * 0.25;
      g.strokeStyle = `rgba(127,200,248,${0.12 * a})`; g.lineWidth = 14; g.stroke();
      g.strokeStyle = `rgba(127,200,248,${0.3 * a})`; g.lineWidth = 5; g.stroke();
      g.strokeStyle = "rgba(200,236,255,.85)"; g.lineWidth = 1.4; g.stroke();
    } else { g.strokeStyle = "rgba(255,238,210,.55)"; g.lineWidth = 1.2; g.stroke(); }
    for (const b of C.bubs) {
      const s = G.s0 + b.f * G.L, th = foamAt(b.f), [x, y] = P(s, G.c - eta(b.f) - th * (1 - b.d));
      if (b.pop) { g.strokeStyle = `rgba(255,240,215,${0.6 * (1 - b.pop / 0.18)})`; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, b.r * (1 + b.pop * 8), 0, 7); g.stroke(); continue; }
      g.fillStyle = "rgba(255,244,225,.14)"; g.strokeStyle = "rgba(255,240,215,.5)"; g.lineWidth = 0.7;
      g.beginPath(); g.arc(x, y, b.r, 0, 7); g.fill(); g.stroke();
      if (b.r > 1.6) { g.fillStyle = "rgba(255,250,240,.75)"; g.beginPath(); g.arc(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.22, 0, 7); g.fill(); }
    }
  }
  const D = C.drops; // the stream: thick at the spout, thinner as it speeds up
  if (D.length > 1) {
    g.lineCap = "round";
    for (const [col0, wk, ox] of [["rgba(201,139,79,.18)", 1.9, 0], ["#6b3617", 1, 0], ["#a35f2c", 0.55, -0.12], ["rgba(255,214,160,.55)", 0.2, -0.28]]) {
      g.strokeStyle = col0;
      for (let i = 1; i < D.length; i++) {
        const a = D[i - 1], b = D[i];
        if (Math.hypot(b.x - a.x, b.y - a.y) > 46) continue;
        const w = clamp(10 - b.age * 7, 4.5, 10);
        g.lineWidth = w * wk; g.beginPath(); g.moveTo(a.x + ox * w, a.y); g.lineTo(b.x + ox * w, b.y); g.stroke();
      }
    }
  }
}

// ---------- loop ----------
function fit() {
  const W = C.canvas.clientWidth || innerWidth, H = C.canvas.clientHeight || innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  if (W === C.W && H === C.H && dpr === C.dpr) return;
  C.canvas.width = Math.round(W * dpr); C.canvas.height = Math.round(H * dpr); C.dpr = dpr;
  C.W = W; C.H = H;
}
function frame(now) {
  C.raf = 0;
  if (!C.canvas || !C.canvas.isConnected) return;
  const dt = Math.min(0.033, (now - (C.last || now)) / 1000 || 0.016);
  C.last = now; C.t += dt;
  fit();
  for (let i = 0; i < 2; i++) { stepTilt(dt / 2); solve(); stepWaves(dt / 2); }
  stepStream(dt); spill(dt); solve(); stepFoam(dt); stepBubbles(dt);
  draw();
  if (!C.pouring && !C.drops.length && C.full === false) { C.full = true; if (C.onFull) C.onFull(); }
  const busy = C.pouring || C.drops.length || moving() || performance.now() < C.liveUntil || C.bubs.some((b) => b.pop);
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
    if (!C.canvas) { C.canvas = document.createElement("canvas"); C.canvas.className = "esp-canvas"; C.g = C.canvas.getContext("2d"); C.th = C.aim = gravAngle(); }
    box.prepend(C.canvas);
    C.W = C.H = 0; fit(); solve();
    if (!C.listening) { C.listening = true; addEventListener("devicemotion", onMotion); addEventListener("deviceorientation", onMotion); }
    C.last = 0; draw(); wake(1500);
  },
  detach() {
    if (C.listening) { C.listening = false; removeEventListener("devicemotion", onMotion); removeEventListener("deviceorientation", onMotion); }
    cancelAnimationFrame(C.raf); C.raf = 0;
  },
  // Pour until the coffee fills `frac` of the screen; temp 0..100 decides the crema. What's there stays in.
  pour(frac, temp, still) {
    fit(); solve();
    C.kind = temp > 66 ? "hot" : temp < 33 ? "cold" : "warm";
    C.still = !!still;
    C.goal = Math.max(0, frac * C.W * C.H - C.V);
    C.poured = 0; C.landed = 0; C.emitAcc = 0;
    C.rate = Math.max(C.goal / 14, 0.06 * C.W * C.H); // ~6% of the screen a second (at most 14 s)
    C.full = false;
    if (still) { // reduced motion: just there
      C.V += C.goal; C.landed = C.goal; C.fm.fill(FOAM[C.kind][0]); C.pouring = false; solve(); draw();
      C.full = true; if (C.onFull) C.onFull(); return;
    }
    C.pouring = true; wake();
  },
  // A finger on the coffee: a dent where it touches (waves), dragging pushes the surface along.
  poke(x, y, mx = 0, my = 0) {
    if (C.V < 1 || !C.geo) return;
    const G = C.geo, f = clamp(along(x, y), 0, 1);
    if (!mx && !my) {
      for (let k = 0; k < MODES; k++) C.v[k] -= (140 * Math.cos((k + 1) * Math.PI * f)) / (k + 1);
      if (C.kind !== "cold" && Math.random() < 0.6) addBubble(f, true);
    } else {
      const push = clamp(mx * G.ux + my * G.uy, -40, 40);
      for (let k = 0; k < MODES; k++) C.v[k] += (push * 6 * Math.sin((k + 1) * Math.PI * f)) / (k + 1);
    }
    wake();
  },
  // How much coffee there is, as a share of the screen.
  amount() { return C.W ? C.V / (C.W * C.H) : 0; },
  rest(on) { C.resting = on; if (on) { cancelAnimationFrame(C.raf); C.raf = 0; } else wake(1500); },
};
