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
  const chord = Math.hypot(W + 8, yR - yL), slack = rnd(1.12, 1.24); // enough slack to pull a U into a V
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
    if (c === " ") links.push(r); else letters.push({ a: ring, b: next, r, c, col: FOILS[ci++ % FOILS.length] });
    ring = next;
  }
  t = chord * slack - 2 * sLen; // the last string runs to the right pin
  string3(ring, null);
  const lastS = strings[strings.length - 1]; // reattach the very end to B
  pts.splice(pts.indexOf(lastS.b), 1); lastS.b = B;
  const rings = [...new Set(letters.flatMap((L) => [L.a, L.b]).concat(links.flatMap((r) => [r.a, r.b])))];
  // Metal cord: it never stretches. Rods are in order from A to B, so each letter's distance along the cord from
  // either pin is known: a pulled letter can't go farther from a pin than that (pull down and the U becomes a V).
  const total = rods.reduce((s, r) => s + r.len, 0);
  { let c = 0; for (const r of rods) { r.fromA = c; c += r.len; } }
  // The end cords are a bit stiff, like wire: points two apart don't fold onto each other (smooth bends, no kinks).
  const bends = [];
  for (let i = 0; i + 1 < strings.length; i++) if (strings[i].b === strings[i + 1].a) bends.push({ a: strings[i].a, b: strings[i + 1].b, min: 2 * sLen * 0.92 });

  // ---- gravity from the phone ----
  let gx = 0, gy = 1, sleeping = false, resting = document.body.classList.contains("resting"), dead = false, still0 = 0, restG = [0, 1];
  const onMotion = (e) => {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    const nx = -a.x / 9.81, ny = a.y / 9.81; // screen coordinates: x right, y down
    const sx = nx - gx, sy = ny - gy;
    gx += sx * 0.15; gy += sy * 0.15;
    if (Math.hypot(sx, sy) > 0.6) for (const p of pts) if (!p.pin) { p.px -= sx * rnd(1, 3); p.py -= sy * rnd(1, 3); } // a shake
    // Tilting the phone is not a touch, so the app's rest mode wouldn't notice it: a real tilt or shake wakes the app.
    if (resting && Math.hypot(gx - restG[0], gy - restG[1]) > 0.3) dispatchEvent(new Event("app-wake"));
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
    // Where the grabbed letter's middle should go: under the finger, but only as far as the cord reaches.
    let tx = 0, ty = 0;
    if (grab) {
      const L = grab.L, ux = L.b.x - L.a.x, uy = L.b.y - L.a.y, len = Math.hypot(ux, uy) || 1, cx = ux / len, cy = uy / len;
      tx = grab.x - (grab.lx * cx - grab.ly * cy); ty = grab.y - (grab.lx * cy + grab.ly * cx);
      const rA = L.r.fromA + L.r.len / 2, rB = total - rA;
      for (let k = 0; k < 6; k++) for (const [o, rr] of [[A, rA], [B, rB]]) {
        const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
        if (d > rr * 0.98) { tx = o.x + (dx / d) * rr * 0.98; ty = o.y + (dy / d) * rr * 0.98; }
      }
      if (Math.hypot(grab.x - tx - (grab.lx * cx - grab.ly * cy), grab.y - ty - (grab.lx * cy + grab.ly * cx)) > 170) { grab = null; lastGrab = performance.now(); } // pulled too hard: it slips out of the finger
    }
    const fix = (r) => {
      const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y, d = Math.hypot(dx, dy) || 0.001, f = (d - r.len) / d;
      const wa = r.a.pin ? 0 : r.b.pin ? 1 : 0.5, wb = r.b.pin ? 0 : r.a.pin ? 1 : 0.5;
      r.a.x += dx * f * wa; r.a.y += dy * f * wa; r.b.x -= dx * f * wb; r.b.y -= dy * f * wb;
    };
    for (let k = 0; k < 50; k++) {
      if (grab && k < 16) { // pull the letter toward the reachable spot
        const L = grab.L, mx = (L.a.x + L.b.x) / 2, my = (L.a.y + L.b.y) / 2, ex = (tx - mx) * 0.4, ey = (ty - my) * 0.4;
        L.a.x += ex; L.a.y += ey; L.b.x += ex; L.b.y += ey;
      }
      for (const b2 of bends) { // wire: resist folding
        const dx = b2.b.x - b2.a.x, dy = b2.b.y - b2.a.y, d = Math.hypot(dx, dy) || 0.001;
        if (d < b2.min) { const f = ((d - b2.min) / d) * 0.15, wa = b2.a.pin ? 0 : 0.5, wb = b2.b.pin ? 0 : 0.5; b2.a.x += dx * f * wa; b2.a.y += dy * f * wa; b2.b.x -= dx * f * wb; b2.b.y -= dy * f * wb; }
      }
      // forward then backward: the length settles from both pins, so nothing is left stretched
      if (k % 2) for (let i = rods.length - 1; i >= 0; i--) fix(rods[i]); else for (const r of rods) fix(r);
    }
    for (const p of pts) { p.x = Math.max(-20, Math.min(W + 20, p.x)); p.y = Math.max(-40, Math.min(CH - 8, p.y)); }
  }
  function energy() { let e = 0; for (const p of pts) e += (p.x - p.px) ** 2 + (p.y - p.py) ** 2; return e; }

  // ---- drawing ----
  const fontPx = Math.round(lh * 0.92);
  // ---- each letter drawn once, as one cut-out piece (like the H in the photo) ----
  // A wide top with rounded ears where the rings go, flowing straight into the letter: one silhouette, one foil,
  // a dark rim around the whole outline and a pressed line just inside it. Saved as a picture; frames only place it.
  // the ears are thinner than the letter's own strokes
  const tabH = Math.max(6.5, lw * 0.13), hwTab = rodLen / 2 + tabH * 0.45, PADX = 6, PADY = 6;
  const PW = Math.ceil(hwTab * 2 + PADX * 2), PH = Math.ceil(tabH / 2 + lh + PADY * 2), OX = PW / 2, OY = PADY + tabH / 2; // OY: the ring line
  const mk = () => { const c = document.createElement("canvas"); c.width = Math.ceil(PW * dpr); c.height = Math.ceil(PH * dpr); const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
  function silhouette(ch, x) {
    x.fillStyle = "#000";
    x.beginPath(); x.roundRect(OX - hwTab, OY - tabH / 2, hwTab * 2, tabH, tabH / 2); x.fill();
    x.font = FONT.replace("{S}", fontPx); x.textAlign = "center"; x.textBaseline = "alphabetic";
    const asc = x.measureText(ch).actualBoundingBoxAscent; // the letter's ink starts right at the ring line
    x.fillText(ch, OX, OY - tabH * 0.15 + asc);
  }
  function erode(src, r) { // the shape shrunk by r px
    const [c, x] = mk(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(src, 0, 0);
    x.globalCompositeOperation = "destination-in";
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; x.drawImage(src, Math.cos(a) * r * dpr, Math.sin(a) * r * dpr); }
    return c;
  }
  function piece(L) {
    const [mask, mx] = mk(); silhouette(L.c, mx);
    const [out, o] = mk(); o.setTransform(1, 0, 0, 1, 0, 0);
    // rim: the silhouette a hair larger, dark
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; o.drawImage(mask, Math.cos(a) * 1.4 * dpr, Math.sin(a) * 1.4 * dpr); }
    o.globalCompositeOperation = "source-in"; o.fillStyle = shade(L.col, -0.62); o.fillRect(0, 0, out.width, out.height);
    // foil inside
    const [f, fx] = mk(); fx.setTransform(1, 0, 0, 1, 0, 0); fx.drawImage(mask, 0, 0);
    fx.globalCompositeOperation = "source-in"; fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gr = fx.createLinearGradient(0, 0, PW * 0.8, PH);
    for (const [s0, k] of [[0, -0.45], [0.14, 0], [0.24, 0.7], [0.3, 0.15], [0.44, -0.35], [0.56, 0.05], [0.66, 0.55], [0.72, 0], [0.86, -0.4], [1, 0.2]]) gr.addColorStop(s0, k ? shade(L.col, k) : L.col);
    fx.fillStyle = gr; fx.fillRect(0, 0, PW, PH);
    fx.globalCompositeOperation = "source-atop"; // crumpled foil: a few soft creases
    for (let k = 0; k < 7; k++) {
      fx.strokeStyle = Math.random() < 0.5 ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.14)"; fx.lineWidth = rnd(1, 3);
      fx.beginPath(); const y0 = rnd(0, PH); fx.moveTo(-5, y0); fx.lineTo(PW + 5, y0 + rnd(-PH * 0.6, PH * 0.6)); fx.stroke();
    }
    o.globalCompositeOperation = "source-over"; o.setTransform(1, 0, 0, 1, 0, 0); o.drawImage(f, 0, 0);
    // the pressed line just inside the outline: a thin band between two insets, dark, with a light edge above it
    const in1 = erode(mask, 2.6), in2 = erode(mask, 3.8);
    const [ln, lx] = mk(); lx.setTransform(1, 0, 0, 1, 0, 0); lx.drawImage(in1, 0, 0);
    lx.globalCompositeOperation = "destination-out"; lx.drawImage(in2, 0, 0);
    lx.globalCompositeOperation = "source-in"; lx.fillStyle = shade(L.col, -0.5); lx.fillRect(0, 0, ln.width, ln.height);
    o.globalAlpha = 0.75; o.drawImage(ln, 0, 0);
    o.globalCompositeOperation = "lighter"; o.globalAlpha = 0.35; o.drawImage(ln, -dpr, -dpr); // light catching the edge
    o.globalCompositeOperation = "source-over"; o.globalAlpha = 1;
    return out;
  }
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, CH);
    g.lineCap = "round";
    g.lineWidth = 1.4; g.strokeStyle = "rgba(240, 200, 110, .9)"; // the two end strings
    g.beginPath(); for (const r of strings) { g.moveTo(r.a.x, r.a.y); g.lineTo(r.b.x, r.b.y); } g.stroke();
    g.lineWidth = 2.2; g.strokeStyle = "#cfd3da"; // metal links (spaces)
    g.beginPath(); for (const r of links) { g.moveTo(r.a.x, r.a.y); g.lineTo(r.b.x, r.b.y); } g.stroke();
    for (const L of letters) {
      L.img ||= piece(L);
      const ang = Math.atan2(L.b.y - L.a.y, L.b.x - L.a.x), mx = (L.a.x + L.b.x) / 2, my = (L.a.y + L.b.y) / 2;
      g.save(); g.translate(mx, my); g.rotate(ang);
      g.drawImage(L.img, -OX, -OY, PW, PH);
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
    rest(on) { resting = on; if (on) restG = [gx, gy]; else wake(); },
    stop,
  };
}

function shade(hex, k) { // k > 0 lighter, < 0 darker
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `rgb(${c.map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))).join(",")})`;
}
