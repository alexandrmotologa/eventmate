import { describe, it, expect } from 'vitest';
import { findGoldenHours, Participant, SlotAvailability } from '../src/engine/overlap.js';

describe('Required Key Members in Golden Hours Algorithm', () => {
  const participants: Participant[] = [
    { id: 'p-alice', name: 'Alice (Host)', avatarColor: '#10B981', isRequired: true },
    { id: 'p-bob', name: 'Bob', avatarColor: '#3B82F6', isRequired: false },
    { id: 'p-charlie', name: 'Charlie', avatarColor: '#F59E0B', isRequired: false },
  ];

  it('should disqualify windows where required participant is absent even with high overall quorum', () => {
    const dates = ['2026-09-18'];
    const slots: SlotAvailability[] = [
      // 18:00 - 19:00: Bob and Charlie free (2/3 = 67%), but Alice (required) is BUSY
      { participantId: 'p-bob', slotKey: '2026-09-18T18:00', state: 'AVAILABLE' },
      { participantId: 'p-bob', slotKey: '2026-09-18T18:30', state: 'AVAILABLE' },
      { participantId: 'p-charlie', slotKey: '2026-09-18T18:00', state: 'AVAILABLE' },
      { participantId: 'p-charlie', slotKey: '2026-09-18T18:30', state: 'AVAILABLE' },

      // 19:00 - 20:00: Alice (required) and Bob free (2/3 = 67%), Charlie is busy
      { participantId: 'p-alice', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p-alice', slotKey: '2026-09-18T19:30', state: 'AVAILABLE' },
      { participantId: 'p-bob', slotKey: '2026-09-18T19:00', state: 'AVAILABLE' },
      { participantId: 'p-bob', slotKey: '2026-09-18T19:30', state: 'AVAILABLE' },
    ];

    const goldenHours = findGoldenHours(dates, 18, 20, 30, participants, slots, 60);

    // Only the window with Alice (19:00 - 20:00) should qualify
    expect(goldenHours.length).toBe(1);
    expect(goldenHours[0].startSlot).toBe('2026-09-18T19:00');
    expect(goldenHours[0].attendeeNames).toContain('Alice (Host)');
    expect(goldenHours[0].attendeeNames).toContain('Bob');
  });
});
