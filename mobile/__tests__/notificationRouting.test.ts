import { contractIdFromResponse, contractIdFromNotificationId } from '@/lib/reminderPlanner';

// Tap routing must work for BOTH notification shapes: local reminders encode
// the contract id in the scheduled identifier; the server push cron sends a
// platform-random identifier and carries the id in data.contractId.

const CONTRACT_ID = '8b7c2f1a-4d3e-4a5b-9c8d-7e6f5a4b3c2d';
const LOCAL_ID = `contract.${CONTRACT_ID}.date-1.2026-08-15.7d`;

describe('contractIdFromResponse', () => {
  it('reads the push payload contractId over a platform-random identifier', () => {
    expect(
      contractIdFromResponse({
        identifier: 'F2A9C41E-0000-4000-8000-123456789ABC',
        data: { contractId: CONTRACT_ID },
      })
    ).toBe(CONTRACT_ID);
  });

  it('parses a local reminder identifier when there is no payload', () => {
    expect(contractIdFromResponse({ identifier: LOCAL_ID })).toBe(CONTRACT_ID);
    expect(contractIdFromResponse({ identifier: LOCAL_ID, data: undefined })).toBe(CONTRACT_ID);
  });

  it('prefers the payload when both are present', () => {
    const other = '11111111-2222-4333-8444-555555555555';
    expect(
      contractIdFromResponse({ identifier: LOCAL_ID, data: { contractId: other } })
    ).toBe(other);
  });

  it('falls back to the identifier when the payload id is unusable', () => {
    for (const bad of ['', '../escape', 'a'.repeat(65), 42, null, { nested: true }]) {
      expect(contractIdFromResponse({ identifier: LOCAL_ID, data: { contractId: bad } })).toBe(
        CONTRACT_ID
      );
    }
  });

  it('returns null when neither side carries a contract id', () => {
    expect(contractIdFromResponse({ identifier: 'not-a-reminder' })).toBeNull();
    expect(contractIdFromResponse({ identifier: '', data: {} })).toBeNull();
    expect(contractIdFromResponse({ identifier: '', data: 'string' })).toBeNull();
  });

  it('stays consistent with the raw identifier parser', () => {
    expect(contractIdFromNotificationId(LOCAL_ID)).toBe(CONTRACT_ID);
    expect(contractIdFromResponse({ identifier: LOCAL_ID })).toBe(
      contractIdFromNotificationId(LOCAL_ID)
    );
  });
});
