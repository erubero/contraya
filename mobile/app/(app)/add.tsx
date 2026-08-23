import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Image, AppState,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import {
  createContract, analyzeContract, getAnalysisCounts,
  uploadSourceImage, uploadSourcePdf, attachDocument, getInboxItem, removeInboxItem,
} from '@/data/repo';
import { downscaleToBase64 } from '@/lib/downscale';
import { isSizeAllowed } from '@/data/documents';
import { requestPermission } from '@/lib/notifications';
import { refreshDeviceSchedules } from '@/lib/deviceSync';
import { ContractAnalysis, AnalyzedDate, unresolvedDates } from '@/data/analysis';
import { InboxItem, inboxItemTitle } from '@/data/inbox';
import {
  CONTRACT_TYPES, CONTRACT_TYPE_LABELS, ContractType,
  ContractInsert, ContractDateInsert, DEFAULT_WINDOWS, DATE_TYPE_LABELS,
} from '@/data/types';
import { useTheme, RADIUS } from '@/theme/colors';
import { severityColor } from '@/theme/severity';
import SuccessCheck from '@/components/SuccessCheck';
import DateField from '@/components/DateField';
import ContryFace from '@/components/ContryFace';
import InsightCard from '@/components/InsightCard';
import GlowBackdrop from '@/components/GlowBackdrop';
import { usePurchases } from '@/lib/PurchasesContext';
import { useAiConsent } from '@/lib/AiConsentContext';
import { presentPaywall } from '@/lib/purchases';
import { PRO_MONTHLY_ANALYSES } from '@/lib/limits';
import { analysisGate } from '@/lib/quotaGate';
import DisclaimerNote from '@/components/DisclaimerNote';
import { statusOf } from '@/api/functionError';
import { analysisErrorCopy } from '@/lib/edgeErrorCopy';
import {
  ContractDraft, DRAFT_DEBOUNCE_MS, DRAFT_VERSION, isDraftWorthKeeping,
} from '@/data/draft';
import { clearDraft, readDraft, writeDraft } from '@/lib/draftStore';

// What the user picked before analysis: one PDF, or 1..12 page photos.
type Source =
  | { kind: 'pdf'; uri: string; name: string | null }
  | { kind: 'images'; pages: string[] }; // base64 JPEGs, in page order

type Step = 'source' | 'analyzing' | 'review' | 'manual';

// Rotating copy while the model reads the document (15-90s). Factual and
// mascot-fronted; never says "AI".
const STAGES = [
  'Contry is reading your contract',
  'Finding the dates and deadlines',
  'Checking the fine print',
  'Writing the plain-English summary',
];


