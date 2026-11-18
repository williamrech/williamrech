// ☕ Espresso — a pacote (see PACOTES in app.js, key "espresso"; the "Espresso" tema switches it on).
// For now it looks exactly like the old "smoke" effect (the cup behind the feed, steam now and then, from
// effects.js). It is the home for game-like things to come; each hook below is ready and does nothing yet.
//   back(layer)                 behind the feed: the cup
//   front(layer, scale, still)  over the feed: nothing yet (in the small tema preview, the cup goes here)
//   tap(x, y, layer)            a tap on empty background
//   start(ctx) / stop()         while it's on and someone is signed in (ctx: db, uid, toast, api, isAdmin, people)
//   rest(on)                    10 s idle: go quiet / wake
const ver = new URL(import.meta.url).search;
const effects = import(new URL("effects.js" + ver, import.meta.url).href);

// CSS that belongs only to this pacote goes here (added once, when it first draws).
const CSS = ``;
function ensureCss() {
  if (!CSS || document.getElementById("espresso-css")) return;
  const s = document.createElement("style");
  s.id = "espresso-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}
const cup = (layer, scale, still) => effects.then((m) => { if (layer.isConnected) m.startEffect(layer, "smoke", scale, still); });

let ctx = null; // set while signed in (start/stop)

export const pacote = {
  back(layer) { ensureCss(); cup(layer, 1, matchMedia("(prefers-reduced-motion: reduce)").matches); },
  front(layer, scale, still) {
    ensureCss();
    if (scale < 1) cup(layer, scale, still); // the tema preview: everything in one layer
  },
  tap(x, y, layer) {},
  start(c) { ctx = c; },
  stop() { ctx = null; },
  rest(on) {},
};
