export const CONTRACT_TYPES = [
  'lease', 'freelance', 'vendor', 'phone_internet', 'subscription',
  'wedding_event', 'insurance', 'employment', 'other',
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  lease: 'Lease',
  freelance: 'Freelance',
  vendor: 'Vendor',
  phone_internet: 'Phone & Internet',
  subscription: 'Subscription',
  wedding_event: 'Wedding & Events',
  insurance: 'Insurance',
  employment: 'Employment',
  other: 'Other',
};

export const CONTRACT_STATUSES = ['active', 'ended', 'archived'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const DATE_TYPES = [
  'payment', 'renewal', 'termination_notice', 'expiry', 'start', 'custom',
] as const;
export type DateType = (typeof DATE_TYPES)[number];

export const DATE_TYPE_LABELS: Record<DateType, string> = {
  payment: 'Payment',
  renewal: 'Renewal',
  termination_notice: 'Notice deadline',
  expiry: 'Ends',
  start: 'Starts',
  custom: 'Date',
};

export const RECURRENCES = ['none', 'monthly', 'yearly'] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const SEVERITIES = ['high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];

// Display only. The stored values stay 'high' | 'medium' | 'low': the DB CHECK,
// the model's JSON schema and every existing row use those, and renaming them
// would be a migration for no gain. Screens must never render the raw enum.
// "HIGH" is developer vocabulary, not something a person reads about a lease.
export const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Critical',
  medium: 'Moderate',
  low: 'Minor',
};

// Reminder windows (days before) a date row may carry. The DB CHECK mirrors
// this set; keep the two in sync.
export const ALLOWED_WINDOWS = [1, 3, 7, 14, 30, 60, 90] as const;

// Default reminder windows by date type. Payments get a short runway, notice
// and renewal deadlines a long one (missing those is the expensive mistake).
export const DEFAULT_WINDOWS: Record<DateType, number[]> = {
  payment: [7, 1],
  renewal: [60, 30, 7],
  termination_notice: [60, 30, 7],
  expiry: [30, 7],
  start: [7],
  custom: [7],
};

// A contract row as stored in Supabase. Dates are ISO date strings (yyyy-MM-dd).
export type Contract = {
  id: string;
  user_id?: string;
  title: string;
  contract_type: ContractType;
  party_you: string | null;
  party_other: string | null;
  summary: string | null;
  payment_terms: string | null;
  total_value: number | null;
  party_other_contact: string | null;
  effective_date: string | null;
  end_date: string | null;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
};

export type ContractDate = {
  id: string;
  contract_id: string;
  user_id?: string;
  label: string;
  date_type: DateType;
  due_date: string;
  recurrence: Recurrence;
  reminder_windows: number[];
  created_at: string;
};

export type ContractObligation = {
  id: string;
  contract_id: string;
  user_id?: string;
  who: string;
  description: string;
  due_note: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ContractRiskFlag = {
  id: string;
  contract_id: string;
  user_id?: string;
  severity: Severity;
  title: string;
  quote: string | null;
  why_it_matters: string;
  created_at: string;
};

// Fields we send on insert (server fills id/user_id/created_at).
export type ContractInsert = Omit<Contract, 'id' | 'user_id' | 'created_at'>;
export type ContractDateInsert = Omit<ContractDate, 'id' | 'user_id' | 'created_at' | 'contract_id'>;
export type ContractObligationInsert = Omit<
  ContractObligation,
  'id' | 'user_id' | 'created_at' | 'contract_id' | 'completed_at'
>;
export type ContractRiskFlagInsert = Omit<ContractRiskFlag, 'id' | 'user_id' | 'created_at' | 'contract_id'>;

// A contract with its children, as the detail screen consumes it.
export type ContractBundle = {
  contract: Contract;
  dates: ContractDate[];
  obligations: ContractObligation[];
  riskFlags: ContractRiskFlag[];
};