export default function AddContract() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { isPro, offeringReady, ready, refresh: refreshPro } = usePurchases();
  const { ensureAiConsent } = useAiConsent();
  const params = useLocalSearchParams<{ inbox?: string; draft?: string }>();

  const [step, setStep] = useState<Step>('source');
  const [inboxItem, setInboxItem] = useState<InboxItem | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [sourcePaths, setSourcePaths] = useState<string[]>([]);
  // What was UPLOADED, as opposed to `source`, which is what the user picked and
  // holds base64. Only these two reach the attach step, so a restored draft can
  // attach without ever having carried megabytes through storage.
  const [sourceKind, setSourceKind] = useState<'pdf' | 'images' | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Draft plumbing. `null` means "not looked yet" so the source step can wait
  // rather than render and then jump when the draft card appears a frame later.
  const [draftChecked, setDraftChecked] = useState(false);
  const [restorable, setRestorable] = useState<ContractDraft | null>(null);
  const draftRef = useRef<ContractDraft | null>(null);
  const savedRef = useRef(false);
  const wroteOnceRef = useRef(false);

  // Review state (editable before save).
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContractType>('other');
  const [partyOther, setPartyOther] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [dates, setDates] = useState<AnalyzedDate[]>([]);

  // Dates the verification pass flagged and the user has not answered yet.
  // Blocks Save; see unresolvedDates for why that is not merely a nag.
  const unresolved = useMemo(() => unresolvedDates(dates), [dates]);

  useEffect(() => {
    if (step !== 'analyzing') return;
    setStageIndex(0);
    const t = setInterval(() => setStageIndex((i) => (i + 1) % STAGES.length), 6000);
    return () => clearInterval(t);
  }, [step]);

  // A slow breathing scale on the "Contry is reading" face so a static icon
  // (the icon-fallback for the still-unwired 'reading' mascot slot) doesn't
  // read as hung during the up-to-90s analysis wait.
  const readingScale = useSharedValue(1);
  useEffect(() => {
    if (step !== 'analyzing') return;
    readingScale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1,
      true
    );
  }, [step, readingScale]);
  const readingPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: readingScale.value }],
  }));

  // Opened from the email inbox: the PDF is already in storage, so skip the
  // source picker and go straight to quota gate -> analysis -> review.
  useEffect(() => {
    const id = params.inbox;
    if (!id || inboxItem) return;
    let cancelled = false;
    (async () => {
      try {
        const item = await getInboxItem(id);
        if (cancelled) return;
        setInboxItem(item);
        // Consent first, and before the quota gate: never sell somebody a
        // subscription for a thing they have not agreed to let happen.
        if (!(await ensureAiConsent())) {
          router.back();
          return;
        }
        if (!(await passQuotaGate())) {
          router.back();
          return;
        }
        setSourcePaths([item.storage_path]);
        setSourceKind('pdf');
        setSourceName(null);
        setStep('analyzing');
        const a = await analyzeContract([item.storage_path], 'pdf');
        if (!cancelled) applyAnalysis(a);
      } catch {
        if (cancelled) return;
        // Reset the inbox state COMPLETELY or a later save with a fresh
        // source would still take the inbox branch: attaching under the
        // email's title and consuming the inbox row whose file was never
        // attached — destroying the user's only copy of an emailed PDF.
        // Same both-or-neither rule applied to the saved draft: a half-reset on
        // disk would let a restore rebuild the very pairing this clears.
        setInboxItem(null);
        setSourcePaths([]);
        setSourceKind(null);
        clearDraft(userId).catch(() => {});
        Alert.alert(
          "Contry couldn't read this document",
          'You can still add the details yourself. The email stays in your inbox.'
        );
        setStep('source');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.inbox]);

  // ---- Draft: survive an accidental dismiss without paying twice ----

  const restoreDraft = async (d: ContractDraft) => {
    let item: InboxItem | null = null;
    let paths = d.sourcePaths;
    let kind = d.sourceKind;
    if (d.inboxItemId) {
      // Never trust a serialized inbox pairing. The row is re-fetched and the
      // SERVER decides whether it still matches; the disk only remembers an id.
      try {
        const fresh = await getInboxItem(d.inboxItemId);
        if (fresh.storage_path === d.sourcePaths[0]) item = fresh;
        else {
          paths = [];
          kind = null;
        }
      } catch {
        // Row gone: dismissed from Tasks, which deletes its file too. Keep the
        // analysis and the edits, drop the attachment ENTIRELY. Both fields
        // together, never one of them, for the reason spelled out in the inbox
        // error path above.
        paths = [];
        kind = null;
      }
    }
    setInboxItem(item);
    setSourcePaths(paths);
    setSourceKind(kind);
    setSourceName(d.sourceName);
    setAnalysis(d.analysis);
    setTitle(d.fields.title);
    setType(d.fields.type);
    setPartyOther(d.fields.partyOther);
    setEffectiveDate(d.fields.effectiveDate);
    setEndDate(d.fields.endDate);
    setNotes(d.fields.notes);
    setDates(d.fields.dates);
    setRestorable(null);
    // Must be d.step, not 'review': only the manual branch renders the start and
    // end date fields and converts a typed end date into a tracked row.
    setStep(d.step);
  };

  useEffect(() => {
    // An active inbox import never consults a draft.
    if (params.inbox) {
      setDraftChecked(true);
      return;
    }
    let cancelled = false;
    readDraft(userId).then((d) => {
      if (cancelled) return;
      // Arriving from the Tasks screen: the tap was already the confirmation,
      // so skip the card.
      if (d && params.draft === '1') restoreDraft(d);
      else setRestorable(d);
      setDraftChecked(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.inbox, params.draft, userId]);

  // Refreshed after EVERY render (no dep array) so the unmount flush below can
  // never write a stale snapshot.
  useEffect(() => {
    draftRef.current =
      step === 'review' || step === 'manual'
        ? {
            v: DRAFT_VERSION,
            userId: userId ?? '',
            savedAt: new Date().toISOString(),
            step,
            analysis,
            sourceKind,
            sourceName,
            sourcePaths,
            inboxItemId: inboxItem?.id ?? null,
            fields: { title, type, partyOther, effectiveDate, endDate, notes, dates },
          }
        : null;
  });

  useEffect(() => {
    const d = draftRef.current;
    if (!d || !userId || savedRef.current) return;
    // The first write of a session is immediate: the analysis has just landed
    // and is the most expensive thing on the screen. Later writes are only
    // keystrokes, so they debounce.
    const delay = wroteOnceRef.current ? DRAFT_DEBOUNCE_MS : 0;
    const t = setTimeout(() => {
      wroteOnceRef.current = true;
      if (isDraftWorthKeeping(d)) writeDraft(userId, d);
      else clearDraft(userId);
    }, delay);
    return () => clearTimeout(t);
  }, [
    step, analysis, sourcePaths, sourceKind, sourceName, inboxItem,
    title, type, partyOther, effectiveDate, endDate, notes, dates, userId,
  ]);

  useEffect(() => {
    const flush = () => {
      const d = draftRef.current;
      if (savedRef.current || !d || !userId) return;
      if (isDraftWorthKeeping(d)) writeDraft(userId, d);
    };
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flush();
    });
    return () => {
      sub.remove();
      // The one that matters. Swiping a modal away unmounts this screen but does
      // NOT background the app, so AppState never fires for the case this whole
      // feature exists for. The JS runtime keeps running through the unmount, so
      // this write completes.
      flush();
    };
  }, [userId]);

  // The analysis is the metered operation (the model call). The verdict lives
  // in `analysisGate` so it can be unit-tested; this function owns only the
  // side effects. Counts fail open, and so does the gate when no offering
  // exists yet, so a store outage never blocks anyone.
  const passQuotaGate = async (): Promise<boolean> => {
    const counts = await getAnalysisCounts().catch(() => ({ lifetime: 0, month: 0 }));
    const decision = analysisGate({
      isPro,
      offeringReady,
      lifetime: counts.lifetime,
      month: counts.month,
    });
    if (decision === 'paywall') {
      const bought = await presentPaywall();
      await refreshPro();
      return bought;
    }
    if (decision === 'quota') {
      Alert.alert(
        'Monthly limit reached',
        `Your plan covers ${PRO_MONTHLY_ANALYSES} contract readings a month. The counter resets on the 1st. You can still add contracts by hand.`
      );
      return false;
    }
    return true;
  };

  const pickPdf = async () => {
    // Guideline 5.1.2(i). Gating at the PICKER rather than at runAnalysis is
    // deliberate: the upload to storage happens inside runAnalysis, so asking
    // here means a declined document is never even chosen, let alone sent.
    if (!(await ensureAiConsent())) return;
    if (!(await passQuotaGate())) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!isSizeAllowed(asset.size)) {
      Alert.alert('That file is too big', 'Contracts can be up to 10 MB.');
      return;
    }
    runAnalysis({ kind: 'pdf', uri: asset.uri, name: asset.name ?? null });
  };

  const addPage = async (source0: Source | null, from: 'camera' | 'library') => {
    const perm =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to photograph the contract.');
      return;
    }
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 1,
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 12,
          });
    if (result.canceled) return;
    const pages = source0?.kind === 'images' ? [...source0.pages] : [];
    for (const asset of result.assets) {
      if (pages.length >= 12) break;
      try {
        pages.push(await downscaleToBase64(asset.uri, asset.width, asset.height));
      } catch {
        // Skip an unreadable asset; the user sees the thumbnails they got.
      }
    }
    if (pages.length === 0) return;
    setSource({ kind: 'images', pages });
  };

  const startPages = async (from: 'camera' | 'library') => {
    if (!(await ensureAiConsent())) return;
    if (!(await passQuotaGate())) return;
    await addPage(null, from);
  };

  const applyAnalysis = (a: ContractAnalysis) => {
    setAnalysis(a);
    setTitle(a.title ?? '');
    setType(a.contract_type);
    setPartyOther(a.party_other ?? '');
    setDates(a.key_dates);
    setStep('review');
  };

  const runAnalysis = async (src: Source) => {
    // A new document supersedes any saved draft. Deliberately here rather than
    // on the picker tap: hitting the paywall in passQuotaGate and backing out
    // must not destroy a perfectly good draft.
    clearDraft(userId).catch(() => {});
    setRestorable(null);
    setSource(src);
    setStep('analyzing');
    try {
      // Upload first (the edge function reads from storage by path), then
      // analyze. The uploaded objects become the contract's documents on save.
      const uid = userId ?? '';
      let paths: string[];
      let kind: 'pdf' | 'images';
      if (src.kind === 'pdf') {
        paths = [await uploadSourcePdf(src.uri, uid)];
        kind = 'pdf';
      } else {
        paths = [];
        for (const page of src.pages) {
          paths.push(await uploadSourceImage(page, uid));
        }
        kind = 'images';
      }
      setSourcePaths(paths);
      // Kind and name are tracked separately from `source` because `source`
      // holds up to 12 base64 pages and can never go in a draft. These two are
      // what the attach step actually needs, so a restored draft can still
      // attach its documents.
      setSourceKind(kind);
      setSourceName(src.kind === 'pdf' ? src.name : null);

      const a = await analyzeContract(paths, kind);
      applyAnalysis(a);
    } catch (e) {
      const { title, body } = analysisErrorCopy(statusOf(e));
      Alert.alert(title, body);
      setStep('source');
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const contract: ContractInsert = {
        title: title.trim(),
        contract_type: type,
        party_you: analysis?.party_you ?? null,
        party_other: partyOther.trim() || null,
        summary: analysis?.summary ?? null,
        payment_terms: analysis?.payment_terms ?? null,
        total_value: analysis?.total_value ?? null,
        party_other_contact: analysis?.party_other_contact ?? null,
        effective_date: effectiveDate || null,
        end_date: endDate || null,
        status: 'active',
        notes: notes.trim() || null,
      };
      // A row the user emptied out (or never finished) is dropped, not saved:
      // the DB CHECKs would reject it anyway.
      const dateRows: ContractDateInsert[] = dates
        .filter((d) => d.label.trim() && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
        .map((d) => ({
          label: d.label.trim(),
          date_type: d.date_type,
          due_date: d.date,
          recurrence: d.recurrence,
          reminder_windows: DEFAULT_WINDOWS[d.date_type],
        }));
      // Manual mode: an end date the user typed becomes a tracked date row.
      if (step === 'manual' && endDate) {
        dateRows.push({
          label: 'Contract ends',
          date_type: 'expiry',
          due_date: endDate,
          recurrence: 'none',
          reminder_windows: DEFAULT_WINDOWS.expiry,
        });
      }
      const obligations = (analysis?.obligations ?? []).map((o) => ({
        who: o.who,
        description: o.description,
        due_note: o.due_note,
      }));
      const riskFlags = (analysis?.risk_flags ?? []).map((r) => ({
        severity: r.severity,
        title: r.title,
        quote: r.quote,
        why_it_matters: r.why_it_matters,
      }));

      const bundle = await createContract(contract, dateRows, obligations, riskFlags);

      // Here, not in onSuccess, and before the attach block. If a draft outlives
      // a successful save, the next Add offers to restore a contract that
      // already exists; saving that creates a duplicate sharing these same
      // storage objects, and deleting either one deletes the objects out from
      // under the other. savedRef also stops the unmount flush rewriting it.
      savedRef.current = true;
      await clearDraft(userId).catch(() => {});

      // Attach the analyzed source files; a failed attach must never cost the
      // user their saved contract (they can re-attach from the detail screen).
      let attachFailed = false;
      // The inbox branch only applies while the sources ARE the inbox file;
      // a freshly picked source must always take the branches below.
      if (inboxItem && sourcePaths[0] === inboxItem.storage_path) {
        await attachDocument(
          bundle.contract.id,
          sourcePaths[0],
          'pdf',
          inboxItemTitle(inboxItem),
          null
        ).catch(() => {
          attachFailed = true;
        });
        // The object now lives as the contract's document; drop the inbox row
        // but keep the file. Best effort: a leftover row is harmless.
        await removeInboxItem(inboxItem, false).catch(() => {});
      } else if (sourceKind === 'pdf' && sourcePaths[0]) {
        await attachDocument(bundle.contract.id, sourcePaths[0], 'pdf', sourceName, null).catch(() => {
          attachFailed = true;
        });
      } else if (sourceKind === 'images') {
        for (let i = 0; i < sourcePaths.length; i++) {
          await attachDocument(bundle.contract.id, sourcePaths[i], 'image', null, i + 1).catch(() => {
            attachFailed = true;
          });
        }
      }

      // Notification permission only. Calendar access is never asked for here:
      // it is requested from the calendar settings screen and nowhere else, so
      // a user who has not opted in is never prompted and never has anything
      // written to their calendar. The sync below no-ops unless they did.
      await requestPermission();
      await refreshDeviceSchedules(userId, { isPro, offeringReady, ready }).catch(() => {});
      return { attachFailed };
    },
    onSuccess: ({ attachFailed }) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-dates'] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      // The dashboard stays mounted behind this modal, so without this its
      // avatar badge would keep counting a draft that no longer exists.
      queryClient.invalidateQueries({ queryKey: ['draft'] });
      if (attachFailed) {
        Alert.alert('Saved, but a document did not attach', 'You can add it again from the contract.');
        router.back();
        return;
      }
      // Brief success beat before dismissing (the checkmark overlay below).
      setShowSuccess(true);
    },
    onError: () => Alert.alert("Couldn't save", 'Please try again.'),
  });

  const onSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing details', 'Give the contract a name.');
      return;
    }
    save.mutate();
  };

  if (showSuccess) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <SuccessCheck size={140} onDone={() => router.back()} />
        <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '700' }}>Saved</Text>
      </View>
    );
  }

  if (step === 'analyzing') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Animated.View style={readingPulseStyle}>
          <ContryFace slot="reading" size={140} fallbackIcon="reader-outline" color={theme.brandText} />
        </Animated.View>
        <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
          {STAGES[stageIndex]}
        </Text>
        <Text style={{ color: theme.mutedForeground, textAlign: 'center' }}>
          Long contracts can take a minute or two.
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 13, textAlign: 'center' }}>
          Encrypted in transit and at rest. Only you can see what's here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Held until the draft lookup returns, so the resume card cannot appear a
          frame late and shove the source cards down. The modal is still
          animating in, so this reads as nothing at all. */}
      {step === 'source' && draftChecked && (
        <View style={{ gap: 12 }}>
          {restorable && !source && (
            <ResumeCard
              draft={restorable}
              onContinue={() => restoreDraft(restorable)}
              onDiscard={() =>
                Alert.alert(
                  'Discard the unfinished contract?',
                  'The reading Contry already did will be lost.',
                  [
                    { text: 'Keep it', style: 'cancel' },
                    {
                      text: 'Discard',
                      style: 'destructive',
                      onPress: () => {
                        clearDraft(userId).catch(() => {});
                        setRestorable(null);
                      },
                    },
                  ]
                )
              }
            />
          )}
          {source?.kind === 'images' ? (
            <PageTray
              pages={source.pages}
              onAddPage={() => addPage(source, 'camera')}
              onRemovePage={(i) =>
                setSource({ kind: 'images', pages: source.pages.filter((_, j) => j !== i) })
              }
              onDone={() => runAnalysis(source)}
            />
          ) : (
            <>
              <SourceCard
                icon="document-outline"
                title="Upload the PDF"
                subtitle="Pick the contract file and Contry reads it."
                onPress={pickPdf}
              />
              <SourceCard
                icon="camera-outline"
                title="Photograph the pages"
                subtitle="Snap each page of a paper contract."
                onPress={() => startPages('camera')}
              />
              <SourceCard
                icon="image-outline"
                title="Choose from Library"
                subtitle="Pick photos of the pages you already took."
                onPress={() => startPages('library')}
              />
              <Pressable onPress={() => setStep('manual')} style={{ alignItems: 'center', padding: 8 }}>
                <Text style={{ color: theme.brandText, fontWeight: '600' }}>Add the details yourself</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {(step === 'review' || step === 'manual') && (
        <View style={{ gap: 14 }}>
          {step === 'review' && (
            <>
              <Animated.View entering={FadeIn.duration(250)}>
                <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }}>
                  Contry finished reading. Here's what it found.
                </Text>
              </Animated.View>
              {/* The disclaimer must render on every review state, summary or
                  not: everything below this point is model output. When a
                  summary exists it lives inside the InsightCard's footer;
                  otherwise the bare line below still carries it. */}
              {analysis?.summary ? (
                <Animated.View entering={FadeInDown.delay(120).duration(350)} style={{ position: 'relative' }}>
                  <GlowBackdrop size={240} style={{ position: 'absolute', top: -50, left: '50%', marginLeft: -120 }} />
                  <InsightCard label="In plain English" icon="checkmark-circle" footer={<DisclaimerNote />}>
                    {analysis.summary}
                  </InsightCard>
                </Animated.View>
              ) : (
                <Animated.View entering={FadeInDown.delay(120).duration(350)}>
                  <DisclaimerNote />
                </Animated.View>
              )}
            </>
          )}

          <Animated.View
            entering={step === 'review' ? FadeInDown.delay(260).duration(350) : undefined}
            style={{ gap: 14 }}
          >
            <Field label="Contract name *" value={title} onChangeText={setTitle} placeholder="e.g. Apartment lease, 12 Palm Ave" />

            <Label text="Type" />
            <Chips
              options={CONTRACT_TYPES.map((t) => ({ value: t, label: CONTRACT_TYPE_LABELS[t] }))}
              selected={type}
              onSelect={(v) => setType(v as ContractType)}
            />

            <Field label="Other party" value={partyOther} onChangeText={setPartyOther} placeholder="e.g. Palm Grove Properties LLC" />

            {step === 'manual' && (
              <>
                <DateField label="Start date" value={effectiveDate} onChange={setEffectiveDate} />
                <DateField label="End date" value={endDate} onChange={setEndDate} />
              </>
            )}
          </Animated.View>

          <Animated.View
            entering={step === 'review' ? FadeInDown.delay(380).duration(350) : undefined}
            style={{ gap: 8 }}
          >
            <Label text={step === 'review' ? 'Dates Contry found. Check them against your document' : 'Dates to track'} />
            {dates.map((d, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: RADIUS,
                  padding: 12,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={d.label}
                    onChangeText={(v) => setDates(dates.map((x, j) => (j === i ? { ...x, label: v } : x)))}
                    placeholder="What is this date?"
                    placeholderTextColor={theme.mutedForeground}
                    style={{ flex: 1, fontSize: 15, fontWeight: '600', color: theme.foreground, paddingVertical: 0 }}
                  />
                  <Pressable
                    onPress={() => setDates(dates.filter((_, j) => j !== i))}
                    hitSlop={8}
                    accessibilityLabel="Remove date"
                  >
                    <Ionicons name="close-circle" size={20} color={theme.mutedForeground} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <DateField
                      label=""
                      value={d.date}
                      onChange={(v) =>
                        // Editing a flagged date resolves the flag: the human
                        // just did the check the marker asked for.
                        setDates(dates.map((x, j) => (j === i ? { ...x, date: v, verified: 'unchecked' } : x)))
                      }
                    />
                  </View>
                  <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
                    {DATE_TYPE_LABELS[d.date_type]}
                    {d.recurrence !== 'none' ? ` · repeats ${d.recurrence}` : ''}
                  </Text>
                </View>
                {(d.verified === 'not_found' || d.verified === 'corrected') && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={14} color={theme.statusExpiring} />
                    <Text style={{ flex: 1, color: theme.statusExpiring, fontSize: 12, fontWeight: '600' }}>
                      {d.verified === 'not_found'
                        ? "Contry couldn't re-find this date in the document. Check it."
                        : 'Contry corrected this date on a second read. Check it.'}
                    </Text>
                    {/* A flagged date is often simply right, and editing was
                        the only way to clear the flag: the user had to retype
                        the value they had just confirmed was correct. This
                        clears it the same way an edit does. */}
                    <Pressable
                      onPress={() =>
                        setDates(dates.map((x, j) => (j === i ? { ...x, verified: 'unchecked' } : x)))
                      }
                      hitSlop={8}
                      style={({ pressed }) => ({
                        borderColor: theme.statusExpiring,
                        borderWidth: 1,
                        borderRadius: RADIUS - 6,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ color: theme.statusExpiring, fontSize: 12, fontWeight: '700' }}>
                        Checked
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            <Pressable
              onPress={() =>
                setDates([
                  ...dates,
                  // User-typed rows are their own authority; no verification marker.
                  { label: '', date: '', date_type: 'custom', recurrence: 'none', note: null, verified: 'unchecked' },
                ])
              }
              style={{
                borderColor: theme.border,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: RADIUS,
                padding: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Ionicons name="add" size={18} color={theme.brandText} />
              <Text style={{ color: theme.brandText, fontWeight: '600' }}>Add a date</Text>
            </Pressable>
          </Animated.View>

          {step === 'review' &&
            ((analysis?.risk_flags.length ?? 0) > 0 || (analysis?.obligations.length ?? 0) > 0) && (
              <Animated.View entering={FadeInDown.delay(500).duration(350)} style={{ gap: 8 }}>
                {analysis!.risk_flags.length > 0 && (
                  <>
                    <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: '600' }}>
                      Contry also found {analysis!.risk_flags.length}{' '}
                      {analysis!.risk_flags.length === 1 ? 'thing' : 'things'} worth a close look
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {analysis!.risk_flags.map((r, i) => {
                        const c = severityColor(theme)[r.severity];
                        return (
                          <View
                            key={i}
                            style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}
                          >
                            <Text style={{ color: c.fg, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                              {r.title}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
                {analysis!.obligations.length > 0 && (
                  <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>
                    Plus {analysis!.obligations.length} to-{analysis!.obligations.length === 1 ? 'do' : 'dos'}. Everything saves with the contract.
                  </Text>
                )}
              </Animated.View>
            )}

          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything else worth remembering" multiline />

          {/* The flags above are the only thing standing between a date Contry
              could not verify and a 9:00 push notification, so they have to
              be answered rather than scrolled past. Tapping Checked or
              editing the date clears one. */}
          {unresolved.length > 0 && (
            <Text
              style={{
                color: theme.statusExpiring,
                fontSize: 13,
                lineHeight: 19,
                textAlign: 'center',
                marginHorizontal: 2,
              }}
            >
              {unresolved.length === 1
                ? 'Check the date Contry flagged before saving.'
                : `Check the ${unresolved.length} dates Contry flagged before saving.`}
            </Text>
          )}

          <Pressable
            onPress={onSave}
            disabled={save.isPending || unresolved.length > 0}
            style={{ backgroundColor: theme.primary, borderRadius: RADIUS, padding: 16, alignItems: 'center', opacity: save.isPending || unresolved.length > 0 ? 0.6 : 1 }}
          >
            {save.isPending ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '600' }}>Save Contract</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function PageTray({
  pages,
  onAddPage,
  onRemovePage,
  onDone,
}: {
  pages: string[];
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: theme.foreground, fontWeight: '600' }}>
        {pages.length} {pages.length === 1 ? 'page' : 'pages'} so far
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {pages.map((b64, i) => (
          <View key={i} style={{ width: 72, height: 96 }}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${b64}` }}
              style={{ width: 72, height: 96, borderRadius: 8, backgroundColor: theme.accent }}
            />
            <Pressable
              onPress={() => onRemovePage(i)}
              hitSlop={8}
              accessibilityLabel={`Remove page ${i + 1}`}
              style={{ position: 'absolute', top: -6, right: -6 }}
            >
              <Ionicons name="close-circle" size={22} color={theme.foreground} />
            </Pressable>
          </View>
        ))}
        {pages.length < 12 && (
          <Pressable
            onPress={onAddPage}
            style={{
              width: 72,
              height: 96,
              borderRadius: 8,
              borderColor: theme.border,
              borderWidth: 1,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={24} color={theme.brandText} />
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={onDone}
        style={{ backgroundColor: theme.primary, borderRadius: RADIUS, padding: 16, alignItems: 'center' }}
      >
        <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '600' }}>
          Done, read it
        </Text>
      </Pressable>
    </View>
  );
}

// Solid card, unlike the dashed SourceCards below it: this is something that
// already exists, not an empty slot to fill.
function ResumeCard({
  draft,
  onContinue,
  onDiscard,
}: {
  draft: ContractDraft;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const theme = useTheme();
  const name = draft.fields.title.trim() || draft.sourceName?.trim() || 'a contract';
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: theme.brand,
        borderWidth: 1,
        borderRadius: RADIUS,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="document-text-outline" size={20} color={theme.brandText} />
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700', flex: 1 }}>
          Pick up where you left off
        </Text>
      </View>
      <Text style={{ color: theme.mutedForeground, fontSize: 14, lineHeight: 20 }}>
        {draft.analysis
          ? `Contry already read ${name}. Continue and nothing is read twice.`
          : `You started adding ${name}.`}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onContinue}
          style={{
            flex: 1,
            backgroundColor: theme.brand,
            borderRadius: RADIUS,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.brandForeground, fontWeight: '700' }}>Continue</Text>
        </Pressable>
        <Pressable
          onPress={onDiscard}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: RADIUS,
            borderColor: theme.border,
            borderWidth: 1,
          }}
        >
          <Text style={{ color: theme.mutedForeground, fontWeight: '600' }}>Discard</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SourceCard({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: RADIUS,
        padding: 24,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Ionicons name={icon} size={30} color={theme.brandText} />
      <Text style={{ color: theme.foreground, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: theme.mutedForeground, fontSize: 13, textAlign: 'center' }}>{subtitle}</Text>
    </Pressable>
  );
}

function Label({ text }: { text: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.foreground, fontWeight: '600', fontSize: 14 }}>{text}</Text>;
}

function Field({
  label, multiline, ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Label text={label} />
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={theme.mutedForeground}
        style={{
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: RADIUS,
          padding: 12,
          fontSize: 15,
          color: theme.foreground,
          backgroundColor: theme.card,
          minHeight: multiline ? 72 : undefined,
        }}
      />
    </View>
  );
}

function Chips({
  options, selected, onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = selected === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? theme.primary : theme.border,
              backgroundColor: active ? theme.primary : theme.card,
            }}
          >
            <Text style={{ color: active ? theme.primaryForeground : theme.foreground, fontSize: 13, fontWeight: '500' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
