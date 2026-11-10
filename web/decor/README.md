# Decor drawings

Any `.svg` file in this folder can be used in a palette's or occasion's `decor` field
(in Firestore `config/fun`), mixed with emoji, separated by spaces:

    decor: "latte.svg 🎄 bean.svg"

To make a drawing **follow the palette colors**, use these instead of fixed colors:

| Variable | Typical use | Comes from |
|---|---|---|
| `var(--d-dark, #fallback)`  | deep shadows, coffee | accent mixed with black |
| `var(--d-mid, #fallback)`   | main fill            | accent |
| `var(--d-light, #fallback)` | foam, highlights     | highlight |
| `var(--d-pale, #fallback)`  | cups, plates         | text color |

Drawings with normal hex colors (like `pumpkin.svg`) keep their own colors on every palette.
Keep files small and simple: no scripts, no external images.
