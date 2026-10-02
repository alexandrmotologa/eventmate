import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { registerPollRoutes } from '../src/routes/pollApi.js';
import { seedDemoData, DEMO_POLL_ID } from '../src/engine/seeder.js';

describe('Poll Routes API Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    getDatabase(':memory:');
    seedDemoData();

    app = fastify();
    await registerPollRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it('GET /api/polls/demo should return demo poll with options, ballots, IRV result, and Borda scores', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/polls/demo',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.poll.id).toBe(DEMO_POLL_ID);
    expect(body.options.length).toBe(4);
    expect(body.ballots.length).toBe(6);
    expect(body.irvResult.winner).toBeDefined();
    expect(body.bordaScores.length).toBe(4);
  });

  it('POST /api/polls should create a new ranked poll with options', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/polls',
      payload: {
        title: 'Where to host the Hackathon afterparty?',
        description: 'Vote in order of preference',
        options: [
          { text: 'Rooftop Bar', icon: '🍸', priceLevel: '$$$' },
          { text: 'Arcade Arena', icon: '🎮', priceLevel: '$$' },
          { text: 'Karaoke Lounge', icon: '🎤', priceLevel: '$' },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.id).toMatch(/^poll-/);
    expect(body.title).toBe('Where to host the Hackathon afterparty?');
    expect(body.optionCount).toBe(3);

    // Verify GET poll by id
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/polls/${body.id}`,
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.options.length).toBe(3);
    expect(getBody.options[0].text).toBe('Rooftop Bar');
  });

  it('POST /api/polls/:id/vote should record ranked choices and update IRV tally', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/polls',
      payload: {
        title: 'Sprint Demo Snack',
        options: [
          { text: 'Donuts', icon: '🍩' },
          { text: 'Smoothies', icon: '🥤' },
          { text: 'Pizza Bites', icon: '🍕' },
        ],
      },
    });
    const poll = JSON.parse(createRes.payload);

    const getRes = await app.inject({ method: 'GET', url: `/api/polls/${poll.id}` });
    const options = JSON.parse(getRes.payload).options;

    // Vote 1
    const vote1 = await app.inject({
      method: 'POST',
      url: `/api/polls/${poll.id}/vote`,
      payload: {
        voterId: 'voter-1',
        voterName: 'Alice',
        preferences: [options[0].id, options[1].id, options[2].id],
      },
    });
    expect(vote1.statusCode).toBe(200);

    // Vote 2
    const vote2 = await app.inject({
      method: 'POST',
      url: `/api/polls/${poll.id}/vote`,
      payload: {
        voterId: 'voter-2',
        voterName: 'Bob',
        preferences: [options[0].id, options[2].id, options[1].id],
      },
    });
    expect(vote2.statusCode).toBe(200);

    // Fetch updated poll
    const updatedPollRes = await app.inject({ method: 'GET', url: `/api/polls/${poll.id}` });
    const updatedPoll = JSON.parse(updatedPollRes.payload);

    expect(updatedPoll.ballots.length).toBe(2);
    expect(updatedPoll.irvResult.winnerId).toBe(options[0].id);
  });
});
