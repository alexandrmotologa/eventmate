import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { getDatabase } from './db/database.js';
import { seedDemoData } from './engine/seeder.js';
import { registerEventRoutes } from './routes/eventApi.js';
import { registerPollRoutes } from './routes/pollApi.js';
import { setupBot } from './bot/bot.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '8080', 10);
const DEMO_MODE = process.env.DEMO_MODE !== 'false';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'mock_token';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

async function start() {
  const app = fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Initialize SQLite Database
  getDatabase();

  if (DEMO_MODE) {
    seedDemoData();
    console.log('[EventMate] Seeded demo data: "Friday Team Dinner" with 6 members and dinner spot poll.');
  }

  // Register API Routes
  await registerEventRoutes(app);
  await registerPollRoutes(app);

  // Health check endpoint
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    demoMode: DEMO_MODE,
  }));

  // Serve static files from web/dist in production or standalone runner
  const rootWebDist = path.resolve(process.cwd(), 'web/dist');
  const parentWebDist = path.resolve(process.cwd(), '../web/dist');
  const localDistPath = path.resolve(process.cwd(), 'public');

  const staticPath = fs.existsSync(rootWebDist)
    ? rootWebDist
    : fs.existsSync(parentWebDist)
    ? parentWebDist
    : fs.existsSync(localDistPath)
    ? localDistPath
    : null;

  if (staticPath) {
    await app.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }

  // Setup Telegram Bot
  const bot = setupBot(BOT_TOKEN, APP_URL);
  if (bot) {
    bot.start({
      onStart: (info) => {
        console.log(`[EventMate] Telegram bot @${info.username} started via long polling.`);
      },
    }).catch((err) => {
      console.error('[EventMate Bot Error]', err);
    });
  }

  // Start HTTP server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[EventMate] Server listening on http://localhost:${PORT}`);
    console.log(`[EventMate] Mini App URL: ${APP_URL}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
