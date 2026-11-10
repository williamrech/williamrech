// Creates config/fun with the default fun content — only if it doesn't exist yet,
// so manual edits made in the Firebase console are never overwritten.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const defaults = require("./fun-defaults.json");

initializeApp({ projectId: process.env.PROJECT_ID });
const ref = getFirestore().doc("config/fun");
ref.get().then(async (snap) => {
  if (snap.exists) { console.log("config/fun already exists — leaving it alone."); return; }
  await ref.set(defaults);
  console.log("config/fun created with defaults.");
}).catch((e) => { console.error(e); process.exit(1); });
