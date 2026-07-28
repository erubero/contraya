// Theme tokens are plain #RRGGBB hex; this is the one place that needs an
// alpha channel, for the layered-View glow effects (no expo-linear-gradient
// installed, so glows are approximated with stacked translucent circles).
export function withOpacity(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
