import * as fs from 'fs';
import * as path from 'path';
import { EMAIL_IN_ENABLED } from '@/lib/appMeta';

// Email-in is finished on both sides but its server half lives outside this
// repo and is not deployed: no INGEST_SECRET, no Cloudflare worker, no
// catch-all rule. 1.0 hides it behind one constant rather than deleting code
// (owner decision, 2026-08-09). These tests are here so flipping the constant
// back on in 1.0.1 is genuinely all it takes, and so nobody adds a second,
// ungated doorway in the meantime.

const mobile = (...p: string[]) => path.join(__dirname, '..', ...p);
const read = (f: string) => fs.readFileSync(f, 'utf8');

describe('email-in is off for 1.0', () => {
  it('the flag is off', () => {
    expect(EMAIL_IN_ENABLED).toBe(false);
  });

  it('settings is the only doorway, and it is gated', () => {
    const source = read(mobile('app', '(app)', '(tabs)', 'settings.tsx'));
    expect(source).toMatch(/EMAIL_IN_ENABLED \?/);
    // The push itself must sit inside the gate, not beside it.
    const gated = source.slice(source.indexOf('EMAIL_IN_ENABLED ?'));
    expect(gated.slice(0, 400)).toMatch(/router\.push\('\/email-in'\)/);
  });

  it('nothing else navigates to the screen', () => {
    // A second ungated entry point would put the dead address back on screen.
    const screens = fs
      .readdirSync(mobile('app', '(app)'), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.tsx') && e.name !== 'email-in.tsx')
      .map((e) => mobile('app', '(app)', e.name));
    const offenders = screens.filter(
      (f) => /'\/email-in'/.test(read(f)) && !/EMAIL_IN_ENABLED/.test(read(f))
    );
    expect(offenders).toEqual([]);
  });

  it('demo mode seeds no inbox row while it is off', () => {
    // Demo mode is what the App Store screenshots are captured in.
    const source = read(mobile('src', 'lib', 'demo.ts'));
    expect(source).toMatch(/if \(!EMAIL_IN_ENABLED\) return \[\]/);
  });

  it('the server half is still in the tree, ready for 1.0.1', () => {
    // Hidden, not ripped out. Deleting it would make turning it back on a
    // rewrite instead of a one-line change.
    expect(fs.existsSync(mobile('app', '(app)', 'email-in.tsx'))).toBe(true);
    expect(fs.existsSync(mobile('..', 'supabase', 'functions', 'ingest-email', 'index.ts'))).toBe(true);
    expect(fs.existsSync(mobile('..', 'email-worker', 'src', 'index.js'))).toBe(true);
  });
});

describe('purpose strings', () => {
  const config = () => read(mobile('app.config.ts'));
  // Comments stripped, because the config explains the template-string trap by
  // quoting it and the assertion is about settings, not prose.
  const settings = () => config().replace(/^\s*\/\/.*$/gm, '');

  it('no Apple template text survives as a value', () => {
    // "Allow $(PRODUCT_NAME) to access your ..." is expo's stock string and a
    // documented 5.1.1 flag. It reaches the plist whenever a plugin permission
    // is left unset. The generated plist would be the truer target, but ios/
    // is gitignored, so a plist assertion would silently pass on any machine
    // that has not prebuilt. The config is what actually decides the value.
    expect(settings()).not.toMatch(/Allow \$\(PRODUCT_NAME\)/);
  });

  it('the microphone key is set to real text rather than deleted', () => {
    // Deleting it risks ITMS-90683, because image-picker's native code still
    // references the audio capture APIs whether or not JS uses them.
    expect(config()).toMatch(/microphonePermission:/);
    expect(config()).not.toMatch(/microphonePermission:\s*false/);
    expect(config()).toMatch(/Contraya does not record audio/);
  });

  it('every permission the app actually uses still has a string', () => {
    const source = config();
    for (const key of ['photosPermission', 'cameraPermission', 'calendarPermission']) {
      expect(source).toMatch(new RegExp(`${key}:`));
    }
  });
});
