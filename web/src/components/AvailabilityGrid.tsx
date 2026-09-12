import React, { useState, useRef, useEffect } from 'react';
import { Participant, SlotQuorum } from '../types.js';
import { useTelegram } from '../hooks/useTelegram.js';
import {
  Check,
  Eraser,
  Sparkles,
  Clock,
  HelpCircle,
  Copy,
  RotateCcw,
  RotateCw,
  ArrowLeftRight,
} from 'lucide-react';

interface Props {
  dates: string[];
  startHour: number;
  endHour: number;
  slotDurationMinutes: number;
  currentParticipant: Participant;
  mySlots: Record<string, 'AVAILABLE' | 'TENTATIVE'>;
  quorumMatrix: Record<string, SlotQuorum>;
  isHeatmapMode: boolean;
  onSaveAvailability: (slots: { slotKey: string; state: 'AVAILABLE' | 'TENTATIVE' }[]) => Promise<void>;
  onSelectSlotTooltip?: (quorum: SlotQuorum | null) => void;
}

export const AvailabilityGrid: React.FC<Props> = ({
  dates,
  startHour,
  endHour,
  slotDurationMinutes,
  currentParticipant,
  mySlots: initialMySlots,
  quorumMatrix,
  isHeatmapMode,
  onSaveAvailability,
  onSelectSlotTooltip,
}) => {
  const { hapticSelection, hapticSuccess } = useTelegram();
  const [localSlots, setLocalSlots] = useState<Record<string, 'AVAILABLE' | 'TENTATIVE'>>(initialMySlots);
  const [isSaving, setIsSaving] = useState(false);
  const [paintMode, setPaintMode] = useState<'AVAILABLE' | 'TENTATIVE' | 'ERASE'>('AVAILABLE');
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<'AVAILABLE' | 'TENTATIVE' | 'ERASE' | null>(null);

  // Undo / Redo Stack
  const [history, setHistory] = useState<Record<string, 'AVAILABLE' | 'TENTATIVE'>[]>([initialMySlots]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    setLocalSlots(initialMySlots);
    setHistory([initialMySlots]);
    setHistoryIndex(0);
  }, [initialMySlots]);

  const pushHistory = (newSlots: Record<string, 'AVAILABLE' | 'TENTATIVE'>) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newSlots];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      hapticSelection();
      const prevSlots = history[historyIndex - 1];
      setLocalSlots(prevSlots);
      setHistoryIndex((prev) => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      hapticSelection();
      const nextSlots = history[historyIndex + 1];
      setLocalSlots(nextSlots);
      setHistoryIndex((prev) => prev + 1);
    }
  };

  // Keyboard shortcut for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Generate time intervals
  const timeRows: { hour: number; minute: number; label: string }[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += slotDurationMinutes) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      timeRows.push({ hour: h, minute: m, label: `${hh}:${mm}` });
    }
  }

  const formatDayHeader = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayMonth = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { weekday, dayMonth };
  };

  const handleCellPointerDown = (slotKey: string) => {
    if (isHeatmapMode) {
      if (onSelectSlotTooltip) {
        onSelectSlotTooltip(quorumMatrix[slotKey] || null);
      }
      return;
    }

    setIsDragging(true);
    const currentState = localSlots[slotKey];
    let modeToUse: 'AVAILABLE' | 'TENTATIVE' | 'ERASE' = paintMode;

    if (currentState === paintMode) {
      modeToUse = 'ERASE';
    }

    dragModeRef.current = modeToUse;
    applyPaint(slotKey, modeToUse);
  };

  const handleCellPointerEnter = (slotKey: string) => {
    if (isDragging && dragModeRef.current && !isHeatmapMode) {
      applyPaint(slotKey, dragModeRef.current);
    }
  };

  const applyPaint = (slotKey: string, mode: 'AVAILABLE' | 'TENTATIVE' | 'ERASE') => {
    hapticSelection();
    setLocalSlots((prev) => {
      const next = { ...prev };
      if (mode === 'ERASE') {
        delete next[slotKey];
      } else {
        next[slotKey] = mode;
      }
      return next;
    });
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      dragModeRef.current = null;
      pushHistory(localSlots);
    }
  };

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [isDragging, localSlots]);

  const handleSave = async () => {
    setIsSaving(true);
    const slotsToSave = Object.entries(localSlots).map(([slotKey, state]) => ({
      slotKey,
      state,
    }));
    await onSaveAvailability(slotsToSave);
    hapticSuccess();
    setIsSaving(false);
  };

  // Smart Paint: Paint or Clear Entire Column (Day)
  const handleToggleWholeDay = (date: string) => {
    if (isHeatmapMode) return;
    hapticSelection();
    const daySlotKeys = timeRows.map((r) => `${date}T${r.label}`);
    const currentMode = paintMode === 'ERASE' ? 'AVAILABLE' : paintMode;
    const allPainted = daySlotKeys.every((k) => localSlots[k] === currentMode);

    const next = { ...localSlots };
    for (const k of daySlotKeys) {
      if (allPainted) {
        delete next[k];
      } else {
        next[k] = currentMode;
      }
    }
    setLocalSlots(next);
    pushHistory(next);
  };

  // Smart Paint: Copy Day to All Days
  const handleCopyDayToAll = () => {
    if (dates.length <= 1) return;
    hapticSelection();
    const baseDate = dates[0];
    const next = { ...localSlots };
    const baseSlots = timeRows.map((r) => ({
      time: r.label,
      state: localSlots[`${baseDate}T${r.label}`],
    }));

    for (const targetDate of dates) {
      if (targetDate === baseDate) continue;
      for (const item of baseSlots) {
        const targetKey = `${targetDate}T${item.time}`;
        if (item.state) {
          next[targetKey] = item.state;
        } else {
          delete next[targetKey];
        }
      }
    }
    setLocalSlots(next);
    pushHistory(next);
  };

  // Smart Paint: Invert Selection
  const handleInvertSelection = () => {
    hapticSelection();
    const next: Record<string, 'AVAILABLE' | 'TENTATIVE'> = {};
    for (const date of dates) {
      for (const row of timeRows) {
        const k = `${date}T${row.label}`;
        if (!localSlots[k]) {
          next[k] = 'AVAILABLE';
        }
      }
    }
    setLocalSlots(next);
    pushHistory(next);
  };

  // Preset: All Evenings
  const handlePresetAllEvening = () => {
    hapticSelection();
    const next = { ...localSlots };
    for (const date of dates) {
      for (const row of timeRows) {
        if (row.hour >= 18 && row.hour < 22) {
          next[`${date}T${row.label}`] = 'AVAILABLE';
        }
      }
    }
    setLocalSlots(next);
    pushHistory(next);
  };

  // Preset: Clear All
  const handleClearAll = () => {
    hapticSelection();
    setLocalSlots({});
    pushHistory({});
  };

  // Heatmap color shading
  const getHeatmapBg = (quorum?: SlotQuorum) => {
    if (!quorum || quorum.totalParticipants === 0 || (quorum.availableCount === 0 && quorum.tentativeCount === 0)) {
      return 'bg-slate-900 border-slate-800 text-slate-500';
    }

    const pct = quorum.quorumPercentage;
    if (pct === 100) {
      return 'bg-emerald-500 text-white font-bold border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse-glow';
    }
    if (pct >= 75) {
      return 'bg-emerald-600/90 text-white font-semibold border-emerald-500';
    }
    if (pct >= 50) {
      return 'bg-emerald-700/75 text-emerald-100 border-emerald-600/60';
    }
    if (pct >= 25) {
      return 'bg-emerald-900/60 text-emerald-300 border-emerald-800/40';
    }
    return 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30';
  };

  return (
    <div className="flex flex-col w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Top Toolbar */}
      {!isHeatmapMode ? (
        <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Paint Mode Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPaintMode('AVAILABLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  paintMode === 'AVAILABLE'
                    ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                Free
              </button>
              <button
                type="button"
                onClick={() => setPaintMode('TENTATIVE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  paintMode === 'TENTATIVE'
                    ? 'bg-amber-500 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Maybe
              </button>
              <button
                type="button"
                onClick={() => setPaintMode('ERASE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  paintMode === 'ERASE'
                    ? 'bg-slate-700 text-slate-200 shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                Erase
              </button>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg disabled:opacity-30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg disabled:opacity-30 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Smart Paint Tools Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Smart Paint:
            </span>
            <button
              type="button"
              onClick={handlePresetAllEvening}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Evenings (18-22)
            </button>
            <button
              type="button"
              onClick={handleCopyDayToAll}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors flex items-center gap-1"
              title="Copy Day 1 availability to all other days"
            >
              <Copy className="w-3 h-3 text-sky-400" />
              Copy Day 1 to All
            </button>
            <button
              type="button"
              onClick={handleInvertSelection}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors flex items-center gap-1"
              title="Invert free vs busy hours"
            >
              <ArrowLeftRight className="w-3 h-3 text-amber-400" />
              Invert
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg border border-slate-800 transition-colors ml-auto"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Heatmap Quorum:</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-700 inline-block" />
              <span>0%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700/80 inline-block" />
              <span>50%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] inline-block" />
              <span className="text-emerald-400 font-semibold">100% (All)</span>
            </div>
          </div>
          <span className="text-xs text-slate-400 italic">Tap any slot to inspect attendees</span>
        </div>
      )}

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-1 min-w-[320px]"
          style={{
            gridTemplateColumns: `56px repeat(${dates.length}, minmax(80px, 1fr))`,
          }}
        >
          {/* Header Corner */}
          <div className="flex items-center justify-center p-2 text-xs font-semibold text-slate-500">
            <Clock className="w-3.5 h-3.5" />
          </div>

          {/* Date Column Headers (Clickable in Paint Mode) */}
          {dates.map((d) => {
            const { weekday, dayMonth } = formatDayHeader(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleToggleWholeDay(d)}
                title={!isHeatmapMode ? `Click to toggle all hours on ${weekday}` : undefined}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${
                  !isHeatmapMode
                    ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 cursor-pointer group'
                    : 'bg-slate-950/80 border-slate-800 cursor-default'
                }`}
              >
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                  {weekday}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">{dayMonth}</span>
                {!isHeatmapMode && (
                  <span className="text-[9px] text-slate-500 group-hover:text-emerald-400/80 mt-0.5">
                    Toggle day
                  </span>
                )}
              </button>
            );
          })}

          {/* Grid Rows */}
          {timeRows.map((row) => (
            <React.Fragment key={row.label}>
              {/* Hour Label */}
              <div className="flex items-center justify-end pr-2 text-[11px] font-medium text-slate-400 select-none">
                {row.minute === 0 ? (
                  <span className="text-slate-300 font-semibold">{row.label}</span>
                ) : (
                  <span className="text-slate-600 text-[10px]">{row.minute}m</span>
                )}
              </div>

              {/* Slot Cells */}
              {dates.map((date) => {
                const slotKey = `${date}T${row.label}`;
                const quorum = quorumMatrix[slotKey];
                const myState = localSlots[slotKey];

                if (isHeatmapMode) {
                  const bgClass = getHeatmapBg(quorum);
                  return (
                    <button
                      key={slotKey}
                      type="button"
                      onClick={() => onSelectSlotTooltip && onSelectSlotTooltip(quorum || null)}
                      className={`paint-grid-cell h-9 rounded-lg border flex items-center justify-center text-[11px] transition-all cursor-pointer ${bgClass}`}
                    >
                      {quorum && quorum.availableCount > 0 ? (
                        <span>
                          {quorum.availableCount}
                          <span className="text-[9px] opacity-75">/{quorum.totalParticipants}</span>
                        </span>
                      ) : (
                        <span className="text-slate-700 opacity-40">·</span>
                      )}
                    </button>
                  );
                }

                // Painter Mode
                let cellStyle = 'bg-slate-950/60 border-slate-800/80 hover:border-slate-600 text-transparent';
                if (myState === 'AVAILABLE') {
                  cellStyle =
                    'bg-emerald-500 border-emerald-400 text-slate-950 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]';
                } else if (myState === 'TENTATIVE') {
                  cellStyle = 'bg-amber-500/80 border-amber-400 text-slate-950 font-bold';
                }

                return (
                  <div
                    key={slotKey}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleCellPointerDown(slotKey);
                    }}
                    onPointerEnter={() => handleCellPointerEnter(slotKey)}
                    className={`paint-grid-cell h-9 rounded-lg border flex items-center justify-center text-xs transition-colors cursor-pointer select-none ${cellStyle}`}
                  >
                    {myState === 'AVAILABLE' && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                    {myState === 'TENTATIVE' && <span className="text-[11px] font-black text-slate-950">?</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Save Button for Painter Mode */}
      {!isHeatmapMode && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentParticipant.avatarColor }}
            />
            <span className="text-xs text-slate-300">
              Painting as: <strong className="text-white">{currentParticipant.name}</strong>
              {currentParticipant.isRequired && (
                <span className="ml-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Required Host
                </span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save My Availability</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
