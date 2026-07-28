import {
  ISLAND_HEIGHT,
  FAB_RISE,
  islandBottomOffset,
  contentClearance,
} from '@/lib/islandMetrics';

describe('islandBottomOffset', () => {
  it('floats above the home indicator on inset phones', () => {
    expect(islandBottomOffset(34)).toBe(42);
  });

  it('keeps a minimum lift on inset-0 phones (SE class)', () => {
    expect(islandBottomOffset(0)).toBe(20);
  });
});

describe('contentClearance', () => {
  it('covers offset + pill + FAB rise + breathing room', () => {
    for (const inset of [0, 34]) {
      expect(contentClearance(inset)).toBe(islandBottomOffset(inset) + ISLAND_HEIGHT + FAB_RISE + 12);
    }
  });

  it('grows with the inset', () => {
    expect(contentClearance(34)).toBeGreaterThan(contentClearance(0));
  });
});
