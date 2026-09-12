import React, { useState, useEffect } from 'react';
import { PollData, PollOption } from '../types.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { ArrowUp, ArrowDown, Check, Trophy, BarChart3, Layers } from 'lucide-react';

interface Props {
  pollData: PollData;
  currentVoterId: string;
  currentVoterName: string;
  onCastVote: (preferences: string[]) => Promise<void>;
}

export const RankedChoiceList: React.FC<Props> = ({
  pollData,
  currentVoterId,
  currentVoterName,
  onCastVote,
}) => {
  const { hapticSelection, hapticSuccess } = useTelegram();
  const [orderedOptions, setOrderedOptions] = useState<PollOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRound, setSelectedRound] = useState(1);
  const [activeTab, setActiveTab] = useState<'VOTE' | 'IRV_ROUNDS' | 'BORDA'>('VOTE');

  const { poll, options, ballots, irvResult, bordaScores } = pollData;

  useEffect(() => {
    // Find if current voter has already voted
    const myBallot = ballots.find((b) => b.voterId === currentVoterId);
    if (myBallot && myBallot.preferences.length > 0) {
      const sorted = [...options].sort((a, b) => {
        const idxA = myBallot.preferences.indexOf(a.id);
        const idxB = myBallot.preferences.indexOf(b.id);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      setOrderedOptions(sorted);
    } else {
      setOrderedOptions([...options]);
    }
  }, [pollData, currentVoterId]);

  const moveOption = (index: number, direction: 'UP' | 'DOWN') => {
    hapticSelection();
    const newIndex = direction === 'UP' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= orderedOptions.length) return;

    const copy = [...orderedOptions];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);
    setOrderedOptions(copy);
  };

  const handleSubmitVote = async () => {
    setIsSubmitting(true);
    const prefIds = orderedOptions.map((o) => o.id);
    await onCastVote(prefIds);
    hapticSuccess();
    setIsSubmitting(false);
    setActiveTab('IRV_ROUNDS');
  };

  const currentRoundData =
    irvResult.rounds.find((r) => r.roundNumber === selectedRound) ||
    irvResult.rounds[irvResult.rounds.length - 1];

  const getCandidateName = (id: string) => {
    const opt = options.find((o) => o.id === id);
    return opt ? `${opt.icon} ${opt.text}` : id;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-md">
      {/* Poll Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Ranked-Choice Poll
            </span>
            <span className="text-xs text-slate-400">&bull; {ballots.length} ballots cast</span>
          </div>
          <h3 className="text-base font-bold text-white">{poll.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{poll.description}</p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('VOTE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'VOTE'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Ballot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('IRV_ROUNDS')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'IRV_ROUNDS'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            IRV Rounds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BORDA')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'BORDA'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Borda Count
          </button>
        </div>
      </div>

      {/* TAB 1: VOTING / REORDERING */}
      {activeTab === 'VOTE' && (
        <div>
          <p className="text-xs text-slate-400 mb-3">
            Rank your preferences from top (1st choice) to bottom. Tap the arrows to reorder.
          </p>

          <div className="space-y-2">
            {orderedOptions.map((opt, idx) => (
              <div
                key={opt.id}
                className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0
                        ? 'bg-amber-500 text-slate-950'
                        : idx === 1
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-sm font-semibold text-white">{opt.text}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveOption(idx, 'UP')}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-25 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOption(idx, 'DOWN')}
                    disabled={idx === orderedOptions.length - 1}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-25 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Voting as: <strong className="text-slate-200">{currentVoterName}</strong>
            </span>
            <button
              type="button"
              onClick={handleSubmitVote}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Submit Ranked Ballot</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: IRV ROUND-BY-ROUND VISUALIZER */}
      {activeTab === 'IRV_ROUNDS' && (
        <div>
          {/* Winner Banner if exists */}
          {irvResult.winner && (
            <div className="p-3.5 mb-4 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-lg">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    Instant-Runoff Winner
                  </span>
                  <h4 className="text-base font-black text-white">
                    {irvResult.winner.icon} {irvResult.winner.text}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/30 text-amber-200 rounded-full border border-amber-400/40">
                Majority Reached
              </span>
            </div>
          )}

          {/* Round Navigation Tabs */}
          <div className="flex items-center gap-2 mb-4 pb-2 overflow-x-auto">
            {irvResult.rounds.map((r) => (
              <button
                key={r.roundNumber}
                type="button"
                onClick={() => setSelectedRound(r.roundNumber)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedRound === r.roundNumber
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                }`}
              >
                Round {r.roundNumber}
              </button>
            ))}
          </div>

          {/* Round Tally Bars */}
          {currentRoundData && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>
                  Active Votes: <strong>{currentRoundData.totalActiveVotes}</strong>
                </span>
                <span>
                  Majority Threshold:{' '}
                  <strong className="text-emerald-400">{currentRoundData.majorityThreshold.toFixed(1)} votes</strong>
                </span>
              </div>

              {Object.entries(currentRoundData.tally).map(([cId, votes]) => {
                const opt = options.find((o) => o.id === cId);
                const isEliminatedThisRound = currentRoundData.eliminatedId === cId;
                const isWinner = irvResult.winnerId === cId;
                const pct = currentRoundData.totalActiveVotes > 0
                  ? (votes / currentRoundData.totalActiveVotes) * 100
                  : 0;

                return (
                  <div key={cId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-white">
                        <span>{opt?.icon}</span>
                        <span>{opt?.text}</span>
                        {isWinner && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                            Winner
                          </span>
                        )}
                        {isEliminatedThisRound && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                            Eliminated
                          </span>
                        )}
                      </span>
                      <span className="text-slate-300">
                        {votes} votes ({Math.round(pct)}%)
                      </span>
                    </div>

                    {/* Bar */}
                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWinner
                            ? 'bg-emerald-400'
                            : isEliminatedThisRound
                            ? 'bg-rose-500/70'
                            : 'bg-emerald-600/70'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {currentRoundData.eliminatedId && (
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 italic">
                  &bull; {getCandidateName(currentRoundData.eliminatedId)} had the fewest 1st-choice votes and was eliminated.
                  Ballots were redistributed to remaining candidates.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BORDA COUNT */}
      {activeTab === 'BORDA' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Borda count scores candidate popularity by awarding points based on placement on each ballot (1st = {options.length} pts, 2nd = {options.length - 1} pts, etc.).
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            {bordaScores.map((score, rank) => {
              const opt = options.find((o) => o.id === score.candidateId);
              return (
                <div
                  key={score.candidateId}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                        rank === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {rank + 1}
                    </span>
                    <span className="text-lg">{opt?.icon}</span>
                    <span className="text-xs font-bold text-white">{opt?.text}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">
                      {score.firstChoiceCount} first choices
                    </span>
                    <span className="font-extrabold text-emerald-400 text-sm px-2 py-0.5 bg-emerald-950/60 rounded border border-emerald-800/60">
                      {score.points} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
