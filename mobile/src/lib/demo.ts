import { addDays, addMonths, format, startOfMonth } from 'date-fns';
import {
  Contract, ContractBundle, ContractInsert,
  ContractDate, ContractDateInsert,
  ContractObligation, ContractObligationInsert,
  ContractRiskFlag, ContractRiskFlagInsert,
} from '@/data/types';
import { ContractDocument } from '@/data/documents';
import { ContractAnalysis } from '@/data/analysis';
import { InboxItem, ingestAddress } from '@/data/inbox';
import { EMAIL_IN_ENABLED } from '@/lib/appMeta';
import { ChatTurn } from '@/data/chat';
import { AnalysisCounts } from '@/api/usage';
import { DateWithContract, RiskFlagRef } from '@/api/contracts';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

// Two contracts that show every surface with no backend: a lease carrying an
// auto-renewal risk flag and recurring rent, and a wedding vendor contract
// carrying obligations. This is also what the App Store reviewer sees.
function seed(): { contracts: Contract[]; dates: ContractDate[]; obligations: ContractObligation[]; riskFlags: ContractRiskFlag[] } {
  const now = new Date();
  const ts = (i: number) => new Date(now.getTime() - i * 1000).toISOString();

  const lease: Contract = {
    id: 'demo-1',
    title: 'Apartment lease, 12 Palm Ave',
    contract_type: 'lease',
    party_you: 'You (tenant)',
    party_other: 'Palm Grove Properties LLC',
    summary:
      'You rent the apartment at 12 Palm Ave for 12 months at $1,850 a month, due on the 1st. ' +
      'A late fee of $75 applies after the 5th. The lease renews by itself for another 12 months ' +
      'unless you give written notice at least 60 days before the end date. The deposit is $1,850, ' +
      'returned within 30 days of move-out minus any repair costs beyond normal wear.',
    payment_terms: '$1,850 due the 1st of each month. $75 late fee after the 5th.',
    total_value: 22200,
    party_other_contact: 'leasing@palmgroveproperties.com',
    effective_date: iso(addMonths(now, -3)),
    end_date: iso(addMonths(now, 9)),
    status: 'active',
    notes: null,
    created_at: ts(1),
  };
  const wedding: Contract = {
    id: 'demo-2',
    title: 'Wedding venue, Casa del Mar',
    contract_type: 'wedding_event',
    party_you: 'You (client)',
    party_other: 'Casa del Mar Events',
    summary:
      'Casa del Mar hosts your event on the reserved date for a total of $8,500: $2,500 was due at ' +
      'signing and the remaining $6,000 is due 30 days before the event. You must provide meals for ' +
      'the vendor staff (6 people) and confirm the final guest count 14 days before. Cancelling ' +
      'within 90 days of the event forfeits the deposit.',
    payment_terms: '$2,500 deposit at signing; $6,000 balance due 30 days before the event.',
    total_value: 8500,
    party_other_contact: 'events@casadelmar.com',
    effective_date: iso(addMonths(now, -1)),
    end_date: iso(addDays(now, 75)),
    status: 'active',
    notes: null,
    created_at: ts(2),
  };

  const dates: ContractDate[] = [
    {
      id: 'demo-date-1', contract_id: lease.id, label: 'Rent payment',
      date_type: 'payment', due_date: iso(startOfMonth(addMonths(now, 1))),
      recurrence: 'monthly', reminder_windows: [7, 1], created_at: ts(3),
    },
    {
      id: 'demo-date-2', contract_id: lease.id, label: 'Renewal notice deadline',
      date_type: 'termination_notice', due_date: iso(addDays(addMonths(now, 9), -60)),
      recurrence: 'none', reminder_windows: [60, 30, 7], created_at: ts(4),
    },
    {
      id: 'demo-date-3', contract_id: lease.id, label: 'Lease ends',
      date_type: 'expiry', due_date: lease.end_date as string,
      recurrence: 'none', reminder_windows: [30, 7], created_at: ts(5),
    },
    {
      id: 'demo-date-4', contract_id: wedding.id, label: 'Final balance due',
      date_type: 'payment', due_date: iso(addDays(now, 45)),
      recurrence: 'none', reminder_windows: [7, 1], created_at: ts(6),
    },
    {
      id: 'demo-date-5', contract_id: wedding.id, label: 'Confirm final guest count',
      date_type: 'custom', due_date: iso(addDays(now, 61)),
      recurrence: 'none', reminder_windows: [7], created_at: ts(7),
    },
  ];

  const obligations: ContractObligation[] = [
    {
      id: 'demo-ob-1', contract_id: wedding.id, who: 'You',
      description: 'Provide meals for the vendor staff (6 people) on the event day.',
      due_note: 'Event day', completed_at: null, created_at: ts(8),
    },
    {
      id: 'demo-ob-2', contract_id: wedding.id, who: 'You',
      description: 'Confirm the final guest count with the venue.',
      due_note: '14 days before the event', completed_at: null, created_at: ts(9),
    },
    {
      id: 'demo-ob-3', contract_id: lease.id, who: 'You',
      description: 'Give written notice 60 days before the end date if you do not want the lease to renew.',
      due_note: '60 days before the lease ends', completed_at: null, created_at: ts(10),
    },
  ];

  const riskFlags: ContractRiskFlag[] = [
    {
      id: 'demo-risk-1', contract_id: lease.id, severity: 'high',
      title: 'Renews by itself',
      quote: 'This lease shall automatically renew for successive twelve month terms unless Tenant provides written notice no fewer than sixty days prior to expiration.',
      why_it_matters: 'The lease continues for another full year unless written notice reaches the landlord at least 60 days before the end date.',
      created_at: ts(11),
    },
    {
      id: 'demo-risk-2', contract_id: lease.id, severity: 'medium',
      title: 'Late fee after the 5th',
      quote: 'Rent received after the fifth day of the month incurs a late charge of seventy-five dollars.',
      why_it_matters: 'Paying after the 5th adds $75 to that month, on top of the rent itself.',
      created_at: ts(12),
    },
    {
      id: 'demo-risk-3', contract_id: wedding.id, severity: 'high',
      title: 'Deposit lost on late cancellation',
      quote: 'Cancellation within ninety days of the reserved date forfeits all deposits paid.',
      why_it_matters: 'Cancelling within 90 days of the event means the $2,500 deposit is not returned.',
      created_at: ts(13),
    },
  ];

  return { contracts: [lease, wedding], dates, obligations, riskFlags };
}

