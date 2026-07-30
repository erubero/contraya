const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  removeItem: jest.fn(async (k: string) => { mockStore.delete(k); }),
  getAllKeys: jest.fn(async () => [...mockStore.keys()]),
  multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); }),
}));

import { clearAllDrafts, clearDraft, draftKey, readDraft, writeDraft } from '@/lib/draftStore';
import { ContractDraft, DRAFT_TTL_MS, DRAFT_VERSION, encodeDraft } from '@/data/draft';

const USER = 'user-1';

const draft = (over: Partial<ContractDraft> = {}): ContractDraft => ({
  v: DRAFT_VERSION,
  userId: USER,
  savedAt: new Date().toISOString(),
  step: 'review',
  analysis: null,
  sourceKind: 'pdf',
  sourceName: 'lease.pdf',
  sourcePaths: ['user-1/abc.pdf'],
  inboxItemId: null,
  fields: {
    title: 'Apartment lease',
    type: 'lease',
    partyOther: '',
    effectiveDate: '',
    endDate: '',
    notes: '',
    dates: [],
  },
  ...over,
});

beforeEach(() => mockStore.clear());

describe('draftStore', () => {
  it('round-trips a draft through storage', async () => {
    await writeDraft(USER, draft());
    const out = await readDraft(USER);
    expect(out?.fields.title).toBe('Apartment lease');
  });

  it('returns null with no userId and writes nothing', async () => {
    await writeDraft(null, draft());
    expect(mockStore.size).toBe(0);
    expect(await readDraft(null)).toBeNull();
  });

  it('returns null and DELETES the key when the stored value is corrupt', async () => {
    mockStore.set(draftKey(USER), 'not json');
    expect(await readDraft(USER)).toBeNull();
    expect(mockStore.has(draftKey(USER))).toBe(false);
  });

  it('returns null and deletes the key when the draft has expired', async () => {
    const old = new Date(Date.now() - DRAFT_TTL_MS - 60_000).toISOString();
    mockStore.set(draftKey(USER), encodeDraft(draft({ savedAt: old }))!);
    expect(await readDraft(USER)).toBeNull();
    expect(mockStore.has(draftKey(USER))).toBe(false);
  });

  it('never hands one account another account\'s draft', async () => {
    await writeDraft(USER, draft());
    expect(await readDraft('user-2')).toBeNull();
    // And the first account's draft is untouched by the failed read.
    expect(await readDraft(USER)).not.toBeNull();
  });

  it('clearDraft removes only that account', async () => {
    await writeDraft(USER, draft());
    await writeDraft('user-2', draft({ userId: 'user-2' }));
    await clearDraft(USER);
    expect(await readDraft(USER)).toBeNull();
    expect(await readDraft('user-2')).not.toBeNull();
  });

  it('clearAllDrafts removes every draft and nothing else', async () => {
    await writeDraft(USER, draft());
    await writeDraft('user-2', draft({ userId: 'user-2' }));
    mockStore.set('contraya.themePref', 'dark');
    mockStore.set('contraya.remindersEnabled', 'true');

    await clearAllDrafts();

    expect(await readDraft(USER)).toBeNull();
    expect(await readDraft('user-2')).toBeNull();
    expect(mockStore.get('contraya.themePref')).toBe('dark');
    expect(mockStore.get('contraya.remindersEnabled')).toBe('true');
  });

  it('keys are namespaced per account under the contraya prefix', () => {
    expect(draftKey(USER)).toBe('contraya.contractDraft.user-1');
    expect(draftKey('user-2')).not.toBe(draftKey(USER));
  });
});
