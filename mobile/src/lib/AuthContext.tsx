import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase, isConfigured, clearStoredSession } from '@/api/supabase';
import { updateProfile as repoUpdateProfile } from '@/data/repo';
import {
  needsOnboarding as computeNeedsOnboarding,
  getOnboardingPending,
  backfillOnboardingComplete,
  OnboardingAnswers,
} from '@/lib/onboarding';
import { hasAiConsent } from '@/lib/aiConsent';
import { hasAcceptedTerms, getLocalTermsAcceptance, stampTermsAcceptance } from '@/lib/terms';
import { TERMS_VERSION } from '@/lib/legal';
import type { ProfilePatch } from '@/api/profile';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: AuthStatus;
  email: string | null;
  userId: string | null;
  displayName: string | null;
  avatarPath: string | null;
  onboardingAnswers: OnboardingAnswers | null;
  needsOnboarding: boolean;
  isDemo: boolean;
  // Guideline 5.1.2(i): whether this account has agreed to have its documents
  // sent to the AI provider. Read here rather than from the session directly
  // because the cached session's user_metadata lags a write until the next
  // refresh, and the sheet must not re-ask somebody who just said yes.
  aiConsentGranted: boolean;
  setAiConsentGranted: (granted: boolean) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const DEMO_USER = { id: 'demo-user', email: 'demo@usecontraya.com' };

