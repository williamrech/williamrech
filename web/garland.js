// 🎉 Varal: a party letter garland hanging across the top, over everything (it's meant to be in the way: tilt the
// phone to swing it aside). Foil letters pinned to each other by little metal rings (string only at the two ends,
// up to pins at random heights), a word picked at random. Physics: points + rods (Verlet). Each letter is a rod
// between its two rings and hangs rigidly below it; neighbours share a ring. Gravity follows the phone (devicemotion),
// a shake jiggles it, a finger can grab, drag and flick a letter, a tap bumps it. When nothing moves it sleeps
// (no frames at all) until the phone tilts, shakes or a finger touches it. Part of the Festa pacote (festa.js).
const WORDS = ["LETRAS", "BOLO!", "REFRIGERANTE", "BRIGADEIRO", "OBA!", "VARAL", "CONFETE", "COXINHA", "PARABÉNS?", "SALGADINHO",
  "BEXIGA", "EBA!", "DOCINHO", "GUARANÁ", "PIPOCA", "SURPRESA!", "VIVA!", "TCHAU DIETA", "BALÃO", "FESTA?"];
const FOILS = ["#2f7fe0", "#d42a7a", "#e8b52a", "#2fa84f", "#c3c8d0", "#ff7a1a", "#8a4fe0"];
const FONT = '900 {S}px "Arial Rounded MT Bold", "Nunito", "Varela Round", system-ui, sans-serif';
const rnd = (a, b) => a + Math.random() * (b - a);

