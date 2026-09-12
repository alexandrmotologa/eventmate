import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '../db/database.js';
import { computeQuorumMatrix, findGoldenHours, Participant, SlotAvailability } from '../engine/overlap.js';
import { DEMO_EVENT_ID } from '../engine/seeder.js';

interface CreateEventBody {
  title: string;
  description?: string;
  creatorName: string;
  creatorId?: string;
  timezone?: string;
  dates: string[];
  startHour?: number;
  endHour?: number;
  slotDurationMinutes?: number;
}

interface SaveAvailabilityBody {
  participantId: string;
  participantName?: string;
  slots: { slotKey: string; state?: 'AVAILABLE' | 'TENTATIVE' }[];
}

interface LockSlotBody {
  slotKey: string;
}

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  const db = getDatabase();

  // GET /api/events/:id
  app.get('/api/events/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const rawId = request.params.id;
    const eventId = rawId === 'demo' ? DEMO_EVENT_ID : rawId;

    const event: any = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const participants: any[] = db
      .prepare('SELECT id, name, avatar_color as avatarColor, is_required as isRequired, telegram_user_id as telegramUserId, created_at as createdAt FROM participants WHERE event_id = ? ORDER BY created_at ASC')
      .all(eventId);

    const rawSlots: any[] = db
      .prepare('SELECT participant_id as participantId, slot_key as slotKey, state FROM availability_slots WHERE event_id = ?')
      .all(eventId);

    const dates: string[] = JSON.parse(event.dates_json || '[]');

    const domainParticipants: Participant[] = participants.map((p) => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      isRequired: Boolean(p.isRequired),
    }));

    const domainSlots: SlotAvailability[] = rawSlots.map((s) => ({
      participantId: s.participantId,
      slotKey: s.slotKey,
      state: s.state,
    }));

    const quorumMatrix = computeQuorumMatrix(domainParticipants, domainSlots);
    const goldenHours = findGoldenHours(
      dates,
      event.start_hour,
      event.end_hour,
      event.slot_duration_minutes,
      domainParticipants,
      domainSlots,
      60 // 60-min preferred window
    );

    return {
      event: {
        ...event,
        dates,
        dates_json: undefined,
      },
      participants,
      slots: rawSlots,
      quorumMatrix,
      goldenHours,
    };
  });

  // POST /api/events
  app.post('/api/events', async (request: FastifyRequest<{ Body: CreateEventBody }>, reply: FastifyReply) => {
    const body = request.body;
    if (!body.title || !body.dates || body.dates.length === 0) {
      return reply.status(400).send({ error: 'Title and dates are required' });
    }

    const eventId = 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const creatorId = body.creatorId || 'user-' + Date.now().toString(36);
    const creatorName = body.creatorName || 'Organizer';
    const timezone = body.timezone || 'UTC';
    const startHour = body.startHour !== undefined ? body.startHour : 9;
    const endHour = body.endHour !== undefined ? body.endHour : 22;
    const slotDuration = body.slotDurationMinutes || 30;

    db.prepare(`
      INSERT INTO events (
        id, title, description, creator_id, creator_name, timezone,
        dates_json, start_hour, end_hour, slot_duration_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      body.title,
      body.description || '',
      creatorId,
      creatorName,
      timezone,
      JSON.stringify(body.dates),
      startHour,
      endHour,
      slotDuration
    );

    // Add creator as first participant (marked as required by default)
    const participantId = 'p-' + Date.now().toString(36);
    db.prepare(`
      INSERT INTO participants (id, event_id, telegram_user_id, name, avatar_color, is_required)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(participantId, eventId, creatorId, creatorName, '#10B981');

    return reply.status(201).send({
      id: eventId,
      title: body.title,
      creatorId,
      creatorName,
      dates: body.dates,
      startHour,
      endHour,
      slotDurationMinutes: slotDuration,
    });
  });

  // POST /api/events/:id/participants
  app.post(
    '/api/events/:id/participants',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { name: string; avatarColor?: string; telegramUserId?: string; isRequired?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const rawId = request.params.id;
      const eventId = rawId === 'demo' ? DEMO_EVENT_ID : rawId;
      const { name, avatarColor, telegramUserId, isRequired } = request.body;

      if (!name) {
        return reply.status(400).send({ error: 'Participant name is required' });
      }

      // Check if participant already exists by name
      const existing: any = db
        .prepare('SELECT id, name, avatar_color as avatarColor, is_required as isRequired FROM participants WHERE event_id = ? AND name = ?')
        .get(eventId, name);

      if (existing) {
        return existing;
      }

      const id = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
      const color = avatarColor || '#3B82F6';

      db.prepare(`
        INSERT INTO participants (id, event_id, telegram_user_id, name, avatar_color, is_required)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, eventId, telegramUserId || null, name, color, isRequired ? 1 : 0);

      return reply.status(201).send({ id, name, avatarColor: color, isRequired: Boolean(isRequired) });
    }
  );

  // POST /api/events/:id/participants/:pId/toggle-required
  app.post(
    '/api/events/:id/participants/:pId/toggle-required',
    async (
      request: FastifyRequest<{
        Params: { id: string; pId: string };
      }>,
      reply: FastifyReply
    ) => {
      const rawId = request.params.id;
      const eventId = rawId === 'demo' ? DEMO_EVENT_ID : rawId;
      const { pId } = request.params;

      db.prepare(`
        UPDATE participants
        SET is_required = CASE WHEN is_required = 1 THEN 0 ELSE 1 END
        WHERE event_id = ? AND id = ?
      `).run(eventId, pId);

      const updated: any = db
        .prepare('SELECT id, name, is_required as isRequired FROM participants WHERE event_id = ? AND id = ?')
        .get(eventId, pId);

      if (!updated) {
        return reply.status(404).send({ error: 'Participant not found' });
      }

      return { success: true, participant: { ...updated, isRequired: Boolean(updated.isRequired) } };
    }
  );

  // POST /api/events/:id/availability
  app.post(
    '/api/events/:id/availability',
    async (request: FastifyRequest<{ Params: { id: string }; Body: SaveAvailabilityBody }>, reply: FastifyReply) => {
      const rawId = request.params.id;
      const eventId = rawId === 'demo' ? DEMO_EVENT_ID : rawId;
      const { participantId, slots } = request.body;

      if (!participantId) {
        return reply.status(400).send({ error: 'participantId is required' });
      }

      // Delete existing slots for this participant in this event
      db.prepare('DELETE FROM availability_slots WHERE event_id = ? AND participant_id = ?').run(
        eventId,
        participantId
      );

      // Insert new slots
      const insertStmt = db.prepare(`
        INSERT INTO availability_slots (id, event_id, participant_id, slot_key, state)
        VALUES (?, ?, ?, ?, ?)
      `);

      let count = 0;
      for (const slot of slots) {
        const slotId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
        insertStmt.run(slotId, eventId, participantId, slot.slotKey, slot.state || 'AVAILABLE');
        count++;
      }

      return { success: true, updatedCount: count };
    }
  );

  // POST /api/events/:id/lock
  app.post(
    '/api/events/:id/lock',
    async (request: FastifyRequest<{ Params: { id: string }; Body: LockSlotBody }>, reply: FastifyReply) => {
      const rawId = request.params.id;
      const eventId = rawId === 'demo' ? DEMO_EVENT_ID : rawId;
      const { slotKey } = request.body;

      db.prepare('UPDATE events SET locked_slot = ? WHERE id = ?').run(slotKey || null, eventId);
      return { success: true, lockedSlot: slotKey };
    }
  );

  // GET /api/events/:id/export-ics
  app.get(
    '/api/events/:id/export-ics',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const rawId = request.params.id;
      const eventId = rawId === 'demo' ? DEMO_EVENT_ID : rawId;

      const event: any = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
      if (!event) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      const targetSlot = event.locked_slot || '2026-09-18T19:00';
      const [slotDate, slotTime] = targetSlot.split('T');
      const [sh, sm] = (slotTime || '19:00').split(':').map(Number);

      const startDateTime = new Date(`${slotDate}T${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:00Z`);
      const endDateTime = new Date(startDateTime.getTime() + 90 * 60 * 1000); // 90 min default

      const formatIcsTime = (d: Date) =>
        d
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '');

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EventMate//Scheduling Engine//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:eventmate-${eventId}@eventmate.app`,
        `DTSTAMP:${formatIcsTime(new Date())}`,
        `DTSTART:${formatIcsTime(startDateTime)}`,
        `DTEND:${formatIcsTime(endDateTime)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || 'Scheduled via EventMate on Telegram.'}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      reply.header('Content-Type', 'text/calendar; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="eventmate-${eventId}.ics"`);
      return reply.send(ics);
    }
  );
}
