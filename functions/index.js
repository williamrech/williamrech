const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const { randomInt, randomBytes, createHmac, timingSafeEqual } = require("crypto");

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
  // Answers and nags: the TITLE is always the question itself (emoji + title), the body
  // starts with the useful part and ends with the sass, so if the phone cuts the text
  // it cuts the joke, not the information.
  answerTail: ["temos resposta!", "anotado.", "se manifestou.", "finalmente.", "milagre."],
  changedTail: ["indecis{o|a}, hein?", "plot twist.", "de novo?", "ninguém entende."],
  nag: [
    "{owner} ainda tá esperando, {name}. 👀",
    "Responde aí, {name}. Não custa nada.",
    "Lembrete carinhoso 💌 (a gente vai continuar perguntando)",
    "{name}, cadê você? {owner} quer saber.",
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

// ---------------------------------------------------------------------------
// Delivery + log. Every notification goes out as one message per phone, each with
// its own log entry (notifLog/{id}), so admins can see: sent / failed / quiet /
// muted / no device — and, via receipts from the phone, received / opened.
// ---------------------------------------------------------------------------
const LOG_DAYS = 30;

async function loadDevices() {
  const snap = await db.collection("devices").get();
  const map = {};
  for (const d of snap.docs) (map[d.get("uid")] ||= []).push({ id: d.id, ua: d.get("userAgent") || "" });
  return map;
}

// "iPhone · app", "Android · Chrome", "Android · Samsung"…
function deviceLabel(ua) {
  ua = String(ua || "");
  const os = /iPhone|iPod/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : "Outro";
  const br = /SamsungBrowser/.test(ua) ? "Samsung" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /EdgA|EdgiOS|Edg\//.test(ua) ? "Edge"
    : /OPR|Opera/.test(ua) ? "Opera" : /CriOS|Chrome/.test(ua) ? "Chrome"
    : (os === "iPhone" || os === "iPad") ? (/Safari\//.test(ua) ? "Safari" : "app") : /Safari/.test(ua) ? "Safari" : "navegador";
  return `${os} · ${br}`;
}

function fcmErrorText(code) {
  return {
    "messaging/registration-token-not-registered": "aparelho não existe mais (app apagado ou notificação desligada)",
    "messaging/invalid-registration-token": "aparelho inválido",
    "messaging/invalid-argument": "mensagem inválida",
    "messaging/message-rate-exceeded": "mensagens demais pra esse aparelho",
    "messaging/third-party-auth-error": "erro no serviço de push da Apple/Google",
    "messaging/server-unavailable": "push do Google fora do ar",
    "messaging/internal-error": "erro interno do push",
  }[code] || String(code || "erro desconhecido");
}

// targets: uids. meta: { kind, roundId, fromUid, quiet: "hold" | "skip", mutedUids }
// Returns { sent, failed, perUser: { uid: "sent" | "failed" | "nodevice" | "quiet" } }.
// ---------- Answer from the notification (2-option questions) ----------
// Each notification carries a key valid only for that person + question; the button sends it
// to /quick, which answers exactly like the app. The secret lives in server/quick (no client access).
const quickOptions = (r) => (r.answerType !== "text" && r.answerType !== "none" && Array.isArray(r.options) && r.options.length === 2 ? r.options : null);
let quickKey = null;
async function quickSecret() {
  if (quickKey) return quickKey;
  const ref = db.doc("server/quick");
  quickKey = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (snap.exists && snap.get("key")) return snap.get("key");
    const key = randomBytes(32).toString("hex");
    t.set(ref, { key, createdAt: Date.now() });
    return key;
  });
  return quickKey;
}
const quickToken = (key, roundId, uid) => createHmac("sha256", key).update(`${roundId}:${uid}`).digest("base64url").slice(0, 32);

