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
      "aniver-1": "🎂🎉🎈", "aniver-2": "🎂💐🎈", "aniver-3": "🎂🎉🎈", "ano-novo": "🥂✨🎆",
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
  if ("versionSpecials" in cur) update.versionSpecials = FieldValue.delete();
  if ("friday13" in cur) update.friday13 = FieldValue.delete();
  update._como_usar = defaults._como_usar;
  await ref.update(update);
  console.log("config/fun upgraded:", Object.keys(update).join(", "));
})().catch((e) => { console.error(e); process.exit(1); });
