# How the app's looks work

Four kinds of things decide how the app looks. All of them live in Firestore `config/fun`, except effects and pacotes, which are code.

| Name | What it is | Where |
|---|---|---|
| **Tema** | Colours (6), drawings, an effect or pacote, a background image. | `config/fun.palettes.<id>` · Admin → 🎨 Visual → Temas |
| **Ocasião** | A date rule + which tema + banner, version text, maldições. It looks exactly like its tema. | `config/fun.occasions.<id>` · Admin → 🎨 Visual → Ocasiões |
| **Efeito** | Decoration only: steam, bubbles, snow, confetti, sparkles, hearts. | `web/effects.js` (CSS in `style.css`) |
| **Pacote** | A big experience: restyles the app, reacts to taps, may keep state. | its own file: `web/grimdawn.js`, `web/haunted.js` |

On a normal day each person sees the tema they picked (and can turn its effect off). On an occasion day the last active occasion with a tema (sorted by só-admin, then priority) decides the whole look for everyone. Admin → 🎨 Visual → Ocasiões → 🗓️ Calendário shows which occasion wins each day and why (tap one to edit it).

## Add a tema
Admin → 🎨 Visual → Temas → ＋ Novo tema. Pick colours, drawings (bottom strip; its ＋ opens the drawing library to upload one), and in ⋯: effect or pacote, extra emojis, background image, "Só em ocasiões" (hidden from Configurações). A tema with Grim Dawn is always occasion-only.

## Add an ocasião
Admin → 🎨 Visual → Ocasiões → ＋ Nova ocasião. Set the dates, banner, version, pick the tema (or "✏️ editar este tema" / "＋ tema novo" right there), maldições if any. "Prévia" shows it on your phone only; "👑 Só admin" makes it a test the family doesn't see. Want a different look for one occasion? Make a tema for it.

## Add an efeito
1. `web/effects.js`: add a `kind === "<id>"` branch in `startEffect(layer, kind, scale, still)` (scale < 1 = the small preview in the tema editor; respect `still` = reduced motion; use `layer._fxTimer` for timers).
2. CSS for its pieces in `style.css` (next to `.snow`, `.bubble`…).
3. `web/app.js`: add `<id>: "emoji Nome"` to `EFFECTS`, and a name look for maldições in `EFFECT_LOOK`.

## Add a pacote
1. New file `web/<id>.js` that exports `pacote` with any of:
   - `back(layer)` — the scene behind the feed (skipped while a background image is on, unless `backOverImage`)
   - `front(layer, scale, still)` — what floats over the feed (also the small preview, scale < 1)
   - `tap(x, y, layer)` — taps on empty background (the app already ignores taps on buttons, links, open popups…)
   - `chip(chip, name)` — take over the name chip; return `true`
   - `start(ctx)` / `stop()` — extras while it's on and someone is signed in; `ctx = { db, uid, toast, api, isAdmin, people }`
   Put its CSS inside the file and add it when it starts (see `ensureCss` in `haunted.js`). Load other files with `new URL("x.js" + new URL(import.meta.url).search, import.meta.url)` so cache-busting follows the app version.
2. `web/app.js`: add it to `PACOTES` (`{ file, skin?, occasionOnly?, backOverImage? }`) and to `EFFECTS` (its label), plus `EFFECT_LOOK`.
3. If the server must know it's live (like Grim Dawn's gifts), use `occEffect(o, palettes)` from `functions/look.js`.

## Data changes
Never edit live data by hand for structure changes: add a step to `scripts/seed-fun.js` keyed by `configVersion` (now 18) and bump `scripts/fun-defaults.json`. It runs on the backend deploy.
