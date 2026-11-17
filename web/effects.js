// The simple effects: decoration only (they don't react to you or change the app). Their CSS is in style.css.
// startEffect(layer, kind, scale, still): scale < 1 is the small preview in the tema editor; still = reduced motion.
// The app clears the layer (and layer._fxTimer) before starting another one.
const HEART_SVG = `<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21.5 C5 16 0 12 0 6.6 C0 3 2.8 0 6.4 0 C8.8 0 10.8 1.3 12 3.3 C13.2 1.3 15.2 0 17.6 0 C21.2 0 24 3 24 6.6 C24 12 19 16 12 21.5Z" fill="currentColor"/></svg>`;
const SPARKLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill="currentColor"/></svg>`;
// A plain cup on a saucer in the theme's drawing colors (coffee on Espresso, matcha on Matcha…).
const CUP_SVG = `<svg viewBox="0 0 140 100" aria-hidden="true">
<ellipse cx="70" cy="86" rx="62" ry="11" fill="var(--d-pale)" opacity=".55"/>
<ellipse cx="70" cy="83" rx="44" ry="6.5" fill="var(--d-pale)"/>
<path d="M106 46 q 22 -2 20 15 q -2 13 -22 13" fill="none" stroke="var(--d-pale)" stroke-width="7" stroke-linecap="round"/>
<path d="M30 36 Q30 79 70 81 Q110 79 110 36 Z" fill="var(--d-pale)"/>
<path d="M110 36 Q110 73 82 80 Q103 68 104 36 Z" fill="var(--d-dark)" opacity=".25"/>
<ellipse cx="70" cy="36" rx="40" ry="9" fill="var(--d-pale)"/>
<ellipse cx="70" cy="37" rx="35" ry="6.5" fill="var(--d-mid)"/>
<ellipse cx="70" cy="37" rx="35" ry="6.5" fill="var(--d-dark)" opacity=".55"/>
<ellipse cx="62" cy="36" rx="11" ry="2.2" fill="var(--d-light)" opacity=".6"/>
</svg>`;
// A little cloud of steam.
const PUFF_SVG = `<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M15 36 a11 11 0 0 1 -1 -22 a13 13 0 0 1 24 -5 a11 11 0 0 1 15 10 a9 9 0 0 1 -3 17 z" fill="currentColor"/></svg>`;

