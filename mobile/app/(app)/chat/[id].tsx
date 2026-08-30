import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getContract, askContract, getChatCount,
  listChatMessages, saveChatExchange, clearChatMessages,
} from '@/data/repo';
import { isConfigured } from '@/api/supabase';
import {
  ChatTurn, turnsFromRows, SUGGESTED_QUESTIONS, MAX_QUESTION_CHARS, MAX_HISTORY_TURNS,
} from '@/data/chat';
import { usePurchases } from '@/lib/PurchasesContext';
import { AiConsentHost, useAiConsent } from '@/lib/AiConsentContext';
import { presentPaywall } from '@/lib/purchases';
import { PRO_MONTHLY_CHATS } from '@/lib/limits';
import { chatOpenGate, chatSendGate } from '@/lib/quotaGate';
import { useTheme, RADIUS } from '@/theme/colors';
import ContryFace from '@/components/ContryFace';
import InsightCard from '@/components/InsightCard';
import { splitLeadIn } from '@/lib/textFormat';
import DisclaimerNote from '@/components/DisclaimerNote';
import { statusOf } from '@/api/functionError';
import { chatErrorCopy } from '@/lib/edgeErrorCopy';


export default function ContractChat() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isPro, offeringReady, ready, refresh: refreshPro } = usePurchases();
  const { ensureAiConsent } = useAiConsent();

  const queryClient = useQueryClient();
  const { data: contract } = useQuery({ queryKey: ['contract-row', id], queryFn: () => getContract(id) });

  // The transcript. Local state stays the working copy (the optimistic append
  // and rollback in send() need it); chat_messages is the record it restores
  // from, seeded once per mount below.
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // This mount's sends only — NEVER seeded from the restored transcript. The
  // send gate charges monthCount + asked, and the server counter behind
  // monthCount already includes every restored turn; seeding would double-
  // count them against the monthly limit.
  const [asked, setAsked] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const { data: stored } = useQuery({
    queryKey: ['chat-messages', id],
    queryFn: () => listChatMessages(id),
  });
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !stored) return;
    seededRef.current = true;
    // Guarded on emptiness: if the user managed to send before the fetch
    // resolved, their live transcript wins over the restore.
    if (stored.length > 0) {
      setTurns((t) => (t.length === 0 ? turnsFromRows(stored) : t));
    }
  }, [stored]);

  // Chat is premium-only (fail-open when no offering exists, like every other
  // gate). Asked once on open; declining returns to the contract. The gate
  // waits for `ready` — before the first entitlement read, isPro is a default,
  // not an answer — and presentPaywall itself re-checks with RevenueCat, so a
  // subscribed user with stale local state gets no sheet at all.
  const gated = useRef(false);
  useEffect(() => {
    if (gated.current || !isConfigured) return;
    if (chatOpenGate({ isPro, offeringReady, ready }) === 'paywall') {
      gated.current = true;
      (async () => {
        const hasAccess = await presentPaywall();
        await refreshPro();
        if (!hasAccess) router.back();
      })();
    }
  }, [isPro, offeringReady, ready, refreshPro, router]);

  useEffect(() => {
    getChatCount().then(setMonthCount).catch(() => {});
  }, []);

  const send = async (raw: string) => {
    const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
    if (!question || busy) return;
    // Guideline 5.1.2(i). Ask Contry sends MORE than the analysis does: the
    // document again, the details already extracted from it, and the question
    // itself. Placed before the input is cleared, so a decline leaves what
    // they typed exactly where they left it.
    if (!(await ensureAiConsent())) return;
    if (chatSendGate({ isPro, used: monthCount + asked }) === 'quota') {
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
      // Persist only completed exchanges, fire-and-forget: a failed question
      // rolls back on screen and stores nothing (matching the quota refund),
      // and a failed save must not disturb a conversation that DID happen.
      saveChatExchange(id, question, answer)
        .then(() => queryClient.invalidateQueries({ queryKey: ['chat-messages', id] }))
        .catch(() => {});
    } catch (e) {
      setTurns((t) => t.slice(0, -1));
      setInput(question);
      const { title, body } = chatErrorCopy(statusOf(e));
      Alert.alert(title, body);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Keep the newest message in view.
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [turns.length, busy]);

  // The old ephemeral behavior gave "start fresh" away for free; now that the
  // transcript survives, this is the only way to get it.
  const confirmClear = () =>
    Alert.alert('Clear this conversation?', 'The messages will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearChatMessages(id)
            .then(() => {
              setTurns([]);
              queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
            })
            .catch(() => Alert.alert("Couldn't clear", 'Please try again.'));
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <AiConsentHost />
      {/* Clear only renders once there is something to clear; an empty chat
          with a trash can in the header would read as a bug. Same glyph and
          color as the contract screen's delete. */}
      <Stack.Screen
        options={{
          headerRight: () =>
            turns.length > 0 ? (
              <Pressable onPress={confirmClear} accessibilityRole="button" accessibilityLabel="Clear conversation">
                <Ionicons name="trash-outline" size={22} color={theme.destructive} />
              </Pressable>
            ) : null,
        }}
      />

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
        <DisclaimerNote variant="chat" style={{ flex: 1 }} />
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
            <ContryFace slot="search-idle" size={56} fallbackIcon="chatbubble-ellipses-outline" color={theme.brandText} />
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
                  <Text style={{ color: theme.brandText, fontWeight: '600', fontSize: 14 }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(() => {
          const firstAssistant = turns.findIndex((t) => t.role === 'assistant');
          return turns.map((t, i) => {
            if (t.role === 'user') {
              return (
                <View
                  key={i}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '85%',
                    backgroundColor: theme.primary,
                    borderRadius: RADIUS,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: theme.primaryForeground, fontSize: 15, lineHeight: 21 }}>{t.content}</Text>
                </View>
              );
            }
            const { lead, rest } = splitLeadIn(t.content);
            const body = (
              <Text style={{ color: theme.foreground, fontSize: 15, lineHeight: 21 }}>
                {lead ? <Text style={{ fontWeight: '700' }}>{lead}</Text> : null}
                {lead && rest ? ' ' : ''}
                {rest || (!lead ? t.content : '')}
              </Text>
            );
            // Only the first answer in the conversation gets the labeled
            // card treatment; a repeated header on every turn would feel
            // noisy in a genuine back-and-forth. The screen's pinned
            // disclaimer strip above already covers "always visible", so no
            // footer is passed here.
            if (i === firstAssistant) {
              return (
                <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <InsightCard label="Contry says" icon="sparkles-outline">
                    {body}
                  </InsightCard>
                </View>
              );
            }
            return (
              <View
                key={i}
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: RADIUS,
                  padding: 12,
                }}
              >
                {body}
              </View>
            );
          });
        })()}

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
            <ActivityIndicator size="small" color={theme.brandText} />
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>Contry is checking the contract</Text>
          </View>
        )}
      </ScrollView>

      {/* Restored transcripts can outgrow what is replayed to the model
          (boundHistory caps at MAX_HISTORY_TURNS). Saying so once here keeps
          long-history amnesia reading as design rather than as a bug. */}
      {turns.length > MAX_HISTORY_TURNS && (
        <Text
          style={{
            color: theme.mutedForeground,
            fontSize: 12,
            textAlign: 'center',
            paddingHorizontal: 16,
            paddingTop: 6,
          }}
        >
          Contry reads your document and the last few messages.
        </Text>
      )}

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