function seedInbox(): InboxItem[] {
  // Empty while email-in is off. Demo mode is what the App Store screenshots
  // are captured in, so a seeded inbox row would advertise a feature 1.0 does
  // not ship, and the fake address below is the one audit finding 35 warned a
  // reviewer might try to email.
  if (!EMAIL_IN_ENABLED) return [];
  return [{
    id: 'demo-inbox-1',
    storage_path: 'demo/inbox-ironworks.pdf',
    kind: 'pdf',
    original_filename: 'IronWorks membership agreement.pdf',
    from_address: 'memberships@ironworksfit.com',
    subject: 'Your membership agreement',
    received_at: new Date().toISOString(),
  }];
}

let db = seed();
let inbox: InboxItem[] = seedInbox();
const files: Record<string, string> = {};
let documents: ContractDocument[] = [];
let profile: { displayName: string | null; avatarUri: string | null } = {
  displayName: null,
  avatarUri: null,
};

const bundleOf = (c: Contract): ContractBundle => ({
  contract: c,
  dates: db.dates.filter((d) => d.contract_id === c.id),
  obligations: db.obligations.filter((o) => o.contract_id === c.id),
  riskFlags: db.riskFlags.filter((r) => r.contract_id === c.id),
});

export const demo = {
  reset() {
    db = seed();
    inbox = seedInbox();
    documents = [];
    profile = { displayName: null, avatarUri: null };
  },
  async list(): Promise<Contract[]> {
    return [...db.contracts].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },
  async get(id: string): Promise<Contract> {
    const c = db.contracts.find((x) => x.id === id);
    if (!c) throw new Error('Not found');
    return c;
  },
  async getBundle(id: string): Promise<ContractBundle> {
    return bundleOf(await this.get(id));
  },
  async create(
    contract: ContractInsert,
    dates: ContractDateInsert[],
    obligations: ContractObligationInsert[],
    riskFlags: ContractRiskFlagInsert[]
  ): Promise<ContractBundle> {
    const now = Date.now();
    const row: Contract = { ...contract, id: `demo-${now}`, created_at: new Date().toISOString() };
    db.contracts = [row, ...db.contracts];
    db.dates = [
      ...db.dates,
      ...dates.map((d, i) => ({
        ...d, id: `demo-date-${now}-${i}`, contract_id: row.id, created_at: new Date().toISOString(),
      })),
    ];
    db.obligations = [
      ...db.obligations,
      ...obligations.map((o, i) => ({
        ...o, id: `demo-ob-${now}-${i}`, contract_id: row.id,
        completed_at: null, created_at: new Date().toISOString(),
      })),
    ];
    db.riskFlags = [
      ...db.riskFlags,
      ...riskFlags.map((r, i) => ({
        ...r, id: `demo-risk-${now}-${i}`, contract_id: row.id, created_at: new Date().toISOString(),
      })),
    ];
    return bundleOf(row);
  },
  async remove(contract: Contract): Promise<void> {
    db.contracts = db.contracts.filter((x) => x.id !== contract.id);
    db.dates = db.dates.filter((x) => x.contract_id !== contract.id);
    db.obligations = db.obligations.filter((x) => x.contract_id !== contract.id);
    db.riskFlags = db.riskFlags.filter((x) => x.contract_id !== contract.id);
    documents = documents.filter((d) => d.contract_id !== contract.id);
  },
  async update(id: string, patch: Partial<Contract>): Promise<Contract> {
    db.contracts = db.contracts.map((c) => (c.id === id ? { ...c, ...patch } : c));
    return this.get(id);
  },
  async setObligationCompleted(id: string, completed: boolean): Promise<ContractObligation> {
    db.obligations = db.obligations.map((o) =>
      o.id === id ? { ...o, completed_at: completed ? new Date().toISOString() : null } : o
    );
    const o = db.obligations.find((x) => x.id === id);
    if (!o) throw new Error('Not found');
    return o;
  },
  async listAllDates(): Promise<DateWithContract[]> {
    const out: DateWithContract[] = [];
    for (const d of [...db.dates].sort((a, b) => (a.due_date < b.due_date ? -1 : 1))) {
      const c = db.contracts.find((x) => x.id === d.contract_id);
      if (c && c.status === 'active') {
        out.push({ ...d, contracts: { title: c.title, status: c.status } });
      }
    }
    return out;
  },
  async listAllRiskFlags(): Promise<RiskFlagRef[]> {
    return db.riskFlags.map((r) => ({ contract_id: r.contract_id, severity: r.severity }));
  },
  async analysisCounts(): Promise<AnalysisCounts> {
    return { lifetime: 0, month: 0 };
  },
  async uploadSource(base64OrUri: string, ext: 'jpg' | 'pdf'): Promise<string> {
    const path = `demo/${Date.now()}.${ext}`;
    if (ext === 'jpg') files[path] = `data:image/jpeg;base64,${base64OrUri}`;
    return path;
  },
  async fileUrl(path: string): Promise<string> {
    return files[path] ?? '';
  },
  async listDocuments(contractId: string): Promise<ContractDocument[]> {
    return documents.filter((d) => d.contract_id === contractId);
  },
  async attachDocument(
    contractId: string,
    path: string,
    kind: 'image' | 'pdf',
    label: string | null,
    pageNumber: number | null
  ): Promise<ContractDocument> {
    const doc: ContractDocument = {
      id: `demo-doc-${Date.now()}-${documents.length}`,
      contract_id: contractId,
      storage_path: path,
      kind,
      label,
      page_number: pageNumber,
      created_at: new Date().toISOString(),
    };
    documents = [...documents, doc];
    return doc;
  },
  async uploadDocumentImage(contractId: string, base64: string): Promise<ContractDocument> {
    const path = await this.uploadSource(base64, 'jpg');
    return this.attachDocument(contractId, path, 'image', null, null);
  },
  async uploadDocumentPdf(contractId: string, _fileUri: string, label: string | null): Promise<ContractDocument> {
    return this.attachDocument(contractId, `demo/${Date.now()}.pdf`, 'pdf', label, null);
  },
  async deleteDocument(doc: ContractDocument): Promise<void> {
    documents = documents.filter((d) => d.id !== doc.id);
    delete files[doc.storage_path];
  },
  profile(): { displayName: string | null; avatarPath: string | null } {
    return { displayName: profile.displayName, avatarPath: profile.avatarUri ? 'demo-avatar' : null };
  },
  async updateProfile(patch: { displayName?: string; avatarPath?: string | null }): Promise<void> {
    if (patch.displayName !== undefined) profile.displayName = patch.displayName;
    // Clearing the path is how "Remove Photo" lands; uploads set avatarUri
    // directly in uploadAvatar, so only the null case matters here.
    if (patch.avatarPath === null) profile.avatarUri = null;
  },
  async uploadAvatar(base64: string): Promise<string> {
    profile.avatarUri = `data:image/jpeg;base64,${base64}`;
    return 'demo-avatar';
  },
  async avatarUrl(): Promise<string> {
    return profile.avatarUri ?? '';
  },
  async chatCount(): Promise<number> {
    return 0;
  },
  async ask(contractId: string, question: string, _history: ChatTurn[]): Promise<string> {
    await new Promise((r) => setTimeout(r, 1200));
    const c = db.contracts.find((x) => x.id === contractId);
    const q = question.toLowerCase();
    // Legal-conclusion questions never get a yes or a no, in demo mode too:
    // this is the behavior App Review sees.
    if (/\b(sue|sued|court|lawsuit|evict|eviction|illegal|legal|enforceable|win|charges)\b/.test(q)) {
      return 'Whether anyone can sue, evict, or win a dispute is a question for a licensed attorney, not for this contract. What the contract does say about the situation: payments, deadlines, and penalties are listed on the contract screen, in its own words. It does not contain a dispute or arbitration clause beyond that.';
    }
    if (c?.contract_type === 'lease') {
      if (q.includes('renew')) {
        return 'The lease renews by itself for another 12 months unless written notice reaches the landlord at least 60 days before the end date. The contract says: "This lease shall automatically renew for successive twelve month terms unless Tenant provides written notice no fewer than sixty days prior to expiration."';
      }
      if (q.includes('cancel')) {
        return 'The contract sets a notice window rather than a cancellation fee: written notice at least 60 days before the end date stops the renewal. It does not describe a way to end the lease earlier than the end date.';
      }
      if (q.includes('late') || q.includes('payment')) {
        return 'Rent is $1,850, due the 1st of each month. The contract says rent received after the 5th adds a $75 late charge for that month.';
      }
      if (q.includes('agree') || q.includes('do')) {
        return 'The contract has you paying $1,850 by the 1st each month and giving written notice 60 days before the end date if you do not want another year. The deposit comes back within 30 days of move-out, minus repair costs beyond normal wear.';
      }
    }
    return 'The contract does not answer that directly. The closest thing it covers is described in the summary on the contract screen.';
  },
  async ingestAddress(): Promise<string> {
    return ingestAddress('deadbeefdeadbeefdeadbeefdeadbeef');
  },
  async listInbox(): Promise<InboxItem[]> {
    return [...inbox];
  },
  async getInboxItem(id: string): Promise<InboxItem> {
    const item = inbox.find((i) => i.id === id);
    if (!item) throw new Error('Not found');
    return item;
  },
  async removeInboxItem(item: InboxItem, deleteObject: boolean): Promise<void> {
    inbox = inbox.filter((i) => i.id !== item.id);
    if (deleteObject) delete files[item.storage_path];
  },
  async analyze(): Promise<ContractAnalysis> {
    await new Promise((r) => setTimeout(r, 2500));
    const now = new Date();
    return {
      title: 'Gym membership, IronWorks Fitness',
      contract_type: 'subscription',
      party_you: 'You (member)',
      party_other: 'IronWorks Fitness',
      summary:
        'You join IronWorks Fitness for 12 months at $49 a month, charged on the 15th. ' +
        'The membership renews by itself each year unless you cancel in writing 30 days ' +
        'before the renewal date. Freezing the membership costs $10 a month.',
      payment_terms: '$49 charged the 15th of each month.',
      total_value: null,
      party_other_contact: 'members@ironworksfit.com',
      key_dates: [
        {
          label: 'Membership payment', date: iso(addDays(now, 20)),
          date_type: 'payment', recurrence: 'monthly', note: 'Charged the 15th of each month',
          verified: 'confirmed',
        },
        {
          label: 'Cancellation notice deadline', date: iso(addMonths(now, 11)),
          date_type: 'termination_notice', recurrence: 'none', note: '30 days before renewal',
          verified: 'confirmed',
        },
      ],
      obligations: [
        {
          who: 'You',
          description: 'Cancel in writing at least 30 days before the renewal date if you do not want another year.',
          due_note: '30 days before renewal',
        },
      ],
      risk_flags: [
        {
          severity: 'high',
          title: 'Renews by itself',
          quote: 'Memberships automatically renew for successive twelve month terms absent written notice of cancellation thirty days prior to renewal.',
          why_it_matters: 'The membership continues for another full year unless written notice arrives 30 days before the renewal date.',
        },
      ],
    };
  },
};
