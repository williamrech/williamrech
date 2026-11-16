// One-off, READ-ONLY diagnostic (16.11.2026): is "celular não confirmou a chegada" for one person real or a
// false positive? Prints only anonymous facts (no names, no message text, no tokens): the repo's run logs are public.
// Person is found by a hash of her display name (env DIAG_HASH: first 16 hex of sha256 of the lowercased name), so the
// name isn't in the repo; shown as "P", others as A, B, C…
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const crypto = require("crypto");
initializeApp();
const db = getFirestore();
const hm = (ms) => ms ? new Date(ms - 3 * 3600e3).toISOString().slice(5, 16).replace("T", " ") : "—";
(async () => {
  const want = String(process.env.DIAG_HASH || "");
  const users = await db.collection("users").get();
  const hash = (s) => crypto.createHash("sha256").update(String(s || "").trim().toLowerCase()).digest("hex").slice(0, 16);
  const P = users.docs.find((d) => hash(d.get("name")) === want);
  if (!P) { console.log("person not found"); return; }
  const letter = {}; let i = 0; for (const d of users.docs) letter[d.id] = d.id === P.id ? "P" : String.fromCharCode(65 + i++);
  // Her phones
  const devs = await db.collection("devices").where("uid", "==", P.id).get();
  console.log(`\n== P's registered phones: ${devs.size}`);
  const devKey = {};
  devs.docs.forEach((d, k) => {
    devKey[d.id] = "phone" + (k + 1);
    const ua = String(d.get("userAgent") || "");
    const os = (ua.match(/Android [\d.]+|iPhone OS [\d_]+|Windows NT [\d.]+|Mac OS X [\d_]+/) || ["?"])[0];
    const br = (ua.match(/SamsungBrowser\/[\d.]+|EdgA?\/[\d.]+|Firefox\/[\d.]+|Chrome\/[\d]+|Version\/[\d.]+ Mobile.*Safari/) || ["?"])[0];
    const st = /standalone/.test(ua) ? " (app)" : "";
    console.log(`  ${devKey[d.id]}: ${os} · ${br}${st} · registered/updated ${hm(d.get("updatedAt") && d.get("updatedAt").toMillis())} · last receipt ${hm(d.get("lastRecv"))}`);
  });
  // Last 14 days of pushes, everybody (for comparison), and P's in detail
  const since = Date.now() - 14 * 864e5;
  const logs = await db.collection("notifLog").where("at", ">=", since).get();
  const per = {};
  const pRows = [], pEvents = [];
  for (const d of logs.docs) {
    const e = d.data();
    if (e.type === "event") { if (e.actorUid === P.id) pEvents.push(e); continue; }
    if (e.kind === "teste" && e.toUid !== P.id) continue;
    const k = letter[e.toUid] || "?";
    per[k] ||= { sent: 0, recv: 0, open: 0, unconf: 0, failed: 0, nodev: 0 };
    if (e.status === "sent") { per[k].sent++; if (e.receivedAt) per[k].recv++; else if (Date.now() - e.at > 3 * 60000) per[k].unconf++; if (e.openedAt) per[k].open++; }
    else if (e.status === "failed") per[k].failed++; else if (e.status === "nodevice") per[k].nodev++;
    if (e.toUid === P.id) pRows.push(e);
  }
  console.log(`\n== Last 14 days, per person (sent / arrival confirmed / opened / NOT confirmed / failed / no phone)`);
  for (const [k, v] of Object.entries(per).sort()) console.log(`  ${k}: ${v.sent} / ${v.recv} / ${v.open} / ${v.unconf} / ${v.failed} / ${v.nodev}`);
  // P in detail, with her own actions right after each push (answers, opening the app = "seen")
  pRows.sort((a, b) => a.at - b.at);
  console.log(`\n== P's pushes (time · kind · phone · status · arrived · opened · resent) + what P did within 2 h after`);
  for (const e of pRows) {
    const after = pEvents.filter((x) => x.at >= e.at && x.at - e.at < 2 * 3600e3 && (!e.roundId || x.roundId === e.roundId));
    const did = after.map((x) => `${x.ev}@${hm(x.at).slice(6)}`).join(",");
    console.log(`  ${hm(e.at)} · ${e.kind || "?"} · ${devKey[e.deviceId] || (e.deviceId ? "old/other phone" : "-")} · ${e.status} · ${e.receivedAt ? "+" + Math.round((e.receivedAt - e.at) / 1000) + "s" : "NO"} · ${e.openedAt ? "yes" : "-"} · ${e.retries || 0}${e.retryError ? "(" + e.retryError + ")" : ""} · ${did || "-"}`);
  }
  // Her answers in the period, from the rounds themselves
  const rounds = await db.collection("rounds").where("participants", "array-contains", P.id).get();
  let asked = 0, answered = 0;
  for (const r of rounds.docs) {
    const x = r.data(); if (!x.createdAt || x.createdAt.toMillis() < since || !(x.recipients || []).includes(P.id)) continue;
    asked++; if (x.answers && x.answers[P.id]) answered++;
    const dv = (x.delivery || {})[P.id] || {};
    console.log(`  round ${hm(x.createdAt.toMillis())}: answered ${x.answers && x.answers[P.id] ? hm(x.answers[P.id].at) : "no"} · delivery recv ${hm(dv.recv)} open ${hm(dv.open)}`);
  }
  console.log(`\n== Rounds asked to P in 14 days: ${asked}, answered: ${answered}`);
})().catch((e) => { console.error(e); process.exit(1); });
