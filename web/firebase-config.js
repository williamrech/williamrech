// Firebase web config. These values are meant to be public; security comes from
// Firebase Auth + Firestore rules, not from hiding them.
// Find them in: Firebase console → Project settings → General → Your apps → Web app → Config.
self.FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.firebasestorage.app",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

// Public "Web Push certificate" key.
// Firebase console → Project settings → Cloud Messaging → Web configuration → Generate key pair.
self.VAPID_KEY = "REPLACE_ME";
