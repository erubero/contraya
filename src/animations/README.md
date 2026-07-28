# Animations

Drop Lottie animation files (`.json`) in this folder and they are picked up
automatically at the next build. No code changes needed.

Used by `src/components/LottieLoader.jsx`, which plays them on loading
screens (for example while a receipt is being read). When more than one
animation is present, the loader rotates through them. If the folder is
empty, the app falls back to a plain spinner.

Tips:
- Export as **Lottie JSON** (not `.lottie` / dotLottie).
- Keep files small, ideally under 100KB each, so waits load instantly.
