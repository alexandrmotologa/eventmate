export interface Participant {
  id: string;
  name: string;
  avatarColor: string;
}

export interface SlotAvailability {
  participantId: string;
  slotKey: string;
  state: 'AVAILABLE' | 'TENTATIVE';
}

export interface SlotQuorum {
  slotKey: string;
  availableCount: number;
  tentativeCount: number;
  totalParticipants: number;
  quorumPercentage: number;
  availableMembers: { id: string; name: string; avatarColor: string; state: 'AVAILABLE' | 'TENTATIVE' }[];
  busyMembers: { id: string; name: string; avatarColor: string }[];
}

export interface GoldenHourWindow {
  date: string;
  startSlot: string;
  endSlot: string;
  durationMinutes: number;
  quorumPercentage: number;
  availableCount: number;
  totalParticipants: number;
  attendeeNames: string[];
  missingNames: string[];
  score: number;
}

/**
 * Builds the quorum matrix for all slots given participants and their availability records.
 */
export function computeQuorumMatrix(
  participants: Participant[],
  slots: SlotAvailability[]
): Record<string, SlotQuorum> {
  const matrix: Record<string, SlotQuorum> = {};
  const total = participants.length;

  const participantMap = new Map<string, Participant>();
  for (const p of participants) {
    participantMap.set(p.id, p);
  }

  // Group slots by slotKey
  const slotsByKey = new Map<string, SlotAvailability[]>();
  for (const slot of slots) {
    if (!slotsByKey.has(slot.slotKey)) {
      slotsByKey.set(slot.slotKey, []);
    }
    slotsByKey.get(slot.slotKey)!.push(slot);
  }

  for (const [slotKey, slotList] of slotsByKey.entries()) {
    const availableMembers: SlotQuorum['availableMembers'] = [];
    const availableIds = new Set<string>();

    let availableCount = 0;
    let tentativeCount = 0;

    for (const s of slotList) {
      const p = participantMap.get(s.participantId);
      if (p) {
        availableMembers.push({
          id: p.id,
          name: p.name,
          avatarColor: p.avatarColor,
          state: s.state,
        });
        availableIds.add(p.id);

        if (s.state === 'AVAILABLE') {
          availableCount++;
        } else {
          tentativeCount++;
        }
      }
    }

    const busyMembers: SlotQuorum['busyMembers'] = [];
    for (const p of participants) {
      if (!availableIds.has(p.id)) {
        busyMembers.push({
          id: p.id,
          name: p.name,
          avatarColor: p.avatarColor,
        });
      }
    }

    const effectiveScore = total > 0 ? (availableCount + 0.5 * tentativeCount) / total : 0;
    const quorumPercentage = Math.round(effectiveScore * 100);

    matrix[slotKey] = {
      slotKey,
      availableCount,
      tentativeCount,
      totalParticipants: total,
      quorumPercentage,
      availableMembers,
      busyMembers,
    };
  }

  return matrix;
}

/**
 * Finds optimal contiguous meeting windows (60m, 90m, or 120m blocks)
 * ranked by quorum percentage and duration.
 */
export function findGoldenHours(
  dates: string[],
  startHour: number,
  endHour: number,
  slotDurationMinutes: number,
  participants: Participant[],
  slots: SlotAvailability[],
  preferredDurationMinutes: number = 60
): GoldenHourWindow[] {
  if (participants.length === 0) return [];

  const matrix = computeQuorumMatrix(participants, slots);
  const windows: GoldenHourWindow[] = [];
  const blocksPerWindow = Math.max(1, Math.round(preferredDurationMinutes / slotDurationMinutes));

  for (const date of dates) {
    const daySlots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotDurationMinutes) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        daySlots.push(`${date}T${hh}:${mm}`);
      }
    }

    // Slide window across daySlots
    for (let i = 0; i <= daySlots.length - blocksPerWindow; i++) {
      const windowSlots = daySlots.slice(i, i + blocksPerWindow);
      const startSlot = windowSlots[0];
      const endSlot = windowSlots[windowSlots.length - 1];

      // Calculate end time
      const [endDate, endTime] = endSlot.split('T');
      const [endH, endM] = endTime.split(':').map(Number);
      let nextM = endM + slotDurationMinutes;
      let nextH = endH;
      if (nextM >= 60) {
        nextH += Math.floor(nextM / 60);
        nextM %= 60;
      }
      const formattedEnd = `${endDate}T${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;

      // A participant is available for the window if they are available for ALL blocks in the window
      const commonAttendees: Participant[] = [];
      const missingAttendees: Participant[] = [];

      for (const p of participants) {
        const isFreeAll = windowSlots.every((sKey) => {
          const q = matrix[sKey];
          return q && q.availableMembers.some((m) => m.id === p.id);
        });

        if (isFreeAll) {
          commonAttendees.push(p);
        } else {
          missingAttendees.push(p);
        }
      }

      const availableCount = commonAttendees.length;
      const total = participants.length;
      const quorumPercentage = total > 0 ? Math.round((availableCount / total) * 100) : 0;

      // Score: high attendance is primary; bonus for full quorum
      const fullAttendanceBonus = quorumPercentage === 100 ? 25 : 0;
      const score = quorumPercentage + fullAttendanceBonus;

      if (availableCount > 0) {
        windows.push({
          date,
          startSlot,
          endSlot: formattedEnd,
          durationMinutes: preferredDurationMinutes,
          quorumPercentage,
          availableCount,
          totalParticipants: total,
          attendeeNames: commonAttendees.map((a) => a.name),
          missingNames: missingAttendees.map((a) => a.name),
          score,
        });
      }
    }
  }

  // Sort descending by score, then duration, then date
  windows.sort((a, b) => b.score - a.score || b.availableCount - a.availableCount);

  // Deduplicate overlapping windows if necessary to return distinct top 3
  const topWindows: GoldenHourWindow[] = [];
  for (const win of windows) {
    const overlaps = topWindows.some(
      (w) => w.date === win.date && w.startSlot === win.startSlot
    );
    if (!overlaps) {
      topWindows.push(win);
    }
    if (topWindows.length >= 5) break;
  }

  return topWindows;
}
