import { describe, it, expect } from 'vitest';
import { computeQuorumMatrix, findGoldenHours, Participant, SlotAvailability } from '../src/engine/overlap.js';

describe('Availability Overlap & Golden Hour Engine', () => {
  const participants: Participant[] = [
    { id: 'p1', name: 'Alice', avatarColor: '#10B981' },
    { id: 'p2', name: 'Bob', avatarColor: '#3B82F6' },
    { id: 'p3', name: 'Charlie', avatarColor: '#F59E0B' },
  ];

  it('should compute exact quorum percentages for slots', () => {
    const slots: SlotAvailability[] = [
      { participantId: 'p1', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p2', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p3', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p1', slotKey: '2026-09-18T19:30', state: 'AVAILABLE' },
      { participantId: 'p2', slotKey: '2026-09-18T19:30', state: 'TENTATIVE' },
    ];

    const matrix = computeQuorumMatrix(participants, slots);

    // 19:00 has 3/3 -> 100%
    expect(matrix['2026-09-18T19:00'].availableCount).toBe(3);
    expect(matrix['2026-09-18T19:00'].quorumPercentage).toBe(100);
    expect(matrix['2026-09-18T19:00'].availableMembers.length).toBe(3);
    expect(matrix['2026-09-18T19:00'].busyMembers.length).toBe(0);

    // 19:30 has 1 available + 1 tentative (0.5) out of 3 -> ~50%
    expect(matrix['2026-09-18T19:30'].availableCount).toBe(1);
    expect(matrix['2026-09-18T19:30'].tentativeCount).toBe(1);
    expect(matrix['2026-09-18T19:30'].quorumPercentage).toBe(50);
    expect(matrix['2026-09-18T19:30'].busyMembers.length).toBe(1);
    expect(matrix['2026-09-18T19:30'].busyMembers[0].name).toBe('Charlie');
  });

  it('should detect contiguous 60-minute Golden Hour window', () => {
    const dates = ['2026-09-18'];
    const slots: SlotAvailability[] = [
      // Alice free 19:00 to 20:00 (2 blocks: 19:00 and 19:30)
      { participantId: 'p1', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p1', slotKey: '2026-09-18T19:30', state: 'AVAILABLE' },
      // Bob free 19:00 to 20:00
      { participantId: 'p2', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p2', slotKey: '2026-09-18T19:30', state: 'AVAILABLE' },
      // Charlie free 19:00 to 20:00
      { participantId: 'p3', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p3', slotKey: '2026-09-18T19:30', state: 'AVAILABLE' },
    ];

    const goldenHours = findGoldenHours(dates, 18, 22, 30, participants, slots, 60);

    expect(goldenHours.length).toBeGreaterThan(0);
    const top = goldenHours[0];
    expect(top.startSlot).toBe('2026-09-18T19:00');
    expect(top.endSlot).toBe('2026-09-18T20:00');
    expect(top.quorumPercentage).toBe(100);
    expect(top.availableCount).toBe(3);
    expect(top.attendeeNames).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
