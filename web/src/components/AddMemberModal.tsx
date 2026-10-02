import React, { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram.js';
import { X, UserPlus, Crown, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddParticipant: (name: string, avatarColor: string, isRequired: boolean) => Promise<void>;
}

const COLOR_PALETTES = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export const AddMemberModal: React.FC<Props> = ({ isOpen, onClose, onAddParticipant }) => {
  const { hapticSelection, hapticSuccess } = useTelegram();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTES[0]);
  const [isRequired, setIsRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddParticipant(name.trim(), selectedColor, isRequired);
      hapticSuccess();
      setName('');
      setIsRequired(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to add participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add Group Member</h3>
              <p className="text-[11px] text-slate-400">Add a new participant to schedule matrix</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Member Name *</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Andrei, Sarah, Alex..."
              className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none transition-colors"
            />
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Avatar Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTES.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setSelectedColor(color);
                    }}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                      isSelected ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required VIP Toggle */}
          <div
            onClick={() => {
              hapticSelection();
              setIsRequired(!isRequired);
            }}
            className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Crown className={`w-4 h-4 ${isRequired ? 'text-amber-400 fill-amber-400/20' : 'text-slate-500'}`} />
              <div>
                <span className="text-xs font-bold text-white block">Required VIP Host</span>
                <span className="text-[10px] text-slate-400 block">
                  Golden Hours strictly require this member to be free
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={() => {}}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Adding...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Add to Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