export function startEffect(layer, kind, scale = 1, still = false) {
  if (kind === "smoke") {
    // The cup stays put; steam only now and then (never with reduced motion).
    const cup = document.createElement("div");
    cup.className = "steam-cup";
    cup.innerHTML = CUP_SVG;
    layer.appendChild(cup);
    if (still) return;
    const puff = () => {
      if (!cup.isConnected) return;
      // While the app is in the background animations are paused: don't pile up puffs that
      // would all float up at once when you come back.
      if (document.hidden || document.body.classList.contains("resting") || cup.querySelectorAll(".puff").length >= 3) {
        layer._fxTimer = setTimeout(puff, 2500 + Math.random() * 4500);
        return;
      }
      const n = Math.random() < 0.3 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const w = document.createElement("i");
        w.className = "puff";
        w.style.cssText = `left:${50 + (Math.random() * 24 - 12)}%;--dur:${(3.2 + Math.random() * 1.4).toFixed(2)}s;--wob:${Math.round(Math.random() * 28 - 14)}px;--peak:${(0.16 + Math.random() * 0.08).toFixed(2)};animation-delay:${k * 0.6}s`;
        w.innerHTML = PUFF_SVG;
        w.addEventListener("animationend", (e) => { if (e.target === w) w.remove(); });
        cup.appendChild(w);
      }
      layer._fxTimer = setTimeout(puff, 2500 + Math.random() * 4500);
    };
    layer._fxTimer = setTimeout(puff, 700);
    return;
  }
  if (still) return;
  const css = getComputedStyle(layer);
  const colors = ["--caramel", "--crema", "--fg", "--muted"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean).concat(["#ff8fb1", "#7fc8f8", "#f5d76e"]);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const add = (cls, style, text) => {
    const s = document.createElement("i");
    s.className = cls;
    s.style.cssText = style;
    if (text) s.textContent = text;
    layer.appendChild(s);
    return s;
  };
  if (kind === "confetti") {
    // A big burst on open, then every few seconds a different shower: amount, speed and spread
    // all random (sometimes a sprinkle, sometimes a cluster on one side, now and then a big one).
    const burst = (count, speed, center, spread) => {
      for (let i = 0; i < count; i++) {
        const strip = Math.random() < 0.15, col = colors[Math.floor(Math.random() * colors.length)];
        const el = add(strip ? "confetti strip" : "confetti", `left:${Math.min(99, Math.max(0, center + rnd(-spread, spread)))}%;background:${strip ? "none" : col};animation-delay:${rnd(0, 0.9)}s;animation-duration:${rnd(2.4, 4.2) * speed}s;--drift:${rnd(-60, 60) * scale}px;--spin:${rnd(-720, 720)}deg;width:${(strip ? rnd(3, 4.5) : rnd(6, 10)) * Math.max(scale, 0.6)}px;height:${(strip ? rnd(24, 40) : rnd(8, 14)) * Math.max(scale, 0.6)}px`);
        if (strip) el.innerHTML = `<b style="background:${col};animation-duration:${rnd(0.35, 0.7)}s"></b>`; // a paper strip, twisting
        el.addEventListener("animationend", (ev) => { if (ev.target === el) el.remove(); });
      }
    };
    burst(Math.round(70 * scale), 1, 50, 50);
    if (scale >= 1) { // a balloon now and then (not while resting)
      const nextBalloon = () => {
        if (layer.dataset.fx !== "confetti") return;
        if (!document.hidden && !document.body.classList.contains("resting") && !layer.querySelector(".fx-balloon")) balloon(layer, colors);
        setTimeout(nextBalloon, rndf(25000, 55000));
      };
      setTimeout(nextBalloon, rndf(8000, 16000));
    }
    const again = () => {
      if (layer.dataset.fx !== "confetti") return;
      if (!document.hidden && !document.body.classList.contains("resting") && layer.childElementCount < 100 * scale + 10) {
        const r = Math.random();
        const count = r < 0.5 ? rnd(8, 20) : r < 0.85 ? rnd(20, 40) : rnd(45, 80);
        const wide = Math.random() < 0.55;
        burst(Math.round(count * scale), rnd(0.7, 1.6), wide ? 50 : rnd(12, 88), wide ? 50 : rnd(10, 30));
      }
      layer._fxTimer = setTimeout(again, rnd(5, 13) * 1000);
    };
    layer._fxTimer = setTimeout(again, rnd(5, 9) * 1000);
  } else if (kind === "snow") {
    for (let i = 0; i < Math.round(26 * scale); i++) {
      add("snow", `left:${rnd(0, 100)}%;font-size:${rnd(8, 18) * Math.max(scale, 0.6)}px;opacity:${rnd(0.25, 0.6)};animation-delay:${rnd(-12, 0)}s;animation-duration:${rnd(8, 16) * Math.max(scale, 0.5)}s;--drift:${rnd(-40, 40) * scale}px`, "❄");
    }
  } else if (kind === "bubbles") {
    // Fizz: a few thin streams of tiny clear bubbles rising from fixed spots (speeding up and
    // growing as they climb), plus some bigger loose ones wobbling up.
    const streams = Math.max(2, Math.round(6 * scale));
    for (let k = 0; k < streams; k++) {
      const x = rnd(4, 96), dur = rnd(3.2, 5.5) * Math.max(scale, 0.6), per = Math.round(rnd(5, 8));
      for (let i = 0; i < per; i++) {
        const size = rnd(2.5, 5) * Math.max(scale, 0.7);
        add("fizz", `left:${x}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${(-dur * i) / per}s;--wob:${rnd(-3, 3)}px;opacity:${rnd(0.35, 0.6)}`);
      }
    }
    for (let i = 0; i < Math.round(9 * scale); i++) {
      const size = rnd(6, 13) * Math.max(scale, 0.6);
      add("bubble", `left:${rnd(0, 100)}%;width:${size}px;height:${size}px;opacity:${rnd(0.25, 0.5)};animation-delay:${rnd(-14, 0) * Math.max(scale, 0.5)}s;animation-duration:${rnd(7, 13) * Math.max(scale, 0.5)}s;--wob:${rnd(3, 9) * scale}px`);
    }
  }
  else if (kind === "hearts") {
    // Hearts drifting up and swaying, in pinks and the theme's accent.
    const tints = ["#ff5c8a", "#ff8fb1", "#ffc2d4"].concat(["--caramel"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean));
    for (let i = 0; i < Math.max(5, Math.round(16 * scale)); i++) {
      const size = rnd(10, 22) * Math.max(scale, 0.6);
      const el = add("heart", `left:${rnd(2, 94)}%;width:${size}px;height:${size}px;color:${tints[Math.floor(Math.random() * tints.length)]};opacity:${rnd(0.3, 0.65).toFixed(2)};animation-delay:${rnd(-16, 0)}s;animation-duration:${rnd(9, 16) * Math.max(scale, 0.5)}s;--wob:${rnd(8, 22) * scale}px`);
      el.innerHTML = HEART_SVG;
    }
  }
  else if (kind === "sparkles") {
    // Little four-point stars twinkling in random spots; each one hops somewhere new after it fades.
    const tints = ["--crema", "--fg", "--caramel"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean).concat(["#ffffff"]);
    for (let i = 0; i < Math.max(6, Math.round(26 * scale)); i++) {
      const el = add("sparkle", `animation-duration:${rnd(2.2, 3.6)}s;animation-delay:${-rnd(0, 3.6)}s`);
      el.innerHTML = SPARKLE_SVG;
      const move = () => {
        const size = rnd(9, 20) * Math.max(scale, 0.6);
        el.style.left = `${rnd(2, 95)}%`;
        el.style.top = `${rnd(3, 92)}%`;
        el.style.width = el.style.height = `${size}px`;
        el.style.color = tints[Math.floor(Math.random() * tints.length)];
      };
      move();
      el.addEventListener("animationiteration", move);
    }
  }
}

