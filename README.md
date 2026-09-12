<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="EventMate Logo" width="130" style="border-radius: 28px;" />
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
  <img src="docs/images/screenshot_schedule_grid.png?raw=true" alt="EventMate 2D Schedule Painter with Contiguous Golden Hours" width="850" />
</p>

<p align="center">
  <em>2D availability grid with Smart Paint tools (Undo/Redo, Column toggles, Invert), Golden VIP host badges, and contiguous Golden Hours detection</em>
</p>

<p align="center">
  <img src="docs/images/screenshot_heatmap.png?raw=true" alt="EventMate Real-Time Group Quorum Heatmap" width="850" />
</p>

<p align="center">
  <em>Live group quorum heatmap overlay displaying collective attendance percentages across days and time slots</em>
</p>

<p align="center">
  <img src="docs/images/screenshot_ranked_irv.png?raw=true" alt="EventMate Instant-Runoff Voting Round Visualizer" width="850" />
</p>

<p align="center">
  <em>Instant-Runoff Voting (IRV) round-by-round tally visualizer showing vote redistribution, majority threshold, and consensus results</em>
</p>

<p align="center">
  <img src="docs/images/screenshot_summary_card.png?raw=true" alt="SyncOtter Shareable Summary Card" width="850" />
</p>

<p align="center">
  <em>SyncOtter shareable summary card ready for instant Telegram group sharing and clipboard export</em>
</p>

## Features

- **2D touch drag-to-paint grid**: Paint availability across dates and 30-minute intervals with pointer gestures on desktop and mobile.
- **Smart Paint tools**: Quick presets ("Evenings 18-22", "Work Hours 9-17"), one-click "Copy Day 1 to All", invert selection, individual day column toggles, and full 30-step Undo/Redo stack (with `Ctrl+Z` / `Ctrl+Y`).
- **Required VIP participants**: Mark key members (hosts, speakers, leads) with a golden crown. Golden Hour detection strictly disqualifies any candidate window where a required member cannot attend.
- **Contiguous Golden Hour detection**: Discovers multi-hour meeting windows with maximum collective attendance rather than scattered 30-minute fragments.
- **Group heatmap overlay**: Visual quorum gradient showing live attendance percentage per slot with detailed member breakdown popovers.
- **SyncOtter summary card**: Generates clean visual infographic cards with confirmed meeting slots, poll winners, and attendee lists for Telegram groups.
- **Timezone converter**: Switch between the organizer's event timezone and local browser time with a single click.
- **Interactive in-app creators**: Dedicated modals to spin up new multi-day meeting grids or launch ranked polls directly from the browser UI.
- **Rich candidate options**: Ranked choices support budget indicators (`$`, `$$`, `$$$`), direct Google Maps links, and detail notes.
- **Instant-Runoff Voting (IRV)**: Ranked preference polling that transfers votes from eliminated candidates until a true majority winner emerges.
- **Borda Count analysis**: Parallel point-based ranking displaying total group sentiment alongside IRV rounds.
- **Calendar sync**: Exports locked meeting windows directly to Google Calendar and standard `.ics` (RFC 5545) files.
- **Standalone demo studio**: Fully self-contained local mode (`DEMO_MODE=true`) running out of the box on port 8080 with mock credentials.

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
