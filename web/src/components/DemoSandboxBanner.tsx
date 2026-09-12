import React from 'react';
import { Calendar, Vote, Sparkles, Plus, Share2, Globe } from 'lucide-react';

interface Props {
  activeSection: 'SCHEDULE' | 'POLL';
  onChangeSection: (section: 'SCHEDULE' | 'POLL') => void;
  isHeatmapMode: boolean;
  onToggleHeatmap: (heatmap: boolean) => void;
  isTelegram: boolean;
  onOpenCreateEvent?: () => void;
  onOpenCreatePoll?: () => void;
  onOpenSummaryCard?: () => void;
  currentTimezone?: string;
  onChangeTimezone?: (tz: string) => void;
}

const COMMON_TIMEZONES = [
  'Europe/Bucharest',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Kyiv',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
  'UTC',
];

export const DemoSandboxBanner: React.FC<Props> = ({
  activeSection,
  onChangeSection,
  isHeatmapMode,
  onToggleHeatmap,
  isTelegram,
  onOpenCreateEvent,
  onOpenCreatePoll,
  onOpenSummaryCard,
  currentTimezone,
  onChangeTimezone,
}) => {
  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-xl">🦦</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">EventMate</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isTelegram ? 'Mini App' : 'Studio Demo'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">When2Meet & Ranked Voting for Telegram</p>
            </div>
          </div>

          {/* Mobile Fast Action Buttons */}
          <div className="flex items-center gap-1.5 md:hidden">
            {onOpenSummaryCard && (
              <button
                type="button"
                onClick={onOpenSummaryCard}
                title="Summary Infographic Card"
                className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60 text-xs flex items-center"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenCreateEvent && (
              <button
                type="button"
                onClick={onOpenCreateEvent}
                title="New Meetup"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 text-xs flex items-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
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
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isHeatmapMode
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Heatmap
              </button>
            </div>
          )}

          {/* Timezone Switcher */}
          {currentTimezone && onChangeTimezone && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={currentTimezone}
                onChange={(e) => onChangeTimezone(e.target.value)}
                className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer pr-1"
              >
                {!COMMON_TIMEZONES.includes(currentTimezone) && (
                  <option value={currentTimezone} className="bg-slate-900 text-slate-200">
                    {currentTimezone} (Local)
                  </option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-slate-900 text-slate-200">
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desktop Extra Action Buttons */}
          <div className="hidden md:flex items-center gap-1.5">
            {onOpenSummaryCard && (
              <button
                type="button"
                onClick={onOpenSummaryCard}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 text-xs font-semibold transition-colors"
                title="Generate SyncOtter Summary Card"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Share Card</span>
              </button>
            )}

            {onOpenCreateEvent && (
              <button
                type="button"
                onClick={onOpenCreateEvent}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                title="Create a new schedule poll"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>New Event</span>
              </button>
            )}

            {onOpenCreatePoll && (
              <button
                type="button"
                onClick={onOpenCreatePoll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                title="Create a new ranked poll"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>New Poll</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
