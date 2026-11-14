// Creates / upgrades config/fun. Never overwrites anything you've edited:
//  - if the doc is missing, it's created with the defaults;
//  - otherwise only missing top-level fields are added (palettes, occasions, …);
//  - old fields (versionSpecials, friday13) are converted into occasions once, then removed.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const defaults = require("./fun-defaults.json");

initializeApp({ projectId: process.env.PROJECT_ID });
const ref = getFirestore().doc("config/fun");

(async () => {
  const snap = await ref.get();
  if (!snap.exists) { await ref.set(defaults); console.log("config/fun created with defaults."); return; }
  const cur = snap.data();
  const update = {};
  for (const [k, v] of Object.entries(defaults)) if (!(k in cur)) update[k] = v;
  if (!("occasions" in cur)) {
    // Carry over hand-edited legacy values into the new occasions.
    const occ = JSON.parse(JSON.stringify(defaults.occasions));
    for (const [md, version] of Object.entries(cur.versionSpecials || {})) {
      const hit = Object.values(occ).find((o) => o.when === md);
      if (hit) hit.version = version; else occ[`data-${md}`] = { when: md, version, priority: 5 };
    }
    if (typeof cur.friday13 === "string") occ["sexta-13"].version = cur.friday13;
    update.occasions = occ;
  }
  // One-time upgrade (decorVersion 2): themed drawings for every palette and occasion.
  // Only fills a palette decor that's empty, or replaces an occasion decor still equal to the
  // old shipped default — anything you edited by hand is left alone.
  if ((Number(cur.decorVersion) || 0) < 2) {
    const OLD_OCC_DECOR = {
      "ano-novo": "🥂✨🎆",
      "carnaval": "🎭🎉🪅", "dia-das-maes": "💐🌷🌸", "halloween": "🎃🦇👻🕸️", "sexta-13": "🐈‍⬛🔮🕯️",
      "natal-clima": "🎄🎁⭐❄️", "teste": "🧪🤖✨",
    };
    for (const [id, p] of Object.entries(defaults.palettes)) {
      if (cur.palettes && cur.palettes[id] && !cur.palettes[id].decor && p.decor) update[`palettes.${id}.decor`] = p.decor;
    }
    for (const [id, o] of Object.entries(defaults.occasions)) {
      const c = cur.occasions && cur.occasions[id];
      if (c && o.decor && (c.decor === undefined || c.decor === OLD_OCC_DECOR[id])) update[`occasions.${id}.decor`] = o.decor;
    }
    update.decorVersion = 2;
  }
  // One-time upgrade (configVersion 3): Champagne becomes an occasion-only palette (Ano Novo).
  if ((Number(cur.configVersion) || 0) < 3) {
    if (cur.palettes && cur.palettes.champagne && cur.palettes.champagne.onlyOccasions === undefined) {
      update["palettes.champagne.onlyOccasions"] = true;
    }
    update.configVersion = 3;
  }
  // configVersion 4: the daily rotating name for "recados" (only added if missing).
  if ((Number(cur.configVersion) || 0) < 4) {
    if (!cur.terms) update.terms = defaults.terms;
    update.configVersion = 4;
  }
  // configVersion 5: theme effects (on by default, each person can switch them off) and the
  // Coca-Cola theme. Only fills an effect a palette doesn't have yet; never touches edited ones.
  if ((Number(cur.configVersion) || 0) < 5) {
    for (const [id, p] of Object.entries(defaults.palettes)) {
      const c = cur.palettes && cur.palettes[id];
      if (c && p.effect && c.effect === undefined) update[`palettes.${id}.effect`] = p.effect;
      if (!c && id === "cocacola") update[`palettes.${id}`] = p;
    }
    update.configVersion = 5;
  }
  // configVersion 6: Espresso gets its coffee steam (only if it has no effect yet).
  if ((Number(cur.configVersion) || 0) < 6) {
    const e = cur.palettes && cur.palettes.espresso;
    if (e && e.effect === undefined) update["palettes.espresso.effect"] = "smoke";
    update.configVersion = 6;
  }
  // configVersion 7: Namorados palette (event-only, sparkles) and the Dia dos Namorados occasion.
  if ((Number(cur.configVersion) || 0) < 7) {
    if (!(cur.palettes && cur.palettes.namorados)) update["palettes.namorados"] = defaults.palettes.namorados;
    if (!(cur.occasions && cur.occasions["dia-dos-namorados"])) update["occasions.dia-dos-namorados"] = defaults.occasions["dia-dos-namorados"];
    update.configVersion = 7;
  }
  // configVersion 8: an occasion id was renamed (done).
  if ((Number(cur.configVersion) || 0) < 8) update.configVersion = 8;
  // configVersion 9: Assombrado on Halloween (theme + occasion) and Friday the 13th — only where no effect was set.
  if ((Number(cur.configVersion) || 0) < 9) {
    for (const id of ["halloween", "sexta-13"]) {
      const o = cur.occasions && cur.occasions[id];
      if (o && !o.effect) update[`occasions.${id}.effect`] = "haunted";
    }
    const hp = cur.palettes && cur.palettes.halloween;
    if (hp && !hp.effect) update["palettes.halloween.effect"] = "haunted";
    update.configVersion = 9;
  }
  // configVersion 10: the name swap's wording/look moved onto each occasion. Occasions that already
  // have swapped names keep exactly what they showed before (Maldição, 🧙, ectoplasm, the old 🎲 list).
  if ((Number(cur.configVersion) || 0) < 10) {
    for (const [id, o] of Object.entries(cur.occasions || {})) {
      if (o && o.curses && Object.keys(o.curses).length && !o.nameSwap) update[`occasions.${id}.nameSwap`] = {
        icon: "🧙", title: "Maldição", banner: "Você foi amaldiçoado(a)!", look: "ecto",
        ideas: ["Conde Drácula", "Múmia Desenrolada", "Bruxa do 71", "Fantasma Chorão", "Lobisomem de Pijama", "Zumbi Sonolento",
          "Abóbora Podre", "Morcego Fofoqueiro", "Caveira Risonha", "Gato Preto", "Vampira Dentuça", "Frankenstein Cansado",
          "Duende Encrenqueiro", "Saci Sem Gorro", "Mula Sem Cabeça", "Cuca Mal-Humorada"],
      };
    }
    update.configVersion = 10;
  }
  // configVersion 11: Grim Dawn — "Cinzas e Brasas" palette (occasion-only) and a 👑 só-admin occasion with no date yet.
  if ((Number(cur.configVersion) || 0) < 11) {
    if (!(cur.palettes && cur.palettes.cinzas)) update["palettes.cinzas"] = defaults.palettes.cinzas;
    if (!(cur.occasions && cur.occasions["grim-dawn"])) update["occasions.grim-dawn"] = defaults.occasions["grim-dawn"];
    update.configVersion = 11;
  }
  // configVersion 12: green "Malmouth" palette for the Grim Dawn occasion (its scene is green now). Only switches the
  // occasion if it still has the shipped palette, and drops the shipped drawings (the scene replaces them).
  if ((Number(cur.configVersion) || 0) < 12) {
    if (!(cur.palettes && cur.palettes.malmouth)) update["palettes.malmouth"] = defaults.palettes.malmouth;
    const gd = cur.occasions && cur.occasions["grim-dawn"];
    if (gd && gd.palette === "cinzas") update["occasions.grim-dawn.palette"] = "malmouth";
    if (gd && gd.decor === "lantern.svg crow.svg crow.svg lantern.svg crow.svg") update["occasions.grim-dawn.decor"] = "";
    update.configVersion = 12;
  }
  // configVersion 13: the Grim Dawn collection switches to the real item list (web/gd-items.js) — everyone starts clean:
  // all collections and iron are wiped and pending gifts are cancelled (nothing is returned; there is nothing to return to).
  if ((Number(cur.configVersion) || 0) < 13) {
    const db = getFirestore();
    const [grails, pend] = await Promise.all([db.collection("grail").get(), db.collection("gifts").where("status", "==", "pending").get()]);
    const bw = db.bulkWriter();
    for (const g of grails.docs) bw.delete(g.ref);
    for (const g of pend.docs) bw.update(g.ref, { status: "cancelled", doneAt: Date.now(), note: "lista nova de itens" });
    await bw.close();
    console.log(`grail reset: ${grails.size} collections, ${pend.size} pending gifts`);
    update.configVersion = 13;
  }
  // configVersion 14: an occasion's name swap is now called "maldicao" (old "nameSwap" stays until the cleanup step).
  if ((Number(cur.configVersion) || 0) < 14) {
    for (const [id, o] of Object.entries(cur.occasions || {})) {
      if (o && typeof o === "object" && o.nameSwap && !o.maldicao) update[`occasions.${id}.maldicao`] = o.nameSwap;
    }
    update.configVersion = 14;
  }
  // configVersion 15: an occasion points to a Tema (`tema`) and keeps only what differs from it in `own`
  // (decor / effect / bgImage). Old fields stay until the cleanup step. Before writing, every day of the next two
  // years is resolved the old way and the new way (family and admin view, each personal tema); any difference → skip.
  if ((Number(cur.configVersion) || 0) < 15) {
    const L = require("../functions/look");
    const pals = cur.palettes || {}, occs = cur.occasions || {};
    const conv = {};
    for (const [id, o] of Object.entries(occs)) {
      if (!o || typeof o !== "object") continue;
      const { tema, own } = L.occLookOf(o);
      const T = tema && pals[tema] && typeof pals[tema] === "object" ? pals[tema] : null;
      const keep = {};
      for (const k of L.LOOK_KEYS) if (own[k] && !(T && own[k] === (T[k] || ""))) keep[k] = own[k];
      conv[id] = { ...o, tema: T ? tema : "", own: keep };
    }
    const EFFECT_LOOK = { grimdawn: "ember", haunted: "ecto", snow: "frost", confetti: "gold", bubbles: "fizz", sparkles: "glitter", smoke: "steam", hearts: "hearts" };
    const LOOKS = ["none", "glow", "rainbow", "wavy", "shadow", "ecto", "frost", "gold", "fizz", "glitter", "steam", "hearts", "ember"];
    const autoLook = (e) => EFFECT_LOOK[e] || "glitter";
    const on = (all, t, admin) => {
      let list = Object.entries(all).filter(([, o]) => o && typeof o === "object" && o.enabled !== false && (!o.adminOnly || admin)
        && String(o.when || "").split(",").some((p) => L.matchesPattern(p, t)));
      if (list.some(([, o]) => o.adminOnly)) list = list.filter(([, o]) => o.adminOnly);
      return list.sort((a, b) => (a[1].adminOnly ? 1 : 0) - (b[1].adminOnly ? 1 : 0) || (Number(a[1].priority) || 0) - (Number(b[1].priority) || 0));
    };
    const pal = (id) => (pals[id] && typeof pals[id] === "object" ? pals[id] : {});
    const oldLook = (list, user) => {
      const m = {}; for (const [, o] of list) Object.assign(m, o);
      const P = m.palette && pals[m.palette] && typeof pals[m.palette] === "object" ? m.palette : user;
      return [P, m.decor || pal(P).decor || "", m.effect || pal(P).effect || "", m.bgImage || ""].join(" | ");
    };
    const newLook = (list, user) => {
      const { m } = L.lookLayers(list, pals), P = m.tema || user;
      return [P, "decor" in m ? m.decor : pal(P).decor || "", "effect" in m ? m.effect : pal(P).effect || "", "bgImage" in m ? m.bgImage : pal(P).bgImage || ""].join(" | ");
    };
    const users = Object.entries(pals).filter(([, p]) => p && !p.onlyOccasions).map(([id]) => id);
    if (!users.includes("espresso")) users.push("espresso");
    const diffs = [];
    const start = Date.now();
    for (let i = 0; i < 731 && diffs.length < 10; i++) {
      const dt = new Date(start + i * 86400000 - 3 * 3600000);
      const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const t = { y, m, d, key, md: key.slice(5), weekday: dt.getUTCDay() };
      for (const admin of [false, true]) {
        const a = on(occs, t, admin), b = on(conv, t, admin);
        for (const u of users) { const x = oldLook(a, u), z = newLook(b, u); if (x !== z) { diffs.push(`${key}${admin ? " (admin)" : ""} [${u}]: ${x}  →  ${z}`); break; } }
      }
    }
    if (diffs.length) {
      console.log("step 3 migration SKIPPED — the look would change on:\n  " + diffs.join("\n  "));
    } else {
      for (const [id, o] of Object.entries(conv)) {
        update[`occasions.${id}.tema`] = o.tema;
        update[`occasions.${id}.own`] = o.own;
        // Maldição look: it used to follow only the occasion's own effect; pin it where the new rule would pick another.
        const m = occs[id].maldicao || occs[id].nameSwap;
        const hasCurse = (occs[id].curses && Object.keys(occs[id].curses).length) || m;
        const pinned = m && typeof m === "object" && LOOKS.includes(m.look);
        const was = autoLook(occs[id].effect), now = autoLook(L.occEffect(o, pals));
        if (hasCurse && !pinned && was !== now) update[`occasions.${id}.maldicao.look`] = was;
        console.log(`step 3: ${id} → tema "${o.tema}"${Object.keys(o.own).length ? ", own " + JSON.stringify(o.own) : ""}`);
      }
      update.configVersion = 15;
    }
  }
  if ("versionSpecials" in cur) update.versionSpecials = FieldValue.delete();
  if ("friday13" in cur) update.friday13 = FieldValue.delete();
  update._como_usar = defaults._como_usar;
  await ref.update(update);
  console.log("config/fun upgraded:", Object.keys(update).join(", "));
})().catch((e) => { console.error(e); process.exit(1); });
