import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(customPath?: string): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath =
    customPath ||
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), 'data', 'eventmate.db');

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      dates_json TEXT NOT NULL,
      start_hour INTEGER NOT NULL DEFAULT 9,
      end_hour INTEGER NOT NULL DEFAULT 22,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
      locked_slot TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      telegram_user_id TEXT,
      name TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#10B981',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, name)
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      slot_key TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'AVAILABLE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, participant_id, slot_key)
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      icon TEXT DEFAULT '📌',
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ranked_ballots (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      voter_id TEXT NOT NULL,
      voter_name TEXT NOT NULL,
      preferences_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(poll_id, voter_id)
    );

    CREATE INDEX IF NOT EXISTS idx_slots_event ON availability_slots(event_id);
    CREATE INDEX IF NOT EXISTS idx_slots_participant ON availability_slots(participant_id);
    CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
    CREATE INDEX IF NOT EXISTS idx_ballots_poll ON ranked_ballots(poll_id);
  `);

  dbInstance = db;
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
