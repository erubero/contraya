import { isConfigured } from '@/api/supabase';
import * as live from '@/api/contracts';
import * as documentsApi from '@/api/documents';
import * as profileApi from '@/api/profile';
import * as usage from '@/api/usage';
import * as inboxApi from '@/api/inbox';
import * as chatApi from '@/api/chat';
import { demo } from '@/lib/demo';
import { shareRemoteFile } from '@/lib/share';
import {
  Contract, ContractBundle, ContractInsert,
  ContractDateInsert, ContractObligation, ContractObligationInsert, ContractRiskFlagInsert,
} from './types';
import { ContractDocument } from './documents';
import { ContractAnalysis } from './analysis';
import { InboxItem } from './inbox';
import { ChatTurn } from './chat';

// One entry point the screens use; dispatches to the live Supabase repository
// or the in-memory demo store depending on whether a backend is configured.

export function listContracts(): Promise<Contract[]> {
  return isConfigured ? live.listContracts() : demo.list();
}

export function getContract(id: string): Promise<Contract> {
  return isConfigured ? live.getContract(id) : demo.get(id);
}

export function getBundle(id: string): Promise<ContractBundle> {
  return isConfigured ? live.getBundle(id) : demo.getBundle(id);
}

export function createContract(
  contract: ContractInsert,
  dates: ContractDateInsert[],
  obligations: ContractObligationInsert[],
  riskFlags: ContractRiskFlagInsert[]
): Promise<ContractBundle> {
  return isConfigured
    ? live.createContract(contract, dates, obligations, riskFlags)
    : demo.create(contract, dates, obligations, riskFlags);
}

export function updateContract(id: string, patch: Partial<Contract>): Promise<Contract> {
  return isConfigured ? live.updateContract(id, patch) : demo.update(id, patch);
}

export function deleteContract(contract: Contract): Promise<void> {
  return isConfigured ? live.deleteContract(contract) : demo.remove(contract);
}

export function setObligationCompleted(id: string, completed: boolean): Promise<ContractObligation> {
  return isConfigured ? live.setObligationCompleted(id, completed) : demo.setObligationCompleted(id, completed);
}

export function listAllDates(): Promise<live.DateWithContract[]> {
  return isConfigured ? live.listAllDates() : demo.listAllDates();
}

export function listAllRiskFlags(): Promise<live.RiskFlagRef[]> {
  return isConfigured ? live.listAllRiskFlags() : demo.listAllRiskFlags();
}

export function getAnalysisCounts(): Promise<usage.AnalysisCounts> {
  return isConfigured ? usage.getAnalysisCounts() : demo.analysisCounts();
}

export function uploadSourceImage(base64: string, userId: string): Promise<string> {
  return isConfigured ? live.uploadSourceImage(base64, userId) : demo.uploadSource(base64, 'jpg');
}

export function uploadSourcePdf(fileUri: string, userId: string): Promise<string> {
  return isConfigured ? live.uploadSourcePdf(fileUri, userId) : demo.uploadSource(fileUri, 'pdf');
}

export function analyzeContract(paths: string[], kind: 'pdf' | 'images'): Promise<ContractAnalysis> {
  return isConfigured ? live.analyzeContract(paths, kind) : demo.analyze();
}

export function listDocuments(contractId: string): Promise<ContractDocument[]> {
  return isConfigured ? documentsApi.listDocuments(contractId) : demo.listDocuments(contractId);
}

export function attachDocument(
  contractId: string,
  path: string,
  kind: 'image' | 'pdf',
  label: string | null,
  pageNumber: number | null
): Promise<ContractDocument> {
  return isConfigured
    ? documentsApi.attachDocument(contractId, path, kind, label, pageNumber)
    : demo.attachDocument(contractId, path, kind, label, pageNumber);
}

export function uploadDocumentImage(
  contractId: string,
  base64: string,
  userId: string
): Promise<ContractDocument> {
  return isConfigured
    ? documentsApi.uploadDocumentImage(contractId, base64, userId)
    : demo.uploadDocumentImage(contractId, base64);
}

export function uploadDocumentPdf(
  contractId: string,
  fileUri: string,
  userId: string,
  label: string | null
): Promise<ContractDocument> {
  return isConfigured
    ? documentsApi.uploadDocumentPdf(contractId, fileUri, userId, label)
    : demo.uploadDocumentPdf(contractId, fileUri, label);
}

export function deleteDocument(doc: ContractDocument): Promise<void> {
  return isConfigured ? documentsApi.deleteDocument(doc) : demo.deleteDocument(doc);
}

export function getDocumentUrl(path: string): Promise<string> {
  return isConfigured ? documentsApi.getDocumentUrl(path) : demo.fileUrl(path);
}

export function shareDocument(doc: ContractDocument): Promise<void> {
  return getDocumentUrl(doc.storage_path).then((url) => shareRemoteFile(url, doc.kind, doc.id));
}

export function askContract(
  contractId: string,
  question: string,
  history: ChatTurn[]
): Promise<string> {
  return isConfigured ? chatApi.askContract(contractId, question, history) : demo.ask(contractId, question, history);
}

export function getChatCount(): Promise<number> {
  return isConfigured ? usage.getChatCount() : demo.chatCount();
}

export function getIngestAddress(): Promise<string> {
  return isConfigured ? inboxApi.getIngestAddress() : demo.ingestAddress();
}

export function listInbox(): Promise<InboxItem[]> {
  return isConfigured ? inboxApi.listInbox() : demo.listInbox();
}

export function getInboxItem(id: string): Promise<InboxItem> {
  return isConfigured ? inboxApi.getInboxItem(id) : demo.getInboxItem(id);
}

export function removeInboxItem(item: InboxItem, deleteObject: boolean): Promise<void> {
  return isConfigured ? inboxApi.removeInboxItem(item, deleteObject) : demo.removeInboxItem(item, deleteObject);
}

export function updateProfile(patch: profileApi.ProfilePatch): Promise<void> {
  return isConfigured ? profileApi.updateProfile(patch) : demo.updateProfile(patch);
}

export function uploadAvatar(base64: string, userId: string): Promise<string> {
  return isConfigured ? profileApi.uploadAvatar(base64, userId) : demo.uploadAvatar(base64);
}

export function getAvatarUrl(path: string): Promise<string> {
  return isConfigured ? profileApi.getAvatarUrl(path) : demo.avatarUrl();
}
