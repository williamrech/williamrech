const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const { randomInt } = require("crypto");

initializeApp();
const db = getFirestore();

const REGION = "us-central1";
const TZ = "America/Sao_Paulo";
const APP_URL = "https://williamrech.github.io/williamrech/";
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// ---------------------------------------------------------------------------
// Sassy copy (pt-BR).
//   {name}, {owner}, {when}, {title}, {value}, {n} → replaced from vars
//   {o|a} → gendered by the subject's gender ("m" → first, "f" → second)
// ---------------------------------------------------------------------------
const COPY = {
  answer: [
    ["{emoji} {name} respondeu", "“{title}” → {value}"],
    ["{emoji} Temos resposta!", "{name}: {value}"],
    ["{emoji} {name} se manifestou", "{value}. Anotado."],
  ],
  changed: [
    ["🌀 {name} mudou de ideia", "“{title}” → agora é {value} ({n}ª vez)"],
    ["🙄 Indecis{o|a}, hein?", "{name} mudou pra {value}. Já é a {n}ª vez."],
    ["Plot twist 🔄", "{name} agora diz {value} (mudança nº {n})"],
  ],
  nag: [
    ["{emoji} Ainda esperando…", "{owner} quer saber: {title}"],
    ["{emoji} Ô, {name}!", "{title} Responde aí, não custa nada."],
    ["{emoji} Lembrete carinhoso 💌", "{title} (a gente vai continuar perguntando)"],
    ["{emoji} {name}, cadê você? 👀", "{owner} tá esperando: {title}"],
  ],
  muted: [
    ["🔕 {name} silenciou “{title}”", "{O|A} {name} não quer mais saber disso. Que deselegante."],
    ["🔕 Ignorad{o|a}", "{name} silenciou “{title}”. Pensa no que você fez."],
  ],
  unmuted: [
    ["🔔 {name} voltou atrás", "Reativou “{title}”. Perdão concedido."],
  ],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function fill(s, vars) {
  const female = vars.gender === "f";
  return s
    .replace(/\{(\w*)\|(\w*)\}/g, (_, m, f) => (female ? f : m))
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}
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
  const hour = String(Number(parts.hour) % 24).padStart(2, "0");
  return { key: `${parts.year}-${parts.month}-${parts.day}`, weekday, hour, minute: parts.minute, hm: `${hour}:${parts.minute}` };
}
const toMin = (hm) => { const [h, m] = String(hm).split(":").map(Number); return h * 60 + m; };

// Quiet hours: user.quiet = { on, start: "22:00", end: "08:00" } (Brasília time).
function isQuiet(user, now = spParts()) {
  const q = user && user.quiet;
  if (!q || !q.on || !q.start || !q.end) return false;
  const t = toMin(now.hm), s = toMin(q.start), e = toMin(q.end);
  return s <= e ? t >= s && t < e : t >= s || t < e; // handles overnight ranges
}

// ---------------------------------------------------------------------------
// Push helpers
// ---------------------------------------------------------------------------
async function loadUsers() {
  const snap = await db.collection("users").get();
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
}

async function tokensByUid() {
  const snap = await db.collection("devices").get();
  const map = {};
  for (const d of snap.docs) (map[d.get("uid")] ||= []).push(d.id);
  return map;
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

// Sends to a list of users, skipping anyone in their quiet hours.
async function sendToUids(uids, msg, path, { users, tokens } = {}) {
  users ||= await loadUsers();
  tokens ||= await tokensByUid();
  const now = spParts();
  const list = [...new Set(uids)].filter((u) => !isQuiet(users[u], now)).flatMap((u) => tokens[u] || []);
  return send(list, msg, path);
}

async function profile(auth) {
  const snap = await db.doc(`users/${auth.uid}`).get();
  const data = snap.exists ? snap.data() : {};
  return { ...data, name: data.name || (auth.token.email || "Alguém").split("@")[0], gender: data.gender || "m" };
}

function requireAuth(req) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Faz login primeiro.");
  return req.auth;
}

