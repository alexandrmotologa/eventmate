import React from 'react';
import { Calendar, Vote, Sparkles } from 'lucide-react';

interface Props {
  activeSection: 'SCHEDULE' | 'POLL';
  onChangeSection: (section: 'SCHEDULE' | 'POLL') => void;
  isHeatmapMode: boolean;
  onToggleHeatmap: (heatmap: boolean) => void;
  isTelegram: boolean;
}

export const DemoSandboxBanner: React.FC<Props> = ({
  activeSection,
  onChangeSection,
  isHeatmapMode,
  onToggleHeatmap,
  isTelegram,
}) => {
  return (
    <div className="w-full bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-xl">🦦</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">EventMate</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {isTelegram ? 'Mini App' : 'Studio Demo'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">When2Meet & Ranked Voting for Telegram</p>
          </div>
        </div>

        {/* Section Navigation Tabs & Heatmap Switch */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Main Navigation: Schedule vs Poll */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChangeSection('SCHEDULE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeSection === 'SCHEDULE'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule Grid
            </button>
            <button
              type="button"
              onClick={() => onChangeSection('POLL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeSection === 'POLL'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              Ranked Poll
            </button>
          </div>

          {/* If on Schedule, show Heatmap vs Paint toggle */}
          {activeSection === 'SCHEDULE' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => onToggleHeatmap(false)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  !isHeatmapMode
                    ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/30 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Paint Availability
              </button>
              <button
                type="button"
                onClick={() => onToggleHeatmap(true)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isHeatmapMode
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Group Heatmap
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
