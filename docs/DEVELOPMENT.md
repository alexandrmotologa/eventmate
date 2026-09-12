# Development guide

This document provides instructions for setting up, developing, testing, and containerizing EventMate.

## Prerequisites

- Node.js 22 or higher (Node.js 24 recommended for native `node:sqlite`).
- npm 10 or higher.
- Docker and Docker Compose (optional, for container runs).

## Project structure

```
eventmate/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json          # Root scripts for multi-workspace management
├── docs/                 # Architectural and algorithmic documentation
├── server/               # Fastify backend, SQLite DB, calculation engines, bot
│   ├── src/
│   │   ├── bot/          # grammY Telegram bot setup and command handlers
│   │   ├── db/           # SQLite schema and query wrappers
│   │   ├── engine/       # IRV, Borda, and Golden Hour quorum algorithms
│   │   ├── routes/       # REST API endpoints and iCalendar export
│   │   ├── security/     # Telegram initData HMAC verification
│   │   └── index.ts      # Fastify server entrypoint
│   ├── tests/            # Vitest unit test suite
│   ├── package.json
│   └── tsconfig.json
└── web/                  # React 19 single-page application
    ├── src/
    │   ├── components/   # AvailabilityGrid, HeatmapOverlay, GoldenHoursCard, etc.
    │   ├── hooks/        # useTelegram hook with haptics
    │   ├── styles/       # Tailwind CSS configuration
    │   ├── App.tsx       # Root UI view
    │   └── main.tsx      # Client entrypoint
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

## Quick setup

### 1. Install dependencies

```bash
# From the repository root:
npm run install:all
```

Or install separately in each folder:

```bash
cd server && npm install
cd ../web && npm install
```

### 2. Environment configuration

Copy the example configuration file:

```bash
cp .env.example .env
```

For local testing without Telegram credentials, keep default values:

```env
PORT=8080
TELEGRAM_BOT_TOKEN=mock_token
DEMO_MODE=true
DATABASE_PATH=./data/eventmate.db
APP_URL=http://localhost:8080
```

### 3. Run the development environment

Open two terminal sessions or run:

```bash
# Terminal 1 (Backend API & Seeded Database on http://localhost:8080):
npm run dev:server

# Terminal 2 (Vite Frontend with API proxy on http://localhost:5173):
npm run dev:web
```

Navigate to `http://localhost:5173` to interact with the Mini App studio.

## Testing

Run unit tests for the voting and quorum algorithms:

```bash
npm test
```

Or inside `server/`:

```bash
cd server
npm test
```

## Production build

Compile both backend TypeScript and frontend static bundles:

```bash
npm run build
```

This compiles `server/src` into `server/dist` and bundles `web/src` into `web/dist`. The Fastify server automatically serves the compiled frontend assets from `web/dist` when started with `npm run start`.

## Running with Docker

Build and run the containerized application:

```bash
docker compose up --build -d
```

Access the application at `http://localhost:8080`. Data is persisted to the `eventmate_data` Docker volume.