// All app actions go through ONE callable function ("api") so a single warm instance
// serves everything — far fewer cold starts than one function per action.
// 512MiB also gives the instance more CPU, which makes cold starts faster.
const opts = { region: REGION, maxInstances: 5, memory: "512MiB", timeoutSeconds: 120 };
const handlers = {};

// ---------------------------------------------------------------------------
// Chamados: personal templates (templates/{id}) that create rounds (rounds/{id}).
//
// template: ownerUid, emoji, title, body, answerType ("none"|"yesno"|"options"|"text"),
//   options[], recipients ("all" | [uid]), visibility ("all"|"owner"), allowMute,
//   nagEveryMin (0 = never), durationHours, schedule { on, days[], time "HH:MM" },
//   mutedBy { uid: name }  ← server only, lastFiredKey ← server only
//
// round: copy of the template's look + recipients/participants, answers { uid: {value,name,changes,at} },
//   notified { uid: millis }, open, closesAt
// ---------------------------------------------------------------------------
const ANSWER_TYPES = ["none", "yesno", "options", "text"];

async function createRound(tplRef, tpl, owner, { users, tokens } = {}) {
  users ||= await loadUsers();
  tokens ||= await tokensByUid();
  const muted = tpl.mutedBy || {};
  const pool = tpl.recipients === "all"
    ? Object.keys(users).filter((u) => u !== tpl.ownerUid)
    : (tpl.recipients || []).filter((u) => users[u]);
  const recipients = pool.filter((u) => !muted[u]);
  if (!recipients.length) throw new HttpsError("failed-precondition", "Ninguém pra receber (ou todo mundo silenciou 🙃).");

  const answerType = ANSWER_TYPES.includes(tpl.answerType) ? tpl.answerType : "none";
  const durationHours = Math.min(Math.max(Number(tpl.durationHours) || 12, 1), 72);
  const now = Date.now();
  const round = {
    templateId: tplRef ? tplRef.id : null, // null = one-off (sent from the feed without saving)
    ownerUid: tpl.ownerUid,
    ownerName: owner.name,
    ownerGender: owner.gender || "m",
    emoji: tpl.emoji || "🔔",
    title: tpl.title,
    body: tpl.body || "",
    answerType,
    options: answerType === "yesno" ? ["Sim", "Não"] : answerType === "options" ? (tpl.options || []).slice(0, 6) : [],
    visibility: tpl.visibility === "owner" ? "owner" : "all",
    allowMute: tplRef ? tpl.allowMute !== false : false, // nothing to mute on a one-off
    nagEveryMin: answerType === "none" ? 0 : Number(tpl.nagEveryMin) || 0,
    recipients,
    recipientNames: Object.fromEntries(recipients.map((u) => [u, users[u].name || "?"])),
    participants: [...new Set([...recipients, tpl.ownerUid])],
    answers: {},
    notified: {},
    open: true,
    closesAt: Timestamp.fromMillis(now + durationHours * 3600000),
    createdAt: FieldValue.serverTimestamp(),
  };

  // Notify now everyone not in quiet hours; the rest get it when their quiet hours end (tick).
  const sp = spParts();
  const awake = recipients.filter((u) => !isQuiet(users[u], sp));
  const ref = db.collection("rounds").doc();
  for (const u of awake) round.notified[u] = now;
  await ref.set(round);

  const msg = { title: `${round.emoji} ${round.title}`, body: round.body || `${owner.name} quer saber.` };
  const res = await send(awake.flatMap((u) => tokens[u] || []), msg, `?rodada=${ref.id}`);
  return { id: ref.id, recipients: recipients.length, delayed: recipients.length - awake.length, ...res };
}

