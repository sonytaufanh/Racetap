import { describe, expect, it } from 'vitest';
import { parseScoresData, timeToSeconds } from './model';
import type { ScoresData } from './types';

const data: ScoresData = {
  race: { title: 'Split Test', items: [{ id: 1, title: '10K' }] },
  scores: [
    {
      id: 42,
      name: 'SPLIT RUNNER',
      bib: '1001',
      sex: 'M',
      item_id: 1,
      finisher: 1,
      net_score: '00:50:00',
      total_score: '00:52:00',
      cp1: '00:10:00',
      cp2: '00:20:00',
      cp3: '00:30:00',
      cp4: '00:40:00',
      cp5: '00:45:00',
      cp6: '00:48:00'
    }
  ]
};

describe('split mapping', () => {
  it('maps all checkpoints from the scores feed', () => {
    const parsed = parseScoresData(data);
    const [runner] = parsed.participants;

    expect(runner.cp1).toBe('00:10:00');
    expect(runner.cp2).toBe('00:20:00');
    expect(runner.cp3).toBe('00:30:00');
    expect(runner.cp4).toBe('00:40:00');
    expect(runner.cp5).toBe('00:45:00');
    expect(runner.cp6).toBe('00:48:00');
  });

  it('orders finishers by net time', () => {
    const parsed = parseScoresData({
      ...data,
      scores: [
        { id: 1, name: 'SLOW', bib: '2', finisher: 1, net_score: '01:10:00' },
        { id: 2, name: 'FAST', bib: '1', finisher: 1, net_score: '00:45:00' }
      ]
    });

    const sorted = parsed.participants.slice().sort((a, b) => timeToSeconds(a.netScore) - timeToSeconds(b.netScore));

    expect(sorted[0].name).toBe('FAST');
    expect(timeToSeconds('01:00:00')).toBe(3600);
    expect(timeToSeconds('')).toBe(Number.POSITIVE_INFINITY);
  });
});
