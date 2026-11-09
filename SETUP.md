# The Button 🔴

One big red button. Press it and every logged-in family device gets a (sassy) notification.

## How it fits together

| Part | Where | Deploys |
|---|---|---|
| Website (`web/`) | GitHub Pages | Automatically on push (`.github/workflows/pages.yml`) |
| Login | Firebase Auth (email/password) | Accounts created by hand in the Firebase console |
| Device list | Firestore `devices` collection | – |
| Sending pushes | Cloud Function `ring` (`functions/`) | Automatically on push (`.github/workflows/firebase.yml`) |

## One-time setup

1. **Firebase project.** Create it at console.firebase.google.com and switch to the **Blaze** plan (needed for Cloud Functions; a family button stays within the free allowance). Set a budget alert of $1.
2. **Web app.** In Project settings → General → Add app → Web. Copy the config into `web/firebase-config.js`.
3. **Web Push key.** In Project settings → Cloud Messaging → Web configuration → Generate key pair. Copy the public key into `VAPID_KEY` in `web/firebase-config.js`.
4. **Auth.** In Build → Authentication → Get started → enable **Email/Password**. Then in Settings → User actions, turn **off** "Enable create (sign-up)". Add each family member under Users → Add user.
5. **Firestore.** In Build → Firestore Database → Create database (production mode, any region).
6. **Deploy service account** (lets GitHub deploy the function):
   - Go to Google Cloud console → IAM & Admin → Service Accounts → Create, and name it `github-deployer`.
   - Give it these roles: **Editor**, **Cloud Functions Admin**, **Cloud Run Admin**, **Service Account User**.
   - Open the account → Keys → Add key → JSON. Paste the whole file into the GitHub repo under Settings → Secrets and variables → Actions → **Secret** `FIREBASE_SERVICE_ACCOUNT`, then delete the downloaded file.
   - On the same page, add a **Variable** `FIREBASE_PROJECT_ID` = your project ID.
7. **GitHub Pages.** In repo Settings → Pages → Source: **GitHub Actions**.

## Using it

- **Android / desktop:** open the site, log in, then tap **Enable notifications**.
- **iPhone (iOS 16.4+):** open the site in Safari, tap Share → **Add to Home Screen**, open it *from the Home Screen*, log in, then tap **Enable notifications**.

## Editing from your phone

Edit any file on github.com (or press `.` in the repo for the web editor) and commit to `main`. The workflows republish automatically, and you can watch progress in the **Actions** tab.
