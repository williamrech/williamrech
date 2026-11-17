// ⚔️ Grim Dawn grail: counts the epics, legendaries and iron each person finds (Firestore grail/{uid}),
// shows them in the footer, opens a "holy grail" list of every possible item, and sends gifts between people
// (gifts/{id}; moved by the functions, so nothing is duplicated or lost). Loaded only while the occasion is live.
import { doc, setDoc, onSnapshot, collection, query, where, increment, deleteField } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const RAR = { legendary: { pt: "Lendário", pl: "Lendários", col: "#c86bff" }, epic: { pt: "Épico", pl: "Épicos", col: "#4f9dff" } };
const IRON_COL = "#a7a7a3";
const KINDS = [["sword", "Espadas"], ["sword2h", "Espadas de duas mãos"], ["axe", "Machados"], ["axe2h", "Machados de duas mãos"], ["mace", "Maças"],
  ["mace2h", "Maças de duas mãos"], ["spear2h", "Lanças"], ["dagger", "Adagas"], ["scepter", "Cetros"], ["gun1h", "Armas de fogo"], ["gun2h", "Armas de fogo de duas mãos"],
  ["shield", "Escudos"], ["focus", "Mão secundária"], ["head", "Elmos"], ["shoulder", "Ombreiras"], ["chest", "Peitorais"], ["hands", "Luvas"], ["waist", "Cintos"],
  ["legs", "Calças"], ["feet", "Botas"], ["ring", "Anéis"], ["amulet", "Amuletos"], ["medal", "Medalhas"]];
const KIND1 = { sword: "Espada", sword2h: "Espada 2 mãos", axe: "Machado", axe2h: "Machado 2 mãos", mace: "Maça", mace2h: "Maça 2 mãos", spear2h: "Lança",
  dagger: "Adaga", scepter: "Cetro", gun1h: "Arma de fogo", gun2h: "Arma de fogo 2 mãos", shield: "Escudo", focus: "Mão secundária", head: "Elmo",
  shoulder: "Ombreira", chest: "Peitoral", hands: "Luvas", waist: "Cinto", legs: "Calças", feet: "Botas", ring: "Anel", amulet: "Amuleto", medal: "Medalha" };
// When the icon art can't show (the download failed, or GrimTools changed its picture): a silly line instead.
const NO_ART = ["A arte deste item se perdeu no Vazio. Reclama com o admin.", "O pintor de Cairn ainda não pintou esse. Vai falar com o admin.",
  "Uma fenda engoliu a imagem. Claramente culpa do admin.", "Sem arte por enquanto. O admin sabe o porquê (ou finge que sabe)."];
