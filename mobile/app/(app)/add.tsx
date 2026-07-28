import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import {
  createContract, analyzeContract, getAnalysisCounts, listAllDates,
  uploadSourceImage, uploadSourcePdf, attachDocument, getInboxItem, removeInboxItem,
} from '@/data/repo';
import { downscaleToBase64 } from '@/lib/downscale';
import { isSizeAllowed } from '@/data/documents';
import { rebuildAll, requestPermission } from '@/lib/notifications';
import { ContractAnalysis, AnalyzedDate } from '@/data/analysis';
import { InboxItem, inboxItemTitle } from '@/data/inbox';
import {
  CONTRACT_TYPES, CONTRACT_TYPE_LABELS, ContractType,
  ContractInsert, ContractDateInsert, DEFAULT_WINDOWS, DATE_TYPE_LABELS,
} from '@/data/types';
import { useTheme, RADIUS } from '@/theme/colors';
import LottieLoader from '@/components/LottieLoader';
import SuccessCheck from '@/components/SuccessCheck';
import DateField from '@/components/DateField';
import { usePurchases } from '@/lib/PurchasesContext';
import { presentPaywall } from '@/lib/purchases';
import { FREE_ANALYSIS_LIFETIME_LIMIT, PRO_MONTHLY_ANALYSES } from '@/lib/limits';

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

const DISCLAIMER = 'This explains what the contract says. It is not legal advice.';

export default function AddContract() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { isPro, offeringReady, refresh: refreshPro } = usePurchases();
  const params = useLocalSearchParams<{ inbox?: string }>();

  const [step, setStep] = useState<Step>('source');
  const [inboxItem, setInboxItem] = useState<InboxItem | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [sourcePaths, setSourcePaths] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Review state (editable before save).
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContractType>('other');
  const [partyOther, setPartyOther] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [dates, setDates] = useState<AnalyzedDate[]>([]);

  useEffect(() => {
    if (step !== 'analyzing') return;
    setStageIndex(0);
    const t = setInterval(() => setStageIndex((i) => (i + 1) % STAGES.length), 6000);
    return () => clearInterval(t);
  }, [step]);

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
        if (!(await passQuotaGate())) {
          router.back();
          return;
        }
        setSourcePaths([item.storage_path]);
        setStep('analyzing');
        const a = await analyzeContract([item.storage_path], 'pdf');
        if (!cancelled) applyAnalysis(a);
      } catch {
        if (cancelled) return;
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

  // The analysis is the metered operation (the model call). Gate at the wall:
  // free tier gets FREE_ANALYSIS_LIFETIME_LIMIT ever; Pro gets a monthly
  // quota. Fails open when no offering exists yet (store outage never blocks).
  const passQuotaGate = async (): Promise<boolean> => {
    const counts = await getAnalysisCounts().catch(() => ({ lifetime: 0, month: 0 }));
    if (!isPro && offeringReady && counts.lifetime >= FREE_ANALYSIS_LIFETIME_LIMIT) {
      const bought = await presentPaywall();
      await refreshPro();
      if (!bought) return false;
    }
    if (isPro && counts.month >= PRO_MONTHLY_ANALYSES) {
      Alert.alert(
        'Monthly limit reached',
        `Your plan covers ${PRO_MONTHLY_ANALYSES} contract readings a month. The counter resets on the 1st. You can still add contracts by hand.`
      );
      return false;
    }
    return true;
  };

  const pickPdf = async () => {
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

      const a = await analyzeContract(paths, kind);
      applyAnalysis(a);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert(
        "Contry couldn't read this document",
        msg.includes('422') || msg.toLowerCase().includes('contract')
          ? "It doesn't look like a contract. You can still add the details yourself."
          : 'Please try again, or add the details yourself.'
      );
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

      // Attach the analyzed source files; a failed attach must never cost the
      // user their saved contract (they can re-attach from the detail screen).
      let attachFailed = false;
      if (inboxItem && sourcePaths[0]) {
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
      } else if (source?.kind === 'pdf' && sourcePaths[0]) {
        await attachDocument(bundle.contract.id, sourcePaths[0], 'pdf', source.name, null).catch(() => {
          attachFailed = true;
        });
      } else if (source?.kind === 'images') {
        for (let i = 0; i < sourcePaths.length; i++) {
          await attachDocument(bundle.contract.id, sourcePaths[i], 'image', null, i + 1).catch(() => {
            attachFailed = true;
          });
        }
      }

      await requestPermission();
      await listAllDates()
        .then((all) => rebuildAll(all.map((d) => ({ date: d, contractTitle: d.contracts.title }))))
        .catch(() => {});
      return { attachFailed };
    },
    onSuccess: ({ attachFailed }) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-dates'] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
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
        <LottieLoader size={140} />
        <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
          {STAGES[stageIndex]}
        </Text>
        <Text style={{ color: theme.mutedForeground, textAlign: 'center' }}>
          Long contracts can take a minute or two.
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
      {step === 'source' && (
        <View style={{ gap: 12 }}>
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
                <Text style={{ color: theme.primary, fontWeight: '600' }}>Add the details yourself</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {(step === 'review' || step === 'manual') && (
        <View style={{ gap: 14 }}>
          {step === 'review' && analysis?.summary ? (
            <View
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: RADIUS,
                padding: 14,
                gap: 8,
              }}
            >
              <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
                In plain English
              </Text>
              <Text style={{ color: theme.foreground, fontSize: 15, lineHeight: 22 }}>{analysis.summary}</Text>
              <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{DISCLAIMER}</Text>
            </View>
          ) : null}

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

          <View style={{ gap: 8 }}>
            <Label text={step === 'review' ? 'Dates Contry found — check them against your document' : 'Dates to track'} />
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
                      onChange={(v) => setDates(dates.map((x, j) => (j === i ? { ...x, date: v } : x)))}
                    />
                  </View>
                  <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
                    {DATE_TYPE_LABELS[d.date_type]}
                    {d.recurrence !== 'none' ? ` · repeats ${d.recurrence}` : ''}
                  </Text>
                </View>
              </View>
            ))}
            <Pressable
              onPress={() =>
                setDates([
                  ...dates,
                  { label: '', date: '', date_type: 'custom', recurrence: 'none', note: null },
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
              <Ionicons name="add" size={18} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Add a date</Text>
            </Pressable>
          </View>

          {step === 'review' && (analysis?.risk_flags.length ?? 0) > 0 && (
            <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>
              Contry also found {analysis!.risk_flags.length}{' '}
              {analysis!.risk_flags.length === 1 ? 'thing' : 'things'} worth a close look and{' '}
              {analysis!.obligations.length} to-{analysis!.obligations.length === 1 ? 'do' : 'dos'}.
              They save with the contract.
            </Text>
          )}

          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything else worth remembering" multiline />

          <Pressable
            onPress={onSave}
            disabled={save.isPending}
            style={{ backgroundColor: theme.primary, borderRadius: RADIUS, padding: 16, alignItems: 'center', opacity: save.isPending ? 0.6 : 1 }}
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
            <Ionicons name="add" size={24} color={theme.primary} />
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
      <Ionicons name={icon} size={30} color={theme.primary} />
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
