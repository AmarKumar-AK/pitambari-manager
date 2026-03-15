import * as SQLite from 'expo-sqlite';

export async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cloth_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cloth_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      sent_by TEXT DEFAULT '',
      received_date TEXT NOT NULL,
      cloth_length REAL NOT NULL DEFAULT 0,
      cloth_cost_per_unit REAL NOT NULL DEFAULT 0,
      coloring_cost_per_unit REAL NOT NULL DEFAULT 0,
      cloth_total REAL NOT NULL DEFAULT 0,
      coloring_total REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      batch_id TEXT DEFAULT '',
      bill_number TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_cloth_customer ON cloth_entries(customer_name)`);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_cloth_date ON cloth_entries(received_date)`);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_cloth_customer_date ON cloth_entries(customer_name, received_date)`);

  // Migration: add batch_id column for existing installs that pre-date this column
  try {
    await db.execAsync(`ALTER TABLE cloth_entries ADD COLUMN batch_id TEXT DEFAULT ''`);
  } catch (_) {
    // Column already exists – safe to ignore
  }

  // Migration: ensure existing NULL batch_id values become empty string
  await db.execAsync(`UPDATE cloth_entries SET batch_id = '' WHERE batch_id IS NULL`);

  // Migration: add bill_number column for existing installs
  try {
    await db.execAsync(`ALTER TABLE cloth_entries ADD COLUMN bill_number TEXT DEFAULT ''`);
  } catch (_) {
    // Column already exists
  }

  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_cloth_batch ON cloth_entries(batch_id)`);
  } catch (_) {
    // Index already exists
  }
}
