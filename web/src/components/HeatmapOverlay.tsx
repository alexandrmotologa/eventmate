import React from 'react';
import { SlotQuorum } from '../types.js';
import { Users, X, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Props {
  quorum: SlotQuorum | null;
  onClose: () => void;
}

export const HeatmapOverlay: React.FC<Props> = ({ quorum, onClose }) => {
  if (!quorum) return null;

  const [date, time] = quorum.slotKey.split('T');
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{time}</span>
            </div>
            <h3 className="text-base font-bold text-white">{formattedDate}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quorum Metric */}
        <div className="my-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-300 font-medium">Group Quorum</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold ${
                quorum.quorumPercentage === 100
                  ? 'text-emerald-400'
                  : quorum.quorumPercentage >= 50
                  ? 'text-emerald-300'
                  : 'text-amber-400'
              }`}
            >
              {quorum.quorumPercentage}%
            </span>
            <span className="text-xs text-slate-500">
              ({quorum.availableCount}/{quorum.totalParticipants})
            </span>
          </div>
        </div>

        {/* Available Members */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Available ({quorum.availableMembers.length})</span>
          </div>
          {quorum.availableMembers.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No one has marked this slot yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {quorum.availableMembers.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-200"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: m.avatarColor }}
                  />
                  {m.name}
                  {m.state === 'TENTATIVE' && <span className="text-[10px] text-amber-400">(?)</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Busy Members */}
        {quorum.busyMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <XCircle className="w-3.5 h-3.5" />
              <span>Unavailable / Pending ({quorum.busyMembers.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quorum.busyMembers.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 border border-slate-700/60 text-slate-400"
                >
                  <span
                    className="w-2 h-2 rounded-full opacity-50"
                    style={{ backgroundColor: m.avatarColor }}
                  />
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
