import type { ImageSourcePropType } from 'react-native';
import type { AnimationObject } from 'lottie-react-native';

// Contry, the contract steward — the face of search and of the analysis
// experience. The owner supplies all art; the app NEVER ships placeholder
// art. A null slot makes consumers render their icon fallback (see
// ContryFace.tsx). A slot can be a static image or a Lottie animation
// (loops, autoplay):
//   'search-idle': { kind: 'image', source: require('./search-idle.png') },
//   'search-idle': { kind: 'lottie', source: require('./contry-search-idle.json') },
// Static require means each new file needs that one-line change here.
// See README.md in this folder for slot placement and sizes.

export type MascotSlot = 'search-idle' | 'search-active' | 'search-empty' | 'reading';

export type MascotArt =
  | { kind: 'image'; source: ImageSourcePropType }
  | { kind: 'lottie'; source: string | AnimationObject | { uri: string } };

export const MASCOT: Record<MascotSlot, MascotArt | null> = {
  'search-idle': null, // header search loop button face
  'search-active': null, // leading face inside the expanded search pill
  'search-empty': null, // larger illustration on the no-results state
  reading: null, // the analysis spinner ("Contry is reading your contract")
};
