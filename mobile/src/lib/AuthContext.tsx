import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase, isConfigured } from '@/api/supabase';
import { updateProfile as repoUpdateProfile } from '@/data/repo';
import {
  needsOnboarding as computeNeedsOnboarding,
  getOnboardingPending,
  backfillOnboardingComplete,
  OnboardingAnswers,
} from '@/lib/onboarding';
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
        if (isConfigured) await supabase.auth.signOut();
        setStatus('signedOut');
        setEmail(null);
        setUserId(null);
        setDisplayName(null);
        setAvatarPath(null);
        setOnboardingAnswers(null);
        setOnboardingComplete(false);
        setCreatedAt(null);
      },
    }),
    [status, email, userId, displayName, avatarPath, onboardingAnswers, needsOnboarding, localPending]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