// Reads our profile fields off the Supabase auth user's metadata.
function metaOf(session: { user: { user_metadata?: Record<string, unknown> } } | null) {
  const meta = session?.user.user_metadata ?? {};
  return {
    displayName: typeof meta.display_name === 'string' ? meta.display_name : null,
    avatarPath: typeof meta.avatar_path === 'string' ? meta.avatar_path : null,
    onboardingComplete: meta.onboarding_complete === true,
    onboardingAnswers:
      typeof meta.onboarding_answers === 'object' && meta.onboarding_answers !== null
        ? (meta.onboarding_answers as OnboardingAnswers)
        : null,
    aiConsentGranted: hasAiConsent(meta),
    termsAccepted: hasAcceptedTerms(meta),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingAnswers | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [aiConsentGranted, setAiConsentGranted] = useState(false);
  // Deliberately NOT on the context value. The only screens that care are
  // welcome and signin, both of which are signed out, so the account's stamp
  // could not answer them anyway; they read the local record instead. This
  // state exists purely so the stamping effect below runs once.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localPending, setLocalPending] = useState<boolean | null>(null);

  useEffect(() => {
    // Load the mid-onboarding resume flag before anything can redirect.
    getOnboardingPending().then(setLocalPending);
    if (!isConfigured) {
      // Demo mode: sign-in is one tap, no real session.
      setStatus('signedOut');
      return;
    }
    const apply = (session: Parameters<typeof metaOf>[0] & { user: { email?: string; id: string; created_at?: string } } | null) => {
      setEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      setCreatedAt(session?.user.created_at ?? null);
      const meta = metaOf(session);
      setDisplayName(meta.displayName);
      setAvatarPath(meta.avatarPath);
      setOnboardingAnswers(meta.onboardingAnswers);
      setOnboardingComplete(meta.onboardingComplete);
      // Supabase emits USER_UPDATED after updateUser, so a grant or a revoke
      // lands here on its own. The consent sheet also sets it directly, so the
      // gate never waits on an event to stop re-asking.
      setAiConsentGranted(meta.aiConsentGranted);
      setTermsAccepted(meta.termsAccepted);
      setStatus(session ? 'signedIn' : 'signedOut');
    };
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Gate resolves only once the pending flag has loaded (see status below).
  const needsOnboarding =
    isConfigured &&
    computeNeedsOnboarding({
      onboardingComplete,
      accountCreatedAt: createdAt,
      localPending: localPending === true,
    });

  // The terms tick happens BEFORE an account exists (the user accepts on
  // welcome, then creates the account), so it lands in AsyncStorage first and
  // is stamped onto the account here, on the first signed-in render. Gated on
  // the LOCAL record so signing in on a device that never accepted stamps
  // nothing. Fire and forget, like the onboarding backfill below: the next
  // launch retries, and no metadata write is worth blocking someone's account.
  useEffect(() => {
    if (status !== 'signedIn' || termsAccepted) return;
    let cancelled = false;
    getLocalTermsAcceptance().then((version) => {
      if (cancelled || version === null || version < TERMS_VERSION) return;
      stampTermsAcceptance();
      setTermsAccepted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [status, termsAccepted]);

  // Old accounts skip onboarding; stamp them complete so the gate is
  // consistent forever after (fire and forget).
  useEffect(() => {
    if (status !== 'signedIn' || localPending === null) return;
    if (!onboardingComplete && !needsOnboarding) {
      backfillOnboardingComplete().catch(() => {});
      setOnboardingComplete(true);
    }
  }, [status, localPending, onboardingComplete, needsOnboarding]);

  const value = useMemo<AuthValue>(
    () => ({
      // Hold 'loading' until the onboarding pending flag resolves so the
      // entry redirects never guess (it resolves in milliseconds).
      status: localPending === null ? 'loading' : status,
      email,
      userId,
      displayName,
      avatarPath,
      onboardingAnswers,
      needsOnboarding,
      isDemo: !isConfigured,
      aiConsentGranted,
      setAiConsentGranted,
      signUp: async (addr, password) => {
        if (!isConfigured) {
          setStatus('signedIn');
          setEmail(DEMO_USER.email);
          setUserId(DEMO_USER.id);
          return;
        }
        // Project has email confirmation OFF (mailer_autoconfirm), so this
        // returns a live session immediately — no "check your inbox" step.
        const { error } = await supabase.auth.signUp({ email: addr, password });
        if (error) throw error;
      },
      signIn: async (addr, password) => {
        if (!isConfigured) {
          setStatus('signedIn');
          setEmail(DEMO_USER.email);
          setUserId(DEMO_USER.id);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (error) throw error;
      },
      signInWithApple: async () => {
        if (!isConfigured) {
          setStatus('signedIn');
          setEmail(DEMO_USER.email);
          setUserId(DEMO_USER.id);
          return;
        }
        // Nonce round-trip: Apple signs the hashed nonce into the identity
        // token, Supabase verifies it against the raw nonce we send it.
        const rawNonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          rawNonce
        );
        let credential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
          });
        } catch (e: unknown) {
          // User dismissed the Apple sheet — not an error worth surfacing.
          if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return;
          throw e;
        }
        if (!credential.identityToken) {
          throw new Error('Apple sign-in did not return an identity token.');
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: rawNonce,
        });
        if (error) throw error;
        // Apple only ever hands back the name on the FIRST authorization for
        // this app, so capture and save it now or it's gone for good.
        const name = [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(' ');
        if (name) {
          await repoUpdateProfile({ displayName: name });
          setDisplayName(name);
        }
      },
      // Sends the recovery email. Supabase mails a link to its own /verify
      // endpoint, which redirects to `redirectTo` with the session in the URL
      // fragment — app/reset-password.tsx picks that up. The redirect target
      // must be on the project's Redirect URL allow-list or Supabase refuses.
      requestPasswordReset: async (addr) => {
        if (!isConfigured) return;
        const { error } = await supabase.auth.resetPasswordForEmail(addr, {
          redirectTo: Linking.createURL('reset-password'),
        });
        if (error) throw error;
      },
      // Runs once the recovery link has established a session.
      completePasswordReset: async (newPassword) => {
        if (!isConfigured) return;
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      },
      // Persists profile fields (live: user_metadata; demo: in-memory) and
      // reflects them locally right away. In live mode the USER_UPDATED event
      // will also refresh from the source, which is idempotent here.
      updateProfile: async (patch) => {
        await repoUpdateProfile(patch);
        if (patch.displayName !== undefined) setDisplayName(patch.displayName);
        if (patch.avatarPath !== undefined) setAvatarPath(patch.avatarPath);
      },
      signOut: async () => {
        if (isConfigured) {
          // With an expired token and no network, signOut() errors BEFORE
          // removing the stored session; ignoring that resurrects the
          // account on the next online launch. Force-clear on any failure.
          try {
            const { error } = await supabase.auth.signOut();
            if (error) await clearStoredSession();
          } catch {
            await clearStoredSession();
          }
        }
        setStatus('signedOut');
        setEmail(null);
        setUserId(null);
        setDisplayName(null);
        setAvatarPath(null);
        setOnboardingAnswers(null);
        setOnboardingComplete(false);
        setCreatedAt(null);
        setAiConsentGranted(false);
        setTermsAccepted(false);
      },
    }),
    [status, email, userId, displayName, avatarPath, onboardingAnswers, needsOnboarding, localPending, aiConsentGranted]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
