import { addDays, format } from 'date-fns';
import { statusKind, daysUntil, nextDate } from '@/data/status';
import { ContractDate } from '@/data/types';

const now = new Date('2026-07-10T12:00:00');
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const cd = (due: string, partial: Partial<ContractDate> = {}): ContractDate => ({
  id: `d-${due}`, contract_id: 'c1', label: 'Date', date_type: 'custom',
  due_date: due, recurrence: 'none', reminder_windows: [7],
  created_at: '2026-01-01T00:00:00Z',
  ...partial,
});

describe('contract date proximity', () => {
  it('is overdue the day after the date', () => {
    expect(statusKind(iso(addDays(now, -1)), now)).toBe('overdue');
  });
  it('is soon on the date itself', () => {
    expect(statusKind(iso(now), now)).toBe('soon');
  });
  it('is soon exactly 30 days out', () => {
    expect(statusKind(iso(addDays(now, 30)), now)).toBe('soon');
  });
  it('is upcoming at 31 days out', () => {
    expect(statusKind(iso(addDays(now, 31)), now)).toBe('upcoming');
  });
  it('daysUntil ignores time of day', () => {
    const morning = new Date('2026-07-10T06:00:00');
    const night = new Date('2026-07-10T23:00:00');
    expect(daysUntil(iso(addDays(now, 10)), morning)).toBe(daysUntil(iso(addDays(now, 10)), night));
  });
});

describe('nextDate', () => {
  it('returns the soonest non-past date', () => {
    const past = cd(iso(addDays(now, -5)));
    const near = cd(iso(addDays(now, 3)));
    const far = cd(iso(addDays(now, 40)));
    expect(nextDate([far, past, near], now)).toBe(near);
  });
  it('counts today as upcoming', () => {
    const today = cd(iso(now));
    expect(nextDate([today], now)).toBe(today);
  });
  it('returns null when everything is past', () => {
    expect(nextDate([cd(iso(addDays(now, -1)))], now)).toBeNull();
  });
});
