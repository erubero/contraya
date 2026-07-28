# Animations

The canonical home for every Lottie animation in the app. Drop new `.json`
files here and wire them below.

## Slots

| Prefix | Behavior | Consumed by |
| --- | --- | --- |
| `loading-*` | Loops; one is picked at random per mount | `src/components/LottieLoader.tsx` (add each file to its `require` list) |
| `success-*` | Plays once | `src/components/SuccessCheck.tsx` |
| `celebrate-*` | Plays once | Onboarding finish (`app/onboarding.tsx`) |

Contry's search-slot animations live in `../mascot/` instead; see that folder's
README.

## Current files

- `loading-main.json`, `loading-pulse-core.json` — owner-supplied; one plays at
  random on the scan wait and the dashboard/vault first load
- `loading-contry-1.json` ... `loading-contry-4.json` — the four Contry shield
  variants (owner-supplied 2026-07-27), in the same random loading pool
- `success-check.json` — shown after a warranty saves (placeholder, swap when
  distinct Contry art exists)
- `celebrate-confetti.json` — onboarding 100% moment (placeholder, same deal)

## Replacing an animation

Overwrite a file KEEPING its exact filename and no code change is needed; the
next build bundles the new version. A new filename needs the one-line wiring
listed in the table above. Either way, run `npm test` afterwards: the
`animationAssets` guard test validates every `.json` in this folder and in
`../mascot/` so a malformed export cannot ship silently.

## Authoring rules

- Must hold: no external image references (every `assets` entry is either a
  precomp or an embedded `data:` image) and no font-dependent text layers
  (convert text to shapes). The renderer is offline.
- Preferred: shape layers only. Smallest files, crisp at every size. Shape-only
  files are best under about 15 KB; if embedded raster is unavoidable keep the
  file under about 200 KB.
- Any canvas size or aspect works (rendering is `contain`, non-square
  letterboxes); 30fps and 1 to 2.5 seconds feel right for the slots above.
- Primary brand blue is `#3B82F6` = `[0.231, 0.510, 0.965]` in Lottie color space
- Static `require` means new files also need a one-line code change in their consumer