// One push message. Every notification has a tag, so a resend replaces it instead of duplicating:
// questions and their reminders share "rodada-<id>" (one "still waiting" in the shade); everything
// else gets its own "n-<logId>".
function buildPush({ token, logId, uid, title, body, link, kind, roundId, qOpts, qKey, resend = false }) {
  const replacing = roundId && REPLACING_KINDS.includes(kind);
  return {
    token,
    // Android cuts the title short, so the title goes into the text: line 1 = title, line 2 = message.
    notification: { title: "", body: body ? `${title}\n${body}` : title },
    data: { url: link, logId,
      ...(qOpts ? { rid: roundId, u: uid, qt: quickToken(qKey, roundId, uid), q0: qOpts[0], q1: qOpts[1] } : {}) },
    webpush: {
      notification: {
        icon: APP_URL + "icons/icon-192.png",
        tag: replacing ? `rodada-${roundId}` : `n-${logId}`,
        renotify: replacing && !resend, // a resend only fills a gap: no second buzz
        ...(qOpts ? { actions: [{ action: "q0", title: qOpts[0] }, { action: "q1", title: qOpts[1] }] } : {}),
      },
      fcmOptions: { link },
      headers: { Urgency: "high", TTL: "21600" },
    },
  };
}

async function deliver(targets, { title, body }, path, meta = {}, ctx = {}) {
  const users = ctx.users || await loadUsers();
  const devices = ctx.devices || await loadDevices();
  const sp = spParts();
  const link = APP_URL + path;
  const now = Date.now();
  const bw = db.bulkWriter();
  const base = { at: now, kind: meta.kind || "outro", roundId: meta.roundId || null, fromUid: meta.fromUid || null, title, body,
    roundTitle: meta.roundTitle || null, emoji: meta.emoji || null };
  const logDoc = () => db.collection("notifLog").doc();
  const perUser = {};
  const msgs = [];
  const qOpts = meta.roundId && meta.quickOptions ? meta.quickOptions : null;
  const qKey = qOpts ? await quickSecret() : null;

  for (const uid of meta.mutedUids || []) {
    bw.create(logDoc(), { ...base, toUid: uid, toName: (users[uid] || {}).name || "?", status: "muted" });
  }
  for (const uid of [...new Set(targets)]) {
    const name = (users[uid] || {}).name || "?";
    if (isQuiet(users[uid], sp)) {
      perUser[uid] = "quiet";
      bw.create(logDoc(), { ...base, toUid: uid, toName: name, status: "quiet",
        note: meta.quiet === "hold" ? "vai quando acabar o horário de silêncio" : "pulado (horário de silêncio)" });
      continue;
    }
    const devs = devices[uid] || [];
    if (!devs.length) {
      perUser[uid] = "nodevice";
      bw.create(logDoc(), { ...base, toUid: uid, toName: name, status: "nodevice" });
      continue;
    }
    for (const d of devs) {
      const ref = logDoc();
      msgs.push({ ref, uid, name, d, message: buildPush({ token: d.id, logId: ref.id, uid, title, body, link,
        kind: base.kind, roundId: meta.roundId, qOpts, qKey }) });
    }
  }

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < msgs.length; i += 500) {
    const chunk = msgs.slice(i, i + 500);
    const res = await getMessaging().sendEach(chunk.map((m) => m.message));
    res.responses.forEach((r, j) => {
      const m = chunk[j];
      const code = r.error && r.error.code;
      if (r.success) { sent++; perUser[m.uid] = "sent"; } else {
        failed++;
        if (perUser[m.uid] !== "sent") perUser[m.uid] = "failed";
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          bw.delete(db.doc(`devices/${m.d.id}`));
        }
      }
      bw.create(m.ref, { ...base, link, toUid: m.uid, toName: m.name, deviceId: m.d.id, device: deviceLabel(m.d.ua), ...(qOpts ? { buttons: 2 } : {}),
        status: r.success ? "sent" : "failed", error: r.success ? null : fcmErrorText(code) });
    });
  }
  await bw.close();
  return { sent, failed, perUser };
}

const REPLACING_KINDS = ["recado", "agendado", "insistência", "recado (depois do silêncio)"];

// Things that happen to a round (created, answered, seen, closed…) for the admin Logs.
function logEvent(ev, data) {
  return db.collection("notifLog").add({ type: "event", ev, at: Date.now(), ...data }).catch((e) => console.warn("logEvent", e));
}

