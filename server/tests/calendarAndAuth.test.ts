import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { seedDemoData } from '../src/engine/seeder.js';
import { registerEventRoutes } from '../src/routes/eventApi.js';
import { generateCalendarLinks } from '../src/utils/calendarLinks.js';
import { validateTelegramInitData } from '../src/security/auth.js';
import crypto from 'crypto';

describe('Calendar Links & Finalize API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    closeDatabase();
    getDatabase(':memory:');
    seedDemoData();

    app = fastify({ logger: false });
    await registerEventRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    closeDatabase();
  });

  it('should generate properly formatted Google, Outlook, and Yahoo calendar links', () => {
    const start = new Date('2026-09-18T19:00:00Z');
    const end = new Date('2026-09-18T20:30:00Z');

    const links = generateCalendarLinks({
      title: 'Team Strategy Dinner',
      description: 'Quarterly team celebration',
      location: 'Trattoria Il Mulino',
      startDateTime: start,
      endDateTime: end,
    });

    expect(links.googleUrl).toContain('calendar.google.com/calendar/render');
    expect(links.googleUrl).toContain('Team+Strategy+Dinner');
    expect(links.googleUrl).toContain('20260918T190000Z');

    expect(links.outlookUrl).toContain('outlook.live.com');
    expect(links.outlookUrl).toContain('Team+Strategy+Dinner');

    expect(links.yahooUrl).toContain('calendar.yahoo.com');
  });

  it('should return calendar links via GET /api/events/:id/calendar-links', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/demo/calendar-links',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.eventId).toBe('demo-event-friday-dinner');
    expect(json.googleUrl).toContain('calendar.google.com');
    expect(json.outlookUrl).toContain('outlook.live.com');
    expect(json.icsUrl).toBe('/api/events/demo-event-friday-dinner/export-ics');
  });

  it('should finalize an event via POST /api/events/:id/finalize', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/events/demo/finalize',
      payload: {
        slotKey: '2026-09-18T19:30',
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.status).toBe('FINALIZED');
    expect(json.lockedSlot).toBe('2026-09-18T19:30');

    // Verify GET /api/events/demo reflects FINALIZED status
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/events/demo',
    });
    const eventJson = JSON.parse(getRes.body);
    expect(eventJson.event.status).toBe('FINALIZED');
    expect(eventJson.event.locked_slot).toBe('2026-09-18T19:30');
  });
});

describe('Telegram WebApp Auth HMAC Validation', () => {
  const botToken = '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ';

  it('should validate valid Telegram initData signature', () => {
    const userJson = JSON.stringify({ id: 9999, first_name: 'Elena', username: 'elena_dev' });
    const authDate = Math.floor(Date.now() / 1000).toString();

    const dataCheckString = `auth_date=${authDate}\nuser=${userJson}`;
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const rawInitData = `user=${encodeURIComponent(userJson)}&auth_date=${authDate}&hash=${hash}`;

    const res = validateTelegramInitData(rawInitData, botToken, false);
    expect(res.valid).toBe(true);
    expect(res.user?.id).toBe(9999);
    expect(res.user?.first_name).toBe('Elena');
  });

  it('should reject tampered Telegram initData signature when demoMode is false', () => {
    const tamperedInitData = 'user=%7B%22id%22%3A123%7D&auth_date=1600000000&hash=invalidhash123';
    const res = validateTelegramInitData(tamperedInitData, botToken, false);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Invalid HMAC signature');
  });

  it('should fallback to mock demo user when demoMode is true and initData is missing or demo', () => {
    const res = validateTelegramInitData('demo', 'mock_token', true);
    expect(res.valid).toBe(true);
    expect(res.user?.first_name).toBe('Alex');
  });
});