const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
// Mercador prices (the server has the same ones and is the one that decides).
const PRICE = { random: { epic: 300, legendary: 900 }, set: { epic: 600, legendary: 1500 } };
const SELL = { epic: 10, legendary: 40 }; // per extra copy; +50% if it's from a set you have complete
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `
.grail-line { pointer-events: auto; display: block; margin: 0 0 4px; padding: 4px 16px; border: 0; background: none; font: 600 .74rem/1.45 var(--sans, system-ui);
  color: var(--muted); letter-spacing: .02em; text-align: left; max-width: calc(100% - 96px); } /* left, clear of the ＋ */
.grail-line b { font-weight: 700; }
.grail-line.glow { animation: grail-glow 1.4s ease-out; }
@keyframes grail-glow { 0% { text-shadow: 0 0 0 transparent; } 25% { text-shadow: 0 0 12px #f3d64e, 0 0 3px #f3d64e; } 100% { text-shadow: 0 0 0 transparent; } }
.gift-in { display: grid; gap: 8px; margin: 0 0 10px; }
.gift-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #6e5832; border-radius: 3px; background: linear-gradient(180deg, #17150f, #0c0b08); }
.gift-card .t { flex: 1; font-size: .86rem; line-height: 1.3; }
.gift-card button, #dlg-grail .gbtn { padding: 6px 10px; font-size: .8rem; border-radius: 3px; border: 1px solid #6e5832; background: linear-gradient(180deg, #2b2519, #16130d); color: #e9dcb8; }
.gift-card button.no, #dlg-grail .gbtn.no { background: none; color: #a59d8a; }
#dlg-grail { padding: 16px 14px 12px; }
#dlg-grail[open] { height: min(88%, 760px); display: flex; flex-direction: column; } /* same height on every tab and filter: nothing jumps */
#dlg-grail .gbody { flex: 1; min-height: 0; display: flex; flex-direction: column; }
#dlg-grail h2 { margin: 0 0 8px; font-family: "GD Cinzel", Georgia, serif; letter-spacing: .06em; }
#dlg-grail .gtabs { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 3px; margin: 0 0 8px; }
#dlg-grail .gtabs button { padding: 6px 2px; font-size: .78rem; border: 1px solid #3c3221; background: #0e0f0e; color: #8d877a; border-radius: 2px; }
#dlg-grail .gtabs button.on { color: #f0d79a; border-color: #8a6f3e; background: linear-gradient(180deg, #2b2519, #16130d); }
#dlg-grail .gbar { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: .8rem; color: var(--muted); }
#dlg-grail .gbar .prog { flex: 1; height: 5px; border-radius: 2px; background: #1c1c1a; overflow: hidden; }
#dlg-grail .gbar .prog i { display: block; height: 100%; }
#dlg-grail .gfilt { display: flex; gap: 4px; margin: 0 0 6px; }
#dlg-grail .gfilt button { padding: 3px 8px; font-size: .74rem; border: 1px solid #3c3221; border-radius: 10px; background: none; color: #8d877a; }
#dlg-grail .gfilt button.on { color: #f0d79a; border-color: #8a6f3e; }
#dlg-grail .glist { flex: 1; min-height: 0; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
#dlg-grail .gset { font-size: .7rem; padding: 1px 6px; border-radius: 8px; border: 1px solid #3d5a3f; color: #8fbf92; white-space: nowrap; }
#dlg-grail .gset.done, #dlg-grail .sdone .gset { border-color: #5fe08a; color: #b9ffcb; box-shadow: 0 0 8px rgba(95, 224, 138, .45); }
#dlg-grail .sdone .nm, .art-set.done b { text-shadow: 0 0 8px rgba(95, 224, 138, .75), 0 0 2px rgba(95, 224, 138, .9); }
#dlg-grail .srow { display: flex; align-items: center; gap: 8px; padding: 7px 2px; border-bottom: 1px solid rgba(255,255,255,.05); font-size: .86rem; cursor: pointer; }
#dlg-grail .srow .nm { flex: 1; min-width: 0; }
#dlg-grail .srow .prog { width: 54px; height: 4px; border-radius: 2px; background: #1c1c1a; overflow: hidden; flex: none; }
#dlg-grail .srow .prog i { display: block; height: 100%; background: #5fe08a; }
#dlg-grail .spieces { margin: 0 0 6px 10px; border-left: 1px solid #3c3221; padding-left: 8px; }
#dlg-grail .spieces .gi { font-size: .8rem; }
#dlg-grail details.snot > summary { cursor: pointer; margin: 12px 0 4px; font-size: .78rem; color: var(--muted); }
.art-set { max-width: min(320px, 86vw); font-size: .8rem; color: #cfc6b0; text-align: left; }
.art-set .t { display: block; text-align: center; margin: 0 0 6px; font-family: "GD Cinzel", Georgia, serif; }
.art-set.done .t { color: #b9ffcb; }
.art-set .app, #dlg-grail .sapp { display: block; text-align: center; margin: -2px 0 8px; font-size: .7rem; color: #8d877a; font-style: italic; }
.art-set ul { list-style: none; margin: 0; padding: 0; }
.art-set li { display: flex; gap: 8px; justify-content: space-between; padding: 2px 0; }
.art-set li.miss { color: #6b675e; }
.art-set li .k { color: #8d877a; font-size: .72rem; white-space: nowrap; }
/* Mercador */
#dlg-grail .mercs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0 8px; }
#dlg-grail .gbtn.merc { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; font-size: .86rem; width: 100%; }
#dlg-grail .gbtn.merc .pr { font-size: .72rem; color: #b8ab8c; }
#dlg-grail .gbtn.merc.epic { border-color: #2f5a93; } #dlg-grail .gbtn.merc.legendary { border-color: #6a3a99; }
#dlg-grail .gbtn.merc.sell { margin-bottom: 6px; }
#dlg-grail .gbtn[disabled], #dlg-art .gbtn[disabled] { opacity: .45; }
#dlg-grail .gbtn.mini-buy { padding: 2px 7px; font-size: .7rem; margin-left: 6px; flex: none; }
.art-act { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: -2px 0 10px; font-size: .72rem; }
.art-act .gbtn { padding: 6px 12px; font-size: .82rem; border-radius: 3px; border: 1px solid #6e5832; background: linear-gradient(180deg, #2b2519, #16130d); color: #e9dcb8; }
/* The set as small framed tiles (same gold/silver as the big frame); missing pieces are silhouettes */
.art-tiles { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; margin: 2px 0 10px; }
.art-tile { width: 50px; height: 50px; padding: 0; display: grid; place-items: center; border: 2px solid transparent; border-radius: 2px; cursor: pointer; }
.art-tile.legendary { background: radial-gradient(circle at 50% 45%, rgba(170, 70, 255, .25), transparent 70%) padding-box, linear-gradient(#0d0a10, #070508) padding-box,
  linear-gradient(135deg, #fff1c2, #d8b06a 22%, #7a5524 48%, #f0d48a 72%, #8a6330) border-box; }
.art-tile.epic { background: radial-gradient(circle at 50% 45%, rgba(70, 140, 255, .22), transparent 70%) padding-box, linear-gradient(#090b10, #050608) padding-box,
  linear-gradient(135deg, #ffffff, #c9ced6 22%, #646a73 48%, #e6e9ee 72%, #7d848d) border-box; }
.art-tile.miss { opacity: .75; }
.art-tile.cur { box-shadow: 0 0 0 2px rgba(255, 255, 255, .85), 0 0 12px rgba(255, 255, 255, .35); }
.art-set.done .art-tile { box-shadow: 0 0 10px rgba(95, 224, 138, .55); } .art-set.done .art-tile.cur { box-shadow: 0 0 0 2px #b9ffcb, 0 0 14px rgba(95, 224, 138, .8); }
.art-tile .ico { background-repeat: no-repeat; }
.ico.sil, canvas.ico.sil { filter: brightness(0) drop-shadow(0 0 1px rgba(214, 190, 140, .55)) drop-shadow(0 0 4px rgba(214, 190, 140, .2)) !important; }
.art-frame.ghost { opacity: .9; } .art-name.ghost { opacity: .55; }
#dlg-grail h4 { margin: 10px 0 4px; font: 700 .7rem/1 "GD Cinzel", Georgia, serif; letter-spacing: .12em; text-transform: uppercase; color: #9a8256; }
#dlg-grail .gi { display: flex; align-items: center; gap: 8px; padding: 4px 2px; border-bottom: 1px solid rgba(255,255,255,.04); font-size: .86rem; }
#dlg-grail .gi img { width: 26px; height: 26px; object-fit: contain; flex: none; }
#dlg-grail .gi.miss { color: #55534e; }
#dlg-grail .gi.miss img { filter: grayscale(1) brightness(.35); }
#dlg-grail .gi .nm { flex: 1; min-width: 0; }
#dlg-grail .gi .meta { font-size: .72rem; color: var(--muted); white-space: nowrap; }
#dlg-grail .gsend { margin: 2px 0 10px; padding: 8px 10px 10px; border: 1px solid #3c3221; border-radius: 3px; background: rgba(0,0,0,.25); }
#dlg-grail .gsend .lbl { font-size: .72rem; color: var(--muted); margin: 0 0 6px; }
#dlg-grail .gsend .who { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
#dlg-grail .gsend .who button { padding: 5px 11px; font-size: .8rem; border-radius: 14px; border: 1px dashed #5a4b33; background: none; color: #cfc6b0; }
#dlg-grail .gsend .who button.pick { border: 1px solid #f3d64e; color: #f3d64e; background: rgba(243,214,78,.08); }
#dlg-grail .gsend .who button.pick::before { content: "✓ "; }
#dlg-grail .gsend .go { display: block; width: 100%; padding: 9px 10px; font: 700 .86rem/1.2 var(--sans, system-ui); border-radius: 3px; border: 1px solid #8a6f3e;
  background: linear-gradient(180deg, #4a3c1f, #2a2112); color: #f3d64e; }
#dlg-grail .gsend .go:disabled { opacity: .4; border-color: #3c3221; color: #8d877a; background: none; }
#dlg-grail .gnote { font-size: .78rem; color: var(--muted); margin: 6px 0; }
#dlg-grail input.gq { width: 7em; min-height: 34px; padding: 4px 8px; font-size: 16px; }
#dlg-grail .grow { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.05); font-size: .84rem; }
#dlg-grail .grow .nm { flex: 1; min-width: 0; }
#dlg-grail .close-link { display: block; margin: 10px auto 0; }
#dlg-grail .gi.has { cursor: pointer; }
#dlg-grail .gi .mini { width: 26px; height: 26px; flex: none; position: relative; overflow: hidden; }
#dlg-grail .gi .mini i { position: absolute; left: 50%; top: 50%; background-repeat: no-repeat; }
#dlg-art { padding: 0; border: 0; background: none; box-shadow: none; overflow: visible; width: auto; max-width: 92vw; }
#dlg-art::backdrop { background: rgba(0, 0, 0, .72); }
.art-wrap { display: grid; justify-items: center; gap: 12px; padding: 18px; }
.art-frame { position: relative; padding: 18px; border: 3px solid transparent; border-radius: 2px; outline-offset: 4px; }
.art-frame.legendary { background: radial-gradient(circle at 50% 45%, rgba(170, 70, 255, .28), transparent 70%) padding-box, linear-gradient(#0d0a10, #070508) padding-box,
  linear-gradient(135deg, #fff1c2, #d8b06a 22%, #7a5524 48%, #f0d48a 72%, #8a6330) border-box;
  outline: 1px solid #8a6330; box-shadow: 0 0 22px rgba(240, 200, 90, .35), 0 0 2px #000 inset; }
.art-frame.epic { background: radial-gradient(circle at 50% 45%, rgba(70, 140, 255, .26), transparent 70%) padding-box, linear-gradient(#090b10, #050608) padding-box,
  linear-gradient(135deg, #ffffff, #c9ced6 22%, #646a73 48%, #e6e9ee 72%, #7d848d) border-box;
  outline: 1px solid #7d848d; box-shadow: 0 0 22px rgba(200, 215, 240, .3), 0 0 2px #000 inset; }
.art-frame::before, .art-frame::after { content: ""; position: absolute; left: 50%; width: 12px; height: 12px; transform: translate(-50%, -50%) rotate(45deg);
  background: inherit; border: 2px solid; }
.art-frame.legendary::before, .art-frame.legendary::after { background: linear-gradient(135deg, #fff1c2, #b98d49); border-color: #5a4219; }
.art-frame.epic::before, .art-frame.epic::after { background: linear-gradient(135deg, #ffffff, #8d939c); border-color: #4a4f57; }
.art-frame::before { top: -2px; } .art-frame::after { top: 100%; margin-top: 2px; }
.art-frame { display: grid; place-items: center; min-width: 150px; min-height: 150px; } /* same frame for every item; small ones sit in the middle */
.art-frame .ico { background-repeat: no-repeat; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, .8)); }
.art-frame .msg { width: 200px; min-height: 120px; display: grid; place-items: center; text-align: center; font-size: .9rem; color: #cfc6b0; }
.art-frame .msg b { display: block; font-size: 2.4rem; margin-bottom: 6px; }
.art-name { font-family: "GD Cinzel", Georgia, serif; font-weight: 700; letter-spacing: .04em; text-align: center; max-width: 80vw; }
.art-name.legendary { color: #c86bff; } .art-name.epic { color: #4f9dff; }
`;

