import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase } from './supabase';
import {
  Contract, ContractBundle, ContractInsert,
  ContractDate, ContractDateInsert,
  ContractObligation, ContractObligationInsert,
  ContractRiskFlag, ContractRiskFlagInsert,
} from '@/data/types';
import { parseAnalysis, ContractAnalysis } from '@/data/analysis';

export async function listContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contract[];
}

export async function getContract(id: string): Promise<Contract> {
  const { data, error } = await supabase.from('contracts').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Contract;
}

export async function getBundle(id: string): Promise<ContractBundle> {
  const [contract, dates, obligations, riskFlags] = await Promise.all([
    getContract(id),
    supabase.from('contract_dates').select('*').eq('contract_id', id).order('due_date'),
    supabase.from('contract_obligations').select('*').eq('contract_id', id).order('created_at'),
    supabase.from('contract_risk_flags').select('*').eq('contract_id', id).order('created_at'),
  ]);
  if (dates.error) throw dates.error;
  if (obligations.error) throw obligations.error;
  if (riskFlags.error) throw riskFlags.error;
  return {
    contract,
    dates: (dates.data ?? []) as ContractDate[],
    obligations: (obligations.data ?? []) as ContractObligation[],
    riskFlags: (riskFlags.data ?? []) as ContractRiskFlag[],
  };
}

// Insert the contract first, then its children. A child insert failing does
// not orphan silently: the error propagates and the caller keeps the review
// state, so the user can retry the save.
export async function createContract(
  contract: ContractInsert,
  dates: ContractDateInsert[],
  obligations: ContractObligationInsert[],
  riskFlags: ContractRiskFlagInsert[]
): Promise<ContractBundle> {
  const { data, error } = await supabase.from('contracts').insert(contract).select().single();
  if (error) throw error;
  const row = data as Contract;

  const withId = <T extends object>(items: T[]) => items.map((i) => ({ ...i, contract_id: row.id }));
  if (dates.length > 0) {
    const { error: e } = await supabase.from('contract_dates').insert(withId(dates));
    if (e) throw e;
  }
  if (obligations.length > 0) {
    const { error: e } = await supabase.from('contract_obligations').insert(withId(obligations));
    if (e) throw e;
  }
  if (riskFlags.length > 0) {
    const { error: e } = await supabase.from('contract_risk_flags').insert(withId(riskFlags));
    if (e) throw e;
  }
  return getBundle(row.id);
}

export async function updateContract(id: string, patch: Partial<Contract>): Promise<Contract> {
  const { data, error } = await supabase.from('contracts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Contract;
}

export async function deleteContract(contract: Contract): Promise<void> {
  // Collect every storage object first: the rows cascade with the contract,
  // so after the delete there is nothing left to ask.
  const { data: docs } = await supabase
    .from('contract_documents')
    .select('storage_path')
    .eq('contract_id', contract.id);
  const paths = (docs ?? []).map((d) => d.storage_path as string);

  const { error } = await supabase.from('contracts').delete().eq('id', contract.id);
  if (error) throw error;
  if (paths.length > 0) {
    await supabase.storage.from('documents').remove(paths).catch(() => {});
  }
}

export async function setObligationCompleted(
  id: string,
  completed: boolean
): Promise<ContractObligation> {
  const { data, error } = await supabase
    .from('contract_obligations')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ContractObligation;
}

// Every date row across the user's active contracts, with the contract title
// the calendar and the reminder planner both need.
export type DateWithContract = ContractDate & { contracts: { title: string; status: string } };

export async function listAllDates(): Promise<DateWithContract[]> {
  const { data, error } = await supabase
    .from('contract_dates')
    .select('*, contracts!inner(title, status)')
    .eq('contracts.status', 'active')
    .order('due_date');
  if (error) throw error;
  return (data ?? []) as DateWithContract[];
}

// Uploads a source file to the private bucket under the owner's folder BEFORE
// analysis (the edge function reads it from storage by path). Always base64 →
// ArrayBuffer: passing an RN Blob to supabase-js is the classic silent
// 0-byte-upload bug, so never "simplify" this to fetch(uri).blob().
export async function uploadSourceImage(base64: string, userId: string): Promise<string> {
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('documents').upload(path, decodeBase64(base64), {
    contentType: 'image/jpeg',
  });
  if (error) throw error;
  return path;
}

export async function uploadSourcePdf(fileUri: string, userId: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = `${userId}/${Crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from('documents').upload(path, decodeBase64(base64), {
    contentType: 'application/pdf',
  });
  if (error) throw error;
  return path;
}

// Sends storage paths to the edge function, which downloads, calls the model,
// and returns the structured analysis.
export async function analyzeContract(
  paths: string[],
  kind: 'pdf' | 'images'
): Promise<ContractAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-contract', {
    body: { paths, kind },
  });
  if (error) throw error;
  return parseAnalysis((data as { analysis?: unknown })?.analysis);
}
