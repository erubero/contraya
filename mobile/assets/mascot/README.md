# Contry mascot art

Contry is the app's steward character: he fronts the search experience ("What
should Contry find?"). All art here is owner-supplied. Until a slot is wired,
the app renders a plain icon fallback — never placeholder art.

## Slots

| Slot | Where it renders | Rendered size | Supply at least |
| --- | --- | --- | --- |
| `search-idle` | Search loop button in the screen headers | 22pt | 96 x 96 px |
| `search-active` | Leading face inside the expanded search pill | 24pt | 96 x 96 px |
| `search-empty` | No-results state on the Warranties list | 64pt | 192 x 192 px |

## Format

Each slot takes a static PNG or a Lottie `.json` (Lotties autoplay and loop):

- PNG: transparency, square canvas, supply at the sizes in the table above.
- Lottie: vector, so one file covers every rendered size; same authoring
  rules as `assets/animations/README.md` (no external images, no fonts).
- Either way keep the character within about 90% of the canvas and readable
  at 24pt: bold silhouette, minimal fine detail.

## Wiring a file

Drop the file in this folder, then set its slot in `index.ts`:

```ts
'search-idle': { kind: 'image', source: require('./search-idle.png') },
'search-idle': { kind: 'lottie', source: require('./contry-search-idle.json') },
```

Static `require` means new files always need that one-line code change —
same rule as `assets/animations/`. Run `npm test` after dropping Lottie
files; the `animationAssets` guard test validates them.
