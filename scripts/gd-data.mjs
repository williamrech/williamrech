// Builds functions/gd-data.json (item names by rarity + item sets) from web/gd-items.js and web/gd-sets.js, so the
// server can price and pick items for the Mercador. Run after changing either file: node scripts/gd-data.mjs
import { writeFileSync } from "node:fs";
const { ITEMS } = await import(new URL("../web/gd-items.js", import.meta.url));
const { SETS } = await import(new URL("../web/gd-sets.js", import.meta.url));
const out = { epic: [], legendary: [], sets: SETS.map((s) => ({ r: s.r, name: s.name, pieces: s.pieces })) };
for (const row of String(ITEMS).trim().split("\n")) { const p = row.split("|"); out[p[0] === "L" ? "legendary" : "epic"].push(p[6]); }
writeFileSync(new URL("../functions/gd-data.json", import.meta.url), JSON.stringify(out));
console.log(`gd-data.json: ${out.epic.length} epic, ${out.legendary.length} legendary, ${out.sets.length} sets`);
