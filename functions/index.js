const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// {name} is replaced with whoever pressed the button.
const SASS = [
  ["Ding. 🔔", "{name} pressed the button. Act surprised."],
  ["Hey you.", "{name} summoned you. No, they won't say why."],
  ["Drop everything.", "Or don't. But {name} pressed the button."],
  ["Attention, please 💅", "{name} demands it."],
  ["Oh look, a notification.", "Courtesy of {name}, who clearly has free time."],
  ["Breaking news 📰", "{name} discovered the button. Again."],
  ["Psst.", "{name} pushed it. You know what you did."],
  ["Not a drill 🚨", "Okay, it might be a drill. Ask {name}."],
  ["You've been buttoned.", "{name} did this. Plan your revenge."],
  ["Main character alert ✨", "{name} needs everyone to know they exist."],
  ["Knock knock.", "It's {name}. With the button. Again."],
  ["Bzzzt.", "{name} pressed the button with zero hesitation."],
  ["Hello? Is this thing on?", "{name} would like to know."],
  ["Important update", "There is none. {name} just likes the button."],
  ["🔴 The Button has spoken", "Well, {name} has. Close enough."],
  ["Mandatory fun", "{name} pressed it. Everyone's involved now."],
  ["We need to talk.", "Kidding. {name} just pushed the button."],
  ["Plot twist", "{name} pressed the button. Nobody saw it coming."],
  ["Your daily reminder", "That {name} has access to a button."],
  ["Respond immediately", "Or within a reasonable time. {name} isn't your boss."],
];

const COOLDOWN_MS = 5000;

exports.ring = onCall({ region: "us-central1", maxInstances: 3 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Log in first.");

  const db = getFirestore();
  const uid = req.auth.uid;
  const token = req.auth.token;
  const name = token.name || (token.email || "Someone").split("@")[0];

  // Simple anti-spam: one press per user every few seconds.
  const cooldownRef = db.doc(`cooldowns/${uid}`);
  await db.runTransaction(async (t) => {
    const snap = await t.get(cooldownRef);
    const now = Date.now();
    if (snap.exists && now - snap.get("at") < COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "Easy, tiger. Wait a few seconds.");
    }
    t.set(cooldownRef, { at: now });
  });

  const devices = await db.collection("devices").get();
  const tokens = devices.docs.map((d) => d.id);
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const [title, bodyTpl] = SASS[Math.floor(Math.random() * SASS.length)];
  const body = bodyTpl.replaceAll("{name}", name);

  let sent = 0;
  let failed = 0;
  const dead = [];

  // FCM allows up to 500 tokens per multicast.
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      webpush: {
        notification: { icon: "icons/icon-192.png", tag: "the-button", renotify: true },
        headers: { Urgency: "high", TTL: "3600" },
      },
    });
    res.responses.forEach((r, j) => {
      if (r.success) { sent++; return; }
      failed++;
      const code = r.error && r.error.code;
      if (code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token") {
        dead.push(batch[j]);
      }
    });
  }

  // Clean up devices that uninstalled / revoked permission.
  await Promise.all(dead.map((t) => db.collection("devices").doc(t).delete()));

  return { sent, failed };
});
