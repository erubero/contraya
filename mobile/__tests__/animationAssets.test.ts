import * as fs from 'fs';
import * as path from 'path';

// Guard for owner-dropped Lottie files: animations are replaced in place with
// zero code change, so this is the only gate between a malformed export and a
// blank spot in the shipped app. Validates every .json in both art folders.

const FOLDERS = [
  path.join(__dirname, '..', 'assets', 'animations'),
  path.join(__dirname, '..', 'assets', 'mascot'),
];

type LottieAsset = { layers?: unknown[]; p?: string; u?: string };
type LottieDoc = {
  v?: string;
  op?: number;
  w?: number;
  h?: number;
  layers?: unknown[];
  assets?: LottieAsset[];
  fonts?: unknown;
};

const files = FOLDERS.flatMap((dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f))
    : []
);

describe('animation assets', () => {
  it('found the animation folders', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [path.basename(f), f]))('%s is a renderable Lottie', (_name, file) => {
    const doc = JSON.parse(fs.readFileSync(file as string, 'utf8')) as LottieDoc;
    expect(doc.v).toBeTruthy();
    expect(Array.isArray(doc.layers)).toBe(true);
    expect((doc.layers ?? []).length).toBeGreaterThan(0);
    expect(doc.op ?? 0).toBeGreaterThan(0);
    // Offline renderer: every asset must be a precomp or an embedded image,
    // never an external file reference, and no font-dependent text.
    for (const asset of doc.assets ?? []) {
      const embedded = typeof asset.p === 'string' && asset.p.startsWith('data:');
      const precomp = Array.isArray(asset.layers);
      expect(precomp || embedded).toBe(true);
    }
    expect(doc.fonts).toBeUndefined();
  });
});