let S = null; // the running grail (one per app open while the occasion is live)

export function startGrail(o) {
  if (S) return S.stop;
  // o: { db, uid, api(action, data) → Promise, gd (grimdawn module), isAdmin(), people() → [[uid, name]], toast(msg) }
  gdRef = o.gd;
  const st = { o, data: { items: {}, iron: 0 }, pend: { items: {}, iron: 0 }, gin: [], gout: [], allPend: [], tab: "legendary", filt: "all", open: null, pick: null, fam: null };
  S = st;
  if (!document.getElementById("grail-css")) { const c = document.createElement("style"); c.id = "grail-css"; c.textContent = CSS; document.head.appendChild(c); }
  const cat = o.gd.grailCatalog();
  st.rar = {}; for (const r of ["epic", "legendary"]) for (const [n] of cat[r]) st.rar[n] = r;
  st.cat = cat;
  st.rar = {}; for (const r of ["epic", "legendary"]) for (const [n] of cat[r]) st.rar[n] = r;
  st.api = o.api; st.toast = o.toast;
  // Item sets: which set each piece belongs to (from the game's data, see gd-sets.js).
  st.sets = o.gd.grailSets ? o.gd.grailSets() : [];
  st.setOf = {}; for (const x of st.sets) for (const n of x.pieces) st.setOf[n] = x;
  st.kindOf = {}; for (const r of ["epic", "legendary"]) for (const [n, k] of cat[r]) st.kindOf[n] = k;
  st.sopen = null;
  st.artReady = false; // GrimTools' icon sheet saved on this phone? If not, fetch it now, quietly (any connection).
  hasSheet().then((ok) => {
    if (ok) { st.artReady = true; return; }
    setTimeout(() => getSheet().then((got) => {
      if (!got) return;
      st.artReady = true;
      const x = document.getElementById("dlg-grail"); if (x && x.open && st.tab !== "iron") st.rerender(); // mini icons appear
    }), 3000); // after the app has settled
  });

  // Footer line
  const line = document.createElement("button");
  line.className = "grail-line"; line.type = "button";
  line.addEventListener("click", () => openList());
  const foot = document.querySelector("footer");
  foot.prepend(line);
  st.line = line;
  // Incoming gifts: cards under the occasion banner
  const gin = document.createElement("div");
  gin.className = "gift-in"; gin.hidden = true;
  const occ = document.getElementById("occ-card");
  (occ ? occ.after(gin) : document.querySelector("main").prepend(gin));
  st.ginEl = gin;

  const ref = doc(o.db, "grail", o.uid);
  const unsubs = [
    onSnapshot(ref, (s) => {
      const d = s.exists() ? s.data() : {};
      if (d.first) setDoc(ref, { first: deleteField() }, { merge: true }).catch(() => {}); // dates aren't kept any more
      st.data = norm(d); render();
    }, (e) => console.warn("grail", e)),
    onSnapshot(query(collection(o.db, "gifts"), where("to", "==", o.uid), where("status", "==", "pending")),
      (s) => { st.gin = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at); render(); }, (e) => console.warn("gifts in", e)),
    onSnapshot(query(collection(o.db, "gifts"), where("from", "==", o.uid), where("status", "==", "pending")),
      (s) => { st.gout = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at); render(); }, (e) => console.warn("gifts out", e)),
  ];
  if (o.isAdmin()) unsubs.push(onSnapshot(query(collection(o.db, "gifts"), where("status", "==", "pending")),
    (s) => { st.allPend = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at); if (st.tab === "fam") renderList(); }, () => {}));

  // What drops: counted at once on screen, saved in small batches
  o.gd.onLoot((x) => {
    if (x.iron) st.pend.iron += x.iron;
    else {
      const have = (st.data.items[x.name] || 0) + (st.pend.items[x.name] || 0);
      st.pend.items[x.name] = (st.pend.items[x.name] || 0) + 1;
      if (!have) { line.classList.remove("glow"); void line.offsetWidth; line.classList.add("glow"); } // new to the collection
    }
    render();
    clearTimeout(st.t); st.t = setTimeout(flush, 4000);
  });
  const onHide = () => { if (document.visibilityState === "hidden") flush(); };
  document.addEventListener("visibilitychange", onHide);
  render();

  st.rerender = renderList;
  st.counts = counts;
  st.stop = () => {
    flush();
    unsubs.forEach((u) => u());
    o.gd.onLoot(null);
    document.removeEventListener("visibilitychange", onHide);
    line.remove(); gin.remove();
    const d = document.getElementById("dlg-grail"); if (d) { if (d.open) d.close(); d.remove(); }
    S = null;
  };
  return st.stop;

  function norm(d) { // apply renames
    const items = {};
    for (const [k, v] of Object.entries(d.items || {})) { const n = o.gd.ALIASES[k] || k; items[n] = (items[n] || 0) + (Number(v) || 0); }
    return { items, iron: Number(d.iron) || 0 };
  }
  function flush() {
    clearTimeout(st.t);
    const p = st.pend;
    if (!p.iron && !Object.keys(p.items).length) return Promise.resolve();
    st.pend = { items: {}, iron: 0 };
    const w = { updatedAt: Date.now() };
    if (p.iron) w.iron = increment(p.iron);
    if (Object.keys(p.items).length) w.items = Object.fromEntries(Object.entries(p.items).map(([k, v]) => [k, increment(v)]));
    return setDoc(ref, w, { merge: true }).catch((e) => { // put it back and try again later
      console.warn("grail save", e);
      for (const [k, v] of Object.entries(p.items)) st.pend.items[k] = (st.pend.items[k] || 0) + v;
      st.pend.iron += p.iron;
      st.t = setTimeout(flush, 15000);
    });
  }
  function counts() {
    const items = { ...st.data.items };
    for (const [k, v] of Object.entries(st.pend.items)) items[k] = (items[k] || 0) + v;
    let epic = 0, legendary = 0;
    for (const [k, v] of Object.entries(items)) { if (st.rar[k] === "epic") epic += v; else if (st.rar[k] === "legendary") legendary += v; }
    return { items, epic, legendary, iron: st.data.iron + st.pend.iron };
  }
  function render() {
    const c = counts();
    const part = (n, long, short, col) => `<b style="color:${col}">${n ? short : long}: ${fmt(n)}</b>`;
    line.innerHTML = [part(c.epic, "Épicos adquiridos", "Épicos", RAR.epic.col), part(c.legendary, "Lendários adquiridos", "Lendários", RAR.legendary.col),
      part(c.iron, "Ferro adquirido", "Ferro", IRON_COL)].join(" · ") + (st.gin.length ? ` · 🎁 ${st.gin.length}` : "");
    gin.hidden = !st.gin.length;
    gin.innerHTML = st.gin.map((g) => `<div class="gift-card" data-id="${g.id}"><span class="t">🎁 <b>${esc(g.fromName || "Alguém")}</b> te mandou ${giftName(g)}</span>
      <button class="ok" data-a="1">Aceitar</button><button class="no" data-a="0">Recusar</button></div>`).join("");
    gin.querySelectorAll("button").forEach((b) => b.onclick = () => answer(b.closest(".gift-card").dataset.id, b.dataset.a === "1", b));
    const d = document.getElementById("dlg-grail");
    if (d && d.open) renderList();
  }
  function giftName(g) {
    return g.kind === "iron" ? `<b style="color:${IRON_COL}">${fmt(g.qty)} Pedaços de Ferro</b>`
      : `<b style="color:${(RAR[g.rarity] || RAR.epic).col}">${esc(g.name)}</b> (${(RAR[g.rarity] || RAR.epic).pt})`;
  }
  async function answer(id, accept, btn) {
    btn.closest(".gift-card").querySelectorAll("button").forEach((x) => (x.disabled = true));
    try { await o.api("answerGift", { id, accept }); o.toast(accept ? "🎁 É seu!" : "Devolvido."); }
    catch (e) { o.toast(e.message || "Não deu."); btn.closest(".gift-card").querySelectorAll("button").forEach((x) => (x.disabled = false)); }
  }

  // ---------- The list ----------
  function openList() {
    let d = document.getElementById("dlg-grail");
    if (!d) {
      d = document.createElement("dialog"); d.id = "dlg-grail";
      d.innerHTML = `<h2>Coleção</h2><div class="gtabs"></div><div class="gbody"></div><button class="link small close-link">fechar</button>`;
      d.querySelector(".close-link").onclick = () => d.close();
      d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
      document.body.appendChild(d);
    }
    st.open = null; st.pick = null;
    renderList();
    d.showModal();
  }
  function renderList() {
    const d = document.getElementById("dlg-grail"); if (!d) return;
    const tabs = [["legendary", "Lendários"], ["epic", "Épicos"], ["sets", "Conjuntos"], ["iron", "Ferro" + (st.gout.length ? ` · ${st.gout.length}` : "")]];
    if (o.isAdmin()) tabs.push(["fam", "Família"]);
    const T = d.querySelector(".gtabs");
    T.style.setProperty("--n", tabs.length);
    T.innerHTML = tabs.map(([k, l]) => `<button class="${st.tab === k ? "on" : ""}" data-k="${k}">${l}</button>`).join("");
    T.querySelectorAll("button").forEach((b) => b.onclick = () => { st.tab = b.dataset.k; st.open = null; st.pick = null; if (st.tab === "fam") loadFam(); renderList(); });
    const B = d.querySelector(".gbody"), keep = B.querySelector(".glist"), top = keep ? keep.scrollTop : 0;
    B.innerHTML = st.tab === "iron" ? ironTab() : st.tab === "fam" ? famTab() : st.tab === "sets" ? setsTab() : itemTab(st.tab);
    const L = B.querySelector(".glist"); if (L) L.scrollTop = top;
    wire(B);
  }
  function people() { return o.people().filter(([u]) => u !== o.uid); }
  function sendRow(key, what) { // 1) choose who (✓), 2) one clear button that says exactly what goes where
    const who = people(), to = who.find(([u]) => u === st.pick);
    return `<div class="gsend"><div class="lbl">Para quem?</div><div class="who">${who.map(([u, n]) => `<button data-to="${u}" class="${st.pick === u ? "pick" : ""}">${esc(n)}</button>`).join("")}</div>
      <button class="go" data-send="${esc(key)}" ${to ? "" : "disabled"}>${to ? `🎁 Mandar ${what} pra ${esc(to[1])}` : "Escolha alguém acima"}</button></div>`;
  }
  function itemTab(r) {
    const c = counts(), list = st.cat[r];
    const owned = list.filter(([n]) => c.items[n] > 0).length, pct = (owned / list.length) * 100;
    let h = `<div class="gbar"><span>${RAR[r].pl} <b style="color:${RAR[r].col}">${owned}</b> / ${list.length}</span><span class="prog"><i style="width:${pct.toFixed(1)}%;background:${RAR[r].col}"></i></span></div>
      <div class="gfilt">${[["all", "Todos"], ["have", "Tenho"], ["miss", "Faltam"]].map(([k, l]) => `<button data-f="${k}" class="${st.filt === k ? "on" : ""}">${l}</button>`).join("")}</div><div class="glist">`;
    for (const [kind, label] of KINDS) {
      const rows = list.filter(([, a]) => a === kind).map(([n]) => n).sort((a, b) => a.localeCompare(b, "pt-BR"))
        .filter((n) => st.filt === "all" || (st.filt === "have") === (c.items[n] > 0));
      if (!rows.length) continue;
      const art = o.gd.grailArt(kind);
      h += `<h4>${label}</h4>`;
      for (const n of rows) {
        const q = c.items[n] || 0, out = st.gout.filter((g) => g.name === n).length;
        const real = q && st.artReady && o.gd.itemArt(n);
        const set = st.setOf[n], sp = set && setProgress(set, c), done = sp && sp.have === sp.of;
        h += `<div class="gi ${q ? "has" : "miss"}${done ? " sdone" : ""}" ${q ? `data-art="${esc(n)}"` : ""}>${real ? mini(real) : `<img src="${art.src}" alt="">`}<span class="nm" ${q ? `style="color:${RAR[r].col}"` : ""}>${esc(n)}</span>
          ${set ? `<span class="gset${done ? " done" : ""}" title="${esc(set.name)}">${done ? "✦ " : ""}${sp.have}/${sp.of}</span>` : ""}
          <span class="meta">${q > 1 ? `×${q}` : ""}${out ? `${q > 1 ? " · " : ""}${out} a caminho` : ""}</span>
          ${q > 1 ? `<button class="gbtn" data-open="${esc(n)}">Presentear</button>` : ""}</div>`;
        if (st.open === n) h += sendRow(n, esc(n));
      }
    }
    return h + (st.filt !== "miss" && !owned ? `<p class="gnote">Nada ainda. Toque no vazio e reze. 🙏</p>` : "") + "</div>";
  }
  // What "Desmontar repetidos" would give right now (same rule as the server).
  function sellPreview(c) {
    let n = 0, iron = 0;
    for (const [name, q] of Object.entries(c.items)) {
      const r = st.rar[name]; if (!r || q < 2) continue;
      const set = st.setOf[name], full = set && set.pieces.every((x) => c.items[x] > 0);
      n += q - 1; iron += Math.round(SELL[r] * (full ? 1.5 : 1)) * (q - 1);
    }
    return { n, iron };
  }
  function setProgress(set, c) { return { have: set.pieces.filter((n) => c.items[n] > 0).length, of: set.pieces.length }; }
  // Conjuntos: sets you've started (most complete first; complete ones glow), then the rest folded away.
  // Tap a set: its pieces, what you have (tap for the art) and what's missing, with the slot.
  function setsTab() {
    const c = counts(), all = st.sets.map((x) => ({ x, ...setProgress(x, c) }));
    const started = all.filter((s) => s.have).sort((a, b) => b.have / b.of - a.have / a.of || b.have - a.have || a.x.name.localeCompare(b.x.name, "pt-BR"));
    const rest = all.filter((s) => !s.have).sort((a, b) => a.x.name.localeCompare(b.x.name, "pt-BR"));
    const done = started.filter((s) => s.have === s.of).length;
    const row = (s) => {
      const isDone = s.have === s.of, col = RAR[s.x.r].col;
      let h = `<div class="srow${isDone ? " sdone" : ""}" data-set="${esc(s.x.name)}"><span class="nm" style="color:${s.have ? col : "#8d877a"}">${isDone ? "✦ " : ""}${esc(s.x.name)}</span>
        <span class="prog"><i style="width:${(s.have / s.of * 100).toFixed(0)}%"></i></span><span class="gset${isDone ? " done" : ""}">${s.have}/${s.of}</span></div>`;
      if (st.sopen === s.x.name) h += `<div class="spieces">${s.x.app ? `<span class="sapp">${esc(s.x.app)}</span>` : ""}${s.x.pieces.map((n) => {
        const q = c.items[n] || 0, real = q && st.artReady && o.gd.itemArt(n), art = o.gd.grailArt(st.kindOf[n]);
        return `<div class="gi ${q ? "has" : "miss"}" ${q ? `data-art="${esc(n)}"` : ""}>${real ? mini(real) : `<img src="${art.src}" alt="">`}<span class="nm" ${q ? `style="color:${col}"` : ""}>${esc(n)}</span><span class="meta">${q ? (q > 1 ? `×${q}` : "✓") : esc(KIND1[st.kindOf[n]] || "")}</span>${q ? "" : buySetBtn(n, s.x, c)}</div>`;
      }).join("")}</div>`;
      return h;
    };
    let h = `<div class="gbar"><span>Conjuntos completos <b style="color:#5fe08a">${done}</b> / ${all.length}</span><span class="prog"><i style="width:${(done / all.length * 100).toFixed(1)}%;background:#5fe08a"></i></span></div><div class="glist">`;
    h += started.length ? started.map(row).join("") : `<p class="gnote">Nenhuma peça de conjunto ainda.</p>`;
    h += `<details class="snot"${st.sopenRest ? " open" : ""}><summary>Ainda sem nenhuma peça (${rest.length})</summary>${rest.map(row).join("")}</details>`;
    return h + "</div>";
  }
  function ironTab() {
    const c = counts();
    let h = `<p>Você tem <b style="color:${IRON_COL}">${fmt(c.iron)} Pedaços de Ferro</b>.</p>`;
    // 🏪 Mercador: a random item you don't have yet; peças de conjunto are bought on the art card (silhouettes)
    // and in Conjuntos. ♻️ Desmontar: every extra copy → iron (one of each always stays).
    const buy = (r, label) => { const p = PRICE.random[r], can = c.iron >= p, k = "buy-" + r;
      return `<button class="gbtn merc ${r}" data-buy="${r}" ${can ? "" : "disabled"}>${st.confirm === k ? "Confirmar? " : ""}🎲 ${label}<span class="pr">${fmt(p)} ⚙️${can ? "" : ` · faltam ${fmt(p - c.iron)}`}</span></button>`; };
    const sale = sellPreview(c);
    h += `<h4>🏪 Mercador</h4><p class="gnote">Um item que você ainda não tem, sorteado. Peça de conjunto: toque na silhueta dela.</p>
      <div class="mercs">${buy("epic", "Épico novo")}${buy("legendary", "Lendário novo")}</div>
      <button class="gbtn merc sell" data-sellall ${sale.n ? "" : "disabled"}>${st.confirm === "sellall" ? "Confirmar? " : ""}♻️ Desmontar repetidos<span class="pr">${sale.n ? `${sale.n} ${sale.n === 1 ? "item" : "itens"} → +${fmt(sale.iron)} ⚙️` : "nada repetido"}</span></button>`;
    if (c.iron > 0) { st.qty = Math.max(1, Math.min(st.qty || 1, c.iron)); h += `<p class="gnote">Quanto presentear: <input class="gq" type="number" inputmode="numeric" min="1" max="${c.iron}" value="${st.qty}"></p>${sendRow("__iron", `<span class="qn">${fmt(st.qty)}</span> de ferro`)}`; }
    h += `<h4>Presentes a caminho</h4>`;
    h += st.gout.length ? st.gout.map((g) => `<div class="grow"><span class="nm">${giftName(g)} → ${esc(g.toName || "?")} <span class="meta">volta em ${Math.max(1, Math.ceil((g.until - Date.now()) / 864e5))} d se não abrir</span></span><button class="gbtn no" data-cancel="${g.id}">Cancelar</button></div>`).join("")
      : `<p class="gnote">Nenhum. Presentes não abertos em 7 dias voltam pra você.</p>`;
    return `<div class="glist">${h}</div>`;
  }
  async function loadFam() {
    st.fam = null;
    try { st.fam = (await o.api("adminGrail", { op: "list" })).data.people; } catch (e) { st.fam = []; o.toast(e.message || "Não deu."); }
    if (st.tab === "fam") renderList();
  }
  function famTab() {
    if (!st.fam) return `<p class="gnote">Carregando…</p>`;
    const tot = (items, r) => Object.entries(items).reduce((s, [k, v]) => s + (st.rar[o.gd.ALIASES[k] || k] === r ? v : 0), 0);
    let h = st.fam.map((p) => `<div class="grow"><span class="nm"><b>${esc(p.name)}</b><br><span class="meta"><b style="color:${RAR.epic.col}">${tot(p.items, "epic")}</b> épicos · <b style="color:${RAR.legendary.col}">${tot(p.items, "legendary")}</b> lendários · ${fmt(p.iron)} ferro</span></span></div>`).join("") || `<p class="gnote">Ninguém achou nada ainda.</p>`;
    h += `<h4>Presentes pendentes</h4>` + (st.allPend.length ? st.allPend.map((g) => `<div class="grow"><span class="nm">${esc(g.fromName || "?")} → ${esc(g.toName || "?")}: ${giftName(g)}</span><button class="gbtn no" data-cancel="${g.id}">Cancelar</button></div>`).join("") : `<p class="gnote">Nenhum.</p>`);
    return `<div class="glist">${h}</div>`;
  }
  function wire(B) {
    B.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { st.filt = b.dataset.f; renderList(); });
    B.querySelectorAll("[data-set]").forEach((b) => b.onclick = () => { st.sopen = st.sopen === b.dataset.set ? null : b.dataset.set; renderList(); });
    const sn = B.querySelector("details.snot"); if (sn) sn.ontoggle = () => { st.sopenRest = sn.open; };
    B.querySelectorAll(".gi[data-art]").forEach((b) => b.onclick = (e) => { if (!e.target.closest("button")) openArt(b.dataset.art); });
    B.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => { st.open = st.open === b.dataset.open ? null : b.dataset.open; st.pick = null; renderList(); });
    B.querySelectorAll("[data-to]").forEach((b) => b.onclick = () => { st.pick = st.pick === b.dataset.to ? null : b.dataset.to; renderList(); });
    const q = B.querySelector(".gq"); if (q) q.oninput = () => { st.qty = Math.floor(Number(q.value)) || 1; const qn = B.querySelector(".qn"); if (qn) qn.textContent = fmt(st.qty); };
    B.querySelectorAll("[data-send]").forEach((b) => b.onclick = async () => {
      const key = b.dataset.send, to = st.pick;
      const data = key === "__iron" ? { kind: "iron", qty: Math.floor(Number((B.querySelector(".gq") || {}).value)) || 0 } : { kind: "item", name: key, rarity: st.rar[key] };
      b.disabled = true;
      try {
        await flush(); // the server only counts what is saved
        await o.api("sendGift", { to, ...data });
        o.toast(`🎁 Mandado pra ${(people().find(([u]) => u === to) || [, "alguém"])[1]}. Fica guardado até aceitar.`);
        st.open = null; st.pick = null; renderList();
      } catch (e) { o.toast(e.message || "Não deu."); b.disabled = false; }
    });
    B.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => twoTap("buy-" + b.dataset.buy, () => buyItem({ mode: "random", rarity: b.dataset.buy })));
    B.querySelectorAll("[data-buyset]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); twoTap("set-" + b.dataset.buyset, () => buyItem({ mode: "set", name: b.dataset.buyset })); });
    B.querySelectorAll("[data-sellall]").forEach((b) => b.onclick = () => twoTap("sellall", async () => {
      try { const r = await o.api("sellRepeats", {}); o.toast(`♻️ ${r.data.sold} ${r.data.sold === 1 ? "item desmontado" : "itens desmontados"}: +${fmt(r.data.iron)} de ferro`); }
      catch (e) { o.toast(e.message || "Não deu."); }
    }));
    B.querySelectorAll("[data-cancel]").forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await o.api("cancelGift", { id: b.dataset.cancel }); o.toast("Cancelado. Voltou pra quem mandou."); if (st.tab === "fam") loadFam(); }
      catch (e) { o.toast(e.message || "Não deu."); b.disabled = false; }
    });
  }
}