// ---------- Confetti that flies (a tap pop, a cannon, a popped balloon) ----------
// Pieces are small squares or, about one in five, long paper strips that twist as they go (the twist is a CSS
// animation on an inner part, the flight a Web Animation on the piece). Every flight is a gravity arc:
// y(s) = a s² + b s with y(1) = dy and the top of the arc at peak (< 0), as in Grim Dawn's loot.
// drag > 0: x slows down as it goes (air), so a fast shot drifts down softly instead of flying on in a line.
const rndf = (a, b) => a + Math.random() * (b - a);
function piece(layer, x, y, colors, stripShare = 0.2) {
  const el = document.createElement("i"), col = colors[Math.floor(Math.random() * colors.length)];
  if (Math.random() < stripShare) {
    el.className = "confetti-fly strip";
    el.style.cssText = `left:${x}px;top:${y}px;width:${rndf(3, 4.5)}px;height:${rndf(24, 42)}px`;
    el.innerHTML = `<b style="background:${col};animation-duration:${rndf(0.35, 0.7)}s"></b>`;
  } else {
    el.className = "confetti-fly";
    el.style.cssText = `left:${x}px;top:${y}px;width:${rndf(5, 9)}px;height:${rndf(8, 13)}px;background:${col}`;
  }
  layer.appendChild(el);
  return el;
}
function arcFrames(dx, dy, peak, spin, drag = 0) {
  const P = Math.min(peak, dy - 10), b = 2 * P - 2 * Math.sqrt(P * P - P * dy), a = dy - b, fr = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, xt = drag ? 1 - Math.pow(1 - t, 1 + drag) : t;
    fr.push({ transform: `translate(-50%,-50%) translate(${(dx * xt).toFixed(1)}px, ${(a * t * t + b * t).toFixed(1)}px) rotate(${(spin * t).toFixed(0)}deg)`, opacity: t < 0.78 ? 1 : 1 - (t - 0.78) / 0.22, offset: t });
  }
  return fr;
}
function fly(el, frames, dur, delay) {
  el.animate(frames, { duration: dur, delay, easing: "linear", fill: "both" }).finished.then(() => el.remove(), () => el.remove());
}
// A party cannon in a bottom corner: a stream shot up and across, each piece on its own arc, slowing in the air.
function cannon(layer, scale, colors, fromLeft) {
  const W = layer.clientWidth || innerWidth, H = layer.clientHeight || innerHeight;
  const x = fromLeft ? -6 : W + 6, y = H * 0.92, dir = fromLeft ? 1 : -1, n = Math.round(40 * Math.max(scale, 0.5));
  for (let i = 0; i < n; i++) {
    const el = piece(layer, x, y, colors, 0.25);
    fly(el, arcFrames(dir * rndf(0.3, 0.95) * W, rndf(0.02, 0.18) * H, -rndf(0.35, 0.72) * H, rndf(-800, 800), 0.9), rndf(1900, 2700), rndf(0, 180));
  }
}
// The umbrella pop (same path as Grim Dawn's loot): the arcs fanned out evenly left to right like the ribs of an open
// umbrella — the middle ones highest, the outer ones lower and wider.
function umbrella(layer, x, y, colors, n, wide = 1) {
  for (let i = 0; i < n; i++) {
    const fan = (i / (n - 1)) * 2 - 1;
    const el = piece(layer, x, y, colors);
    fly(el, arcFrames((fan * 130 + rndf(-12, 12)) * wide, rndf(70, 130) + Math.abs(fan) * 25, -(rndf(95, 140) - Math.abs(fan) * 45) * wide, rndf(-700, 700)), rndf(950, 1250), rndf(0, 80));
  }
}
// Now and then a balloon (the Festa drawing, web/decor/balloon.svg) inflates at the bottom and floats up on its
// string, swaying. Tap it: it pops into confetti.
let balloonSvg = null;
const BALLOON_COLS = ["#ff5d8f", "#ffb703", "#7fc8f8", "#b388ff", "#6ee7b7", "#ff8a5c"];
async function balloon(layer, colors) {
  balloonSvg ||= await fetch(new URL("decor/balloon.svg", import.meta.url)).then((r) => r.text()).catch(() => "");
  if (!balloonSvg || layer.dataset.fx !== "confetti") return;
  const W = layer.clientWidth || innerWidth, H = layer.clientHeight || innerHeight, col = BALLOON_COLS[Math.floor(Math.random() * BALLOON_COLS.length)];
  const b = document.createElement("div");
  b.className = "fx-balloon";
  b.style.cssText = `left:${rndf(0.15, 0.85) * W}px;--d-mid:${col};--d-light:#fff;--d-pale:rgba(255,255,255,.55)`;
  b.innerHTML = balloonSvg;
  b.setAttribute("role", "button");
  b.setAttribute("aria-label", "Balão: toque pra estourar");
  layer.appendChild(b);
  const inflate = b.animate([{ transform: "translateX(-50%) scale(.12)" }, { transform: "translateX(-50%) scale(1.06)", offset: 0.8 }, { transform: "translateX(-50%) scale(1)" }],
    { duration: 1300, easing: "ease-out", fill: "forwards" });
  const rise = [], sway = rndf(14, 26), turns = rndf(2, 3.5), up = H + 180;
  for (let i = 0; i <= 12; i++) { const t = i / 12; rise.push({ transform: `translateX(-50%) translate(${(Math.sin(t * Math.PI * turns) * sway).toFixed(1)}px, ${(-up * t).toFixed(0)}px) rotate(${(Math.sin(t * Math.PI * turns + 0.6) * 6).toFixed(1)}deg)`, offset: t }); }
  let floating = null;
  inflate.finished.then(() => {
    if (!b.isConnected) return;
    floating = b.animate(rise, { duration: rndf(9000, 13000), easing: "ease-in", fill: "forwards" });
    floating.finished.then(() => b.remove(), () => {});
  }, () => {});
  b.addEventListener("click", (e) => { // pop!
    e.stopPropagation();
    const r = b.getBoundingClientRect(), L = layer.getBoundingClientRect();
    const cx = r.left - L.left + r.width / 2, cy = r.top - L.top + r.width * 0.55;
    b.remove();
    const ring = document.createElement("i");
    ring.className = "fx-pop";
    ring.style.cssText = `left:${cx}px;top:${cy}px;border-color:${col}`;
    layer.appendChild(ring);
    ring.animate([{ transform: "translate(-50%,-50%) scale(.3)", opacity: 0.9 }, { transform: "translate(-50%,-50%) scale(1.6)", opacity: 0 }], { duration: 380, easing: "ease-out" }).finished.then(() => ring.remove());
    umbrella(layer, cx, cy, [col, col, ...colors], 28, 1.15);
  }, { once: true });
}

// A tap on the background (only "confetti" reacts): two times out of three an umbrella pop right there; the third,
// a party cannon fires from the bottom corner on that side, shooting a stream up and across.
export function tapEffect(kind, x, y, layer) {
  if (kind !== "confetti" || !layer) return;
  const css = getComputedStyle(layer);
  const colors = ["--caramel", "--crema", "--fg", "--muted"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean).concat(["#ff8fb1", "#7fc8f8", "#f5d76e"]);
  if (Math.random() < 1 / 3) cannon(layer, 1, colors, x < (layer.clientWidth || innerWidth) / 2);
  else umbrella(layer, x, y, colors, 24);
}

