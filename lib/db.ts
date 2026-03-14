import type BetterSqlite3 from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'crm.db');

let db: BetterSqlite3.Database | null = null;
let dbInitAttempted = false;

export function getDb(): BetterSqlite3.Database | null {
  if (dbInitAttempted) return db;
  dbInitAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const Database = require('better-sqlite3') as any;
    const instance: BetterSqlite3.Database = new Database(DB_PATH);
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
    initializeSchema(instance);
    db = instance;
  } catch (e) {
    console.warn('SQLite unavailable (running without database):', e);
    db = null;
  }
  return db;
}

function initializeSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      industry TEXT,
      status TEXT DEFAULT 'active',
      website TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      category TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration: add archived column if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(clients)").all() as Array<{ name: string }>;
  if (!columns.some(col => col.name === 'archived')) {
    db.exec("ALTER TABLE clients ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  }
}

export interface Client {
  id: number;
  name: string;
  industry: string | null;
  status: string;
  website: string | null;
  notes: string | null;
  created_at: string;
  archived: number;
}

export interface Contact {
  id: number;
  client_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export interface BudgetEntry {
  id: number;
  client_id: number;
  service: string;
  month: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  description: string;
  category: string | null;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}
