import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('neoagri.db');

export async function initDB() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS drone_markers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      capture_id TEXT UNIQUE NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      disease TEXT,
      confidence REAL,
      timestamp TEXT,
      synced INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS manual_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      capture_id TEXT UNIQUE NOT NULL,
      latitude REAL,
      longitude REAL,
      disease TEXT NOT NULL,
      confidence REAL NOT NULL,
      image_path TEXT,
      timestamp TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      started_at TEXT,
      commands_count INTEGER DEFAULT 0
    );
  `);
}
export { db };