// Sends to a list of users; anyone in quiet hours is skipped (logged).
async function sendToUids(uids, msg, path, meta = {}, ctx = {}) {
  return deliver(uids, msg, path, { ...meta, quiet: "skip" }, ctx);
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
//   nagEveryMin (0 = never), durationHours, keep (false = vanishes after its last date),
//   schedule { on, slots: [{ d: 0-6, t: "HH:MM" }], dates: ["YYYY-MM-DD HH:MM"] } (older: { days[], time }),
//   mutedBy { uid: name }  ← server only, lastFiredKey ← server only
//
// round: copy of the template's look + recipients/participants, answers { uid: {value,name,changes,at} },
//   notified { uid: millis }, open, closesAt
// ---------------------------------------------------------------------------
const ANSWER_TYPES = ["none", "yesno", "options", "text"];

async function createRound(tplRef, tpl, owner, { users, devices, kind } = {}) {
  users ||= await loadUsers();
  devices ||= await loadDevices();
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
    delivery: {}, // uid -> { st: "sent"|"failed"|"nodevice"|"quiet", at, recv, open }
    seen: {},     // uid -> millis, written by the recipient's app
    open: true,
    closesAt: Timestamp.fromMillis(now + durationHours * 3600000),
    createdAt: FieldValue.serverTimestamp(),
  };

  // Notify now everyone not in quiet hours; the rest get it when their quiet hours end (tick).
  const ref = db.collection("rounds").doc();
  await ref.set(round);

  const msg = { title: `${round.emoji} ${round.title}`, body: round.body || `${owner.name} quer saber.` };
  const res = await deliver(recipients, msg, `?rodada=${ref.id}`,
    { kind: kind || "recado", roundId: ref.id, fromUid: tpl.ownerUid, quiet: "hold", mutedUids: pool.filter((u) => muted[u]),
      roundTitle: round.title, emoji: round.emoji, quickOptions: quickOptions(round) },
    { users, devices });
  const upd = {};
  for (const [u, st] of Object.entries(res.perUser)) {
    if (st !== "quiet") upd[`notified.${u}`] = now;
    upd[`delivery.${u}`] = { st, at: now };
  }
  if (Object.keys(upd).length) await ref.update(upd);
  await logEvent("created", { at: now - 1, roundId: ref.id, roundTitle: round.title, emoji: round.emoji,
    actorUid: tpl.ownerUid, actorName: owner.name, count: recipients.length, scheduled: kind === "agendado" });
  const delayed = Object.values(res.perUser).filter((x) => x === "quiet").length;
  return { id: ref.id, recipients: recipients.length, delayed, sent: res.sent, failed: res.failed };
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

// The sender joins their own open question ("também responder" on the card).
handlers.joinRound = async (req) => {
  const auth = requireAuth(req);
  const ref = db.doc(`rounds/${String((req.data && req.data.roundId) || "")}`);
  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Isso não existe mais.");
    const r = snap.data();
    if (r.ownerUid !== auth.uid) throw new HttpsError("permission-denied", "Só quem mandou pode entrar assim.");
    if (!r.open) throw new HttpsError("failed-precondition", "Já encerrou.");
    if (r.answerType === "none") throw new HttpsError("failed-precondition", "Isso é só um aviso.");
    if (r.recipients.includes(auth.uid)) return;
    t.update(ref, { recipients: FieldValue.arrayUnion(auth.uid), participants: FieldValue.arrayUnion(auth.uid), ownerJoined: true });
  });
  return { ok: true };
};

// One answer, from the app or from a notification button.
async function applyAnswer(uid, me, roundId, rawValue, via = "app") {
  let value = typeof rawValue === "string" ? rawValue.trim() : "";
  const ref = db.doc(`rounds/${roundId}`);
  const { round, changes } = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Isso não existe mais.");
    const round = snap.data();
    if (!round.recipients.includes(uid)) throw new HttpsError("permission-denied", "Não perguntaram pra você. 💅");
    if (!round.open) throw new HttpsError("failed-precondition", "Já encerrou. Chegou tarde.");
    if (round.answerType === "none") throw new HttpsError("failed-precondition", "Isso é só um aviso.");
    if (round.answerType === "text") {
      if (!value) throw new HttpsError("invalid-argument", "Escreve alguma coisa.");
      value = value.slice(0, 200);
    } else if (!round.options.includes(value)) {
      throw new HttpsError("invalid-argument", "Opção inválida.");
    }
    const prev = round.answers && round.answers[uid];
    if (prev && prev.value === value) throw new HttpsError("already-exists", "Você já respondeu isso. 😉");
    const changes = prev ? (prev.changes || 0) + 1 : 0;
    t.update(ref, { [`answers.${uid}`]: { value, name: me.name, gender: me.gender, changes, at: Date.now() } });
    return { round, changes };
  });

  const vars = { name: me.name, gender: me.gender };
  const msg = {
    title: `${round.emoji} ${round.title}`,
    body: changes
      ? `${me.name} mudou pra: ${value} (${changes}ª vez) — ${fill(pick(COPY.changedTail), vars)}`
      : `${me.name}: ${value} — ${fill(pick(COPY.answerTail), vars)}`,
  };
  const targets = round.visibility === "all"
    ? round.participants.filter((u) => u !== uid)
    : [round.ownerUid].filter((u) => u !== uid);
  await logEvent("answer", { roundId, roundTitle: round.title, emoji: round.emoji, actorUid: uid, actorName: me.name, value, changes,
    ...(via !== "app" ? { via } : {}) });
  await sendToUids(targets, msg, `?rodada=${roundId}`, { kind: changes ? "mudou de ideia" : "resposta", roundId, fromUid: uid,
    roundTitle: round.title, emoji: round.emoji });
  return { ok: true, changes, value };
}