export function startGarland(layer, _colors, still) {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const W = innerWidth, CH = innerHeight, dpr = Math.min(2, devicePixelRatio || 1); // the whole screen: no invisible floor
  const cv = document.createElement("canvas");
  cv.className = "fx-garland";
  cv.width = Math.round(W * dpr); cv.height = Math.round(CH * dpr);
  cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${CH}px;pointer-events:none`;
  layer.appendChild(cv);
  const g = cv.getContext("2d");

  // ---- the chain ----
  // Letters hang edge to edge: each one is a rod between two rings, and neighbours share the ring between them (one
  // metal ring pins two letters together, free to pivot). String only at the two ends, up to the pins on the edges.
  // A space is a short metal link instead of a letter.
  const chars = [...word], n = chars.filter((c) => c !== " ").length, spaces = chars.length - n;
  // Hung in a hurry: one end high, the other clearly lower (which side, at random), so the line runs skewed.
  const hi = rnd(6, 40), lo = rnd(95, 190), leftHigh = Math.random() < 0.5, yL = leftHigh ? hi : lo, yR = leftHigh ? lo : hi;
  const chord = Math.hypot(W + 8, yR - yL), slack = rnd(1.07, 1.16);
  let lw = Math.max(20, Math.min(72, (chord * 0.9) / (n + spaces * 0.4))); // the letters fill the width: end strings stay short
  const rodLen = lw, linkLen = lw * 0.4, lh = lw * 1.18;
  const sLen = Math.max(3, (chord * slack - n * rodLen - spaces * linkLen) / 6); // 3 string segments at each end
  const pts = [], rods = [], letters = [], strings = [], links = [];
  const P = (x, y, pin) => { const p = { x, y, px: x, py: y, pin: !!pin }; pts.push(p); return p; };
  const rod = (a, b, len) => { const r = { a, b, len }; rods.push(r); return r; };
  const A = P(-4, yL, true), B = P(W + 4, yR, true);
  let t = 0;
  const along = (d) => { t += d; const k = Math.min(1, t / (chord * slack)); return [A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k]; };
  const string3 = (from, to) => { let p = from; for (let i = 0; i < 3; i++) { const q = i < 2 ? P(...along(sLen)) : to || P(...along(sLen)); strings.push(rod(p, q, sLen)); p = q; } return p; };
  let ring = string3(A), ci = 0;
  for (const c of chars) {
    const len = c === " " ? linkLen : rodLen, next = P(...along(len)), r = rod(ring, next, len);
    if (c === " ") links.push(r); else letters.push({ a: ring, b: next, c, col: FOILS[ci++ % FOILS.length] });
    ring = next;
  }
  t = chord * slack - 2 * sLen; // the last string runs to the right pin
  string3(ring, null);
  const lastS = strings[strings.length - 1]; // reattach the very end to B
  pts.splice(pts.indexOf(lastS.b), 1); lastS.b = B;
  const rings = [...new Set(letters.flatMap((L) => [L.a, L.b]).concat(links.flatMap((r) => [r.a, r.b])))];

  // ---- gravity from the phone ----
  let gx = 0, gy = 1, sleeping = false, resting = document.body.classList.contains("resting"), dead = false, still0 = 0;
  const onMotion = (e) => {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    const nx = -a.x / 9.81, ny = a.y / 9.81; // screen coordinates: x right, y down
    const sx = nx - gx, sy = ny - gy;
    gx += sx * 0.15; gy += sy * 0.15;
    if (Math.hypot(sx, sy) > 0.6) for (const p of pts) if (!p.pin) { p.px -= sx * rnd(1, 3); p.py -= sy * rnd(1, 3); } // a shake
    if (Math.hypot(sx, sy) > 0.04) wake();
  };
  addEventListener("devicemotion", onMotion);

  // ---- finger ----
  let grab = null;
  const letterAt = (x, y) => {
    for (let i = letters.length - 1; i >= 0; i--) {
      const L = letters[i], ux = L.b.x - L.a.x, uy = L.b.y - L.a.y, len = Math.hypot(ux, uy) || 1, cx = ux / len, cy = uy / len;
      const mx = (L.a.x + L.b.x) / 2, my = (L.a.y + L.b.y) / 2, dx = x - mx, dy = y - my;
      const lx = dx * cx + dy * cy, ly = -dx * cy + dy * cx; // along the rod, and below it
      if (Math.abs(lx) < lw * 0.6 && ly > -lw * 0.25 && ly < lh * 1.05) return { L, lx, ly };
    }
    return null;
  };
  const onDown = (e) => {
    if (resting && !document.body.classList.contains("resting")) resting = false;
    const r = cv.getBoundingClientRect(), hit = letterAt(e.clientX - r.left, e.clientY - r.top);
    if (!hit) return;
    e.stopPropagation(); e.preventDefault(); // no text selection / page drag underneath
    grab = { ...hit, x: e.clientX - r.left, y: e.clientY - r.top, moved: false, id: e.pointerId };
    wake();
  };
  const onMove = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - grab.x, y - grab.y) > 6) grab.moved = true;
    grab.x = x; grab.y = y;
  };
  const onUp = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    if (!grab.moved) { grab.L.a.py -= rnd(6, 10); grab.L.b.py -= rnd(6, 10); grab.L.a.px += rnd(-3, 3); } // a tap: a little bump
    grab = null; lastGrab = performance.now();
  };
  // touches on a letter don't reach what's underneath (a click there, or the page scrolling while dragging)
  let lastGrab = -1e9;
  const onClick = (e) => { if (performance.now() - lastGrab < 600) { e.stopPropagation(); e.preventDefault(); } };
  const onTouchMove = (e) => { if (grab) e.preventDefault(); };
  addEventListener("pointerdown", onDown, true);
  addEventListener("pointermove", onMove, true);
  addEventListener("pointerup", onUp, true);
  addEventListener("pointercancel", onUp, true);
  addEventListener("click", onClick, true);
  addEventListener("touchmove", onTouchMove, { passive: false, capture: true });

  // ---- simulation ----
  const G = 1500, DT = 1 / 60;
  function step() {
    // phone flat on a table: gravity barely points along the screen; keep at least a gentle pull (down if unsure)
    const m = Math.hypot(gx, gy), ex = m < 0.15 ? 0 : (gx / m) * Math.max(m, 0.6), ey = m < 0.15 ? 0.6 : (gy / m) * Math.max(m, 0.6);
    for (const p of pts) {
      if (p.pin) continue;
      const vx = (p.x - p.px) * 0.985, vy = (p.y - p.py) * 0.985;
      p.px = p.x; p.py = p.y;
      p.x += vx + ex * G * DT * DT; p.y += vy + ey * G * DT * DT;
    }
    for (let k = 0; k < 14; k++) {
      for (const r of rods) {
        const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y, d = Math.hypot(dx, dy) || 0.001, f = (d - r.len) / d;
        const wa = r.a.pin ? 0 : r.b.pin ? 1 : 0.5, wb = r.b.pin ? 0 : r.a.pin ? 1 : 0.5;
        r.a.x += dx * f * wa; r.a.y += dy * f * wa; r.b.x -= dx * f * wb; r.b.y -= dy * f * wb;
      }
      if (grab) { // the grabbed spot follows the finger
        const L = grab.L, ux = L.b.x - L.a.x, uy = L.b.y - L.a.y, len = Math.hypot(ux, uy) || 1, cx = ux / len, cy = uy / len;
        const mx = (L.a.x + L.b.x) / 2, my = (L.a.y + L.b.y) / 2;
        const wx = mx + grab.lx * cx - grab.ly * cy, wy = my + grab.lx * cy + grab.ly * cx;
        const ex = (grab.x - wx) * 0.35, ey = (grab.y - wy) * 0.35;
        L.a.x += ex; L.a.y += ey; L.b.x += ex; L.b.y += ey;
      }
    }
    for (const p of pts) { p.x = Math.max(-20, Math.min(W + 20, p.x)); p.y = Math.max(-40, Math.min(CH - 8, p.y)); }
  }
  function energy() { let e = 0; for (const p of pts) e += (p.x - p.px) ** 2 + (p.y - p.py) ** 2; return e; }

  // ---- drawing ----
  const fontPx = Math.round(lh * 0.92);
  // Foil: hard bands of light and dark across the piece (like crumpled metallic paper catching the light),
  // not a soft plastic gradient.
  function foil(col, x0, y0, x1, y1) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    const stops = [[0, -0.45], [0.14, 0], [0.24, 0.7], [0.3, 0.15], [0.44, -0.35], [0.56, 0.05], [0.66, 0.55], [0.72, 0], [0.86, -0.4], [1, 0.2]];
    for (const [o, k] of stops) gr.addColorStop(o, k ? shade(col, k) : col);
    return gr;
  }
  // A letter with a dark rim: the glyph drawn dark a hair larger all around, then the foil on top. (Stroking the text
  // would also trace the font's inner overlaps — the broken lines inside A, R…)
  function glyph(c, y, col, hw) {
    g.fillStyle = shade(col, -0.6);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.fillText(c, Math.cos(a) * 1.3, y + Math.sin(a) * 1.3); }
    g.fillStyle = foil(col, -hw, y, hw * 0.7, y + lh);
    g.fillText(c, 0, y);
  }
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, CH);
    g.lineCap = "round";
    g.lineWidth = 1.4; g.strokeStyle = "rgba(240, 200, 110, .9)"; // the two end strings
    g.beginPath(); for (const r of strings) { g.moveTo(r.a.x, r.a.y); g.lineTo(r.b.x, r.b.y); } g.stroke();
    g.lineWidth = 2.2; g.strokeStyle = "#cfd3da"; // metal links (spaces)
    g.beginPath(); for (const r of links) { g.moveTo(r.a.x, r.a.y); g.lineTo(r.b.x, r.b.y); } g.stroke();
    g.font = FONT.replace("{S}", fontPx); g.textAlign = "center"; g.textBaseline = "top";
    for (const L of letters) {
      const ang = Math.atan2(L.b.y - L.a.y, L.b.x - L.a.x), mx = (L.a.x + L.b.x) / 2, my = (L.a.y + L.b.y) / 2;
      g.save(); g.translate(mx, my); g.rotate(ang);
      const hw = rodLen / 2 + 3, tabH = lw * 0.3;
      g.fillStyle = foil(L.col, -hw, -tabH, hw * 0.5, tabH * 2);
      g.beginPath(); g.roundRect(-hw, -tabH * 0.5, hw * 2, tabH, tabH * 0.5); g.fill(); // the top tab, ring to ring
      g.lineWidth = 1; g.strokeStyle = shade(L.col, -0.45); g.stroke();
      glyph(L.c, tabH * 0.15, L.col, hw);
      g.restore();
    }
    for (const p of rings) { // one metal ring per joint, pinning the two letters together
      g.beginPath(); g.arc(p.x, p.y, 2.8, 0, Math.PI * 2); g.fillStyle = "#3a3020"; g.fill();
      g.lineWidth = 1.4; g.strokeStyle = "#f2d38a"; g.stroke();
    }
  }

  // ---- loop: runs only while something moves ----
  let raf = 0;
  function frame() {
    raf = 0;
    if (dead || !cv.isConnected) return stop();
    step(); draw();
    if (!grab && energy() < 0.05) still0++; else still0 = 0;
    if (still0 > 45 || resting) { sleeping = true; return; }
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (dead || still || resting) return;
    if (!cv.isConnected) return stop();
    sleeping = false; still0 = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    dead = true;
    if (raf) cancelAnimationFrame(raf);
    removeEventListener("devicemotion", onMotion);
    removeEventListener("pointerdown", onDown, true);
    removeEventListener("pointermove", onMove, true);
    removeEventListener("pointerup", onUp, true);
    removeEventListener("pointercancel", onUp, true);
    removeEventListener("click", onClick, true);
    removeEventListener("touchmove", onTouchMove, { capture: true });
    cv.remove();
  }
  // settle into the curve before the first picture (no swinging in from a straight line)
  for (let i = 0; i < 240; i++) step();
  for (const p of pts) { p.px = p.x; p.py = p.y; }
  const firstDraw = () => { if (!dead) { draw(); if (!still) { // a small swing on arrival
    for (const L of letters) { L.a.px -= rnd(-4, 4); L.b.px -= rnd(-4, 4); } wake(); } } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(firstDraw); else firstDraw();
  return {
    rest(on) { resting = on; if (!on) wake(); },
    stop,
  };
}

function shade(hex, k) { // k > 0 lighter, < 0 darker
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `rgb(${c.map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))).join(",")})`;
}
