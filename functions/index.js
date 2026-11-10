const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

const REGION = "us-central1";
const TZ = "America/Sao_Paulo";
const APP_URL = "https://williamrech.github.io/williamrech/";
const FRIDAY = 5;
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// ---------------------------------------------------------------------------
// Sassy copy (pt-BR). {name}, {owner}, {when}, {day} get replaced.
// ---------------------------------------------------------------------------
const COPY = {
  nag: [
    ["Vai no mercado hoje? 🛒", "Responde logo, a geladeira tá esperando."],
    ["Pergunta do dia 🛒", "Vai no mercado ou vai deixar todo mundo passar fome?"],
    ["Oi, sumida(o) 👀", "Vai no mercado hoje? Sim ou não, sem enrolação."],
    ["Mercado? 🥦", "Só responde. Não dói. Prometo."],
    ["Hora da verdade ⏰", "Hoje tem mercado ou não tem?"],
  ],
  nagFriday: [
    ["Sexta-feira, meu bem 🛒", "Sexta é obrigatório. Vai no mercado hoje?"],
    ["É SEXTA 🎉", "E na sexta a gente pergunta, sim. Vai no mercado?"],
  ],
  trip: [
    ["🛒 {name} vai no mercado", "{when}. Quem vai junto?"],
    ["Alerta de mercado 🚨", "{name} vai {when}. Se manifesta quem quer ir."],
    ["{name} vai no mercado 🛒", "{when}. Última chance de pedir sorvete."],
  ],
  join: [
    ["{name} vai junto 🙋", "Com {owner}, {when}. Que lindo, que união."],
    ["Carona confirmada 🚗", "{name} vai no mercado com {owner}. Alguém mais?"],
    ["{name} se convidou 💅", "Vai junto com {owner} {when}."],
  ],
  leave: [
    ["{name} desistiu 💔", "Não vai mais com {owner}. Traição registrada."],
    ["Ih, {name} amarelou 🐔", "Desistiu de ir no mercado com {owner}."],
  ],
  cancel: [
    ["Mercado cancelado ❌", "{owner} não vai mais. Ninguém vai comer hoje."],
    ["{owner} desistiu do mercado 🙄", "Plano cancelado. Se vira aí."],
  ],
  no: [
    ["{name} não vai no mercado hoje 🙅", "Anotado. Com decepção, mas anotado."],
    ["Hoje não, diz {name} 😒", "Alguém mais corajoso se habilita?"],
    ["{name} pulou fora 🏃", "Não vai no mercado hoje. Típico."],
  ],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
function message(kind, vars) {
  const [t, b] = pick(COPY[kind]);
  return { title: fill(t, vars), body: fill(b, vars) };
}

// ---------------------------------------------------------------------------
// Date helpers (everything in Brasília time)
// ---------------------------------------------------------------------------
function spParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { key: `${parts.year}-${parts.month}-${parts.day}`, weekday, hour: parts.hour, minute: parts.minute };
}

// "hoje às 18:30" / "amanhã às 10:00" / "sexta (14/11) às 09:00"
function whenText(date) {
  const now = spParts();
  const d = spParts(date);
  const tomorrow = spParts(new Date(Date.now() + 86400000));
  const time = `${d.hour}:${d.minute}`;
  if (d.key === now.key) return `hoje às ${time}`;
  if (d.key === tomorrow.key) return `amanhã às ${time}`;
  const [, m, day] = d.key.split("-");
  return `${DAY_NAMES[d.weekday]} (${day}/${m}) às ${time}`;
}

// ---------------------------------------------------------------------------
// Push helpers
// ---------------------------------------------------------------------------
async function tokensFor({ onlyUid, excludeUid } = {}) {
  let q = db.collection("devices");
  if (onlyUid) q = q.where("uid", "==", onlyUid);
  const snap = await q.get();
  return snap.docs.filter((d) => d.get("uid") !== excludeUid).map((d) => d.id);
}

async function send(tokens, { title, body }, path = "") {
  if (!tokens.length) return { sent: 0, failed: 0 };
  const link = APP_URL + path;
  let sent = 0;
  let failed = 0;
  const dead = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: { url: link },
      webpush: {
        notification: { icon: APP_URL + "icons/icon-192.png" },
        fcmOptions: { link },
        headers: { Urgency: "high", TTL: "21600" },
      },
    });
    res.responses.forEach((r, j) => {
      if (r.success) { sent++; return; }
      failed++;
      const code = r.error && r.error.code;
      if (code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token") dead.push(batch[j]);
    });
  }
  await Promise.all(dead.map((t) => db.collection("devices").doc(t).delete()));
  return { sent, failed };
}