handlers.answerRound = async (req) => {
  const auth = requireAuth(req);
  const me = await profile(auth);
  return applyAnswer(auth.uid, me, req.data && String(req.data.roundId || ""), req.data && req.data.value);
};

// "Visto": the recipient's app reports the round is on screen (first time only).
handlers.seenRound = async (req) => {
  const auth = requireAuth(req);
  const ref = db.doc(`rounds/${String((req.data && req.data.roundId) || "")}`);
  const first = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists || !snap.get("recipients").includes(auth.uid)) return null;
    if (snap.get(`seen.${auth.uid}`)) return null;
    t.update(ref, { [`seen.${auth.uid}`]: Date.now() });
    return snap.data();
  });
  if (first) {
    const me = await profile(auth);
    await logEvent("seen", { roundId: ref.id, roundTitle: first.title, emoji: first.emoji, actorUid: auth.uid, actorName: me.name });
  }
  return { ok: true };
};

handlers.closeRound = async (req) => {
  const auth = requireAuth(req);
  const ref = db.doc(`rounds/${String((req.data && req.data.roundId) || "")}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Isso não existe mais.");
  if (snap.get("ownerUid") !== auth.uid) throw new HttpsError("permission-denied", "Só quem criou pode encerrar.");
  await ref.update({ open: false });
  await logEvent("closed", { roundId: ref.id, roundTitle: snap.get("title"), emoji: snap.get("emoji"), actorUid: auth.uid,
    actorName: snap.get("ownerName") });
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
  await logEvent(mute ? "muted" : "unmuted", { roundTitle: tpl.title, emoji: tpl.emoji || "🔔", actorUid: auth.uid, actorName: me.name });
  if (tpl.ownerUid !== auth.uid) {
    await sendToUids([tpl.ownerUid], message(mute ? "muted" : "unmuted", { name: me.name, gender: me.gender, title: tpl.title }), "",
      { kind: mute ? "silenciou" : "reativou", fromUid: auth.uid });
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
  const [users, devices] = await Promise.all([loadUsers(), loadDevices()]);

  // 1) Scheduled templates: weekly slots { d, t } and one-off dates "YYYY-MM-DD HH:MM" (Brasília).
  //    Each fires within 60 min after its time, once. One-offs are removed after firing (or when
  //    missed); a recado saved with keep:false disappears after its last date.
  const scheduled = await db.collection("templates").where("schedule.on", "==", true).get();
  const nowKey = `${sp.key} ${sp.hm}`;
  const inWindow = (t) => { const diff = nowMin - toMin(t); return diff >= 0 && diff <= 60; };
  for (const doc of scheduled.docs) {
    const tpl = doc.data();
    const s = tpl.schedule || {};
    const legacy = !Array.isArray(s.slots);
    const slots = legacy ? (Array.isArray(s.days) && s.time ? s.days.map((d) => ({ d, t: s.time })) : []) : s.slots;
    const fired = tpl.firedKeys || {};
    const dueSlots = slots.filter((x) => x.d === sp.weekday && x.t && inWindow(x.t)
      && fired[`${x.d}-${x.t}`] !== sp.key && !(legacy && tpl.lastFiredKey === sp.key));
    const dates = Array.isArray(s.dates) ? s.dates : [];
    const dueDates = dates.filter((x) => x.slice(0, 10) === sp.key && inWindow(x.slice(11)));
    const remaining = dates.filter((x) => !dueDates.includes(x) && x > nowKey);
    const stillOn = slots.length > 0 || remaining.length > 0;
    const vanish = tpl.keep === false && !stillOn;
    if (!dueSlots.length && !dueDates.length) {
      // Clean up dates that were missed (e.g. while the server was down).
      if (remaining.length !== dates.length) {
        if (vanish) await doc.ref.delete();
        else await doc.ref.update({ "schedule.dates": remaining, "schedule.on": stillOn });
      }
      continue;
    }
    const upd = { lastFiredKey: sp.key, "schedule.dates": remaining, "schedule.on": stillOn };
    for (const x of dueSlots) upd[`firedKeys.${x.d}-${x.t}`] = sp.key;
    await doc.ref.update(upd);
    const owner = users[tpl.ownerUid] || {};
    try {
      await createRound(doc.ref, tpl, { name: owner.name || "Alguém", gender: owner.gender || "m" }, { users, devices, kind: "agendado" });
    } catch (e) {
      console.warn("scheduled fire skipped", doc.id, e.message);
    }
    if (vanish) await doc.ref.delete();
  }

  // 2) Open rounds: close, deliver delayed, nag.
  const open = await db.collection("rounds").where("open", "==", true).get();
  // Read every template these rounds need in one batch.
  const tplIds = [...new Set(open.docs.map((d) => d.get("templateId")).filter(Boolean))];
  const tplDocs = tplIds.length ? await db.getAll(...tplIds.map((id) => db.doc(`templates/${id}`))) : [];
  const mutedByTemplate = Object.fromEntries(tplDocs.filter((d) => d.exists).map((d) => [d.id, d.get("mutedBy") || {}]));
  for (const doc of open.docs) {
    const r = doc.data();
    if (r.closesAt && r.closesAt.toMillis() <= now) {
      await doc.ref.update({ open: false });
      await logEvent("expired", { roundId: doc.id, roundTitle: r.title, emoji: r.emoji, actorUid: r.ownerUid, actorName: r.ownerName });
      continue;
    }

    const muted = mutedByTemplate[r.templateId] || {};
    const updates = {};
    for (const u of r.recipients) {
      if (muted[u] || (r.answers && r.answers[u]) || isQuiet(users[u], sp)) continue;
      if (u === r.ownerUid && r.ownerJoined) continue; // joined their own question from the card: no nagging
      const last = r.notified && r.notified[u];
      let msg = null;
      let kind = "insistência";
      if (!last) {
        msg = { title: `${r.emoji} ${r.title}`, body: r.body || `${r.ownerName} quer saber.` };
        kind = "recado (depois do silêncio)";
      } else if (r.nagEveryMin > 0 && now - last >= r.nagEveryMin * 60000 - 30000) {
        msg = { title: `${r.emoji} ${r.title}`,
          body: fill(pick(COPY.nag), { owner: r.ownerName, name: (users[u] || {}).name || "", gender: (users[u] || {}).gender }) };
      }
      if (!msg) continue;
      const res = await deliver([u], msg, `?rodada=${doc.id}`,
        { kind, roundId: doc.id, fromUid: r.ownerUid, quiet: "hold", roundTitle: r.title, emoji: r.emoji, quickOptions: quickOptions(r) }, { users, devices });
      updates[`notified.${u}`] = now;
      if (!last) updates[`delivery.${u}`] = { st: res.perUser[u] || "failed", at: now };
    }
    if (Object.keys(updates).length) await doc.ref.update(updates);
  }

  // 3) Forget log entries older than LOG_DAYS.
  const old = await db.collection("notifLog").where("at", "<", now - LOG_DAYS * 86400000).limit(400).get();
  if (!old.empty) {
    const bw = db.bulkWriter();
    old.docs.forEach((d) => bw.delete(d.ref));
    await bw.close();
  }

  // 3b) Resend what the phone hasn't confirmed: no "arrived" after 10 min → send again (max 2x).
  //     Same tag, no second buzz: if it was there it's quietly replaced, if it was lost it shows up.
  try {
    const recent = await db.collection("notifLog").where("at", ">=", now - 50 * 60000).get();
    const roundCache = {};
    const getRound = async (id) => (id in roundCache ? roundCache[id] : (roundCache[id] = (await db.doc(`rounds/${id}`).get()).data() || null));
    const todo = [];
    for (const d of recent.docs) {
      const e = d.data();
      if (e.type === "event" || e.status !== "sent" || e.receivedAt || e.kind === "teste" || !e.deviceId) continue;
      if ((e.retries || 0) >= 2 || now - (e.lastTry || e.at) < 10 * 60000) continue;
      if (e.roundId && REPLACING_KINDS.includes(e.kind)) {
        const r = await getRound(e.roundId);
        if (!r || !r.open || (r.answers && r.answers[e.toUid])) continue; // nothing left to ask
      }
      if (!(devices[e.toUid] || []).some((x) => x.id === e.deviceId)) continue;
      const r = e.roundId ? await getRound(e.roundId) : null;
      const qOpts = r && REPLACING_KINDS.includes(e.kind) ? quickOptions(r) : null;
      todo.push({ ref: d.ref, e, message: buildPush({ token: e.deviceId, logId: d.id, uid: e.toUid, title: e.title || "", body: e.body || "",
        link: e.link || (e.roundId ? `${APP_URL}?rodada=${e.roundId}` : APP_URL), kind: e.kind, roundId: e.roundId,
        qOpts, qKey: qOpts ? await quickSecret() : null, resend: true }) });
    }
    if (todo.length) {
      const res = await getMessaging().sendEach(todo.map((x) => x.message));
      const bw = db.bulkWriter();
      res.responses.forEach((r, i) => {
        const { ref, e } = todo[i];
        const code = r.error && r.error.code;
        bw.update(ref, { retries: (e.retries || 0) + 1, lastTry: now, ...(r.success ? {} : { retryError: fcmErrorText(code) }) });
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") bw.delete(db.doc(`devices/${e.deviceId}`));
      });
      await bw.close();
    }
  } catch (e) { console.warn("resend", e.message); }

  // 4) Heartbeat for Admin → Backend (one small write per run).
  try {
    const fresh = await db.collection("templates").where("schedule.on", "==", true).get();
    await db.doc("meta/backend").set({
      lastTick: now, tickMs: Date.now() - now, build: BUILD,
      counts: { users: Object.keys(users).length, devices: Object.values(devices).reduce((n, l) => n + l.length, 0),
        scheduled: fresh.size, open: open.size },
      next: upcomingSends(fresh.docs, users, 3),
    });
  } catch (e) { console.warn("heartbeat", e.message); }
});

// ---------------------------------------------------------------------------
// Admin → Backend: what's deployed, the next sends, today's activity and real Firebase usage.
// ---------------------------------------------------------------------------
let BUILD = {};
try { BUILD = require("./build.json"); } catch { /* written by the deploy workflow */ }
const PROJECT = process.env.GCLOUD_PROJECT || (JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId);

// Next sends across all scheduled recados (Brasília keys "YYYY-MM-DD HH:MM").
function upcomingSends(docs, users, n) {
  const nowSp = spParts();
  const nowKey = `${nowSp.key} ${nowSp.hm}`;
  const days = Array.from({ length: 8 }, (_, k) => spParts(new Date(Date.now() + k * 86400000)));
  const out = [];
  for (const doc of docs) {
    const t = doc.data(), s = t.schedule || {};
    const slots = Array.isArray(s.slots) ? s.slots : (Array.isArray(s.days) && s.time ? s.days.map((d) => ({ d, t: s.time })) : []);
    const cands = (s.dates || []).filter((x) => x > nowKey);
    for (const day of days) for (const x of slots) if (x.d === day.weekday) cands.push(`${day.key} ${x.t}`);
    const next = cands.filter((x) => x > nowKey).sort()[0];
    if (next) out.push({ when: next, title: t.title || "", emoji: t.emoji || "🔔", owner: (users[t.ownerUid] || {}).name || "?" });
  }
  return out.sort((a, b) => (a.when < b.when ? -1 : 1)).slice(0, n);
}

// Sum of a Cloud Monitoring metric over [start, end] (needs "Monitoring Viewer" on the functions' account).
async function metricSum(type, startMs, endMs) {
  const tok = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }).then((r) => r.json());
  const secs = Math.max(60, Math.round((endMs - startMs) / 1000));
  const q = new URLSearchParams({
    filter: `metric.type="${type}"`,
    "interval.startTime": new Date(startMs).toISOString(), "interval.endTime": new Date(endMs).toISOString(),
    "aggregation.alignmentPeriod": `${secs}s`, "aggregation.perSeriesAligner": "ALIGN_SUM",
    "aggregation.crossSeriesReducer": "REDUCE_SUM",
  });
  const res = await fetch(`https://monitoring.googleapis.com/v3/projects/${PROJECT}/timeSeries?${q}`,
    { headers: { Authorization: `Bearer ${tok.access_token}` } });
  if (res.status === 403) { const e = new Error("permission"); e.code = 403; throw e; }
  if (!res.ok) throw new Error(`monitoring ${res.status}`);
  const body = await res.json();
  let sum = 0;
  for (const ts of body.timeSeries || []) for (const pt of ts.points || []) sum += Number(pt.value.int64Value ?? pt.value.doubleValue ?? 0);
  return sum;
}
async function readUsage() {
  const sp = spParts();
  const end = Date.now();
  const dayStart = Date.parse(`${sp.key}T00:00:00-03:00`);
  const monthStart = Date.parse(`${sp.key.slice(0, 7)}-01T00:00:00-03:00`);
  const pick = async (types, start) => {
    for (const t of types) { const v = await metricSum(t, start, end); if (v) return v; }
    return 0;
  };
  const M = {
    reads: ["firestore.googleapis.com/document/read_ops_count", "firestore.googleapis.com/document/read_count"],
    writes: ["firestore.googleapis.com/document/write_ops_count", "firestore.googleapis.com/document/write_count"],
    deletes: ["firestore.googleapis.com/document/delete_ops_count", "firestore.googleapis.com/document/delete_count"],
    runs: ["run.googleapis.com/request_count"],
  };
  const today = {}, month = {};
  for (const [k, types] of Object.entries(M)) { today[k] = await pick(types, dayStart); month[k] = await pick(types, monthStart); }
  const [y, m] = sp.key.split("-").map(Number);
  return { ok: true, at: end, today, month, dayOfMonth: Number(sp.key.slice(8)), daysInMonth: new Date(y, m, 0).getDate() };
}

