import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/lib/AuthContext';
import { MIN_PASSWORD } from '@/lib/limits';
import { useTheme, RADIUS } from '@/theme/colors';
import { useThemeScheme } from '@/theme/ThemeContext';
import TermsAgreement, { useTermsAcceptance } from '@/components/TermsAgreement';

type Mode = 'signIn' | 'signUp';

export default function SignIn() {
  const { status, isDemo, needsOnboarding, signUp, signIn, signInWithApple, requestPasswordReset } = useAuth();
  const theme = useTheme();
  const scheme = useThemeScheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signUp' ? 'signUp' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  // Reached directly on every launch after the first, so an install that
  // passed welcome before this screen existed still gets asked exactly once.
  const terms = useTermsAcceptance();

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  if (status === 'signedIn') {
    return <Redirect href={needsOnboarding ? '/onboarding' : '/dashboard'} />;
  }

  // No explicit navigation in any of these handlers: on success they flip
  // status to 'signedIn' in AuthContext, which re-renders this component
  // into the <Redirect> above.
  // Every entry point runs this first. Apple's button is native and cannot be
  // disabled, so the check has to live inside the handler rather than in a
  // `disabled` prop, and it must be here: Apple sign-in CREATES accounts.
  const passTerms = async (): Promise<boolean> => {
    if (terms.blocked) {
      terms.flagBlocked();
      return false;
    }
    await terms.accept();
    return true;
  };

  const onApple = async () => {
    if (!(await passTerms())) return;
    setBusy(true);
    try {
      await signInWithApple();
    } catch {
      Alert.alert("Apple sign-in didn't work", 'Please try again, or use email instead.');
    } finally {
      setBusy(false);
    }
  };

  const onDemo = async () => {
    if (!(await passTerms())) return;
    setBusy(true);
    try {
      await signIn(email, password);
    } finally {
      setBusy(false);
    }
  };

  // Reuses whatever is already typed in the email field rather than adding
  // another screen. Always reports success so the response can't be used to
  // probe which addresses have accounts.
  const onForgot = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email first', 'Type your email above, then tap Forgot password.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
    } catch {
      // Swallowed for the same reason: no account-existence signal.
    } finally {
      setBusy(false);
      Alert.alert(
        'Check your email',
        `If an account exists for ${email.trim()}, we just sent a link to reset your password.`
      );
    }
  };

  const onSubmit = async () => {
    if (isDemo) return onDemo();
    if (!(await passTerms())) return;
    if (!email.trim() || !password) return;
    // Sign-up only: existing accounts with shorter passwords must still get in.
    if (mode === 'signUp' && password.length < MIN_PASSWORD) {
      Alert.alert('Password too short', `Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signUp') {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (mode === 'signUp' && /already registered/i.test(message)) {
        Alert.alert('That email is already registered', 'Try signing in instead.');
      } else if (mode === 'signIn' && /invalid login credentials/i.test(message)) {
        Alert.alert('Wrong email or password', 'Please check your details and try again.');
      } else if (mode === 'signUp' && /password/i.test(message)) {
        Alert.alert("That password won't work", message);
      } else {
        Alert.alert(
          mode === 'signUp' ? "We couldn't create your account" : "We couldn't sign you in",
          'Please check your details and try again.'
        );
      }
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
            {mode === 'signUp' ? 'Create your Contraya account' : 'Sign in to Contraya'}
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: 6 }}>
            {mode === 'signUp'
              ? 'Enter your email and choose a password.'
              : 'Enter your email and password.'}
          </Text>
        </View>

        {isDemo && (
          <View
            style={{
              backgroundColor: theme.accent,
              borderRadius: RADIUS,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: theme.foreground, fontSize: 13, textAlign: 'center' }}>
              Demo mode: tap Continue to explore with sample data.
            </Text>
          </View>
        )}

        <View style={{ marginBottom: 16 }}>
          <TermsAgreement state={terms} />
        </View>

        {appleAvailable && (
          <View style={{ marginBottom: 16, gap: 14 }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={RADIUS}
              style={{ height: 50 }}
              onPress={onApple}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          <TextInput
            style={inputStyle}
            placeholder="you@example.com"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={inputStyle}
            placeholder="Password"
            placeholderTextColor={theme.mutedForeground}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signUp' ? 'new-password' : 'password'}
            value={password}
            onChangeText={setPassword}
          />
          <Button
            label={isDemo ? 'Continue' : mode === 'signUp' ? 'Create Account' : 'Sign In'}
            busy={busy}
            dimmed={terms.blocked}
            onPress={onSubmit}
          />
          {!isDemo && mode === 'signIn' && (
            <Pressable onPress={onForgot} style={{ paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>Forgot password?</Text>
            </Pressable>
          )}
          {!isDemo && (
            <Pressable
              onPress={() => setMode((m) => (m === 'signUp' ? 'signIn' : 'signUp'))}
              style={{ padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: theme.mutedForeground }}>
                {mode === 'signUp' ? 'Already have an account? ' : 'New here? '}
                <Text style={{ color: theme.brandText, fontWeight: '600' }}>
                  {mode === 'signUp' ? 'Sign In' : 'Create Account'}
                </Text>
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// `dimmed` is not `disabled`. A blocked tap still runs onPress so the terms
// error can explain itself; a dead button would only leave the user guessing.
function Button({
  label,
  busy,
  dimmed = false,
  onPress,
}: {
  label: string;
  busy: boolean;
  dimmed?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={{
        backgroundColor: theme.primary,
        borderRadius: RADIUS,
        padding: 15,
        alignItems: 'center',
        opacity: busy || dimmed ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={theme.primaryForeground} />
      ) : (
        <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '600' }}>{label}</Text>
      )}
    </Pressable>
  );
}
