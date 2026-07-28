// Geometry for the floating island tab bar. Pure math so screens and the bar
// itself agree on clearance, and so it can be unit-tested.

export const ISLAND_HEIGHT = 64; // pill content height
export const ISLAND_H_MARGIN = 16; // gap between the pill and the screen edges
export const ISLAND_RADIUS = 32; // full pill
export const FAB_SIZE = 56;
export const FAB_RISE = 18; // how far the FAB protrudes above the pill top

// Distance from the physical screen bottom to the pill's bottom edge.
// Home-indicator phones (inset 34) get 42; inset-0 phones (SE class) get 20.
export function islandBottomOffset(insetBottom: number): number {
  return Math.max(insetBottom, 12) + 8;
}

// Bottom padding a scrollable tab screen needs so its last row clears the
// floating pill (including the FAB protrusion) with breathing room. Every
// screen under the tabs layout must pad by this — the bar is absolutely
// positioned, so nothing else keeps content out from under it.
export function contentClearance(insetBottom: number): number {
  return islandBottomOffset(insetBottom) + ISLAND_HEIGHT + FAB_RISE + 12;
}
