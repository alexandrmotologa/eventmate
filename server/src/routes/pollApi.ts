import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '../db/database.js';
import { computeInstantRunoff, computeBordaCount, RankedBallot } from '../engine/rankedChoice.js';
import { DEMO_POLL_ID } from '../engine/seeder.js';

interface CreatePollBody {
  eventId?: string;
  title: string;
  description?: string;
  options: {
    text: string;
    icon?: string;
    mapsUrl?: string;
    priceLevel?: string;
    details?: string;
  }[];
}

interface CastVoteBody {
  voterId: string;
  voterName: string;
  preferences: string[];
}

export async function registerPollRoutes(app: FastifyInstance): Promise<void> {
  const db = getDatabase();

  // GET /api/polls/:id
  app.get('/api/polls/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const rawId = request.params.id;
    const pollId = rawId === 'demo' ? DEMO_POLL_ID : rawId;

    const poll: any = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll) {
      return reply.status(404).send({ error: 'Poll not found' });
    }

    const options: any[] = db
      .prepare('SELECT id, text, icon, maps_url as mapsUrl, price_level as priceLevel, details, display_order as displayOrder FROM poll_options WHERE poll_id = ? ORDER BY display_order ASC')
      .all(pollId);

    const rawBallots: any[] = db
      .prepare('SELECT id, voter_id as voterId, voter_name as voterName, preferences_json as preferencesJson, created_at as createdAt FROM ranked_ballots WHERE poll_id = ?')
      .all(pollId);

    const ballots: RankedBallot[] = rawBallots.map((b) => ({
      voterId: b.voterId,
      voterName: b.voterName,
      preferences: JSON.parse(b.preferencesJson || '[]'),
    }));

    const candidateIds = options.map((o) => o.id);
    const irvResult = computeInstantRunoff(candidateIds, ballots);
    const bordaScores = computeBordaCount(candidateIds, ballots);

    const winnerOption = options.find((o) => o.id === irvResult.winnerId);

    return {
      poll,
      options,
      ballots,
      irvResult: {
        ...irvResult,
        winner: winnerOption || null,
      },
      bordaScores,
    };
  });

  // POST /api/polls
  app.post('/api/polls', async (request: FastifyRequest<{ Body: CreatePollBody }>, reply: FastifyReply) => {
    const body = request.body;
    if (!body.title || !body.options || body.options.length < 2) {
      return reply.status(400).send({ error: 'Title and at least 2 options are required' });
    }

    const pollId = 'poll-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

    db.prepare(`
      INSERT INTO polls (id, event_id, title, description, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(pollId, body.eventId || null, body.title, body.description || '', 'OPEN');

    const insertOpt = db.prepare(`
      INSERT INTO poll_options (id, poll_id, text, icon, maps_url, price_level, details, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    body.options.forEach((opt, idx) => {
      const optId = 'opt-' + Date.now().toString(36) + '-' + (idx + 1);
      insertOpt.run(
        optId,
        pollId,
        opt.text,
        opt.icon || '📌',
        opt.mapsUrl || null,
        opt.priceLevel || null,
        opt.details || null,
        idx + 1
      );
    });

    return reply.status(201).send({ id: pollId, title: body.title, optionCount: body.options.length });
  });

  // POST /api/polls/:id/vote
  app.post(
    '/api/polls/:id/vote',
    async (request: FastifyRequest<{ Params: { id: string }; Body: CastVoteBody }>, reply: FastifyReply) => {
      const rawId = request.params.id;
      const pollId = rawId === 'demo' ? DEMO_POLL_ID : rawId;
      const { voterId, voterName, preferences } = request.body;

      if (!voterId || !preferences || preferences.length === 0) {
        return reply.status(400).send({ error: 'voterId and preferences are required' });
      }

      // Check if ballot already exists
      const existing: any = db
        .prepare('SELECT id FROM ranked_ballots WHERE poll_id = ? AND voter_id = ?')
        .get(pollId, voterId);

      if (existing) {
        db.prepare(`
          UPDATE ranked_ballots
          SET voter_name = ?, preferences_json = ?, created_at = datetime('now')
          WHERE id = ?
        `).run(voterName || 'Voter', JSON.stringify(preferences), existing.id);
      } else {
        const ballotId = 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
        db.prepare(`
          INSERT INTO ranked_ballots (id, poll_id, voter_id, voter_name, preferences_json)
          VALUES (?, ?, ?, ?, ?)
        `).run(ballotId, pollId, voterId, voterName || 'Voter', JSON.stringify(preferences));
      }

      return { success: true };
    }
  );
}
