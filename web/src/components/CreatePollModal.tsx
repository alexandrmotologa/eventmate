import React, { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram.js';
import { X, Vote, Plus, Trash2, Check, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newPollId: string) => void;
  eventId?: string;
}

interface OptionForm {
  text: string;
  icon: string;
  mapsUrl: string;
  priceLevel: string;
  details: string;
}

const EMOJI_PRESETS = ['🍕', '🍣', '🍔', '🌮', '🥩', '☕', '🎳', '🎬', '🎮', '🏖️', '⛰️', '🎯'];

export const CreatePollModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreated,
  eventId,
}) => {
  const { hapticSelection, hapticSuccess } = useTelegram();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [options, setOptions] = useState<OptionForm[]>([
    { text: 'Trattoria Roma', icon: '🍕', mapsUrl: '', priceLevel: '$$', details: '' },
    { text: 'Sushi Master', icon: '🍣', mapsUrl: '', priceLevel: '$$$', details: '' },
    { text: 'Craft Burger Lab', icon: '🍔', mapsUrl: '', priceLevel: '$$', details: '' },
  ]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    hapticSelection();
    const randomEmoji = EMOJI_PRESETS[Math.floor(Math.random() * EMOJI_PRESETS.length)];
    setOptions((prev) => [
      ...prev,
      { text: '', icon: randomEmoji, mapsUrl: '', priceLevel: '$$', details: '' },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert('A ranked poll requires at least 2 options.');
      return;
    }
    hapticSelection();
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: keyof OptionForm, value: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.text.trim().length > 0);
    if (!title.trim() || validOptions.length < 2) {
      alert('Please enter a poll title and at least 2 valid options.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId || null,
          title: title.trim(),
          description: description.trim(),
          options: validOptions.map((o) => ({
            text: o.text.trim(),
            icon: o.icon || '📌',
            mapsUrl: o.mapsUrl.trim() || undefined,
            priceLevel: o.priceLevel || undefined,
            details: o.details.trim() || undefined,
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to create poll');
      const data = await res.json();
      hapticSuccess();
      onCreated(data.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error creating poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Ranked-Choice Poll</h3>
              <p className="text-xs text-slate-400">Run an instant-runoff group decision</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Decision Topic / Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Which restaurant should we book?, Movie of the night..."
              className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions or context for voters..."
              className="w-full px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none transition-colors"
            />
          </div>

          {/* Options List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Poll Options ({options.length})
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-800/40 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Option
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto p-1">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    {/* Emoji Select */}
                    <select
                      value={opt.icon}
                      onChange={(e) => handleOptionChange(idx, 'icon', e.target.value)}
                      className="w-12 py-1.5 text-center bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none"
                    >
                      {EMOJI_PRESETS.map((em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      ))}
                    </select>

                    {/* Option Text */}
                    <input
                      type="text"
                      required
                      placeholder={`Option #${idx + 1} name`}
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-700 focus:border-emerald-500 text-white text-xs outline-none"
                    />

                    {/* Price Level */}
                    <select
                      value={opt.priceLevel}
                      onChange={(e) => handleOptionChange(idx, 'priceLevel', e.target.value)}
                      className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-400 font-bold outline-none"
                    >
                      <option value="">-</option>
                      <option value="$">$</option>
                      <option value="$$">$$</option>
                      <option value="$$$">$$$</option>
                    </select>

                    {/* Delete Option */}
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={options.length <= 2}
                      className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Optional Google Maps URL and Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="relative">
                      <MapPin className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
                      <input
                        type="url"
                        placeholder="Google Maps / Web link"
                        value={opt.mapsUrl}
                        onChange={(e) => handleOptionChange(idx, 'mapsUrl', e.target.value)}
                        className="w-full pl-7 pr-2 py-1 bg-slate-900/60 rounded-md border border-slate-800 text-[11px] text-slate-300 outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Short notes or specialties"
                      value={opt.details}
                      onChange={(e) => handleOptionChange(idx, 'details', e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-900/60 rounded-md border border-slate-800 text-[11px] text-slate-300 outline-none"
                    />
                  </div>
                </div>
              ))}
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
                <span>Publishing Poll...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Launch Ranked Poll</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
