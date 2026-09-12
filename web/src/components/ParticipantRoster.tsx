import React from 'react';
import { Participant } from '../types.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { Users, CheckCircle2, Plus, Crown } from 'lucide-react';

interface Props {
  participants: Participant[];
  currentParticipant: Participant;
  submittedParticipantIds: Set<string>;
  onSelectParticipant: (participant: Participant) => void;
  onAddParticipant: (name: string) => void;
  onToggleRequired?: (participantId: string) => void;
}

export const ParticipantRoster: React.FC<Props> = ({
  participants,
  currentParticipant,
  submittedParticipantIds,
  onSelectParticipant,
  onAddParticipant,
  onToggleRequired,
}) => {
  const { hapticSelection } = useTelegram();

  const handlePromptAdd = () => {
    const name = window.prompt('Enter new member name:');
    if (name && name.trim().length > 0) {
      onAddParticipant(name.trim());
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Group Roster ({submittedParticipantIds.size}/{participants.length} Painted)
          </h4>
        </div>

        <button
          type="button"
          onClick={handlePromptAdd}
          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/50 px-2.5 py-1 rounded-lg border border-emerald-800/50 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add Member
        </button>
      </div>

      {/* Participants Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {participants.map((p) => {
          const isCurrent = p.id === currentParticipant.id;
          const hasSubmitted = submittedParticipantIds.has(p.id);

          return (
            <div
              key={p.id}
              className={`inline-flex items-center rounded-xl text-xs font-semibold transition-all ${
                isCurrent
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Main Select Button */}
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  onSelectParticipant(p);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.avatarColor }}
                />
                <span>{p.name}</span>
                {hasSubmitted && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isCurrent ? 'text-slate-950' : 'text-emerald-400'
                    }`}
                  />
                )}
              </button>

              {/* Required / VIP Toggle Button */}
              {onToggleRequired && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticSelection();
                    onToggleRequired(p.id);
                  }}
                  title={
                    p.isRequired
                      ? 'Required Host (must attend Golden Hours). Click to make optional.'
                      : 'Optional attendee. Click to mark as Required VIP.'
                  }
                  className={`px-1.5 py-1.5 pr-2 rounded-r-xl transition-colors cursor-pointer ${
                    p.isRequired
                      ? isCurrent
                        ? 'text-slate-950 bg-emerald-600/60'
                        : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                      : isCurrent
                      ? 'text-slate-700 hover:text-slate-950'
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <Crown className={`w-3.5 h-3.5 ${p.isRequired ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/60">
        <span>&bull; Tap any member to paint as that person in Demo Mode.</span>
        <span className="flex items-center gap-1 text-slate-400">
          <Crown className="w-3 h-3 text-amber-400 fill-amber-400/20 inline" />
          <span>= Required VIP (Golden Hours strictly require their presence)</span>
        </span>
      </div>
    </div>
  );
};