handlers.adminBackend = async (req) => {
  await requireAdmin(req);
  const sp = spParts();
  const dayStart = Date.parse(`${sp.key}T00:00:00-03:00`);
  // Real usage, cached 30 min (or on "atualizar").
  const uRef = db.doc("meta/usage");
  let usage = (await uRef.get()).data() || null;
  if (!usage || (req.data && req.data.refresh) || Date.now() - (usage.at || 0) > 30 * 60000) {
    try { usage = await readUsage(); } catch (e) { usage = { ok: false, at: Date.now(), reason: e.code === 403 ? "permission" : e.message }; }
    await uRef.set(usage);
  }
  // Today's activity from the notification log (small: one family's day).
  const [logSnap, rounds7, roundsToday, users, devices] = await Promise.all([
    db.collection("notifLog").where("at", ">=", dayStart).select("status", "type", "ev", "deviceId", "toName").get(),
    db.collection("rounds").where("createdAt", ">=", Timestamp.fromMillis(dayStart - 6 * 86400000)).count().get(),
    db.collection("rounds").where("createdAt", ">=", Timestamp.fromMillis(dayStart)).count().get(),
    db.collection("users").select("name").get(), db.collection("devices").select("uid").get(),
  ]);
  const a = { sent: 0, failed: 0, quiet: 0, nodevice: 0, muted: 0, answers: 0 };
  const failedPhones = new Set();
  for (const d of logSnap.docs) {
    const x = d.data();
    if (x.type === "event") { if (x.ev === "answer") a.answers++; continue; }
    if (x.status in a) a[x.status]++;
    if (x.status === "failed") failedPhones.add(x.toName || "?");
  }
  const withPhone = new Set(devices.docs.map((d) => d.get("uid")));
  let principal = null;
  if (!usage.ok) {
    try {
      const num = await fetch("http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id",
        { headers: { "Metadata-Flavor": "Google" } }).then((r) => r.text());
      principal = `${num.trim()}-compute@developer.gserviceaccount.com`;
    } catch { /* shown generically */ }
  }
  return {
    usage, principal, project: PROJECT,
    activity: { ...a, roundsToday: roundsToday.data().count, rounds7: rounds7.data().count, failedPhones: [...failedPhones],
      noPhone: users.docs.filter((d) => !withPhone.has(d.id)).map((d) => d.get("name") || "(sem apelido)") },
  };
};