// ---------- Item art: GrimTools' icon sheet (5.6 MB), saved on the phone when the collection starts ----------
// Any connection, no asking (William's call: family phones, he pays the internet). One download per phone.
const ART_CACHE = "gd-art";
let gdRef = null;
async function hasSheet() {
  try { return !!(gdRef && "caches" in self && await (await caches.open(ART_CACHE)).match(gdRef.ITEM_SPRITE)); } catch { return false; }
}
let sheetLoad = null; // one download at a time
function getSheet() {
  return (sheetLoad ||= fetchSheet().finally(() => { sheetLoad = null; }));
}
async function fetchSheet() {
  if (await hasSheet()) return true;
  try {
    const res = await fetch(gdRef.ITEM_SPRITE, { mode: "no-cors" }); // their server doesn't share; an opaque copy is enough to show it
    await (await caches.open(ART_CACHE)).put(gdRef.ITEM_SPRITE, res);
    return true;
  } catch (e) { console.warn("art", e); return false; }
}
function icon(a, box, maxK = Infinity) { // the icon scaled to fit a box (keeps its shape), never more than maxK × its own size
  const k = Math.min(box / a.w, box / a.h, maxK), [W, H] = gdRef.ITEM_SHEET;
  return `<i class="ico" style="display:block;width:${(a.w * k).toFixed(1)}px;height:${(a.h * k).toFixed(1)}px;background-image:url('${gdRef.ITEM_SPRITE}');
    background-size:${(W * k).toFixed(1)}px ${(H * k).toFixed(1)}px;background-position:${(-a.x * k).toFixed(1)}px ${(-a.y * k).toFixed(1)}px"></i>`;
}
function mini(a) { return `<span class="mini">${icon(a, 26).replace('style="display:block;', 'style="display:block;transform:translate(-50%,-50%);')}</span>`; }
// The card: the item big in its frame (owned: the art; not owned yet: its silhouette), its name, and — for a set piece —
// the whole set as small framed tiles (tap one to flip the card to it) plus the list of pieces with ✓ or slot.
// Tapping anywhere else closes it.
let sheetImg = null;
async function openArt(name) {
  const a = gdRef.itemArt(name);
  let d = document.getElementById("dlg-art");
  if (!d) {
    d = document.createElement("dialog"); d.id = "dlg-art";
    d.addEventListener("click", (e) => {
      const t = e.target.closest("[data-flip], [data-buyset], [data-sell1]");
      if (!t) return d.close();
      e.stopPropagation();
      if (t.dataset.flip) openArt(t.dataset.flip);
      else if (t.dataset.buyset) twoTap("set-" + t.dataset.buyset, () => buyItem({ mode: "set", name: t.dataset.buyset }));
      else twoTap("sell-" + t.dataset.sell1, async () => {
        try { const x = (await S.api("sellRepeats", { name: t.dataset.sell1 })).data; S.toast(`♻️ +${fmt(x.iron)} de ferro`); setTimeout(reshow, 400); }
        catch (err) { S.toast(err.message || "Não deu."); }
      });
    });
    document.body.appendChild(d);
  }
  const r = (a && a.r) || "epic", owned = !!(S && S.counts().items[name] > 0);
  d.dataset.name = name;
  const show = (inner) => { d.innerHTML = `<div class="art-wrap"><div class="art-frame ${r}${owned ? "" : " ghost"}">${inner}</div><div class="art-name ${r}${owned ? "" : " ghost"}">${esc(name)}</div>${cardActions(name)}${setBlock(name)}</div>`; };
  const silly = () => show(`<div class="msg"><div><b>❓</b>${NO_ART[Math.floor(Math.random() * NO_ART.length)]}</div></div>`);
  show(`<div class="msg"><div>Buscando a arte…</div></div>`);
  if (!d.open) d.showModal();
  if (!a) return silly();
  if (!(await getSheet())) return silly();
  if (S) S.artReady = true;
  if (!sheetImg || !sheetImg.complete) {
    sheetImg = new Image();
    sheetImg.src = gdRef.ITEM_SPRITE;
    try { await sheetImg.decode(); } catch { sheetImg = null; return silly(); }
    if (S && S.tab !== "iron") { const x = document.getElementById("dlg-grail"); if (x && x.open) S.rerender(); }
  }
  if (!d.open) return;
  show(`<span class="big"></span>`);
  // Big: at most 1.4× the game's own icon (its art is small; more just blurs), drawn once with the browser's best scaling.
  d.querySelector(".big").replaceWith(bigIcon(a, Math.min(170, innerWidth * 0.46), 1.4, !owned));
}
function bigIcon(a, box, maxK, ghost) {
  const k = Math.min(box / a.w, box / a.h, maxK), w = a.w * k, h = a.h * k, dpr = Math.min(3, devicePixelRatio || 1);
  const c = document.createElement("canvas");
  c.className = "ico" + (ghost ? " sil" : "");
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  c.style.cssText = `display:block;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px`;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(sheetImg, a.x, a.y, a.w, a.h, 0, 0, c.width, c.height);
  return c;
}

