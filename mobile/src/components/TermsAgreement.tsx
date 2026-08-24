import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/colors';
import { TERMS_URL, PRIVACY_URL } from '@/lib/appMeta';
import { getLocalTermsAcceptance, recordTermsAcceptance } from '@/lib/terms';
import {
  TERMS_VERSION,
  TERMS_ACCEPT_LEAD,
  TERMS_NOTE_LEAD,
  TERMS_LINK_TERMS,
  TERMS_LINK_PRIVACY,
  TERMS_REQUIRED_ERROR,
} from '@/lib/legal';

// One component owns the whole either/or, for the same reason DisclaimerNote
// does: the rule is easy to state and easy to forget at the second call site.
//
//   Show the checkbox wherever acceptance is not yet on file.
//   Once it is, show the passive line as a reminder.
//
// That covers a fresh install (ticks on welcome), an install upgrading from a
// build that already passed welcome (ticks on signin), and a returning
// signed-out user (just the reminder), with no second flow and no second copy
// of the wording.
//
// Acceptance is remembered by NOT RENDERING the checkbox, never by rendering it
// already ticked. A pre-checked box is a rejected consent pattern in its own
// right, so there is deliberately no code path that can produce one.

export type TermsAcceptance = {
  loading: boolean;
  needsAcceptance: boolean;
  checked: boolean;
  setChecked: (checked: boolean) => void;
  /** True when the caller must not proceed yet. */
  blocked: boolean;
  showError: boolean;
  /** Surfaces the inline error. For entry points that cannot be disabled. */
  flagBlocked: () => void;
  /** Persists the tick. Call it as the user proceeds, not as they tick. */
  accept: () => Promise<void>;
};

export function useTermsAcceptance(): TermsAcceptance {
  // null while the local record is being read. Treated as "needs acceptance"
  // below, so the gate is closed during the read rather than open.
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLocalTermsAcceptance().then((version) => {
      if (!cancelled) setAccepted(version !== null && version >= TERMS_VERSION);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const needsAcceptance = accepted !== true;
  const blocked = needsAcceptance && !checked;

  const accept = useCallback(async () => {
    if (needsAcceptance) await recordTermsAcceptance();
  }, [needsAcceptance]);

  return {
    loading: accepted === null,
    needsAcceptance,
    checked,
    setChecked: (next) => {
      setChecked(next);
      if (next) setShowError(false);
    },
    blocked,
    showError,
    flagBlocked: () => setShowError(true),
    accept,
  };
}

export default function TermsAgreement({ state }: { state: TermsAcceptance }) {
  const theme = useTheme();

  // Nothing during the read, so neither variant flashes before the other.
  if (state.loading) return null;

  if (!state.needsAcceptance) {
    return (
      <Text style={{ color: theme.mutedForeground, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
        {`${TERMS_NOTE_LEAD} `}
        <Links />
      </Text>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.checked }}
        accessibilityLabel={`${TERMS_ACCEPT_LEAD} ${TERMS_LINK_TERMS} and ${TERMS_LINK_PRIVACY}`}
        onPress={() => state.setChecked(!state.checked)}
        hitSlop={6}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 }}
      >
        <Ionicons
          name={state.checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={state.checked ? theme.brandText : state.showError ? theme.destructive : theme.mutedForeground}
        />
        {/* The links are nested Text with their own onPress, which consumes the
            touch, so opening the Terms does not also tick the box. */}
        <Text style={{ color: theme.foreground, fontSize: 13, lineHeight: 19, flex: 1 }}>
          {`${TERMS_ACCEPT_LEAD} `}
          <Links />
        </Text>
      </Pressable>
      {state.showError && (
        <Text style={{ color: theme.destructive, fontSize: 12, lineHeight: 17, marginLeft: 32 }}>
          {TERMS_REQUIRED_ERROR}
        </Text>
      )}
    </View>
  );
}

function Links() {
  const theme = useTheme();
  return (
    <Text>
      <Text
        accessibilityRole="link"
        onPress={() => Linking.openURL(TERMS_URL)}
        style={{ color: theme.brandText, fontWeight: '600' }}
      >
        {TERMS_LINK_TERMS}
      </Text>
      {' and '}
      <Text
        accessibilityRole="link"
        onPress={() => Linking.openURL(PRIVACY_URL)}
        style={{ color: theme.brandText, fontWeight: '600' }}
      >
        {TERMS_LINK_PRIVACY}
      </Text>
      .
    </Text>
  );
}
