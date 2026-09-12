# Architecture

EventMate coordinates group scheduling and voting for Telegram chats. It combines a 2D touch availability grid with a ranked-choice voting engine.

## System overview

The system operates across three tiers: a Telegram bot interface for group chat interactions, a Fastify backend providing REST APIs and calculation engines, and a React 19 single-page web client rendered inside the Telegram Mini App webview or in a desktop browser.

```
+-------------------------------------------------------------+
| Telegram Group Chat / Private Chat                          |
| - Bot commands: /meet, /poll, /golden, /help                |
| - Inline query: @EventMateBot [event name]                  |
| - WebApp action button: [Paint Availability]                |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Telegram Mini App / Web Client (React 19, Tailwind CSS)     |
| - AvailabilityGrid: 2D touch drag-to-paint matrix           |
| - HeatmapOverlay: Quorum color gradient & attendee breakdown|
| - GoldenHoursCard: Contiguous meeting slot finder & calendar|
| - RankedChoiceList: Interactive ballot & IRV visualizer     |
| - ParticipantRoster: Multi-member switcher & presence       |
+-------------------------------------------------------------+
                              |
                     REST API | HMAC initData
                              v
+-------------------------------------------------------------+
| Fastify Backend (Node.js 24, TypeScript)                    |
| - /api/events: Event details, slot painting, slot lock, ics |
| - /api/polls: Ranked ballots, IRV rounds, Borda scoring     |
| - grammY Bot runner: Long-polling mode                      |
+-------------------------------------------------------------+
       |                                      |
       v                                      v
+------------------------+      +-----------------------------+
| Calculation Engines    |      | SQLite Storage (WAL Mode)   |
| - Instant-Runoff (IRV) |      | - node:sqlite DatabaseSync  |
| - Borda Count points   |      | - Events, Participants      |
| - Contiguous Quorum    |      | - Slots, Polls, Ballots     |
+------------------------+      +-----------------------------+
```

## Data model

The storage layer uses SQLite through the Node.js built-in `node:sqlite` module with write-ahead logging enabled.

### 1. events
Represents a group scheduling session.
- `id` (TEXT PRIMARY KEY): Unique identifier.
- `title` (TEXT NOT NULL): Display title.
- `description` (TEXT): Meeting agenda or context.
- `creator_id` (TEXT NOT NULL): Telegram ID or local user ID.
- `creator_name` (TEXT NOT NULL): Display name of the organizer.
- `timezone` (TEXT NOT NULL): Default timezone (e.g. UTC, Europe/Bucharest).
- `dates_json` (TEXT NOT NULL): Serialized JSON array of dates (ISO 8601 strings).
- `start_hour` (INTEGER NOT NULL): Earliest hour in 24h format (e.g. 9 or 17).
- `end_hour` (INTEGER NOT NULL): Latest hour in 24h format (e.g. 22 or 23).
- `slot_duration_minutes` (INTEGER NOT NULL): Slot step size, default 30 minutes.
- `locked_slot` (TEXT): Finalized meeting slot timestamp if locked by creator.
- `created_at` (TEXT NOT NULL): Creation timestamp.

### 2. participants
Members participating in an event.
- `id` (TEXT PRIMARY KEY): Unique identifier.
- `event_id` (TEXT NOT NULL): Foreign key referencing `events(id)`.
- `telegram_user_id` (TEXT): Optional Telegram user ID.
- `name` (TEXT NOT NULL): Member display name.
- `avatar_color` (TEXT NOT NULL): Distinct color hex for visual badges.
- `is_required` (INTEGER NOT NULL DEFAULT 0): VIP flag; when set to 1, Golden Hour windows must include this member.
- `created_at` (TEXT NOT NULL): Timestamp.

### 3. availability_slots
Painted availability records per member and slot.
- `id` (TEXT PRIMARY KEY): Slot row ID.
- `event_id` (TEXT NOT NULL): Foreign key referencing `events(id)`.
- `participant_id` (TEXT NOT NULL): Foreign key referencing `participants(id)`.
- `slot_key` (TEXT NOT NULL): Combined date and time key (`YYYY-MM-DDTHH:mm`).
- `state` (TEXT NOT NULL): Status (`AVAILABLE` or `TENTATIVE`).
- `created_at` (TEXT NOT NULL): Timestamp.
- Unique constraint on `(event_id, participant_id, slot_key)`.

### 4. polls
Ranked-choice decision polls linked to events or standalone.
- `id` (TEXT PRIMARY KEY): Poll ID.
- `event_id` (TEXT): Optional linked event ID.
- `title` (TEXT NOT NULL): Decision topic.
- `description` (TEXT): Additional details.
- `status` (TEXT NOT NULL): State (`OPEN` or `CLOSED`).
- `created_at` (TEXT NOT NULL): Timestamp.

### 5. poll_options
Candidates or options available for voting in a poll.
- `id` (TEXT PRIMARY KEY): Option ID.
- `poll_id` (TEXT NOT NULL): Foreign key referencing `polls(id)`.
- `text` (TEXT NOT NULL): Label.
- `icon` (TEXT): Associated emoji or icon.
- `maps_url` (TEXT): Optional external location or Google Maps link.
- `price_level` (TEXT): Optional budget indicator (e.g. `$`, `$$`, `$$$`).
- `details` (TEXT): Optional notes or menu highlights.
- `display_order` (INTEGER NOT NULL): Default sort position.

### 6. ranked_ballots
Individual submitted preference orders.
- `id` (TEXT PRIMARY KEY): Ballot ID.
- `poll_id` (TEXT NOT NULL): Foreign key referencing `polls(id)`.
- `voter_id` (TEXT NOT NULL): Participant ID.
- `voter_name` (TEXT NOT NULL): Voter display name.
- `preferences_json` (TEXT NOT NULL): Ordered array of option IDs.
- `created_at` (TEXT NOT NULL): Timestamp.
- Unique constraint on `(poll_id, voter_id)`.

## Telegram security and validation

When running in production with Telegram:
1. The Telegram client generates an `initData` string signed with HMAC-SHA256 using the bot token.
2. The backend verifies this signature before granting access or saving sensitive preferences.
3. In demo mode (`DEMO_MODE=true`), authentication checks allow local testing with pre-seeded demo members and mock tokens without contacting Telegram servers.
