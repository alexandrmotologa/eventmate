export interface RankedBallot {
  voterId: string;
  voterName?: string;
  preferences: string[]; // Option IDs sorted from 1st choice to last choice
}

export interface CandidateInfo {
  id: string;
  text: string;
  icon?: string;
}

export interface IRVRound {
  roundNumber: number;
  tally: Record<string, number>;
  eliminatedId?: string;
  exhaustedVotes: number;
  totalActiveVotes: number;
  majorityThreshold: number;
}

export interface IRVResult {
  winnerId: string | null;
  rounds: IRVRound[];
  exhaustedBallotCount: number;
  isTie: boolean;
}

export interface BordaScore {
  candidateId: string;
  points: number;
  firstChoiceCount: number;
}

/**
 * Computes Instant-Runoff Voting (Ranked Choice) winner and round-by-round tally.
 */
export function computeInstantRunoff(
  candidateIds: string[],
  ballots: RankedBallot[]
): IRVResult {
  if (candidateIds.length === 0) {
    return { winnerId: null, rounds: [], exhaustedBallotCount: 0, isTie: false };
  }

  if (candidateIds.length === 1) {
    const single = candidateIds[0];
    return {
      winnerId: single,
      rounds: [
        {
          roundNumber: 1,
          tally: { [single]: ballots.length },
          exhaustedVotes: 0,
          totalActiveVotes: ballots.length,
          majorityThreshold: ballots.length / 2,
        },
      ],
      exhaustedBallotCount: 0,
      isTie: false,
    };
  }

  const activeCandidates = new Set<string>(candidateIds);
  const rounds: IRVRound[] = [];
  let roundNumber = 1;

  while (activeCandidates.size > 0) {
    const tally: Record<string, number> = {};
    for (const id of activeCandidates) {
      tally[id] = 0;
    }

    let exhaustedVotes = 0;

    for (const ballot of ballots) {
      const topChoice = ballot.preferences.find((id) => activeCandidates.has(id));
      if (topChoice) {
        tally[topChoice] = (tally[topChoice] || 0) + 1;
      } else {
        exhaustedVotes++;
      }
    }

    const totalActiveVotes = Object.values(tally).reduce((sum, count) => sum + count, 0);
    const majorityThreshold = totalActiveVotes / 2;

    // Check for majority winner (> 50% of active votes)
    for (const [candidate, votes] of Object.entries(tally)) {
      if (votes > majorityThreshold && totalActiveVotes > 0) {
        rounds.push({
          roundNumber,
          tally,
          exhaustedVotes,
          totalActiveVotes,
          majorityThreshold,
        });
        return {
          winnerId: candidate,
          rounds,
          exhaustedBallotCount: exhaustedVotes,
          isTie: false,
        };
      }
    }

    // If only one candidate remains, they win
    if (activeCandidates.size === 1) {
      const remaining = Array.from(activeCandidates)[0];
      rounds.push({
        roundNumber,
        tally,
        exhaustedVotes,
        totalActiveVotes,
        majorityThreshold,
      });
      return {
        winnerId: remaining,
        rounds,
        exhaustedBallotCount: exhaustedVotes,
        isTie: false,
      };
    }

    // Check if all active candidates have equal votes
    const voteValues = Object.values(tally);
    const allEqual = voteValues.length > 0 && voteValues.every((v) => v === voteValues[0]);
    if (allEqual) {
      // Tie breaker: pick candidate with highest first preferences in original ballots
      const originalFirstPreferences: Record<string, number> = {};
      for (const id of activeCandidates) {
        originalFirstPreferences[id] = 0;
      }
      for (const ballot of ballots) {
        const first = ballot.preferences[0];
        if (first && activeCandidates.has(first)) {
          originalFirstPreferences[first]++;
        }
      }

      const sortedByOriginal = Array.from(activeCandidates).sort(
        (a, b) => (originalFirstPreferences[b] || 0) - (originalFirstPreferences[a] || 0)
      );

      rounds.push({
        roundNumber,
        tally,
        exhaustedVotes,
        totalActiveVotes,
        majorityThreshold,
      });

      return {
        winnerId: sortedByOriginal[0] || null,
        rounds,
        exhaustedBallotCount: exhaustedVotes,
        isTie: true,
      };
    }

    // Find candidate(s) with minimum votes to eliminate
    let minVotes = Infinity;
    let candidatesWithMin: string[] = [];

    for (const [candidate, votes] of Object.entries(tally)) {
      if (votes < minVotes) {
        minVotes = votes;
        candidatesWithMin = [candidate];
      } else if (votes === minVotes) {
        candidatesWithMin.push(candidate);
      }
    }

    // In case of tie for lowest votes, eliminate the one with fewest original first-choice votes
    let toEliminate = candidatesWithMin[0];
    if (candidatesWithMin.length > 1) {
      const firstChoiceCounts: Record<string, number> = {};
      for (const id of candidatesWithMin) {
        firstChoiceCounts[id] = 0;
      }
      for (const ballot of ballots) {
        const first = ballot.preferences[0];
        if (first && firstChoiceCounts[first] !== undefined) {
          firstChoiceCounts[first]++;
        }
      }
      candidatesWithMin.sort((a, b) => firstChoiceCounts[a] - firstChoiceCounts[b]);
      toEliminate = candidatesWithMin[0];
    }

    rounds.push({
      roundNumber,
      tally,
      eliminatedId: toEliminate,
      exhaustedVotes,
      totalActiveVotes,
      majorityThreshold,
    });

    activeCandidates.delete(toEliminate);
    roundNumber++;
  }

  return {
    winnerId: candidateIds[0] || null,
    rounds,
    exhaustedBallotCount: 0,
    isTie: false,
  };
}

/**
 * Computes Borda Count scores across all ballots.
 * 1st choice receives N points, 2nd receives N-1, etc.
 */
export function computeBordaCount(
  candidateIds: string[],
  ballots: RankedBallot[]
): BordaScore[] {
  const points: Record<string, number> = {};
  const firstChoices: Record<string, number> = {};
  const candidateCount = candidateIds.length;

  for (const id of candidateIds) {
    points[id] = 0;
    firstChoices[id] = 0;
  }

  for (const ballot of ballots) {
    ballot.preferences.forEach((candidateId, index) => {
      if (points[candidateId] !== undefined) {
        const score = Math.max(0, candidateCount - index);
        points[candidateId] += score;
        if (index === 0) {
          firstChoices[candidateId]++;
        }
      }
    });
  }

  return candidateIds
    .map((id) => ({
      candidateId: id,
      points: points[id] || 0,
      firstChoiceCount: firstChoices[id] || 0,
    }))
    .sort((a, b) => b.points - a.points || b.firstChoiceCount - a.firstChoiceCount);
}
