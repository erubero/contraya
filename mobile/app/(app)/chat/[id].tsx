import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getContract, askContract, getChatCount } from '@/data/repo';
import { isConfigured } from '@/api/supabase';
import { ChatTurn, SUGGESTED_QUESTIONS, MAX_QUESTION_CHARS } from '@/data/chat';
import { usePurchases } from '@/lib/PurchasesContext';
import { presentPaywall } from '@/lib/purchases';
import { PRO_MONTHLY_CHATS } from '@/lib/limits';
import { useTheme, RADIUS } from '@/theme/colors';
import ContryFace from '@/components/ContryFace';

const DISCLAIMER = 'Contry explains what the contract says. It is not legal advice.';

export default function ContractChat() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isPro, offeringReady, refresh: refreshPro } = usePurchases();

  const { data: contract } = useQuery({ queryKey: ['contract-row', id], queryFn: () => getContract(id) });

  // Session-only transcript; persistence is a roadmap item.
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Chat is premium-only (fail-open when no offering exists, like every other
  // gate). Asked once on open; declining returns to the contract.
  const gated = useRef(false);
  useEffect(() => {
    if (gated.current || !isConfigured) return;
    if (!isPro && offeringReady) {
      gated.current = true;
      (async () => {
        const bought = await presentPaywall();
        await refreshPro();
        if (!bought) router.back();
      })();
    }
  }, [isPro, offeringReady, refreshPro, router]);

  useEffect(() => {
    getChatCount().then(setMonthCount).catch(() => {});
  }, []);

  const send = async (raw: string) => {
    const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
    if (!question || busy) return;
    if (isPro && monthCount + asked >= PRO_MONTHLY_CHATS) {
      Alert.alert(
        'Monthly limit reached',
        `Your plan covers ${PRO_MONTHLY_CHATS} questions a month. The counter resets on the 1st.`
      );
      return;
    }
    setInput('');
    const history = turns;
    setTurns((t) => [...t, { role: 'user', content: question }]);
    setBusy(true);
    try {
      const answer = await askContract(id, question, history);
      setTurns((t) => [...t, { role: 'assistant', content: answer }]);
      setAsked((n) => n + 1);
    } catch {
      setTurns((t) => t.slice(0, -1));
      setInput(question);
      Alert.alert("Contry couldn't answer", 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Keep the newest message in view.
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [turns.length, busy]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Pinned disclaimer: every chat surface carries it, always visible. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: theme.accent,
        }}
      >
        <Ionicons name="information-circle-outline" size={16} color={theme.mutedForeground} />
        <Text style={{ flex: 1, color: theme.mutedForeground, fontSize: 12 }}>{DISCLAIMER}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {contract && (
          <Text style={{ color: theme.mutedForeground, fontSize: 13, textAlign: 'center' }}>
            Asking about "{contract.title}"
          </Text>
        )}

        {turns.length === 0 && !busy && (
          <View style={{ alignItems: 'center', gap: 14, paddingVertical: 24 }}>
            <ContryFace slot="search-idle" size={56} fallbackIcon="chatbubble-ellipses-outline" color={theme.primary} />
            <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              Ask Contry about this contract
            </Text>
            <View style={{ gap: 8, alignSelf: 'stretch' }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => send(q)}
                  style={{
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: RADIUS,
                    backgroundColor: theme.card,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {turns.map((t, i) => (
          <View
            key={i}
            style={{
              alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              backgroundColor: t.role === 'user' ? theme.primary : theme.card,
              borderColor: theme.border,
              borderWidth: t.role === 'user' ? 0 : 1,
              borderRadius: RADIUS,
              padding: 12,
            }}
          >
            <Text
              style={{
                color: t.role === 'user' ? theme.primaryForeground : theme.foreground,
                fontSize: 15,
                lineHeight: 21,
              }}
            >
              {t.content}
            </Text>
          </View>
        ))}

        {busy && (
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: RADIUS,
              padding: 12,
            }}
          >
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>Contry is checking the contract</Text>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 10,
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about this contract"
          placeholderTextColor={theme.mutedForeground}
          multiline
          style={{
            flex: 1,
            maxHeight: 110,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: RADIUS,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
            color: theme.foreground,
            backgroundColor: theme.card,
          }}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={busy || !input.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send question"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy || !input.trim() ? 0.5 : 1,
          }}
        >
          <Ionicons name="arrow-up" size={22} color={theme.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
