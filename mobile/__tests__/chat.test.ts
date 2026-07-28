import { boundHistory, SUGGESTED_QUESTIONS, MAX_HISTORY_TURNS, MAX_TURN_CHARS, ChatTurn } from '@/data/chat';

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
