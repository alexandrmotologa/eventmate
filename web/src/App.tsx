import React, { useState, useEffect } from 'react';
import { EventData, Participant, SlotAvailability, SlotQuorum, GoldenHourWindow, PollData } from './types.js';
import { useTelegram } from './hooks/useTelegram.js';
import { AvailabilityGrid } from './components/AvailabilityGrid.js';
import { HeatmapOverlay } from './components/HeatmapOverlay.js';
import { GoldenHoursCard } from './components/GoldenHoursCard.js';
import { RankedChoiceList } from './components/RankedChoiceList.js';
import { ParticipantRoster } from './components/ParticipantRoster.js';
import { DemoSandboxBanner } from './components/DemoSandboxBanner.js';
import { Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const { isTelegram } = useTelegram();
  const [activeSection, setActiveSection] = useState<'SCHEDULE' | 'POLL'>('SCHEDULE');
  const [isHeatmapMode, setIsHeatmapMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Event & Schedule State
  const [event, setEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [quorumMatrix, setQuorumMatrix] = useState<Record<string, SlotQuorum>>({});
  const [goldenHours, setGoldenHours] = useState<GoldenHourWindow[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [tooltipQuorum, setTooltipQuorum] = useState<SlotQuorum | null>(null);

  // Poll State
  const [pollData, setPollData] = useState<PollData | null>(null);

  // Determine eventId from URL query param e.g. ?eventId=xxx or default to 'demo'
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId') || 'demo';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Event Details
      const eventRes = await fetch(`/api/events/${eventId}`);
      if (!eventRes.ok) {
        throw new Error(`Failed to load event: ${eventRes.statusText}`);
      }
      const eventJson = await eventRes.json();
      setEvent(eventJson.event);
      setParticipants(eventJson.participants);
      setSlots(eventJson.slots);
      setQuorumMatrix(eventJson.quorumMatrix);
      setGoldenHours(eventJson.goldenHours);

      // Set default participant to first one or preserve current
      if (eventJson.participants.length > 0) {
        setCurrentParticipant((prev) => {
          if (prev) {
            const found = eventJson.participants.find((p: Participant) => p.id === prev.id);
            if (found) return found;
          }
          return eventJson.participants[0];
        });
      }

      // Fetch Poll Details
      const pollRes = await fetch('/api/polls/demo');
      if (pollRes.ok) {
        const pollJson = await pollRes.json();
        setPollData(pollJson);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to EventMate backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  // Save Availability
  const handleSaveAvailability = async (newSlots: { slotKey: string; state: 'AVAILABLE' | 'TENTATIVE' }[]) => {
    if (!currentParticipant || !event) return;

    try {
      const res = await fetch(`/api/events/${event.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          participantName: currentParticipant.name,
          slots: newSlots,
        }),
      });

      if (!res.ok) throw new Error('Failed to save availability');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving availability');
    }
  };

  // Lock Slot
  const handleLockSlot = async (slotKey: string) => {
    if (!event) return;
    try {
      const res = await fetch(`/api/events/${event.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotKey }),
      });
      if (!res.ok) throw new Error('Failed to lock slot');
      setEvent((prev) => (prev ? { ...prev, locked_slot: slotKey } : null));
    } catch (err: any) {
      alert(err.message || 'Error locking slot');
    }
  };

  // Add Participant
  const handleAddParticipant = async (name: string) => {
    if (!event) return;
    try {
      const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#14B8A6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const res = await fetch(`/api/events/${event.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatarColor: randomColor }),
      });
      if (!res.ok) throw new Error('Failed to add participant');
      const newP = await res.json();
      await fetchData();
      setCurrentParticipant(newP);
    } catch (err: any) {
      alert(err.message || 'Error adding member');
    }
  };

  // Cast Ranked Vote
  const handleCastVote = async (preferences: string[]) => {
    if (!pollData || !currentParticipant) return;
    try {
      const res = await fetch(`/api/polls/${pollData.poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: currentParticipant.id,
          voterName: currentParticipant.name,
          preferences,
        }),
      });
      if (!res.ok) throw new Error('Failed to cast vote');
      // Refresh poll data
      const pollRes = await fetch(`/api/polls/${pollData.poll.id}`);
      if (pollRes.ok) {
        const updatedPoll = await pollRes.json();
        setPollData(updatedPoll);
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting vote');
    }
  };

  // Compute submitted participant IDs
  const submittedParticipantIds = new Set<string>();
  slots.forEach((s) => submittedParticipantIds.add(s.participantId));

  // Current participant's slot map
  const mySlots: Record<string, 'AVAILABLE' | 'TENTATIVE'> = {};
  if (currentParticipant) {
    slots
      .filter((s) => s.participantId === currentParticipant.id)
      .forEach((s) => {
        mySlots[s.slotKey] = s.state;
      });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
        <h2 className="text-base font-bold text-white">Loading EventMate...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to schedule matrix</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">Failed to Load Event</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">{error || 'Unknown error'}</p>
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Banner with Navigation */}
      <DemoSandboxBanner
        activeSection={activeSection}
        onChangeSection={setActiveSection}
        isHeatmapMode={isHeatmapMode}
        onToggleHeatmap={setIsHeatmapMode}
        isTelegram={isTelegram}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Event Header Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {event.dates.length} Days &bull; {event.start_hour}:00 &ndash; {event.end_hour}:00
              </span>
              <span className="text-slate-500">&bull;</span>
              <Clock className="w-3.5 h-3.5" />
              <span>{event.timezone}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{event.title}</h2>
            {event.description && (
              <p className="text-xs text-slate-400 mt-1 max-w-xl">{event.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs text-slate-400">Created by:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200">
              {event.creator_name}
            </span>
          </div>
        </div>

        {/* SECTION 1: SCHEDULE GRID */}
        {activeSection === 'SCHEDULE' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Golden Hours Top Windows Card */}
            <GoldenHoursCard
              goldenHours={goldenHours}
              lockedSlot={event.locked_slot}
              eventTitle={event.title}
              onLockSlot={handleLockSlot}
              eventId={event.id}
            />

            {/* Participant Roster */}
            {currentParticipant && (
              <ParticipantRoster
                participants={participants}
                currentParticipant={currentParticipant}
                submittedParticipantIds={submittedParticipantIds}
                onSelectParticipant={setCurrentParticipant}
                onAddParticipant={handleAddParticipant}
              />
            )}

            {/* Interactive 2D Availability Painter / Heatmap Grid */}
            {currentParticipant && (
              <AvailabilityGrid
                dates={event.dates}
                startHour={event.start_hour}
                endHour={event.end_hour}
                slotDurationMinutes={event.slot_duration_minutes}
                currentParticipant={currentParticipant}
                mySlots={mySlots}
                quorumMatrix={quorumMatrix}
                isHeatmapMode={isHeatmapMode}
                onSaveAvailability={handleSaveAvailability}
                onSelectSlotTooltip={setTooltipQuorum}
              />
            )}
          </div>
        )}

        {/* SECTION 2: RANKED CHOICE POLL */}
        {activeSection === 'POLL' && pollData && currentParticipant && (
          <div className="space-y-5 animate-fadeIn">
            <RankedChoiceList
              pollData={pollData}
              currentVoterId={currentParticipant.id}
              currentVoterName={currentParticipant.name}
              onCastVote={handleCastVote}
            />
          </div>
        )}
      </main>

      {/* Slot Tooltip Modal Popover */}
      <HeatmapOverlay quorum={tooltipQuorum} onClose={() => setTooltipQuorum(null)} />

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-400">
        <p>
          EventMate &bull; Telegram Mini App for 2D Schedule Painting & Ranked-Choice Decision Engine
        </p>
      </footer>
    </div>
  );
};