// Notifies everyone except the person who did the action.
const broadcast = async (actorUid, msg, path) => send(await tokensFor({ excludeUid: actorUid }), msg, path);

async function displayName(auth) {
  const snap = await db.doc(`users/${auth.uid}`).get();
  return (snap.exists && snap.get("name")) || (auth.token.email || "Alguém").split("@")[0];
}

function requireAuth(req) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Faz login primeiro.");
  return req.auth;
}

const opts = { region: REGION, maxInstances: 5 };

// ---------------------------------------------------------------------------
// "Tô indo no mercado" — create a trip and tell everyone.
// ---------------------------------------------------------------------------
exports.createTrip = onCall(opts, async (req) => {
  const auth = requireAuth(req);
  const when = new Date(req.data && req.data.when);
  const now = Date.now();
  if (isNaN(when) || when.getTime() < now - 30 * 60000 || when.getTime() > now + 7 * 86400000) {
    throw new HttpsError("invalid-argument", "Horário estranho. Escolhe de novo.");
  }
  const name = await displayName(auth);
  const ref = await db.collection("trips").add({
    uid: auth.uid,
    name,
    when: Timestamp.fromDate(when),
    riders: {},
    createdAt: FieldValue.serverTimestamp(),
  });
  // Volunteering counts as answering today's question.
  await db.doc(`users/${auth.uid}`).set({ lastAnswered: spParts().key }, { merge: true });

  const result = await broadcast(auth.uid, message("trip", { name, when: whenText(when) }), `?viagem=${ref.id}`);
  return { id: ref.id, ...result };
});

// "Vou junto" / "Desisti" — toggle riding along.
exports.toggleRide = onCall(opts, async (req) => {
  const auth = requireAuth(req);
  const tripId = req.data && String(req.data.tripId || "");
  if (!tripId) throw new HttpsError("invalid-argument", "Qual mercado?");
  const name = await displayName(auth);
  const ref = db.doc(`trips/${tripId}`);

  const { joined, trip } = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Esse mercado não existe mais.");
    const trip = snap.data();
    if (trip.uid === auth.uid) throw new HttpsError("failed-precondition", "Você já vai, né? É seu mercado.");
    const joined = !(trip.riders && trip.riders[auth.uid]);
    t.update(ref, { [`riders.${auth.uid}`]: joined ? name : FieldValue.delete() });
    return { joined, trip };
  });

  const vars = { name, owner: trip.name, when: whenText(trip.when.toDate()) };
  await broadcast(auth.uid, message(joined ? "join" : "leave", vars), `?viagem=${tripId}`);
  return { joined };
});

