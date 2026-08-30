import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { grantAiConsent } from '@/lib/aiConsent';
import AiConsentSheet from '@/components/AiConsentSheet';

// The gate that stands in front of every path that would send a document to
// the AI provider. Guideline 5.1.2(i) wants permission BEFORE the transmission,
// so this is awaitable: a call site asks, and does not proceed until the user
// has answered.
//
// WHY THE SHEET IS NOT RENDERED HERE, which is the whole point of this file's
// shape and must not be "simplified" back:
//
// 1.0 (7) was rejected under guideline 2.1(a) because on iPad every button on
// the Add screen did nothing. The cause was this provider rendering the sheet
// itself. React Native presents a <Modal> by calling presentViewController: on
// `[modalHostView reactViewController]` -- the view controller that owns the
// spot in the tree where the Modal is MOUNTED, not the frontmost one. Mounted
// beside the <Stack> in (app)/_layout, that owner is the stack's own view
// controller, and `add` is a `presentation: 'modal'` route, so by the time the
// user can tap anything that controller is ALREADY presenting the Add screen.
// UIKit refuses to present a second thing on it, logs a warning to a console
// nobody was reading, and does nothing. The promise below never settled, the
// tap was swallowed, and every later tap hit the re-entrancy guard and
// returned false. Three dead buttons, no crash, no error.
//
// So the sheet is mounted by the screen that asks, via <AiConsentHost />. Its
// owner is then that screen's own controller, which is the frontmost one, and
// the presentation succeeds. `__tests__/aiConsentGate.test.ts` asserts at the
// source level that every screen calling ensureAiConsent also renders a host,
// because a screen that forgets is exactly the bug Apple found.
type AiConsentValue = {
  /** Resolves true only when consent is on record. False means do not send. */
  ensureAiConsent: () => Promise<boolean>;
  /** Internal: the host component reads these. Not for call sites. */
  __host: {
    register: (id: number) => void;
    unregister: (id: number) => void;
    topId: number | null;
    visible: boolean;
    busy: boolean;
    allow: () => void;
    decline: () => void;
  };
};

const AiConsentContext = createContext<AiConsentValue | null>(null);

let nextHostId = 1;

export function AiConsentProvider({ children }: { children: ReactNode }) {
  const { aiConsentGranted, setAiConsentGranted } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  // A stack, because the Add modal can sit on top of a screen that also hosts
  // one. Last mounted wins, which is the frontmost controller.
  const [hosts, setHosts] = useState<number[]>([]);
  const hostsRef = useRef<number[]>([]);
  const resolver = useRef<((granted: boolean) => void) | null>(null);

  const register = useCallback((id: number) => {
    hostsRef.current = [...hostsRef.current, id];
    setHosts(hostsRef.current);
  }, []);

  const unregister = useCallback((id: number) => {
    hostsRef.current = hostsRef.current.filter((h) => h !== id);
    setHosts(hostsRef.current);
  }, []);

  const settle = useCallback((granted: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setVisible(false);
    setBusy(false);
    resolve?.(granted);
  }, []);

  // A host disappearing mid-ask (the screen was swiped away) has to settle the
  // promise, or the caller waits forever and the guard below wedges every
  // later tap. Declining is the safe answer.
  useEffect(() => {
    if (hosts.length === 0 && resolver.current) settle(false);
  }, [hosts, settle]);

  const ensureAiConsent = useCallback((): Promise<boolean> => {
    if (aiConsentGranted) return Promise.resolve(true);
    // No host means nothing can appear on screen. Fail loudly in development
    // rather than hand back a promise that will never settle.
    if (hostsRef.current.length === 0) {
      if (__DEV__) {
        console.error(
          'ensureAiConsent() was called from a screen with no <AiConsentHost />. ' +
            'The sheet cannot be shown, so the request was declined. Render a host in this screen.'
        );
      }
      return Promise.resolve(false);
    }
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

  const decline = useCallback(() => settle(false), [settle]);

  const value = useMemo<AiConsentValue>(
    () => ({
      ensureAiConsent,
      __host: {
        register,
        unregister,
        topId: hosts.length ? hosts[hosts.length - 1] : null,
        visible,
        busy,
        allow,
        decline,
      },
    }),
    [ensureAiConsent, register, unregister, hosts, visible, busy, allow, decline]
  );

  return <AiConsentContext.Provider value={value}>{children}</AiConsentContext.Provider>;
}

/**
 * Mounts the consent sheet inside the calling screen, so it presents from that
 * screen's view controller. Every screen that calls ensureAiConsent must render
 * exactly one of these. See the note above for what happens when it does not.
 */
export function AiConsentHost() {
  const ctx = useContext(AiConsentContext);
  if (!ctx) throw new Error('AiConsentHost must be used within AiConsentProvider');
  const { register, unregister, topId, visible, busy, allow, decline } = ctx.__host;
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) idRef.current = nextHostId++;
  const id = idRef.current;

  useEffect(() => {
    register(id);
    return () => unregister(id);
  }, [id, register, unregister]);

  // Only the frontmost host draws, so two mounted screens cannot both present.
  if (topId !== id) return null;
  return <AiConsentSheet visible={visible} busy={busy} onAllow={allow} onDecline={decline} />;
}

export function useAiConsent(): AiConsentValue {
  const ctx = useContext(AiConsentContext);
  if (!ctx) throw new Error('useAiConsent must be used within AiConsentProvider');
  return ctx;
}
