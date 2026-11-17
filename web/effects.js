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
  if (kind === "snow") {
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
