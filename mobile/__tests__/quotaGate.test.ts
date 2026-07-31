import fs from 'fs';
import path from 'path';

import { analysisGate, calendarSyncGate, chatOpenGate, chatSendGate } from '@/lib/quotaGate';
import {
  FREE_ANALYSIS_LIFETIME_LIMIT,
  PRO_MONTHLY_ANALYSES,
  PRO_MONTHLY_CHATS,
} from '@/lib/limits';

const free = { isPro: false, offeringReady: true };
const pro = { isPro: true, offeringReady: true };

describe('analysisGate', () => {
  it('allows a free user below the lifetime limit', () => {
    expect(analysisGate({ ...free, lifetime: 0, month: 0 })).toBe('allow');
    expect(analysisGate({ ...free, lifetime: FREE_ANALYSIS_LIFETIME_LIMIT - 1, month: 0 })).toBe('allow');
  });

  it('paywalls a free user at the lifetime limit', () => {
    expect(analysisGate({ ...free, lifetime: FREE_ANALYSIS_LIFETIME_LIMIT, month: 0 })).toBe('paywall');
  });

  it('treats the limit as inclusive, not exclusive', () => {
    // A `>` instead of `>=` would hand out one free analysis too many, every
    // account, forever. Cheap test, expensive bug.
    expect(analysisGate({ ...free, lifetime: FREE_ANALYSIS_LIFETIME_LIMIT, month: 0 })).not.toBe('allow');
  });

  it('FAILS OPEN for a free user at the limit when no offering is sellable', () => {
    // Deliberate: before Apple approves the app, StoreKit vends nothing, so
    // `offeringReady` is false and this is the ONLY path that runs. It is also
    // what a store outage looks like. Never "fix" this into a block — it would
    // trap users behind a paywall they cannot buy.
    expect(
      analysisGate({ isPro: false, offeringReady: false, lifetime: 999, month: 0 })
    ).toBe('allow');
  });

  it('allows a premium user below the monthly quota', () => {
    expect(analysisGate({ ...pro, lifetime: 999, month: PRO_MONTHLY_ANALYSES - 1 })).toBe('allow');
  });

  it('blocks a premium user at the monthly quota WITHOUT a paywall', () => {
    // Never upsell someone who already pays.
    expect(analysisGate({ ...pro, lifetime: 999, month: PRO_MONTHLY_ANALYSES })).toBe('quota');
  });

  it('ignores lifetime count entirely for premium users', () => {
    expect(analysisGate({ ...pro, lifetime: 10_000, month: 0 })).toBe('allow');
  });
});

describe('chat gates', () => {
  it('paywalls any non-premium user on open', () => {
    expect(chatOpenGate(free)).toBe('paywall');
  });

  it('fails open on chat when no offering is sellable', () => {
    expect(chatOpenGate({ isPro: false, offeringReady: false })).toBe('allow');
  });

  it('lets a premium user in', () => {
    expect(chatOpenGate(pro)).toBe('allow');
  });

  it('blocks a premium user at the monthly question quota', () => {
    expect(chatSendGate({ isPro: true, used: PRO_MONTHLY_CHATS - 1 })).toBe('allow');
    expect(chatSendGate({ isPro: true, used: PRO_MONTHLY_CHATS })).toBe('quota');
  });
});

describe('calendar sync gate', () => {
  it('paywalls any non-premium user', () => {
    expect(calendarSyncGate(free)).toBe('paywall');
  });

  it('lets a premium user in', () => {
    expect(calendarSyncGate(pro)).toBe('allow');
  });

  it('FAILS OPEN when no offering is sellable', () => {
    // fetchProStatus() returns false on any throw and PurchasesContext re-runs
    // it on every foreground, so an offline launch reads as "not premium". A
    // closed gate here would stop a paying user's calendar updating because a
    // plane had no signal. It must never do worse than that either: the gate
    // only ever pauses the sync, it never deletes events.
    expect(calendarSyncGate({ isPro: false, offeringReady: false })).toBe('allow');
  });
});

describe('invariants that span the client and the edge functions', () => {
  const read = (...parts: string[]) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
  const constant = (src: string, name: string): number => {
    const m = new RegExp(`const ${name}\\s*=\\s*(\\d+)`).exec(src);
    if (!m) throw new Error(`${name} not found — did it get renamed?`);
    return Number(m[1]);
  };

  it('keeps the server ceilings above the advertised product limits', () => {
    // The edge functions cannot see the RevenueCat entitlement, so their
    // ceilings are entitlement-blind abuse backstops. If a product limit is
    // ever raised past its ceiling, paying customers start hitting 429s at a
    // number lower than the one sold to them in the App Store description.
    const analysis = read('..', 'supabase', 'functions', 'analyze-contract', 'index.ts');
    const chat = read('..', 'supabase', 'functions', 'chat-contract', 'index.ts');
    expect(constant(analysis, 'ANALYSIS_CEILING')).toBeGreaterThan(PRO_MONTHLY_ANALYSES);
    expect(constant(chat, 'CHAT_CEILING')).toBeGreaterThan(PRO_MONTHLY_CHATS);
  });

  it('pins the RevenueCat entitlement identifier to "premium"', () => {
    // Hand-maintained in the RevenueCat dashboard across two repos. A drifted
    // string here means every paying user reads as free, silently.
    const src = read('src', 'lib', 'purchases.ts');
    expect(src).toMatch(/const ENTITLEMENT = 'premium';/);
  });
});
