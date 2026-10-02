import React, { useState } from 'react';
import { EventData, GoldenHourWindow, PollData } from '../types.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { generateCalendarLinks } from '../utils/calendarLinks.js';
import {
  X,
  Trophy,
  Calendar,
  Users,
  Share2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Lock,
  Download,
  CalendarCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: EventData;
  goldenHours: GoldenHourWindow[];
  pollData: PollData | null;
  onFinalize?: (slotKey?: string) => Promise<void>;
}

export const SummaryCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  event,
  goldenHours,
  pollData,
  onFinalize,
}) => {
  const { hapticSuccess, hapticSelection } = useTelegram();
  const [copied, setCopied] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  if (!isOpen) return null;

  const topGolden = goldenHours[0];
  const winner = pollData?.irvResult?.winner;

  // Format date and time
  let displayTime = 'To be finalized';
  let displayDate = 'Pending';
  let chosenSlotKey = event.locked_slot || topGolden?.startSlot;

  if (event.locked_slot) {
    const [d, t] = event.locked_slot.split('T');
    displayDate = new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    displayTime = t;
  } else if (topGolden) {
    const [d, t] = topGolden.startSlot.split('T');
    const [, endT] = topGolden.endSlot.split('T');
    displayDate = new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    displayTime = `${t} – ${endT}`;
  }

  // Generate calendar link URLs
  let startDateTime = new Date();
  let endDateTime = new Date(startDateTime.getTime() + 90 * 60 * 1000);

  if (chosenSlotKey) {
    const [slotDate, slotTime] = chosenSlotKey.split('T');
    const [sh, sm] = (slotTime || '19:00').split(':').map(Number);
    startDateTime = new Date(`${slotDate}T${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:00Z`);
    endDateTime = new Date(startDateTime.getTime() + 90 * 60 * 1000);
  }

  const calendarLinks = generateCalendarLinks({
    title: event.title,
    description: `${event.description || 'Scheduled via EventMate.'}${
      winner ? `\n\nDecided Location: ${winner.icon} ${winner.text}` : ''
    }`,
    location: winner ? `${winner.text}` : '',
    startDateTime,
    endDateTime,
  });

  const generateMarkdownSummary = () => {
    let text = `📅 *${event.title}*\n`;
    text += `⏰ *Date & Time:* ${displayDate} at ${displayTime}\n`;
    if (topGolden) {
      text += `👥 *Attendance:* ${topGolden.availableCount}/${topGolden.totalParticipants} confirmed (${topGolden.quorumPercentage}% quorum)\n`;
      text += `✓ ${topGolden.attendeeNames.join(', ')}\n`;
    }
    if (winner) {
      text += `\n🏆 *Decided Location:* ${winner.icon} ${winner.text}`;
      if (winner.priceLevel) text += ` (${winner.priceLevel})`;
      if (winner.mapsUrl) text += `\n📍 Map: ${winner.mapsUrl}`;
    }
    text += `\n\n🦦 Coordinated seamlessly with EventMate.`;
    return text;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateMarkdownSummary());
    hapticSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    hapticSelection();
    const summary = generateMarkdownSummary();
    const currentUrl = window.location.href;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(summary)}`;
    window.open(tgUrl, '_blank');
  };

  const handleFinalize = async () => {
    if (!onFinalize || !chosenSlotKey) return;
    setFinalizing(true);
    try {
      await onFinalize(chosenSlotKey);
      hapticSuccess();
    } catch {
      // Handled in parent
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Shareable Event Card
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-4 custom-scrollbar">
          {/* Infographic Visual Card Preview */}
          <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/60 rounded-2xl border border-emerald-500/30 shadow-xl space-y-4">
            {/* Card Top Brand */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-lg shadow-md shadow-emerald-500/30">
                  🦦
                </div>
                <span className="text-xs font-black text-white tracking-wide">EventMate Official</span>
              </div>
              <div className="flex items-center gap-1.5">
                {event.status === 'FINALIZED' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-full shadow flex items-center gap-1">
                    <CalendarCheck className="w-3 h-3" /> FINALIZED
                  </span>
                ) : event.locked_slot ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full shadow flex items-center gap-1">
                    <Lock className="w-3 h-3" /> LOCKED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-500 text-slate-950 rounded-full shadow">
                    PLANNING
                  </span>
                )}
              </div>
            </div>

            {/* Event Title */}
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Group Gathering
              </span>
              <h2 className="text-lg font-black text-white mt-0.5 leading-snug">{event.title}</h2>
            </div>

            {/* Confirmed Slot */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">{displayDate}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                <span className="text-slate-400">Optimal Time Window:</span>
                <strong className="text-emerald-400 text-sm font-bold">{displayTime}</strong>
              </div>
            </div>

            {/* Attendance Quorum */}
            {topGolden && (
              <div className="flex items-center justify-between text-xs px-1 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Confirmed Quorum</span>
                </div>
                <span className="font-bold text-emerald-400">
                  {topGolden.availableCount}/{topGolden.totalParticipants} free ({topGolden.quorumPercentage}%)
                </span>
              </div>
            )}

            {/* Decided Location */}
            {winner && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    Ranked Choice Winner
                  </span>
                  <span className="text-xs font-black text-white truncate block">
                    {winner.icon} {winner.text} {winner.priceLevel && `(${winner.priceLevel})`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Calendar Links */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1-Click Add to Calendar
            </span>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={calendarLinks.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={hapticSelection}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 text-slate-200 rounded-xl text-xs font-semibold transition-all shadow-sm group cursor-pointer"
              >
                <span className="text-sm">🗓️</span>
                <span>Google Cal</span>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </a>

              <a
                href={calendarLinks.outlookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={hapticSelection}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 text-slate-200 rounded-xl text-xs font-semibold transition-all shadow-sm group cursor-pointer"
              >
                <span className="text-sm">💼</span>
                <span>Outlook Web</span>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </a>
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href={`/api/events/${event.id}/export-ics`}
                download
                onClick={hapticSelection}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Apple / Outlook (.ics file)</span>
              </a>

              <a
                href={calendarLinks.yahooUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={hapticSelection}
                className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center gap-1 hover:underline"
              >
                <span>Yahoo Cal</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Organizer Lock & Finalize Control */}
          {onFinalize && event.status !== 'FINALIZED' && chosenSlotKey && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-300 block">
                  Host Decision Control
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Lock optimal slot and mark event as finalized.
                </span>
              </div>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>{finalizing ? 'Finalizing...' : 'Finalize Event'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-3 border-t border-slate-800/80 shrink-0 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Summary Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareTelegram}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Telegram</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