// Purchases and sales ask twice: the first tap turns the button into "Confirmar?" for 4 s.
let confirmTimer = 0;
function twoTap(key, go) {
  if (S.confirm === key) { S.confirm = null; clearTimeout(confirmTimer); go(); }
  else { S.confirm = key; clearTimeout(confirmTimer); confirmTimer = setTimeout(() => { S.confirm = null; reshow(); }, 4000); }
  reshow();
}
function reshow() {
  const g = document.getElementById("dlg-grail"); if (g && g.open) S.rerender();
  const a = document.getElementById("dlg-art"), act = a && a.open && a.querySelector(".art-act");
  if (act) act.outerHTML = cardActions(a.dataset.name) || "<div class=\"art-act\"></div>"; // just the buttons, no redraw
}
function buySetBtn(name, set, c, big) {
  const p = PRICE.set[set.r], can = c.iron >= p;
  return `<button class="gbtn${big ? "" : " mini-buy"}" data-buyset="${esc(name)}" ${can ? "" : "disabled"}>${S.confirm === "set-" + name ? "Confirmar? " : ""}${big ? "🏪 Comprar · " : ""}${fmt(p)} ⚙️</button>`;
}
// Bought: the item drops on screen like loot, then its card opens.
async function buyItem(args) {
  try {
    const r = (await S.api("buyItem", args)).data;
    for (const id of ["dlg-art", "dlg-grail"]) { const x = document.getElementById(id); if (x && x.open) x.close(); }
    if (gdRef.dropItem) gdRef.dropItem(r.name, r.rarity);
    S.toast(`🏪 ${r.name}! (−${fmt(r.price)} de ferro)`);
    setTimeout(() => openArt(r.name), 2200);
  } catch (e) { S.toast(e.message || "Não deu."); }
}

