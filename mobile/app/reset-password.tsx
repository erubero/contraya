import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/lib/AuthContext';
import { releaseAccountState } from '@/lib/accountHandoff';
import { MIN_PASSWORD } from '@/lib/limits';
import { parseRecoveryParams, isExpiredLinkError } from '@/lib/recoveryLink';
import { useTheme, RADIUS } from '@/theme/colors';

type Phase = 'verifying' | 'ready' | 'invalid';

export default function ResetPassword() {
  const theme = useTheme();
  const router = useRouter();
  const { completePasswordReset } = useAuth();
  const queryClient = useQueryClient();
  const url = Linking.useURL();

  const [phase, setPhase] = useState<Phase>('verifying');
  const [problem, setProblem] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  // Establish the recovery session from the link, once.
  useEffect(() => {
    if (!url || handled.current) return;
    handled.current = true;

    const { error: linkError, accessToken, refreshToken, code } = parseRecoveryParams(url);

    const run = async () => {
      if (linkError) {
        setProblem(
          isExpiredLinkError(linkError)
            ? 'That reset link has expired. Request a new one and open it right away.'
            : 'That reset link is no longer valid. Please request a new one.'
        );
        setPhase('invalid');
        return;
      }
      try {
        // Who is signed in BEFORE the link takes effect. A recovery link is a
        // sign-in, so opening one for account B while account A is signed in
        // swaps the session underneath a cache, a set of scheduled reminders
        // and a calendar that all still belong to A (audit finding 22).
        const { data: before } = await supabase.auth.getSession();
        const leaving = before.session?.user?.id ?? null;

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          setProblem('This link is missing its sign-in details. Please request a new one.');
          setPhase('invalid');
          return;
        }

        // Only on a genuine handover. Resetting your own password is the
        // common case by far, and wiping that user's draft and reminders for
        // it would be a bug of its own.
        const { data: after } = await supabase.auth.getSession();
        const arriving = after.session?.user?.id ?? null;
        if (leaving && arriving && leaving !== arriving) {
          await releaseAccountState(queryClient);
        }
        setPhase('ready');
      } catch {
        setProblem('We could not verify that reset link. Please request a new one.');
        setPhase('invalid');
      }
    };
    run();
  }, [url]);

  // Opened without a link (e.g. navigated here directly) — don't spin forever.
  useEffect(() => {
    if (url) return;
    const t = setTimeout(() => {
      if (!handled.current) {
        setProblem('Open the reset link from your email to change your password.');
        setPhase('invalid');
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [url]);

  const onSave = async () => {
    if (password.length < MIN_PASSWORD) {
      Alert.alert('Password too short', `Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      Alert.alert("Those don't match", 'Please enter the same password twice.');
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(password);
      // The recovery link already signed them in, so go straight to the app.
      Alert.alert('Password updated', 'You are signed in with your new password.');
      router.replace('/dashboard');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      Alert.alert(
        "We couldn't update your password",
        /password/i.test(message) ? message : 'Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: RADIUS,
    padding: 14,
    fontSize: 16,
    color: theme.foreground,
    backgroundColor: theme.card,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center', padding: 24 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Image
            source={require('../assets/icon.png')}
            style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 12 }}
          />
          <Text style={{ color: theme.foreground, fontSize: 22, fontWeight: '700' }}>
            Choose a new password
          </Text>
        </View>

        {phase === 'verifying' && (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={theme.brandText} />
            <Text style={{ color: theme.mutedForeground }}>Checking your reset link…</Text>
          </View>
        )}

        {phase === 'invalid' && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 15, textAlign: 'center' }}>
              {problem}
            </Text>
            <Pressable
              onPress={() => router.replace('/signin')}
              style={{
                backgroundColor: theme.primary,
                borderRadius: RADIUS,
                padding: 15,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '600' }}>
                Back to Sign In
              </Text>
            </Pressable>
          </View>
        )}

        {phase === 'ready' && (
          <View style={{ gap: 12 }}>
            <TextInput
              style={inputStyle}
              placeholder="New password"
              placeholderTextColor={theme.mutedForeground}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={inputStyle}
              placeholder="Confirm new password"
              placeholderTextColor={theme.mutedForeground}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              value={confirm}
              onChangeText={setConfirm}
            />
            <Pressable
              onPress={onSave}
              disabled={busy}
              style={{
                backgroundColor: theme.primary,
                borderRadius: RADIUS,
                padding: 15,
                alignItems: 'center',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '600' }}>
                  Save Password
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
