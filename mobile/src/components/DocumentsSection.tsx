import { useState } from 'react';
import { View, Text, Image, Pressable, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDocuments, uploadDocumentImage, uploadDocumentPdf, deleteDocument,
  getDocumentUrl, shareDocument,
} from '@/data/repo';
import { ContractDocument, isSizeAllowed } from '@/data/documents';
import { Contract } from '@/data/types';
import { downscaleToBase64 } from '@/lib/downscale';
import { useTheme, RADIUS } from '@/theme/colors';
import ImageViewer from '@/components/ImageViewer';

const TILE = 104;

// The document shelf: the contract itself (PDF or page photos) plus anything
// else the user attached — amendments, invoices, screenshots. Long-press a
// tile to delete it.
export default function DocumentsSection({
  contract,
  userId,
}: {
  contract: Contract;
  userId: string | null;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [viewer, setViewer] = useState<{ url: string; doc: ContractDocument } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ['documents', contract.id],
    queryFn: () => listDocuments(contract.id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents', contract.id] });
    queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
  };

  const addPhoto = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to add a document.');
      return;
    }
    const launch =
      source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const b64 = await downscaleToBase64(asset.uri, asset.width, asset.height);
      await uploadDocumentImage(contract.id, b64, userId ?? '');
      invalidate();
    } catch {
      Alert.alert("Couldn't add that photo", 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const addPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!isSizeAllowed(asset.size)) {
      Alert.alert('That file is too big', 'Documents can be up to 10 MB.');
      return;
    }
    setBusy(true);
    try {
      await uploadDocumentPdf(contract.id, asset.uri, userId ?? '', asset.name ?? null);
      invalidate();
    } catch {
      Alert.alert("Couldn't add that PDF", 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onAdd = () =>
    Alert.alert('Add a document', 'Amendments, invoices, letters, screenshots.', [
      { text: 'Take Photo', onPress: () => addPhoto('camera') },
      { text: 'Choose Photo', onPress: () => addPhoto('library') },
      { text: 'Choose PDF', onPress: addPdf },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const removeDoc = useMutation({
    mutationFn: (doc: ContractDocument) => deleteDocument(doc),
    onSuccess: invalidate,
    onError: () => Alert.alert("Couldn't delete", 'Please try again.'),
  });

  const confirmDelete = (doc: ContractDocument) =>
    Alert.alert('Delete this document?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeDoc.mutate(doc) },
    ]);

  const openPdf = async (doc: ContractDocument) => {
    try {
      const url = await getDocumentUrl(doc.storage_path);
      if (url) await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open that PDF", 'Please try again.');
    }
  };

  const shareDoc = async (doc: ContractDocument) => {
    try {
      await shareDocument(doc);
    } catch {
      Alert.alert("Couldn't share that document", 'Please try again.');
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
        Documents
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {docs.map((doc) =>
          doc.kind === 'image' ? (
            <ImageTile
              key={doc.id}
              doc={doc}
              onPress={async () => {
                const url = await getDocumentUrl(doc.storage_path).catch(() => '');
                if (url) setViewer({ url, doc });
              }}
              onLongPress={() => confirmDelete(doc)}
              onShare={() => shareDoc(doc)}
            />
          ) : (
            <View key={doc.id} style={{ width: TILE, height: TILE }}>
              <Pressable
                onPress={() => openPdf(doc)}
                onLongPress={() => confirmDelete(doc)}
                style={{
                  width: TILE, height: TILE, borderRadius: RADIUS,
                  backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1,
                  alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8,
                }}
              >
                <Ionicons name="document-text-outline" size={30} color={theme.primary} />
                <Text numberOfLines={2} style={{ color: theme.mutedForeground, fontSize: 11, textAlign: 'center' }}>
                  {doc.label ?? 'PDF'}
                </Text>
              </Pressable>
              <ShareBadge onPress={() => shareDoc(doc)} />
            </View>
          )
        )}
        <Pressable
          onPress={onAdd}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Add document"
          style={{
            width: TILE, height: TILE, borderRadius: RADIUS,
            borderColor: theme.border, borderWidth: 1, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {busy ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <Ionicons name="add" size={26} color={theme.primary} />
              <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>Add</Text>
            </>
          )}
        </Pressable>
      </View>
      {viewer && (
        <ImageViewer
          url={viewer.url}
          visible
          onClose={() => setViewer(null)}
          onShare={() => shareDoc(viewer.doc)}
        />
      )}
    </View>
  );
}

function ImageTile({
  doc,
  onPress,
  onLongPress,
  onShare,
}: {
  doc: ContractDocument;
  onPress: () => void;
  onLongPress: () => void;
  onShare: () => void;
}) {
  const theme = useTheme();
  // Signed URLs live 60 min; refresh well before that.
  const { data: url } = useQuery({
    queryKey: ['documentUrl', doc.storage_path],
    queryFn: () => getDocumentUrl(doc.storage_path),
    staleTime: 30 * 60 * 1000,
  });
  return (
    <View style={{ width: TILE, height: TILE }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={{
          width: TILE, height: TILE, borderRadius: RADIUS, overflow: 'hidden',
          backgroundColor: theme.accent, borderColor: theme.border, borderWidth: 1,
        }}
      >
        {url ? (
          <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={24} color={theme.mutedForeground} />
          </View>
        )}
      </Pressable>
      <ShareBadge onPress={onShare} />
    </View>
  );
}

// Small overlay button on each tile so users can send/save a document without
// opening it first. Separate from tap-to-view and long-press-to-delete.
function ShareBadge({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Share document"
      style={{
        position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13,
        backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Ionicons name="share-outline" size={15} color="#FFFFFF" />
    </Pressable>
  );
}
