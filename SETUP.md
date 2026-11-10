# Ela gosta de sorvete? 🍦

Family nag app (pt-BR UI). Features:
- **Chamados:** personal saved notifications. Each has a look (emoji/title/text), answer type (none, Sim/Não, options, free text), recipients, who sees answers, nagging (every X min for Y hours), mute permission, and a trigger (button or weekly schedule).
- **Rounds:** each firing creates a round; answers are live, changes are announced ("mudou de ideia, 2ª vez"), creators see who muted their chamados.
- **Quiet hours:** per person, off by default. Questions wait; answer broadcasts are skipped.
- **Home:** pinned favorite chamados on top, then Feed / Chamados tabs. Schedules use 15-minute steps (the server checks every 15 min).
- **Occasions & palettes (config/fun):** date rules (12-25, fri-13, 2sun-05, lastfri-11, easter-47, 12-20..12-31, comma = OR) that force a palette, emoji decor, banner, confetti/snow and the footer version for everyone. Preview any with `?ocasiao=<id>`. Users pick a palette in Configurações.
- **Admin tab** (admins only): tools, people (make/remove admins), palettes and occasions editors with preview, drawings gallery + SVG upload (stored in Firestore `decor/{name}`), version & texts.
- **Styled names:** each user picks color, font, effect and badge; everyone sees it.
- **Gendered copy:** each user picks menino/menina at onboarding.

Data: `users/{uid}` (name, gender, quiet, style, mutes, admin), `templates/{id}`, `rounds/{id}`, `devices/{token}`.
Functions: `fireTemplate`, `answerRound`, `closeRound`, `muteTemplate`, admin tools, and `tick` (every 15 min: scheduled chamados, delayed deliveries, nagging, closing).

## How it fits together

| Part | Where | Deploys |
|---|---|---|
| Website (`web/`) | GitHub Pages | Automatically on push (`.github/workflows/pages.yml`) |
| Login | Firebase Auth (email/password) | Accounts created by hand in the Firebase console |
| Device list | Firestore `devices` collection | – |
| Sending pushes | Cloud Functions (`functions/`) | Automatically on push (`.github/workflows/firebase.yml`) |

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
7. **GitHub Pages.** In repo Settings → Pages → Source: **GitHub Actions**.

## Using it

- **Android / desktop:** open the site, log in, then tap **Enable notifications**.
- **iPhone (iOS 16.4+):** open the site in Safari, tap Share → **Add to Home Screen**, open it *from the Home Screen*, log in, then tap **Enable notifications**.

## Editing from your phone

Edit any file on github.com (or press `.` in the repo for the web editor) and commit to `main`. The workflows republish automatically, and you can watch progress in the **Actions** tab.
