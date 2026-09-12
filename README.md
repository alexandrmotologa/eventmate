<p align="center">
  <img src="docs/images/logo.svg" alt="EventMate Logo" width="130" style="border-radius: 28px;" />
</p>

<h1 align="center">EventMate</h1>

<p align="center">
  <strong>2D Schedule Painter & Ranked-Choice Decision Engine for Telegram</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Fastify-5.x-black?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/grammY-Telegram_Bot-24A1DE?style=flat-square&logo=telegram&logoColor=white" alt="Telegram Bot" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

EventMate replaces rigid native polls and chat scheduling confusion in Telegram groups with a touch availability painter and an Instant-Runoff Voting engine. Group members drag their fingers or mouse across a 2D calendar matrix to mark available hours. The backend calculates quorum overlaps and identifies the top contiguous meeting windows. When groups need to decide on locations or activities, an integrated ranked-choice poll eliminates compromise gridlock by running automated runoff rounds.

EventMate uses the **SyncOtter** mascot. River otters hold paws in a raft while resting on water to stay aligned against the river current. That behavior reflects EventMate's goal of keeping group schedules aligned without members drifting apart.

## Screenshots

<p align="center">
  <img src="docs/images/screenshot_schedule_heatmap.png?raw=true" alt="EventMate Schedule Painter and Golden Hours" width="850" />
</p>

<p align="center">
  <em>2D availability grid with contiguous Golden Hours detection, group quorum calculation, and calendar sync</em>
</p>

<p align="center">
  <img src="docs/images/screenshot_ranked_irv.png?raw=true" alt="EventMate Instant-Runoff Voting Visualizer" width="850" />
</p>

<p align="center">
  <em>Instant-Runoff Voting (IRV) round-by-round tally visualizer showing vote redistribution and consensus results</em>
</p>

## Features

- **2D touch drag-to-paint grid**: Paint availability across days and 30-minute intervals with pointer gestures on desktop and mobile.
- **Group heatmap overlay**: Visual quorum gradient displaying real-time attendance percentage for each slot, complete with participant inspection tooltips.
- **Contiguous Golden Hour detection**: Finds multi-hour meeting windows with maximum collective attendance rather than isolated 30-minute fragments.
- **Calendar sync**: Exports locked meeting times directly to Google Calendar links and standard `.ics` (RFC 5545) files.
- **Instant-Runoff Voting (IRV)**: Ranked preference polling that redistributes votes from eliminated candidates until a majority winner emerges.
- **Round-by-round tally visualizer**: Inspect vote transfers, eliminated options, and majority threshold lines across all runoff rounds.
- **Borda Count analysis**: View total consensus points alongside IRV for transparent group decision evaluation.
- **Long polling Telegram bot**: Operates locally without webhooks, public HTTPS certificates, or paid hosting.
- **Demo mode**: Pre-seeds a simulated "Friday Team Dinner" with six team members and an active restaurant poll for standalone browser testing.

## Technical stack

- **Backend**: Node.js 22+, TypeScript, Fastify 5.x.
- **Telegram bot framework**: grammY 1.x (long-polling runner).
- **Database**: SQLite WAL mode using built-in `node:sqlite` (DatabaseSync).
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide icons, `@twa-dev/sdk`.
- **Testing**: Vitest for algorithmic verification.
- **Packaging**: Multi-stage Docker container.

## Quick start

### 1. Clone repository

```bash
git clone https://github.com/alexandrmotologa/eventmate.git
cd eventmate
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment

Copy the example configuration:

```bash
cp .env.example .env
```

To run in standalone demo mode without Telegram credentials, keep the default values:

```env
PORT=8080
TELEGRAM_BOT_TOKEN=mock_token
DEMO_MODE=true
DATABASE_PATH=./data/eventmate.db
APP_URL=http://localhost:8080
```

### 4. Start the application

Compile both frontend and backend bundles, then start the server:

```bash
npm run build
npm run start
```

Open `http://localhost:8080` in any web browser to explore the Mini App studio.

## Bot commands

| Command | Usage | Description |
| :--- | :--- | :--- |
| `/meet [title]` | `/meet Sprint Planning` | Creates a 2D scheduling matrix and posts a launch button in the group. |
| `/poll [title]` | `/poll Choose Restaurant` | Creates a ranked-choice poll to decide on activities or locations. |
| `/golden` | `/golden` | Displays top three contiguous meeting windows with quorum percentages. |
| `/help` | `/help` | Lists available bot commands. |

## Documentation

Detailed technical documents are available in the `docs` directory:

- [Architecture](docs/ARCHITECTURE.md): Database schema, components, and security model.
- [Algorithms](docs/ALGORITHMS.md): Mathematical formulations for IRV, Borda, and contiguous quorum search.
- [Telegram specifications](docs/TELEGRAM_SPECS.md): Bot interaction rules, inline query contracts, and haptic feedback.
- [Development guide](docs/DEVELOPMENT.md): Local development workflow and container setup.

## Running with Docker

Run the containerized application with Docker Compose:

```bash
docker compose up --build -d
```

Access the studio at `http://localhost:8080`. SQLite state is persisted in the `eventmate_data` volume.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
