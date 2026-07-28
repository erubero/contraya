// Pure geometry for the avatar cropper. Screen-point gesture state in, a
// source-pixel crop rectangle out. The AvatarCropper renders the image at
// coverScale (smaller edge exactly fills the crop square), then applies
// transforms in the order [translateX, translateY, scale] — scale around the
// image center — which is what keeps translations in unscaled screen points
// and makes these formulas hold. The helpers marked 'worklet' also run inside
// gesture handlers on the UI thread; the directive is inert under jest.

export type CropRect = { originX: number; originY: number; width: number; height: number };

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

// Points per source pixel at gesture scale 1: the smaller image edge exactly
// covers the crop square.
export function coverScale(imageWidth: number, imageHeight: number, cropSize: number): number {
  'worklet';
  return cropSize / Math.min(imageWidth, imageHeight);
}

// Largest |translate| per axis (screen points) that keeps the image covering
// the crop square at the given gesture scale. Both are >= 0 for scale >= 1.
export function maxTranslate(
  imageWidth: number,
  imageHeight: number,
  cropSize: number,
  scale: number
): { x: number; y: number } {
  'worklet';
  const base = coverScale(imageWidth, imageHeight, cropSize);
  return {
    x: (imageWidth * base * scale - cropSize) / 2,
    y: (imageHeight * base * scale - cropSize) / 2,
  };
}

// The crop square in source-pixel coordinates. Runs on the JS thread at Save
// time with a snapshot of the shared values.
export function cropRect(p: {
  imageWidth: number;
  imageHeight: number;
  cropSize: number;
  scale: number;
  translateX: number;
  translateY: number;
}): CropRect {
  const s = coverScale(p.imageWidth, p.imageHeight, p.cropSize) * p.scale;
  const size = Math.min(Math.round(p.cropSize / s), p.imageWidth, p.imageHeight);
  const originX = clamp(
    Math.round(p.imageWidth / 2 - (p.cropSize / 2 + p.translateX) / s),
    0,
    p.imageWidth - size
  );
  const originY = clamp(
    Math.round(p.imageHeight / 2 - (p.cropSize / 2 + p.translateY) / s),
    0,
    p.imageHeight - size
  );
  return { originX, originY, width: size, height: size };
}
