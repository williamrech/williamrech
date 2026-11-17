// 🎉 Festa — a pacote (see PACOTES in app.js; its key is still "confetti", the effect temas already use):
// confetti showers from the top, taps that pop confetti (or fire a corner cannon), balloons floating up to pop,
// and a varal (a hanging letter garland, garland.js) across the top that swings with the phone and the finger.
// CSS for the pieces is in style.css (.confetti, .confetti-fly, .fx-balloon…).
const rnd = (a, b) => a + Math.random() * (b - a);
function partyColors(layer) {
  const css = getComputedStyle(layer);
  return ["--caramel", "--crema", "--fg", "--muted"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean).concat(["#ff8fb1", "#7fc8f8", "#f5d76e"]);
}
// Showers from the top: a big burst on open, then every few seconds a different one (and balloons now and then).
function showers(layer, scale) {
  const kind = layer.dataset.fx, colors = partyColors(layer);
  const add = (cls, style, text) => {
    const s = document.createElement("i");
    s.className = cls;
    s.style.cssText = style;
    if (text) s.textContent = text;
    layer.appendChild(s);
    return s;
  };
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
        if (layer.dataset.fx !== kind) return;
        if (!document.hidden && !document.body.classList.contains("resting") && !layer.querySelector(".fx-balloon")) balloon(layer, colors);
        setTimeout(nextBalloon, rndf(25000, 55000));
      };
      setTimeout(nextBalloon, rndf(8000, 16000));
    }
    const again = () => {
      if (layer.dataset.fx !== kind) return;
      if (!document.hidden && !document.body.classList.contains("resting") && layer.childElementCount < 100 * scale + 10) {
        const r = Math.random();
        const count = r < 0.5 ? rnd(8, 20) : r < 0.85 ? rnd(20, 40) : rnd(45, 80);
        const wide = Math.random() < 0.55;
        burst(Math.round(count * scale), rnd(0.7, 1.6), wide ? 50 : rnd(12, 88), wide ? 50 : rnd(10, 30));
      }
      layer._fxTimer = setTimeout(again, rnd(5, 13) * 1000);
    };
    layer._fxTimer = setTimeout(again, rnd(5, 9) * 1000);
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
// string, swaying. Tap it: it pops like a piñata, candy and a little confetti.
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
    umbrella(layer, cx, cy, [col, col, ...colors], 16, 1.15);
    candy(layer, cx, cy);
  }, { once: true });
}

// Candy from a popped balloon: heavier than paper, so it goes up less and falls all the way down, tumbling.
const CANDY = ["🍬", "🍭", "🍫", "🍬", "🍭", "🍡", "🧁", "🍬"];
function candy(layer, x, y) {
  const H = layer.clientHeight || innerHeight, n = 11;
  for (let i = 0; i < n; i++) {
    const fan = (i / (n - 1)) * 2 - 1, el = document.createElement("i");
    el.className = "fx-candy"; el.textContent = CANDY[Math.floor(Math.random() * CANDY.length)];
    el.style.cssText = `left:${x}px;top:${y}px;font-size:${rndf(18, 26).toFixed(0)}px`;
    layer.appendChild(el);
    fly(el, arcFrames(fan * rndf(70, 150), H - y + 40, -rndf(50, 110) * (1 - Math.abs(fan) * 0.4), rndf(-540, 540), 0.5), rndf(1500, 2000), rndf(0, 90));
  }
}

// A tap on the background: two times out of three an umbrella pop right there; the third, a party cannon fires from
// the bottom corner on that side, shooting a stream up and across.
function tapPop(x, y, layer) {
  const colors = partyColors(layer);
  if (Math.random() < 1 / 3) cannon(layer, 1, colors, x < (layer.clientWidth || innerWidth) / 2);
  else umbrella(layer, x, y, colors, 24);
}

let garland = null, gl = null; // the varal (garland.js), loaded with the pacote
export const pacote = {
  front(layer, scale, still) {
    if (!still) showers(layer, scale);
    if (scale < 1) return; // the small preview: just the confetti
    const me = layer.dataset.fx;
    (gl ||= import(new URL("garland.js" + new URL(import.meta.url).search, import.meta.url).href)).then((m) => {
      if (layer.dataset.fx !== me) return;
      if (garland) garland.stop();
      garland = m.startGarland(layer, partyColors(layer), still);
    }).catch((e) => console.warn("varal", e));
  },
  tap(x, y, layer) { tapPop(x, y, layer); },
  rest(on) { if (garland) garland.rest(on); },
  stop() { if (garland) { garland.stop(); garland = null; } },
};