// ---------------------------------------------------------------------------
// Receipts: the phone's service worker calls this when a notification arrives
// (e=recv) or is tapped (e=open). The id is the unguessable log id it came with.
// ---------------------------------------------------------------------------
// Notification button → answer. Body (text/plain JSON): { r: roundId, u: uid, t: key, i: 0|1 }.
exports.quick = onRequest({ region: REGION, maxInstances: 3, memory: "256MiB", cors: true }, async (req, res) => {
  const out = (code, body) => res.status(code).json(body);
  if (req.method !== "POST") return out(405, { ok: false });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch { return out(400, { ok: false }); }
  const roundId = String((b && b.r) || ""), uid = String((b && b.u) || ""), tok = String((b && b.t) || "");
  const i = Number(b && b.i);
  if (!/^[A-Za-z0-9]{1,40}$/.test(roundId) || !/^[A-Za-z0-9]{1,128}$/.test(uid) || !tok || ![0, 1].includes(i)) return out(400, { ok: false });
  const want = Buffer.from(quickToken(await quickSecret(), roundId, uid));
  const got = Buffer.from(tok);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return out(403, { ok: false, msg: "Chave inválida." });
  try {
    const snap = await db.doc(`rounds/${roundId}`).get();
    if (!snap.exists) return out(200, { ok: false, msg: "Essa pergunta não existe mais." });
    const value = (snap.get("options") || [])[i];
    const uSnap = await db.doc(`users/${uid}`).get();
    const u = uSnap.exists ? uSnap.data() : {};
    const r = await applyAnswer(uid, { name: u.name || "Alguém", gender: u.gender || "m" }, roundId, value, "notificação");
    return out(200, { ok: true, value: r.value });
  } catch (e) {
    if (e.code === "already-exists") return out(200, { ok: true, value: (b && b.v) || "" , same: true });
    return out(200, { ok: false, msg: e.message || "Não deu." });
  }
});

