import { getDatabase } from '../db/database.js';

export const DEMO_EVENT_ID = 'demo-event-friday-dinner';
export const DEMO_POLL_ID = 'demo-poll-dinner-location';

export function seedDemoData(): void {
  const db = getDatabase();

  // Check if demo event already exists
  const existingEvent = db.prepare('SELECT id FROM events WHERE id = ?').get(DEMO_EVENT_ID);
  if (existingEvent) {
    return;
  }

  // Create demo event
  const dates = ['2026-09-18', '2026-09-19', '2026-09-20'];
  db.prepare(`
    INSERT INTO events (
      id, title, description, creator_id, creator_name, timezone,
      dates_json, start_hour, end_hour, slot_duration_minutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    DEMO_EVENT_ID,
    'Friday Team Dinner & Sprint Celebration',
    'Select your available hours for dinner and vote on our restaurant of choice.',
    'user-alex',
    'Alex Motologa',
    'Europe/Bucharest',
    JSON.stringify(dates),
    17, // 17:00
    23, // 23:00
    30  // 30 min intervals
  );

  // 6 participants (Alex is marked as required organizer)
  const participants = [
    { id: 'p-alex', name: 'Alex Motologa', color: '#10B981', tgId: '1001', isRequired: true },
    { id: 'p-elena', name: 'Elena Popescu', color: '#3B82F6', tgId: '1002', isRequired: false },
    { id: 'p-bogdan', name: 'Bogdan Ionescu', color: '#F59E0B', tgId: '1003', isRequired: false },
    { id: 'p-maria', name: 'Maria Radu', color: '#EC4899', tgId: '1004', isRequired: false },
    { id: 'p-stefan', name: 'Stefan Dumitru', color: '#8B5CF6', tgId: '1005', isRequired: false },
    { id: 'p-irina', name: 'Irina Vasilescu', color: '#06B6D4', tgId: '1006', isRequired: false },
  ];

  const insertParticipant = db.prepare(`
    INSERT INTO participants (id, event_id, telegram_user_id, name, avatar_color, is_required)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of participants) {
    insertParticipant.run(p.id, DEMO_EVENT_ID, p.tgId, p.name, p.color, p.isRequired ? 1 : 0);
  }

  // Seed availability slots
  // Golden hour on Friday 2026-09-18 between 19:00 and 21:00 (Everyone or 5/6 free!)
  const insertSlot = db.prepare(`
    INSERT INTO availability_slots (id, event_id, participant_id, slot_key, state)
    VALUES (?, ?, ?, ?, ?)
  `);

  const availabilityMap: Record<string, string[]> = {
    'p-alex': [
      '2026-09-18T18:00', '2026-09-18T18:30', '2026-09-18T19:00', '2026-09-18T19:30',
      '2026-09-18T20:00', '2026-09-18T20:30', '2026-09-18T21:00',
      '2026-09-19T19:00', '2026-09-19T19:30', '2026-09-19T20:00',
    ],
    'p-elena': [
      '2026-09-18T19:00', '2026-09-18T19:30', '2026-09-18T20:00', '2026-09-18T20:30',
      '2026-09-18T21:00', '2026-09-18T21:30',
      '2026-09-19T18:00', '2026-09-19T18:30', '2026-09-19T19:00',
    ],
    'p-bogdan': [
      '2026-09-18T18:30', '2026-09-18T19:00', '2026-09-18T19:30', '2026-09-18T20:00',
      '2026-09-18T20:30', '2026-09-18T21:00', '2026-09-18T21:30',
      '2026-09-20T17:00', '2026-09-20T17:30', '2026-09-20T18:00',
    ],
    'p-maria': [
      '2026-09-18T19:00', '2026-09-18T19:30', '2026-09-18T20:00', '2026-09-18T20:30',
      '2026-09-18T21:00',
      '2026-09-19T20:00', '2026-09-19T20:30', '2026-09-19T21:00',
    ],
    'p-stefan': [
      '2026-09-18T19:00', '2026-09-18T19:30', '2026-09-18T20:00', '2026-09-18T20:30',
      '2026-09-18T21:00', '2026-09-18T21:30', '2026-09-18T22:00',
      '2026-09-20T18:00', '2026-09-20T18:30', '2026-09-20T19:00',
    ],
    'p-irina': [
      '2026-09-18T17:30', '2026-09-18T18:00', '2026-09-18T18:30', '2026-09-18T19:00',
      '2026-09-18T19:30', '2026-09-18T20:00', '2026-09-18T20:30',
      '2026-09-19T17:00', '2026-09-19T17:30',
    ],
  };

  let slotIndex = 1;
  for (const [pId, slots] of Object.entries(availabilityMap)) {
    for (const s of slots) {
      insertSlot.run(`slot-${slotIndex++}`, DEMO_EVENT_ID, pId, s, 'AVAILABLE');
    }
  }

  // Create demo ranked poll
  db.prepare(`
    INSERT INTO polls (id, event_id, title, description, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    DEMO_POLL_ID,
    DEMO_EVENT_ID,
    'Dinner Spot Preference (Ranked Choice)',
    'Order the options from your favorite (1st) to your least favorite.',
    'OPEN'
  );

  const options = [
    {
      id: 'opt-pizza',
      text: 'Trattoria Roma',
      icon: '🍕',
      order: 1,
      mapsUrl: 'https://maps.google.com/?q=Trattoria+Roma',
      priceLevel: '$$',
      details: 'Wood-fired sourdough pizza, outdoor terrace & fresh truffle pasta',
    },
    {
      id: 'opt-sushi',
      text: 'Sushi Master',
      icon: '🍣',
      order: 2,
      mapsUrl: 'https://maps.google.com/?q=Sushi+Master',
      priceLevel: '$$$',
      details: 'Omakase sashimi, nigiri bar & artisanal craft sake',
    },
    {
      id: 'opt-burger',
      text: 'Craft Burger Lab',
      icon: '🍔',
      order: 3,
      mapsUrl: 'https://maps.google.com/?q=Craft+Burger+Lab',
      priceLevel: '$$',
      details: 'Dry-aged beef smash burgers, rosemary parmesan fries & IPA tap',
    },
    {
      id: 'opt-taco',
      text: 'Taqueria Fiesta',
      icon: '🌮',
      order: 4,
      mapsUrl: 'https://maps.google.com/?q=Taqueria+Fiesta',
      priceLevel: '$',
      details: 'Slow-cooked birria tacos, loaded guacamole & hot cinnamon churros',
    },
  ];

  const insertOption = db.prepare(`
    INSERT INTO poll_options (id, poll_id, text, icon, maps_url, price_level, details, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const opt of options) {
    insertOption.run(opt.id, DEMO_POLL_ID, opt.text, opt.icon, opt.mapsUrl, opt.priceLevel, opt.details, opt.order);
  }

  // Seed Ballots
  const ballots = [
    { voterId: 'p-alex', voterName: 'Alex Motologa', prefs: ['opt-sushi', 'opt-pizza', 'opt-burger', 'opt-taco'] },
    { voterId: 'p-elena', voterName: 'Elena Popescu', prefs: ['opt-pizza', 'opt-sushi', 'opt-taco', 'opt-burger'] },
    { voterId: 'p-bogdan', voterName: 'Bogdan Ionescu', prefs: ['opt-burger', 'opt-pizza', 'opt-taco', 'opt-sushi'] },
    { voterId: 'p-maria', voterName: 'Maria Radu', prefs: ['opt-sushi', 'opt-taco', 'opt-pizza', 'opt-burger'] },
    { voterId: 'p-stefan', voterName: 'Stefan Dumitru', prefs: ['opt-taco', 'opt-burger', 'opt-pizza', 'opt-sushi'] },
    { voterId: 'p-irina', voterName: 'Irina Vasilescu', prefs: ['opt-pizza', 'opt-sushi', 'opt-burger', 'opt-taco'] },
  ];

  const insertBallot = db.prepare(`
    INSERT INTO ranked_ballots (id, poll_id, voter_id, voter_name, preferences_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  ballots.forEach((b, idx) => {
    insertBallot.run(`ballot-${idx + 1}`, DEMO_POLL_ID, b.voterId, b.voterName, JSON.stringify(b.prefs));
  });
}
