import { describe, it, expect } from 'vitest';
import { computeInstantRunoff, computeBordaCount, RankedBallot } from '../src/engine/rankedChoice.js';

describe('Instant-Runoff Voting (IRV) Algorithm', () => {
  it('should elect candidate with immediate > 50% majority in Round 1', () => {
    const candidates = ['opt-a', 'opt-b', 'opt-c'];
    const ballots: RankedBallot[] = [
      { voterId: 'v1', preferences: ['opt-a', 'opt-b', 'opt-c'] },
      { voterId: 'v2', preferences: ['opt-a', 'opt-c', 'opt-b'] },
      { voterId: 'v3', preferences: ['opt-a', 'opt-b', 'opt-c'] },
      { voterId: 'v4', preferences: ['opt-b', 'opt-a', 'opt-c'] },
    ];

    const result = computeInstantRunoff(candidates, ballots);
    expect(result.winnerId).toBe('opt-a');
    expect(result.rounds.length).toBe(1);
    expect(result.rounds[0].tally['opt-a']).toBe(3);
    expect(result.rounds[0].majorityThreshold).toBe(2);
  });

  it('should eliminate lowest candidate and reallocate votes in subsequent rounds', () => {
    const candidates = ['pizza', 'sushi', 'burger'];
    // 5 voters:
    // 2 prefer Pizza > Burger > Sushi
    // 2 prefer Sushi > Burger > Pizza
    // 1 prefers Burger > Pizza > Sushi
    // Round 1: Pizza: 2, Sushi: 2, Burger: 1. (Total active: 5, majority threshold: 2.5)
    // Burger is eliminated. Burger's 1 vote transfers to Pizza!
    // Round 2: Pizza: 3, Sushi: 2. Pizza has 3 > 2.5 -> Pizza wins!
    const ballots: RankedBallot[] = [
      { voterId: 'v1', preferences: ['pizza', 'burger', 'sushi'] },
      { voterId: 'v2', preferences: ['pizza', 'burger', 'sushi'] },
      { voterId: 'v3', preferences: ['sushi', 'burger', 'pizza'] },
      { voterId: 'v4', preferences: ['sushi', 'burger', 'pizza'] },
      { voterId: 'v5', preferences: ['burger', 'pizza', 'sushi'] },
    ];

    const result = computeInstantRunoff(candidates, ballots);
    expect(result.winnerId).toBe('pizza');
    expect(result.rounds.length).toBe(2);
    expect(result.rounds[0].eliminatedId).toBe('burger');
    expect(result.rounds[1].tally['pizza']).toBe(3);
    expect(result.rounds[1].tally['sushi']).toBe(2);
  });

  it('should handle single candidate scenario', () => {
    const result = computeInstantRunoff(['single'], [{ voterId: 'v1', preferences: ['single'] }]);
    expect(result.winnerId).toBe('single');
    expect(result.rounds.length).toBe(1);
  });

  it('should handle empty candidates list gracefully', () => {
    const result = computeInstantRunoff([], []);
    expect(result.winnerId).toBeNull();
    expect(result.rounds.length).toBe(0);
  });
});

describe('Borda Count Scoring Algorithm', () => {
  it('should assign points correctly (N for 1st, N-1 for 2nd...)', () => {
    const candidates = ['pizza', 'sushi', 'burger'];
    const ballots: RankedBallot[] = [
      { voterId: 'v1', preferences: ['pizza', 'sushi', 'burger'] }, // pizza: 3, sushi: 2, burger: 1
      { voterId: 'v2', preferences: ['sushi', 'pizza', 'burger'] }, // sushi: 3, pizza: 2, burger: 1
    ];

    const scores = computeBordaCount(candidates, ballots);
    const pizzaScore = scores.find((s) => s.candidateId === 'pizza');
    const sushiScore = scores.find((s) => s.candidateId === 'sushi');
    const burgerScore = scores.find((s) => s.candidateId === 'burger');

    expect(pizzaScore?.points).toBe(5);
    expect(sushiScore?.points).toBe(5);
    expect(burgerScore?.points).toBe(2);
  });
});
