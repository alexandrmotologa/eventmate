import React, { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram.js';
import { X, Calendar, Sparkles, User, Check, Share2, Copy } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newEventId: string) => void;
  defaultOrganizerName: string;
}

export const CreateEventModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreated,
  defaultOrganizerName,
}) => {
  const { hapticSelection, hapticSuccess } = useTelegram();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organizerName, setOrganizerName] = useState(defaultOrganizerName || 'Organizer');
  const [startHour, setStartHour] = useState(17);
  const [endHour, setEndHour] = useState(23);
  const [slotDuration, setSlotDuration] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate next 14 days for quick selection
  const candidateDates: { dateStr: string; weekday: string; dayMonth: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayMonth = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    candidateDates.push({ dateStr, weekday, dayMonth });
  }

  // Default selected dates: upcoming Friday, Saturday, Sunday
  const [selectedDates, setSelectedDates] = useState<string[]>([
    candidateDates[0]?.dateStr || '',
    candidateDates[1]?.dateStr || '',
    candidateDates[2]?.dateStr || '',
  ].filter(Boolean));

  if (!isOpen) return null;

  const toggleDate = (dStr: string) => {
    hapticSelection();
    setSelectedDates((prev) =>
      prev.includes(dStr) ? prev.filter((d) => d !== dStr) : [...prev, dStr].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedDates.length === 0) {
      alert('Please provide an event title and select at least one date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          creatorName: organizerName.trim() || 'Organizer',
          dates: selectedDates,
          startHour,
          endHour,
          slotDurationMinutes: slotDuration,
        }),
      });

      if (!res.ok) throw new Error('Failed to create event');
      const data = await res.json();
      hapticSuccess();
      setCreatedEventId(data.id);
    } catch (err: any) {
      alert(err.message || 'Error creating event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInviteUrl = () => {
    if (!createdEventId) return '';
    return `${window.location.origin}/?eventId=${createdEventId}`;
  };

  const handleCopyLink = () => {
    const url = getInviteUrl();
    navigator.clipboard.writeText(url);
    hapticSuccess();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareTelegram = () => {
    const url = encodeURIComponent(getInviteUrl());
    const text = encodeURIComponent(`📅 Paint your availability for "${title}" on EventMate!`);
    const tgUrl = `https://t.me/share/url?url=${url}&text=${text}`;
    window.open(tgUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Schedule Meetup</h3>
              <p className="text-xs text-slate-400">Set dates and hours for group availability painting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen after creation */}
        {createdEventId ? (
          <div className="py-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-lg font-extrabold text-white">Meetup Created Successfully!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Share this link with your group chat so members can paint their available hours.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="truncate text-slate-300 max-w-[280px]">{getInviteUrl()}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleShareTelegram}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Share to Telegram
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreated(createdEventId);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                Open Event Studio
              </button>
            </div>
          </div>
        ) : (
          /* Event Form */
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Title & Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekend Board Game Night, Hackathon Sync..."
                className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details, venue ideas, or agenda..."
                className="w-full px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none transition-colors"
              />
            </div>

            {/* Organizer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name (Organizer) *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none transition-colors"
                />
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Select Potential Days ({selectedDates.length} selected) *
                </label>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
                {candidateDates.map((item) => {
                  const isSelected = selectedDates.includes(item.dateStr);
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => toggleDate(item.dateStr)}
                      className={`p-1.5 rounded-lg text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold">{item.weekday}</div>
                      <div className="text-[11px] font-semibold">{item.dayMonth}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Range & Intervals */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Earliest Hour</label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs outline-none"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i} disabled={i >= endHour}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Latest Hour</label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs outline-none"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i + 1} value={i + 1} disabled={i + 1 <= startHour}>
                      {(i + 1).toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Slot Step</label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs outline-none"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Creating Meetup...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Create Availability Grid</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
