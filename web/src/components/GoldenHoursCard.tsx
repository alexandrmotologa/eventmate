import React, { useState } from 'react';
import { GoldenHourWindow } from '../types.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { Trophy, CalendarPlus, Lock, Check, Clock, Users, ExternalLink } from 'lucide-react';

interface Props {
  goldenHours: GoldenHourWindow[];
  lockedSlot: string | null;
  eventTitle: string;
  onLockSlot: (slotKey: string) => Promise<void>;
  eventId: string;
}

export const GoldenHoursCard: React.FC<Props> = ({
  goldenHours,
  lockedSlot,
  eventTitle,
  onLockSlot,
  eventId,
}) => {
  const { hapticSuccess } = useTelegram();
  const [lockingSlot, setLockingSlot] = useState<string | null>(null);

  if (goldenHours.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center">
        <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-slate-300">No Golden Hours Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Members need to paint their availability on the grid above to find overlapping meeting times.
        </p>
      </div>
    );
  }

  const handleLock = async (slotKey: string) => {
    setLockingSlot(slotKey);
    await onLockSlot(slotKey);
    hapticSuccess();
    setLockingSlot(null);
  };

  const getGoogleCalendarUrl = (window: GoldenHourWindow) => {
    const [startDate, startTime] = window.startSlot.split('T');
    const [endDate, endTime] = window.endSlot.split('T');

    const startIso = `${startDate.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00Z`;
    const endIso = `${endDate.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00Z`;

    const details = encodeURIComponent(
      `EventMate Group Meetup: ${window.attendeeNames.join(', ')} confirmed available.`
    );
    const title = encodeURIComponent(eventTitle);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/30 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Golden Hours (Optimal Meeting Windows)</h3>
            <p className="text-xs text-slate-400">Contiguous times with maximum group attendance</p>
          </div>
        </div>

        {lockedSlot && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-700/80 rounded-full text-xs font-bold text-emerald-400">
            <Lock className="w-3 h-3" />
            Time Locked
          </span>
        )}
      </div>

      {/* Cards List */}
      <div className="grid gap-3">
        {goldenHours.slice(0, 3).map((win, idx) => {
          const isSelectedLocked = lockedSlot === win.startSlot;
          const [dateStr, startTime] = win.startSlot.split('T');
          const [, endTime] = win.endSlot.split('T');
          const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={win.startSlot}
              className={`p-3.5 rounded-xl border transition-all ${
                isSelectedLocked
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : idx === 0
                  ? 'bg-slate-950 border-emerald-900/60 hover:border-emerald-700/60'
                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Time & Attendance */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        idx === 0
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 font-bold'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {dateFormatted} &bull; {startTime} &ndash; {endTime}
                    </span>
                    <span className="text-xs text-slate-400">({win.durationMinutes} min)</span>
                  </div>

                  {/* Quorum and Attendees */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {win.availableCount}/{win.totalParticipants} free ({win.quorumPercentage}%)
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                      {win.attendeeNames.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Google Calendar Link */}
                  <a
                    href={getGoogleCalendarUrl(win)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors text-xs flex items-center gap-1"
                    title="Add to Google Calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">GCal</span>
                  </a>

                  {/* Download .ics */}
                  <a
                    href={`/api/events/${eventId}/export-ics`}
                    className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors text-xs flex items-center gap-1"
                    title="Download iCalendar (.ics)"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">.ics</span>
                  </a>

                  {/* Lock Slot Button */}
                  <button
                    type="button"
                    onClick={() => handleLock(win.startSlot)}
                    disabled={lockingSlot === win.startSlot || isSelectedLocked}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelectedLocked
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isSelectedLocked ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Locked
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Lock Slot
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
