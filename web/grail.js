// ⚔️ Grim Dawn grail: counts the epics, legendaries and iron each person finds (Firestore grail/{uid}),
// shows them in the footer, opens a "holy grail" list of every possible item, and sends gifts between people
// (gifts/{id}; moved by the functions, so nothing is duplicated or lost). Loaded only while the occasion is live.
import { doc, setDoc, onSnapshot, collection, query, where, increment, deleteField } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const RAR = { legendary: { pt: "Lendário", pl: "Lendários", col: "#c86bff" }, epic: { pt: "Épico", pl: "Épicos", col: "#4f9dff" } };
const IRON_COL = "#a7a7a3";
const KINDS = [["sword", "Espadas"], ["axe", "Machados"], ["mace", "Maças e martelos"], ["pistol", "Armas de fogo"], ["scepter", "Mão secundária"],
  ["shield", "Escudos"], ["helm", "Elmos"], ["chest", "Armaduras"], ["gloves", "Luvas"], ["boots", "Botas"], ["ring", "Anéis"], ["amulet", "Amuletos"]];
const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
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
#dlg-grail .glist { max-height: 56dvh; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
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
`;

let S = null; // the running grail (one per app open while the occasion is live)

export function startGrail(o) {
  if (S) return S.stop;
  // o: { db, uid, api(action, data) → Promise, gd (grimdawn module), isAdmin(), people() → [[uid, name]], toast(msg) }
  const st = { o, data: { items: {}, iron: 0 }, pend: { items: {}, iron: 0 }, gin: [], gout: [], allPend: [], tab: "legendary", filt: "all", open: null, pick: null, fam: null };
  S = st;
  if (!document.getElementById("grail-css")) { const c = document.createElement("style"); c.id = "grail-css"; c.textContent = CSS; document.head.appendChild(c); }
  const cat = o.gd.grailCatalog();
  st.rar = {}; for (const r of ["epic", "legendary"]) for (const [n] of cat[r]) st.rar[n] = r;
  st.cat = cat;

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
    const tabs = [["legendary", "Lendários"], ["epic", "Épicos"], ["iron", "Ferro" + (st.gout.length ? ` · ${st.gout.length}` : "")]];
    if (o.isAdmin()) tabs.push(["fam", "Família"]);
    const T = d.querySelector(".gtabs");
    T.style.setProperty("--n", tabs.length);
    T.innerHTML = tabs.map(([k, l]) => `<button class="${st.tab === k ? "on" : ""}" data-k="${k}">${l}</button>`).join("");
    T.querySelectorAll("button").forEach((b) => b.onclick = () => { st.tab = b.dataset.k; st.open = null; st.pick = null; if (st.tab === "fam") loadFam(); renderList(); });
    const B = d.querySelector(".gbody"), keep = B.querySelector(".glist"), top = keep ? keep.scrollTop : 0;
    B.innerHTML = st.tab === "iron" ? ironTab() : st.tab === "fam" ? famTab() : itemTab(st.tab);
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
        h += `<div class="gi ${q ? "" : "miss"}"><img src="${art.src}" alt=""><span class="nm" ${q ? `style="color:${RAR[r].col}"` : ""}>${esc(n)}</span>
          <span class="meta">${q > 1 ? `×${q}` : ""}${out ? `${q > 1 ? " · " : ""}${out} a caminho` : ""}</span>
          ${q > 1 ? `<button class="gbtn" data-open="${esc(n)}">Presentear</button>` : ""}</div>`;
        if (st.open === n) h += sendRow(n, esc(n));
      }
    }
    return h + (st.filt !== "miss" && !owned ? `<p class="gnote">Nada ainda. Toque no vazio e reze. 🙏</p>` : "") + "</div>";
  }
  function ironTab() {
    const c = counts();
    let h = `<p>Você tem <b style="color:${IRON_COL}">${fmt(c.iron)} Pedaços de Ferro</b>.</p>`;
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
    let h = st.fam.map((p) => `<div class="grow"><span class="nm"><b>${esc(p.name)}</b><br><span class="meta"><b style="color:${RAR.epic.col}">${tot(p.items, "epic")}</b> épicos · <b style="color:${RAR.legendary.col}">${tot(p.items, "legendary")}</b> lendários · ${fmt(p.iron)} ferro</span></span>
      <button class="gbtn no" data-reset="${p.uid}">${st.confirm === p.uid ? "Certeza?" : "Zerar"}</button></div>`).join("") || `<p class="gnote">Ninguém achou nada ainda.</p>`;
    h += `<p><button class="gbtn no" data-reset="all">${st.confirm === "all" ? "Zerar TODO MUNDO? Toque de novo" : "Zerar todos"}</button></p>`;
    h += `<h4>Presentes pendentes</h4>` + (st.allPend.length ? st.allPend.map((g) => `<div class="grow"><span class="nm">${esc(g.fromName || "?")} → ${esc(g.toName || "?")}: ${giftName(g)}</span><button class="gbtn no" data-cancel="${g.id}">Cancelar</button></div>`).join("") : `<p class="gnote">Nenhum.</p>`);
    return `<div class="glist">${h}</div>`;
  }
  function wire(B) {
    B.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { st.filt = b.dataset.f; renderList(); });
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
    B.querySelectorAll("[data-cancel]").forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await o.api("cancelGift", { id: b.dataset.cancel }); o.toast("Cancelado. Voltou pra quem mandou."); if (st.tab === "fam") loadFam(); }
      catch (e) { o.toast(e.message || "Não deu."); b.disabled = false; }
    });
    B.querySelectorAll("[data-reset]").forEach((b) => b.onclick = async () => {
      const u = b.dataset.reset;
      if (st.confirm !== u) { st.confirm = u; renderList(); return; }
      st.confirm = null; b.disabled = true;
      try { await o.api("adminGrail", { op: "reset", uid: u }); o.toast("Zerado."); loadFam(); } catch (e) { o.toast(e.message || "Não deu."); b.disabled = false; }
    });
  }
}

export function stopGrail() { if (S) S.stop(); }
