import * as SQLite from 'expo-sqlite';

export async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

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
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_cloth_customer
      ON cloth_entries(customer_name);

    CREATE INDEX IF NOT EXISTS idx_cloth_date
      ON cloth_entries(received_date);

    CREATE INDEX IF NOT EXISTS idx_cloth_customer_date
      ON cloth_entries(customer_name, received_date);
  `);
}