// On the art card: the item's set, every piece with ✓ or its slot; a complete set glows.
// Under the name: buy it (a missing set piece) or sell one extra copy.
function cardActions(name) {
  if (!S || !S.counts) return "";
  const c = S.counts(), q = c.items[name] || 0, set = S.setOf && S.setOf[name];
  if (!q && set) { const p = PRICE.set[set.r]; return `<div class="art-act">${buySetBtn(name, set, c, true)}<span class="muted">${c.iron >= p ? "comprar essa peça" : `faltam ${fmt(p - c.iron)} de ferro`}</span></div>`; }
  if (q > 1 && S.rar[name]) {
    const full = set && set.pieces.every((x) => c.items[x] > 0), p = Math.round(SELL[S.rar[name]] * (full ? 1.5 : 1));
    return `<div class="art-act"><button class="gbtn" data-sell1="${esc(name)}">${S.confirm === "sell-" + name ? "Confirmar? " : ""}♻️ Vender 1 repetido · +${fmt(p)} ⚙️</button><span class="muted">você tem ×${q}</span></div>`;
  }
  return `<div class="art-act"></div>`;
}
function setBlock(name) {
  const set = S && S.setOf && S.setOf[name];
  if (!set) return "";
  const c = S.counts(), have = set.pieces.filter((n) => c.items[n] > 0).length, done = have === set.pieces.length;
  const tiles = gdRef && S.artReady ? `<div class="art-tiles">${set.pieces.map((n) => {
    const a = gdRef.itemArt(n), q = c.items[n] > 0;
    return `<button type="button" class="art-tile ${(a && a.r) || "epic"}${q ? "" : " miss"}${n === name ? " cur" : ""}" data-flip="${esc(n)}" aria-label="${esc(n)}">${a ? icon(a, 38, 1).replace('class="ico"', `class="ico${q ? "" : " sil"}"`) : "❓"}</button>`;
  }).join("")}</div>` : "";
  return `<div class="art-set${done ? " done" : ""}"><span class="t">${done ? "✦ Conjunto completo · " : "Conjunto · "}<b>${esc(set.name)}</b> ${have}/${set.pieces.length}</span>${set.app ? `<span class="app">${esc(set.app)}</span>` : ""}${tiles}<ul>${set.pieces.map((n) => {
    const q = c.items[n] > 0;
    return `<li class="${q ? "" : "miss"}"><span>${q ? "✓ " : "· "}${esc(n)}</span><span class="k">${esc(KIND1[S.kindOf[n]] || "")}</span></li>`;
  }).join("")}</ul></div>`;
}

export function stopGrail() { if (S) S.stop(); }
