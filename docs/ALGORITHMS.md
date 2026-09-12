# Algorithms specification

EventMate uses two core algorithmic components: an Instant-Runoff Voting engine with Borda Count evaluation, and a contiguous time slot overlap finder for group schedules.

## Instant-runoff voting (IRV)

Instant-runoff voting, also known as ranked-choice voting, identifies a consensus winner among multiple options without requiring separate runoff elections.

### Input data
- `candidateIds`: Array of candidate option identifiers.
- `ballots`: Collection of voter ballots where each voter provides an ordered list of candidate IDs from first preference to last preference.

### Evaluation steps
1. **Initial tally**: Count the top active choice of each ballot among the remaining active candidates.
2. **Exhausted ballots tracking**: If a ballot has all of its ranked choices eliminated, it is marked as exhausted and excluded from the active vote total for subsequent rounds.
3. **Majority verification**: Calculate the threshold `threshold = activeVotes / 2`. If any candidate receives strictly more than the majority threshold (`votes > threshold`), that candidate is declared the winner immediately.
4. **Candidate elimination**: If no candidate reaches a strict majority:
   - Identify candidate with the fewest active votes.
   - If multiple candidates tie for lowest votes, break the tie by examining original first-choice votes from Round 1.
   - Remove the eliminated candidate from the active candidate set.
5. **Vote redistribution**: Ballots that ranked the eliminated candidate as their top active choice have their votes transferred to their next highest-ranked active candidate.
6. **Repeat**: Steps 1 through 5 continue until a majority winner emerges or a single candidate remains.

### Round snapshot schema
Each round records:
- `roundNumber`: 1-based index of the round.
- `tally`: Map of candidate ID to vote count in that round.
- `eliminatedId`: ID of the candidate eliminated at the conclusion of the round (if any).
- `exhaustedVotes`: Number of ballots whose ranked candidates are all eliminated.
- `totalActiveVotes`: Total number of non-exhausted votes remaining in the round.
- `majorityThreshold`: Minimum vote count required to win in the round (`totalActiveVotes / 2`).

## Borda count scoring

EventMate calculates Borda Count scores alongside IRV for comparative consensus analysis.

For $N$ options on a ballot:
- 1st choice receives $N$ points.
- 2nd choice receives $N - 1$ points.
- $k$-th choice receives $\max(0, N - k + 1)$ points.

The scores from all ballots are summed. Candidates are sorted by total points descending, with ties resolved by total first-choice votes.

## Contiguous golden hour overlap engine

Traditional availability pollers evaluate each time block in isolation. EventMate searches for contiguous blocks (for example, 60 minutes or 90 minutes) because group meetings require uninterrupted windows.

### Algorithm definition
1. **Quorum matrix construction**:
   - For each 30-minute block key (`YYYY-MM-DDTHH:mm`), tally participants marked `AVAILABLE` (1.0 weight) and `TENTATIVE` (0.5 weight).
   - Compute quorum percentage: $\text{pct} = \text{round}((\text{available} + 0.5 \times \text{tentative}) / \text{total} \times 100)$.
2. **Required participant constraint**:
   - Participants flagged with `isRequired = true` (for example, event hosts or essential team leads) act as strict preconditions.
   - If any required participant is not available for all slots across a candidate window, that window is immediately excluded from the candidate list, regardless of general quorum.
3. **Sliding window scan**:
   - Given a required meeting duration $D$ (default 60 minutes) and block duration $S$ (30 minutes), calculate window length $W = D / S$ blocks.
   - For each day in the event, slide a window of length $W$ over the day's time slots.
   - A participant is considered available for the window only if they are available across every block within that window.
4. **Scoring function**:
   - $\text{score} = \text{quorumPercentage} + \text{fullAttendanceBonus}$.
   - Windows with 100% attendance receive a 25-point priority bonus.
5. **Deduplication and ranking**:
   - Windows are ranked descending by score and attendee count.
   - Overlapping windows on the same date with identical start times are deduplicated to yield the top three distinct options.
