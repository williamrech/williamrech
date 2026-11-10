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
  if ("versionSpecials" in cur) update.versionSpecials = FieldValue.delete();
  if ("friday13" in cur) update.friday13 = FieldValue.delete();
  update._como_usar = defaults._como_usar;
  await ref.update(update);
  console.log("config/fun upgraded:", Object.keys(update).join(", "));
})().catch((e) => { console.error(e); process.exit(1); });
