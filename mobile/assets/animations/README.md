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
  random on the dashboard's first load
- `success-check.json` — shown after a contract saves
- `celebrate-confetti.json` — the onboarding finish moment

The analysis wait ("Contry is reading your contract") no longer uses this pool:
it renders the `reading` mascot slot from `../mascot/` instead, which falls
back to an icon until real art is supplied.

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
- Brand lime is `#A3E635` = `[0.639, 0.902, 0.208]` in Lottie color space. Deep
  navy `#0F2060` = `[0.059, 0.125, 0.376]` is the structural counterpart. Do not
  use the old brand blue `#3B82F6`; that is Warraya's.
- Static `require` means new files also need a one-line code change in their consumer
