import React from 'react';
import { Participant } from '../types.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { Users, CheckCircle2, Plus } from 'lucide-react';

interface Props {
  participants: Participant[];
  currentParticipant: Participant;
  submittedParticipantIds: Set<string>;
  onSelectParticipant: (participant: Participant) => void;
  onAddParticipant: (name: string) => void;
}

export const ParticipantRoster: React.FC<Props> = ({
  participants,
  currentParticipant,
  submittedParticipantIds,
  onSelectParticipant,
  onAddParticipant,
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
          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/50 px-2 py-1 rounded-lg border border-emerald-800/50 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Member
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {participants.map((p) => {
          const isCurrent = p.id === currentParticipant.id;
          const hasSubmitted = submittedParticipantIds.has(p.id);

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                hapticSelection();
                onSelectParticipant(p);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: p.avatarColor }}
              />
              <span>{p.name}</span>
              {hasSubmitted && (
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    isCurrent ? 'text-slate-950' : 'text-emerald-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 mt-2.5">
        &bull; Tap any member badge to switch views and paint as that person in Demo Mode.
      </p>
    </div>
  );
};
