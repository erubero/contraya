import {
  boundHistory, turnsFromRows, SUGGESTED_QUESTIONS,
  MAX_HISTORY_TURNS, MAX_TURN_CHARS, ChatTurn, ChatMessage,
} from '@/data/chat';

const turn = (role: ChatTurn['role'], content: string): ChatTurn => ({ role, content });

describe('boundHistory', () => {
  it('keeps a normal conversation intact', () => {
    const h = [turn('user', 'q1'), turn('assistant', 'a1'), turn('user', 'q2'), turn('assistant', 'a2')];
    expect(boundHistory(h)).toEqual(h);
  });

  it('drops empty and whitespace-only turns', () => {
    const h = [turn('user', 'q1'), turn('assistant', '   '), turn('assistant', 'a1')];
    expect(boundHistory(h)).toEqual([turn('user', 'q1'), turn('assistant', 'a1')]);
  });

  it('caps at the last N turns', () => {
    const h: ChatTurn[] = [];
    for (let i = 0; i < 20; i++) {
      h.push(turn(i % 2 === 0 ? 'user' : 'assistant', `t${i}`));
    }
    const out = boundHistory(h);
    expect(out.length).toBeLessThanOrEqual(MAX_HISTORY_TURNS);
    expect(out[out.length - 1].content).toBe('t19');
  });

  it('never starts with an assistant half-pair after the cap', () => {
    const h: ChatTurn[] = [turn('assistant', 'orphan'), turn('user', 'q'), turn('assistant', 'a')];
    const out = boundHistory(h);
    expect(out[0].role).toBe('user');
  });

  it('caps individual turn length', () => {
    const out = boundHistory([turn('user', 'x'.repeat(MAX_TURN_CHARS + 500))]);
    expect(out[0].content).toHaveLength(MAX_TURN_CHARS);
  });
});

describe('suggested questions', () => {
  it('exist and never ask for advice', () => {
    expect(SUGGESTED_QUESTIONS.length).toBeGreaterThan(0);
    for (const q of SUGGESTED_QUESTIONS) {
      expect(q.toLowerCase()).not.toContain('should');
    }
  });
});

describe('turnsFromRows', () => {
  const row = (seq: number, role: 'user' | 'assistant', content: string): ChatMessage => ({
    id: `m-${seq}`,
    contract_id: 'demo-1',
    seq,
    role,
    content,
    created_at: '2026-08-11T00:00:00Z',
  });

  it('restores a conversation in seq order regardless of array order', () => {
    // Stored data is still input: the API asks for seq order, but the mapping
    // must not depend on getting it.
    const out = turnsFromRows([row(3, 'user', 'q2'), row(1, 'user', 'q1'), row(2, 'assistant', 'a1')]);
    expect(out.map((t) => t.content)).toEqual(['q1', 'a1', 'q2']);
  });

  it('drops blank rows rather than rendering empty bubbles', () => {
    const out = turnsFromRows([row(1, 'user', '  '), row(2, 'assistant', 'a')]);
    expect(out).toEqual([{ role: 'assistant', content: 'a' }]);
  });

  it('round-trips through boundHistory with the first turn a user turn', () => {
    // A restored transcript feeds the same replay path as a live one; the
    // server folds turn 0 into the document message, so it must be a user turn
    // even when the stored window starts on an assistant row.
    const rows = [row(1, 'assistant', 'orphan'), row(2, 'user', 'q'), row(3, 'assistant', 'a')];
    const bounded = boundHistory(turnsFromRows(rows));
    expect(bounded[0].role).toBe('user');
  });
});
