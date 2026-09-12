export interface EventData {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  creator_name: string;
  timezone: string;
  dates: string[];
  start_hour: number;
  end_hour: number;
  slot_duration_minutes: number;
  locked_slot: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  name: string;
  avatarColor: string;
  isRequired?: boolean;
  telegramUserId?: string | null;
  createdAt?: string;
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
  availableMembers: { id: string; name: string; avatarColor: string; state: 'AVAILABLE' | 'TENTATIVE'; isRequired?: boolean }[];
  busyMembers: { id: string; name: string; avatarColor: string; isRequired?: boolean }[];
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

export interface PollOption {
  id: string;
  text: string;
  icon: string;
  mapsUrl?: string | null;
  priceLevel?: string | null;
  details?: string | null;
  displayOrder: number;
}

export interface RankedBallot {
  voterId: string;
  voterName: string;
  preferences: string[];
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
  winner: PollOption | null;
  rounds: IRVRound[];
  exhaustedBallotCount: number;
  isTie: boolean;
}

export interface BordaScore {
  candidateId: string;
  points: number;
  firstChoiceCount: number;
}

export interface PollData {
  poll: {
    id: string;
    eventId?: string;
    title: string;
    description: string;
    status: 'OPEN' | 'CLOSED';
    created_at: string;
  };
  options: PollOption[];
  ballots: RankedBallot[];
  irvResult: IRVResult;
  bordaScores: BordaScore[];
}