// Owner cancels their trip.
exports.cancelTrip = onCall(opts, async (req) => {
  const auth = requireAuth(req);
  const tripId = req.data && String(req.data.tripId || "");
  const ref = db.doc(`trips/${tripId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Esse mercado não existe mais.");
  if (snap.get("uid") !== auth.uid) throw new HttpsError("permission-denied", "Só quem vai pode cancelar.");
  await ref.delete();
  await broadcast(auth.uid, message("cancel", { owner: snap.get("name") }));
  return { ok: true };
});

// Answer to the daily question. "Sim" goes on to createTrip from the app.
exports.answerNo = onCall(opts, async (req) => {
  const auth = requireAuth(req);
  const today = spParts();
  const update = { lastAnswered: today.key };
  if (today.weekday !== FRIDAY) update.skipDays = FieldValue.arrayUnion(today.weekday);
  await db.doc(`users/${auth.uid}`).set(update, { merge: true });

  const name = await displayName(auth);
  await broadcast(auth.uid, message("no", { name }));
  return { skipped: today.weekday !== FRIDAY ? DAY_NAMES[today.weekday] : null };
});

// ---------------------------------------------------------------------------
// Daily nag at noon, Brasília time. Each user individually.
// ---------------------------------------------------------------------------
exports.noonNag = onSchedule({ schedule: "0 12 * * *", timeZone: TZ, region: REGION }, async () => {
  const today = spParts();
  const [users, devices] = await Promise.all([db.collection("users").get(), db.collection("devices").get()]);
  const userById = Object.fromEntries(users.docs.map((d) => [d.id, d.data()]));

  const tokensByUid = {};
  for (const d of devices.docs) (tokensByUid[d.get("uid")] ||= []).push(d.id);

  for (const [uid, tokens] of Object.entries(tokensByUid)) {
    const u = userById[uid] || {};
    if (u.lastAnswered === today.key) continue; // already volunteered/answered today
    const skip = Array.isArray(u.skipDays) ? u.skipDays : [];
    if (today.weekday !== FRIDAY && skip.includes(today.weekday)) continue;
    const msg = message(today.weekday === FRIDAY ? "nagFriday" : "nag", {});
    await send(tokens, msg, "?pergunta=mercado");
  }
});

// ---------------------------------------------------------------------------
// Admin tools. To make someone admin: Firestore console → users/{uid} → add
// field `admin` (boolean) = true. Clients can't set it themselves (see rules).
// ---------------------------------------------------------------------------
async function requireAdmin(req) {
  const auth = requireAuth(req);
  const snap = await db.doc(`users/${auth.uid}`).get();
  if (!snap.exists || snap.get("admin") !== true) throw new HttpsError("permission-denied", "Só admin. Belo tento.");
  return auth;
}

// Health check: counts, orphans, and validates every push token (dry run, nothing is shown).
exports.adminHealth = onCall(opts, async (req) => {
  const auth = await requireAdmin(req);
  const myToken = req.data && String(req.data.token || "");
  const [users, devices, trips] = await Promise.all([
    db.collection("users").get(), db.collection("devices").get(), db.collection("trips").get(),
  ]);
  const userIds = new Set(users.docs.map((d) => d.id));
  const deviceUids = new Set(devices.docs.map((d) => d.get("uid")));
  const now = Date.now();

  // Dry-run every token to find dead ones, and clean them up.
  const tokens = devices.docs.map((d) => d.id);
  const dead = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await getMessaging().sendEach(
      batch.map((token) => ({ token, notification: { title: "health", body: "check" } })), true);
    res.responses.forEach((r, j) => { if (!r.success) dead.push(batch[j]); });
  }
  await Promise.all(dead.map((t) => db.collection("devices").doc(t).delete()));

  const today = spParts();
  return {
    serverTime: `${today.key} ${today.hour}:${today.minute} (${DAY_NAMES[today.weekday]}, Brasília)`,
    users: users.size,
    names: users.docs.map((d) => d.get("name") || "(sem apelido)"),
    usersWithoutDevices: users.docs.filter((d) => !deviceUids.has(d.id)).map((d) => d.get("name") || d.id),
    devices: devices.size,
    devicesWithoutProfile: devices.docs.filter((d) => !userIds.has(d.get("uid"))).length,
    deadTokensRemoved: dead.length,
    myDeviceRegistered: !!myToken && devices.docs.some((d) => d.id === myToken && d.get("uid") === auth.uid),
    myDevices: devices.docs.filter((d) => d.get("uid") === auth.uid).length,
    tripsUpcoming: trips.docs.filter((d) => d.get("when").toMillis() >= now).length,
    tripsPast: trips.docs.filter((d) => d.get("when").toMillis() < now).length,
  };
});

// Sends a test notification to the admin's own devices only.
exports.adminTest = onCall(opts, async (req) => {
  const auth = await requireAdmin(req);
  return send(await tokensFor({ onlyUid: auth.uid }),
    { title: "Teste ☕", body: "Se você tá lendo isso, as notificações funcionam." });
});

// scope "me": wipe my profile, devices, trips and rides. scope "all": wipe everything.
// Admin flags survive so you can log back in as admin.
exports.adminReset = onCall({ ...opts, timeoutSeconds: 120 }, async (req) => {
  const auth = await requireAdmin(req);
  const scope = req.data && req.data.scope;

  if (scope === "all") {
    await Promise.all([
      db.recursiveDelete(db.collection("devices")),
      db.recursiveDelete(db.collection("trips")),
      db.recursiveDelete(db.collection("cooldowns")),
    ]);
    const users = await db.collection("users").get();
    await Promise.all(users.docs.map((d) =>
      d.get("admin") === true ? d.ref.set({ admin: true }) : d.ref.delete()));
    return { ok: true, scope };
  }

  if (scope === "me") {
    const [devices, trips] = await Promise.all([
      db.collection("devices").where("uid", "==", auth.uid).get(),
      db.collection("trips").get(),
    ]);
    const writes = devices.docs.map((d) => d.ref.delete());
    for (const t of trips.docs) {
      if (t.get("uid") === auth.uid) writes.push(t.ref.delete());
      else if (t.get(`riders.${auth.uid}`)) writes.push(t.ref.update({ [`riders.${auth.uid}`]: FieldValue.delete() }));
    }
    writes.push(db.doc(`cooldowns/${auth.uid}`).delete());
    writes.push(db.doc(`users/${auth.uid}`).set({ admin: true }));
    await Promise.all(writes);
    return { ok: true, scope };
  }

  throw new HttpsError("invalid-argument", "scope deve ser 'me' ou 'all'.");
});