handlers.fireTemplate = async (req) => {
  const auth = requireAuth(req);
  const id = req.data && String(req.data.templateId || "");
  const ref = db.doc(`templates/${id}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get("ownerUid") !== auth.uid) throw new HttpsError("not-found", "Não encontrei esse aqui.");
  const last = snap.get("lastManualAt");
  if (last && Date.now() - last.toMillis() < 15000) throw new HttpsError("resource-exhausted", "Calma. Espera uns segundinhos.");
  await ref.update({ lastManualAt: FieldValue.serverTimestamp() });
  return createRound(ref, snap.data(), await profile(auth));
};

// Send once from the feed, without saving a recado. Same fields as a template.
handlers.sendOnce = async (req) => {
  const auth = requireAuth(req);
  const d = req.data || {};
  const str = (v, max) => String(v || "").trim().slice(0, max);
  const tpl = {
    ownerUid: auth.uid,
    emoji: str(d.emoji, 16) || "🔔",
    title: str(d.title, 80),
    body: str(d.body, 160),
    answerType: ANSWER_TYPES.includes(d.answerType) ? d.answerType : "none",
    options: Array.isArray(d.options) ? d.options.map((o) => str(o, 40)).filter(Boolean).slice(0, 6) : [],
    recipients: d.recipients === "all" ? "all" : (Array.isArray(d.recipients) ? d.recipients.map(String).slice(0, 50) : []),
    visibility: d.visibility === "owner" ? "owner" : "all",
    nagEveryMin: [0, 15, 30, 60, 120].includes(Number(d.nagEveryMin)) ? Number(d.nagEveryMin) : 0,
    durationHours: Number(d.durationHours) || 12,
  };
  if (!tpl.title) throw new HttpsError("invalid-argument", "Dá um título, vai.");
  if (tpl.answerType === "options" && tpl.options.length < 2) throw new HttpsError("invalid-argument", "Coloca pelo menos 2 opções.");
  if (tpl.recipients !== "all" && !tpl.recipients.length) throw new HttpsError("invalid-argument", "Pra quem? Escolhe alguém.");
  // Same anti-spam pause as the saved ones.
  const cd = db.doc(`cooldowns/${auth.uid}`);
  const last = await cd.get();
  if (last.exists && Date.now() - (last.get("sendOnce") || 0) < 15000) throw new HttpsError("resource-exhausted", "Calma. Espera uns segundinhos.");
  await cd.set({ sendOnce: Date.now() }, { merge: true });
  return createRound(null, tpl, await profile(auth));
};

handlers.answerRound = async (req) => {
  const auth = requireAuth(req);
  const roundId = req.data && String(req.data.roundId || "");
  let value = req.data && typeof req.data.value === "string" ? req.data.value.trim() : "";
  const me = await profile(auth);
  const ref = db.doc(`rounds/${roundId}`);

  const { round, changes } = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Isso não existe mais.");
    const round = snap.data();
    if (!round.recipients.includes(auth.uid)) throw new HttpsError("permission-denied", "Não perguntaram pra você. 💅");
    if (!round.open) throw new HttpsError("failed-precondition", "Já encerrou. Chegou tarde.");
    if (round.answerType === "none") throw new HttpsError("failed-precondition", "Isso é só um aviso.");
    if (round.answerType === "text") {
      if (!value) throw new HttpsError("invalid-argument", "Escreve alguma coisa.");
      value = value.slice(0, 200);
    } else if (!round.options.includes(value)) {
      throw new HttpsError("invalid-argument", "Opção inválida.");
    }
    const prev = round.answers && round.answers[auth.uid];
    if (prev && prev.value === value) throw new HttpsError("already-exists", "Você já respondeu isso. 😉");
    const changes = prev ? (prev.changes || 0) + 1 : 0;
    t.update(ref, { [`answers.${auth.uid}`]: { value, name: me.name, gender: me.gender, changes, at: Date.now() } });
    return { round, changes };
  });

  const vars = { name: me.name, gender: me.gender, title: round.title, value, emoji: round.emoji, n: changes };
  const msg = message(changes ? "changed" : "answer", vars);
  const targets = round.visibility === "all"
    ? round.participants.filter((u) => u !== auth.uid)
    : [round.ownerUid].filter((u) => u !== auth.uid);
  await sendToUids(targets, msg, `?rodada=${roundId}`);
  return { ok: true, changes };
};

handlers.closeRound = async (req) => {
  const auth = requireAuth(req);
  const ref = db.doc(`rounds/${String((req.data && req.data.roundId) || "")}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Isso não existe mais.");
  if (snap.get("ownerUid") !== auth.uid) throw new HttpsError("permission-denied", "Só quem criou pode encerrar.");
  await ref.update({ open: false });
  return { ok: true };
};

// Delete a round for everyone (its creator, or an admin).
handlers.deleteRound = async (req) => {
  const auth = requireAuth(req);
  const ref = db.doc(`rounds/${String((req.data && req.data.roundId) || "")}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: true };
  if (snap.get("ownerUid") !== auth.uid) {
    const me = await db.doc(`users/${auth.uid}`).get();
    if (!me.exists || me.get("admin") !== true) throw new HttpsError("permission-denied", "Só quem criou pode apagar.");
  }
  await ref.delete();
  return { ok: true };
};

// Mute / unmute a template (from a round card, or by templateId from settings).
handlers.muteTemplate = async (req) => {
  const auth = requireAuth(req);
  const mute = !(req.data && req.data.mute === false);
  let templateId = req.data && req.data.templateId;
  if (!templateId && req.data && req.data.roundId) {
    const r = await db.doc(`rounds/${req.data.roundId}`).get();
    if (!r.exists || !r.get("recipients").includes(auth.uid)) throw new HttpsError("not-found", "Não achei.");
    if (mute && r.get("allowMute") === false) throw new HttpsError("permission-denied", "Esse aqui não dá pra silenciar. Sinto muito (mentira).");
    templateId = r.get("templateId");
    if (!templateId) throw new HttpsError("failed-precondition", "Esse foi avulso, não tem o que silenciar. Dá pra ocultar quando fechar.");
  }
  const tRef = db.doc(`templates/${String(templateId || "")}`);
  const tSnap = await tRef.get();
  if (!tSnap.exists) throw new HttpsError("not-found", "Isso não existe mais.");
  const tpl = tSnap.data();
  if (mute && tpl.allowMute === false) throw new HttpsError("permission-denied", "Esse aqui não dá pra silenciar.");
  const me = await profile(auth);

  await Promise.all([
    tRef.update({ [`mutedBy.${auth.uid}`]: mute ? me.name : FieldValue.delete() }),
    db.doc(`users/${auth.uid}`).set({
      mutes: { [tSnap.id]: mute ? { title: tpl.title, emoji: tpl.emoji || "🔔", owner: (await profile({ uid: tpl.ownerUid, token: {} })).name } : FieldValue.delete() },
    }, { merge: true }),
  ]);
  if (tpl.ownerUid !== auth.uid) {
    await sendToUids([tpl.ownerUid], message(mute ? "muted" : "unmuted", { name: me.name, gender: me.gender, title: tpl.title }));
  }
  return { muted: mute };
};

// ---------------------------------------------------------------------------
// Every 15 minutes: fire scheduled templates, deliver delayed (quiet-hours)
// notifications, nag people who haven't answered, close expired rounds.
// ---------------------------------------------------------------------------
exports.tick = onSchedule({ schedule: "*/15 * * * *", timeZone: TZ, region: REGION }, async () => {
  const sp = spParts();
  const nowMin = toMin(sp.hm);
  const now = Date.now();
  const [users, tokens] = await Promise.all([loadUsers(), tokensByUid()]);

  // 1) Scheduled templates due today (fire within 60 min after their time, once per day).
  const scheduled = await db.collection("templates").where("schedule.on", "==", true).get();
  for (const doc of scheduled.docs) {
    const tpl = doc.data();
    const s = tpl.schedule || {};
    if (!Array.isArray(s.days) || !s.days.includes(sp.weekday) || !s.time) continue;
    const diff = nowMin - toMin(s.time);
    if (diff < 0 || diff > 60 || tpl.lastFiredKey === sp.key) continue;
    await doc.ref.update({ lastFiredKey: sp.key });
    const owner = users[tpl.ownerUid] || {};
    try {
      await createRound(doc.ref, tpl, { name: owner.name || "Alguém", gender: owner.gender || "m" }, { users, tokens });
    } catch (e) {
      console.warn("scheduled fire skipped", doc.id, e.message);
    }
  }

  // 2) Open rounds: close, deliver delayed, nag.
  const open = await db.collection("rounds").where("open", "==", true).get();
  // Read every template these rounds need in one batch.
  const tplIds = [...new Set(open.docs.map((d) => d.get("templateId")).filter(Boolean))];
  const tplDocs = tplIds.length ? await db.getAll(...tplIds.map((id) => db.doc(`templates/${id}`))) : [];
  const mutedByTemplate = Object.fromEntries(tplDocs.filter((d) => d.exists).map((d) => [d.id, d.get("mutedBy") || {}]));
  for (const doc of open.docs) {
    const r = doc.data();
    if (r.closesAt && r.closesAt.toMillis() <= now) { await doc.ref.update({ open: false }); continue; }

    const muted = mutedByTemplate[r.templateId] || {};
    const updates = {};
    for (const u of r.recipients) {
      if (muted[u] || (r.answers && r.answers[u]) || isQuiet(users[u], sp)) continue;
      const last = r.notified && r.notified[u];
      let msg = null;
      if (!last) {
        msg = { title: `${r.emoji} ${r.title}`, body: r.body || `${r.ownerName} quer saber.` };
      } else if (r.nagEveryMin > 0 && now - last >= r.nagEveryMin * 60000 - 30000) {
        msg = message("nag", { emoji: r.emoji, title: r.title, owner: r.ownerName, name: (users[u] || {}).name || "", gender: (users[u] || {}).gender });
      }
      if (!msg) continue;
      await send(tokens[u] || [], msg, `?rodada=${doc.id}`);
      updates[`notified.${u}`] = now;
    }
    if (Object.keys(updates).length) await doc.ref.update(updates);
  }
});

// ---------------------------------------------------------------------------
// Admin tools. The first person to log in claims admin (see claimAdmin).
// ---------------------------------------------------------------------------
async function requireAdmin(req) {
  const auth = requireAuth(req);
  const snap = await db.doc(`users/${auth.uid}`).get();
  if (!snap.exists || snap.get("admin") !== true) throw new HttpsError("permission-denied", "Só admin. Belo tento.");
  return auth;
}

handlers.adminHealth = async (req) => {
  const auth = await requireAdmin(req);
  const myToken = req.data && String(req.data.token || "");
  const [users, devices, templates, rounds] = await Promise.all([
    db.collection("users").get(), db.collection("devices").get(),
    db.collection("templates").get(), db.collection("rounds").where("open", "==", true).get(),
  ]);
  const userIds = new Set(users.docs.map((d) => d.id));
  const deviceUids = new Set(devices.docs.map((d) => d.get("uid")));

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
    serverTime: `${today.key} ${today.hm} (${DAY_NAMES[today.weekday]}, Brasília)`,
    users: users.size,
    names: users.docs.map((d) => d.get("name") || "(sem apelido)"),
    usersWithoutDevices: users.docs.filter((d) => !deviceUids.has(d.id)).map((d) => d.get("name") || d.id),
    devices: devices.size,
    devicesWithoutProfile: devices.docs.filter((d) => !userIds.has(d.get("uid"))).length,
    deadTokensRemoved: dead.length,
    myDeviceRegistered: !!myToken && devices.docs.some((d) => d.id === myToken && d.get("uid") === auth.uid),
    myDevices: devices.docs.filter((d) => d.get("uid") === auth.uid).length,
    templates: templates.size,
    scheduledTemplates: templates.docs.filter((d) => d.get("schedule.on") === true).length,
    openRounds: rounds.size,
  };
};

handlers.adminTest = async (req) => {
  const auth = await requireAdmin(req);
  const tokens = await tokensByUid();
  return send(tokens[auth.uid] || [], { title: "Teste ☕", body: "Se você tá lendo isso, as notificações funcionam." });
};

handlers.adminReset = async (req) => {
  const auth = await requireAdmin(req);
  const scope = req.data && req.data.scope;

  if (scope === "all") {
    await Promise.all(["devices", "trips", "cooldowns", "templates", "rounds"]
      .map((c) => db.recursiveDelete(db.collection(c))));
    const users = await db.collection("users").get();
    await Promise.all(users.docs.map((d) =>
      d.get("admin") === true ? d.ref.set({ admin: true }) : d.ref.delete()));
    return { ok: true, scope };
  }

  if (scope === "me") {
    const [devices, templates, rounds] = await Promise.all([
      db.collection("devices").where("uid", "==", auth.uid).get(),
      db.collection("templates").where("ownerUid", "==", auth.uid).get(),
      db.collection("rounds").where("ownerUid", "==", auth.uid).get(),
    ]);
    const writes = [...devices.docs, ...templates.docs, ...rounds.docs].map((d) => d.ref.delete());
    writes.push(db.doc(`users/${auth.uid}`).set({ admin: true }));
    await Promise.all(writes);
    return { ok: true, scope };
  }

  throw new HttpsError("invalid-argument", "scope deve ser 'me' ou 'all'.");
};

// Promote / demote another person (can't remove the last admin).
handlers.setAdmin = async (req) => {
  await requireAdmin(req);
  const uid = String((req.data && req.data.uid) || "");
  const make = !!(req.data && req.data.admin);
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!uid || !snap.exists) throw new HttpsError("not-found", "Pessoa não encontrada.");
  if (!make) {
    const admins = await db.collection("users").where("admin", "==", true).get();
    if (admins.size <= 1 && admins.docs[0].id === uid) throw new HttpsError("failed-precondition", "Precisa ter pelo menos um admin.");
  }
  await ref.update({ admin: make ? true : FieldValue.delete() });
  return { ok: true, admin: make };
};

// ---------------------------------------------------------------------------
// User management (Admin → Pessoas). Uses the Admin SDK, so it works with public
// sign-up turned off. The functions' runtime service account needs the
// "Firebase Authentication Admin" role; if it's missing we say so clearly.
// ---------------------------------------------------------------------------
const PW_WORDS = ["cafe", "sorvete", "mercado", "pudim", "pastel", "biscoito", "panela", "carrinho", "sacola", "brigadeiro", "goiaba", "pipoca"];
const newPassword = () => `${PW_WORDS[randomInt(PW_WORDS.length)]}-${PW_WORDS[randomInt(PW_WORDS.length)]}-${randomInt(1000, 10000)}`;

async function authCall(fn) {
  try {
    return await fn();
  } catch (e) {
    const code = String((e && (e.code || e.errorInfo && e.errorInfo.code)) || "");
    const msg = String((e && e.message) || "");
    if (code === "auth/email-already-exists") throw new HttpsError("already-exists", "Esse e-mail já tem conta.");
    if (code === "auth/invalid-email") throw new HttpsError("invalid-argument", "E-mail inválido.");
    if (code === "auth/invalid-password") throw new HttpsError("invalid-argument", "Senha fraca: pelo menos 6 caracteres.");
    if (code === "auth/user-not-found") throw new HttpsError("not-found", "Essa conta não existe mais.");
    if (code === "auth/insufficient-permission" || /permission|PERMISSION_DENIED|403/i.test(msg)) {
      throw new HttpsError("failed-precondition",
        "Sem permissão pra mexer em contas. No Google Cloud → IAM, dê o papel “Administrador do Firebase Authentication” " +
        "para a conta “…-compute@developer.gserviceaccount.com” (a que roda as functions).");
    }
    console.error("auth admin error", code, msg);
    throw new HttpsError("internal", "Deu ruim mexendo na conta. Tenta de novo.");
  }
}

handlers.adminListUsers = async (req) => {
  await requireAdmin(req);
  const res = await authCall(() => getAuth().listUsers(1000));
  return {
    users: res.users.map((u) => ({
      uid: u.uid, email: u.email || "", disabled: !!u.disabled,
      created: u.metadata.creationTime || "", lastSignIn: u.metadata.lastSignInTime || "",
    })),
  };
};

handlers.adminCreateUser = async (req) => {
  await requireAdmin(req);
  const email = String((req.data && req.data.email) || "").trim().toLowerCase();
  const password = String((req.data && req.data.password) || "").trim() || newPassword();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError("invalid-argument", "E-mail inválido.");
  if (password.length < 6) throw new HttpsError("invalid-argument", "Senha fraca: pelo menos 6 caracteres.");
  const user = await authCall(() => getAuth().createUser({ email, password }));
  return { uid: user.uid, email, password };
};

handlers.adminSetPassword = async (req) => {
  await requireAdmin(req);
  const uid = String((req.data && req.data.uid) || "");
  const password = String((req.data && req.data.password) || "").trim() || newPassword();
  if (password.length < 6) throw new HttpsError("invalid-argument", "Senha fraca: pelo menos 6 caracteres.");
  const user = await authCall(() => getAuth().updateUser(uid, { password }));
  return { uid, email: user.email || "", password };
};

// Removes the login, profile, devices and everything they created.
handlers.adminDeleteUser = async (req) => {
  const auth = await requireAdmin(req);
  const uid = String((req.data && req.data.uid) || "");
  if (!uid) throw new HttpsError("invalid-argument", "Quem?");
  if (uid === auth.uid) throw new HttpsError("failed-precondition", "Você não pode se remover. Peça pra outro admin.");
  const profileSnap = await db.doc(`users/${uid}`).get();
  if (profileSnap.exists && profileSnap.get("admin") === true) {
    throw new HttpsError("failed-precondition", "Tira o admin dessa pessoa antes de remover.");
  }
  await authCall(() => getAuth().deleteUser(uid).catch((e) => { if (e && e.code === "auth/user-not-found") return; throw e; }));
  const [devices, templates, rounds] = await Promise.all([
    db.collection("devices").where("uid", "==", uid).get(),
    db.collection("templates").where("ownerUid", "==", uid).get(),
    db.collection("rounds").where("ownerUid", "==", uid).get(),
  ]);
  await Promise.all([...devices.docs, ...templates.docs, ...rounds.docs].map((d) => d.ref.delete()).concat([db.doc(`users/${uid}`).delete()]));
  return { ok: true };
};

handlers.claimAdmin = async (req) => {
  const auth = requireAuth(req);
  return db.runTransaction(async (t) => {
    const admins = await t.get(db.collection("users").where("admin", "==", true).limit(1));
    if (!admins.empty) return { admin: admins.docs[0].id === auth.uid, claimed: false };
    t.set(db.doc(`users/${auth.uid}`), { admin: true }, { merge: true });
    return { admin: true, claimed: true };
  });
};

exports.api = onCall(opts, async (req) => {
  const action = req.data && req.data.action;
  const fn = Object.prototype.hasOwnProperty.call(handlers, action) && handlers[action];
  if (!fn) throw new HttpsError("invalid-argument", "Ação desconhecida.");
  return fn(req);
});
