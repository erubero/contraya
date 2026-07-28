import { coverScale, maxTranslate, cropRect } from '@/lib/cropRect';

describe('coverScale', () => {
  it('fits the smaller edge to the crop square', () => {
    expect(coverScale(1000, 800, 300)).toBe(0.375);
    expect(coverScale(800, 1000, 300)).toBe(0.375);
    expect(coverScale(500, 500, 300)).toBe(0.6);
  });
});

describe('maxTranslate', () => {
  it('at scale 1 only the longer axis has slack', () => {
    expect(maxTranslate(1000, 800, 300, 1)).toEqual({ x: 37.5, y: 0 });
    expect(maxTranslate(500, 500, 300, 1)).toEqual({ x: 0, y: 0 });
  });

  it('zooming grows the slack on both axes', () => {
    expect(maxTranslate(1000, 800, 300, 2)).toEqual({ x: 225, y: 150 });
  });
});

describe('cropRect', () => {
  it('centered landscape, no gesture: full-height square from the middle', () => {
    expect(cropRect({ imageWidth: 1000, imageHeight: 800, cropSize: 300, scale: 1, translateX: 0, translateY: 0 }))
      .toEqual({ originX: 100, originY: 0, width: 800, height: 800 });
  });

  it('centered portrait mirrors the landscape case', () => {
    expect(cropRect({ imageWidth: 800, imageHeight: 1000, cropSize: 300, scale: 1, translateX: 0, translateY: 0 }))
      .toEqual({ originX: 0, originY: 100, width: 800, height: 800 });
  });

  it('zoomed 2x centered halves the crop window', () => {
    expect(cropRect({ imageWidth: 1000, imageHeight: 800, cropSize: 300, scale: 2, translateX: 0, translateY: 0 }))
      .toEqual({ originX: 300, originY: 200, width: 400, height: 400 });
  });

  it('dragging the image right moves the crop window to its left edge', () => {
    expect(cropRect({ imageWidth: 1000, imageHeight: 800, cropSize: 300, scale: 1, translateX: 37.5, translateY: 0 }).originX).toBe(0);
    expect(cropRect({ imageWidth: 1000, imageHeight: 800, cropSize: 300, scale: 1, translateX: -37.5, translateY: 0 }).originX).toBe(200);
  });

  it('zoom plus max pan reaches the image corner exactly', () => {
    expect(cropRect({ imageWidth: 1000, imageHeight: 800, cropSize: 300, scale: 2, translateX: 225, translateY: 150 }))
      .toEqual({ originX: 0, originY: 0, width: 400, height: 400 });
  });

  it('clamps defensively when translate exceeds the legal bounds', () => {
    expect(cropRect({ imageWidth: 1000, imageHeight: 800, cropSize: 300, scale: 1, translateX: 100, translateY: 0 }).originX).toBe(0);
    expect(cropRect({ imageWidth: 1000, imageHeight: 800, cropSize: 300, scale: 1, translateX: -100, translateY: 0 }).originX).toBe(200);
  });

  it('square source at scale 1 crops the whole image', () => {
    expect(cropRect({ imageWidth: 500, imageHeight: 500, cropSize: 300, scale: 1, translateX: 0, translateY: 0 }))
      .toEqual({ originX: 0, originY: 0, width: 500, height: 500 });
  });

  it('source smaller than the crop square never exceeds the image', () => {
    expect(cropRect({ imageWidth: 200, imageHeight: 150, cropSize: 300, scale: 1, translateX: 0, translateY: 0 }))
      .toEqual({ originX: 25, originY: 0, width: 150, height: 150 });
  });

  it('holds its invariants on ugly numbers', () => {
    const r = cropRect({ imageWidth: 1013, imageHeight: 767, cropSize: 329, scale: 1.7, translateX: 41.3, translateY: -22.8 });
    expect(r.originX).toBeGreaterThanOrEqual(0);
    expect(r.originY).toBeGreaterThanOrEqual(0);
    expect(r.originX + r.width).toBeLessThanOrEqual(1013);
    expect(r.originY + r.height).toBeLessThanOrEqual(767);
    expect(r.width).toBe(r.height);
  });
});
