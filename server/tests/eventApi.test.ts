import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { registerEventRoutes } from '../src/routes/eventApi.js';
import { seedDemoData, DEMO_EVENT_ID } from '../src/engine/seeder.js';

describe('Event Routes API Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // In-memory test db
    getDatabase(':memory:');
    seedDemoData();

    app = fastify();
    await registerEventRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it('GET /api/events/demo should return demo event with participants, quorum matrix and golden hours', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/events/demo',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.event.id).toBe(DEMO_EVENT_ID);
    expect(body.participants.length).toBe(6);
    expect(body.goldenHours.length).toBeGreaterThan(0);
    expect(body.pollId).toBe('demo-poll-dinner-location');
  });

  it('POST /api/events should create a new event and add creator as required participant', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: {
        title: 'Strategy Offsite 2026',
        description: 'Quarterly alignment and roadmap planning',
        creatorName: 'Alex Motologa',
        dates: ['2026-10-15', '2026-10-16'],
        startHour: 10,
        endHour: 18,
        slotDurationMinutes: 30,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.title).toBe('Strategy Offsite 2026');
    expect(body.dates).toEqual(['2026-10-15', '2026-10-16']);
    expect(body.id).toMatch(/^ev-/);

    // Verify GET of newly created event
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/events/${body.id}`,
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.participants.length).toBe(1);
    expect(getBody.participants[0].name).toBe('Alex Motologa');
    expect(getBody.participants[0].isRequired).toBe(1);
  });

  it('POST /api/events/:id/participants should add a new member and support VIP host toggle', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: {
        title: 'Board Game Evening',
        creatorName: 'Host',
        dates: ['2026-10-20'],
      },
    });
    const event = JSON.parse(createRes.payload);

    // Add Member
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/participants`,
      payload: {
        name: 'Diana Prince',
        avatarColor: '#8B5CF6',
        isRequired: true,
      },
    });

    expect(addRes.statusCode).toBe(201);
    const participant = JSON.parse(addRes.payload);
    expect(participant.name).toBe('Diana Prince');
    expect(participant.isRequired).toBe(true);

    // Toggle Required status
    const toggleRes = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/participants/${participant.id}/toggle-required`,
    });
    expect(toggleRes.statusCode).toBe(200);
    const toggleBody = JSON.parse(toggleRes.payload);
    expect(toggleBody.participant.isRequired).toBe(false);
  });

  it('POST /api/events/:id/availability should save slot selections and compute quorum', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: {
        title: 'Team Sync',
        creatorName: 'Host',
        dates: ['2026-10-22'],
        startHour: 9,
        endHour: 12,
      },
    });
    const event = JSON.parse(createRes.payload);

    const getRes = await app.inject({ method: 'GET', url: `/api/events/${event.id}` });
    const hostParticipant = JSON.parse(getRes.payload).participants[0];

    const saveRes = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/availability`,
      payload: {
        participantId: hostParticipant.id,
        slots: [
          { slotKey: '2026-10-22T09:00', state: 'AVAILABLE' },
          { slotKey: '2026-10-22T09:30', state: 'AVAILABLE' },
        ],
      },
    });

    expect(saveRes.statusCode).toBe(200);
    const saveBody = JSON.parse(saveRes.payload);
    expect(saveBody.success).toBe(true);
    expect(saveBody.updatedCount).toBe(2);
  });

  it('GET /api/events/:id/export-ics should export valid VCALENDAR file', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/events/demo/export-ics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/calendar');
    expect(response.payload).toContain('BEGIN:VCALENDAR');
    expect(response.payload).toContain('SUMMARY:Friday Team Dinner & Sprint Celebration');
    expect(response.payload).toContain('END:VCALENDAR');
  });

  it('GET /api/events/:id/export-csv should export valid CSV matrix', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/events/demo/export-csv',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.payload).toContain('Date,Time,Quorum %');
    expect(response.payload).toContain('Alex Motologa (Host)');
  });
});