exports.receipt = onRequest({ region: REGION, maxInstances: 3, memory: "256MiB", cors: true }, async (req, res) => {
  const id = String(req.query.id || "");
  const e = req.query.e === "open" ? "open" : "recv";
  if (!/^[A-Za-z0-9]{20}$/.test(id)) { res.status(400).end(); return; }
  const ref = db.doc(`notifLog/${id}`);
  try {
    const now = Date.now();
    const out = await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) return null;
      const upd = {};
      // The phone sends the real moment (t) — it may report late, e.g. after the screen was locked.
      const tPhone = Number(req.query.t);
      const when = tPhone && tPhone >= (snap.get("at") || 0) - 60000 && tPhone <= now + 60000 ? Math.min(tPhone, now) : now;
      if (!snap.get("receivedAt")) upd.receivedAt = when; // a tap also proves it arrived
      // Diagnostics from the phone: buttons in the payload it got, and how many its browser shows.
      if (e === "recv" && req.query.a !== undefined && snap.get("phoneButtons") === undefined) {
        upd.phoneButtons = Math.min(9, Number(req.query.a) || 0);
        upd.phoneMaxButtons = Math.min(9, Number(req.query.m) || 0);
      }
      if (e === "open" && !snap.get("openedAt")) upd.openedAt = when;
      if (Object.keys(upd).length) t.update(ref, upd);
      return { log: snap.data(), upd };
    });
    if (out && Object.keys(out.upd).length) {
      const { log, upd } = out;
      const writes = [];
      if (log.deviceId) writes.push(db.doc(`devices/${log.deviceId}`).update({ lastRecv: now }).catch(() => {}));
      if (log.roundId && log.toUid) {
        const r = {};
        if (upd.receivedAt) r[`delivery.${log.toUid}.recv`] = now;
        if (upd.openedAt) r[`delivery.${log.toUid}.open`] = now;
        writes.push(db.doc(`rounds/${log.roundId}`).update(r).catch(() => {}));
      }
      await Promise.all(writes);
    }
    res.status(204).end();
  } catch (err) {
    console.error("receipt", err);
    res.status(500).end();
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
  return deliver([auth.uid], { title: "Teste ☕", body: "Se você tá lendo isso, as notificações funcionam." }, "", { kind: "teste", fromUid: auth.uid });
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

// Admin sets someone's "letra grande".
handlers.adminSetUserFlag = async (req) => {
  await requireAdmin(req);
  const uid = String((req.data && req.data.uid) || "");
  const key = req.data && req.data.key;
  if (!["bigText"].includes(key)) throw new HttpsError("invalid-argument", "Opção inválida.");
  const ref = db.doc(`users/${uid}`);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Pessoa não encontrada.");
  await ref.update({ [key]: !!(req.data && req.data.value) });
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
