import React, { useState } from 'react';
import { EventData, GoldenHourWindow, PollData } from '../types.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { X, Trophy, Calendar, Users, Share2, Copy, Check, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: EventData;
  goldenHours: GoldenHourWindow[];
  pollData: PollData | null;
}

export const SummaryCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  event,
  goldenHours,
  pollData,
}) => {
  const { hapticSuccess } = useTelegram();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const topGolden = goldenHours[0];
  const winner = pollData?.irvResult?.winner;

  // Format date and time
  let displayTime = 'To be finalized';
  let displayDate = 'Pending';
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
    const summary = generateMarkdownSummary();
    const currentUrl = window.location.href;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(summary)}`;
    window.open(tgUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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

        {/* Infographic Visual Card Preview */}
        <div className="my-5 p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/60 rounded-2xl border border-emerald-500/30 shadow-xl space-y-4">
          {/* Card Top Brand */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-lg shadow-md shadow-emerald-500/30">
                🦦
              </div>
              <span className="text-xs font-black text-white tracking-wide">EventMate Official</span>
            </div>
            {event.locked_slot && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-full shadow">
                LOCKED
              </span>
            )}
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
              <span className="text-slate-400">Golden Hours:</span>
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
                  Ranked Choice Decision
                </span>
                <span className="text-xs font-black text-white truncate block">
                  {winner.icon} {winner.text} {winner.priceLevel && `(${winner.priceLevel})`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
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
  );
};
