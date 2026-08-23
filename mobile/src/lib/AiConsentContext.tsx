import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { grantAiConsent } from '@/lib/aiConsent';
import AiConsentSheet from '@/components/AiConsentSheet';

// The gate that stands in front of every path that would send a document to
// the AI provider. Guideline 5.1.2(i) wants permission BEFORE the transmission,
// so this is awaitable: a call site asks, and does not proceed until the user
// has answered.
//
// One provider mounts one sheet for the whole signed-in app, rather than each
// screen owning a copy, because there are four call sites and a fifth will be
// added by whoever adds the next AI feature. `__tests__/aiConsentGate.test.ts`
// asserts at the source level that every caller of analyzeContract or
// askContract goes through here first.
type AiConsentValue = {
  /** Resolves true only when consent is on record. False means do not send. */
  ensureAiConsent: () => Promise<boolean>;
};

const AiConsentContext = createContext<AiConsentValue | null>(null);

export function AiConsentProvider({ children }: { children: ReactNode }) {
  const { aiConsentGranted, setAiConsentGranted } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((granted: boolean) => void) | null>(null);

  const settle = useCallback((granted: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setVisible(false);
    setBusy(false);
    resolve?.(granted);
  }, []);

  const ensureAiConsent = useCallback((): Promise<boolean> => {
    if (aiConsentGranted) return Promise.resolve(true);
    // Two screens cannot both be asking at once in this app, but if that ever
    // changes, the second caller must not overwrite the first one's resolver
    // and leave it hanging forever. Declining is the safe answer.
    if (resolver.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setVisible(true);
    });
  }, [aiConsentGranted]);

  const allow = useCallback(async () => {
    setBusy(true);
    try {
      await grantAiConsent();
      setAiConsentGranted(true);
      settle(true);
    } catch {
      // Fail closed, and stay open so the tap is not lost. A consent the
      // server never received is one the edge functions will refuse anyway,
      // so pretending it landed would only turn a clear message into a 403.
      setBusy(false);
      Alert.alert(
        'Contry could not save your answer',
        'Your permission has to reach the server before anything is sent. Check your connection and tap it again.'
      );
    }
  }, [settle, setAiConsentGranted]);

  const value = useMemo<AiConsentValue>(() => ({ ensureAiConsent }), [ensureAiConsent]);

  return (
    <AiConsentContext.Provider value={value}>
      {children}
      <AiConsentSheet visible={visible} busy={busy} onAllow={allow} onDecline={() => settle(false)} />
    </AiConsentContext.Provider>
  );
}

export function useAiConsent(): AiConsentValue {
  const ctx = useContext(AiConsentContext);
  if (!ctx) throw new Error('useAiConsent must be used within AiConsentProvider');
  return ctx;
}
