import { createClient, type Client as LibsqlClient, type ResultSet } from '@libsql/client';

let client: LibsqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function createDbClient(): LibsqlClient {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

async function initializeSchema(db: LibsqlClient): Promise<void> {
  await db.executeMultiple(`
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

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration: add archived column if it doesn't exist
  const result = await db.execute('PRAGMA table_info(clients)');
  const hasArchived = result.rows.some(row => row[1] === 'archived');
  if (!hasArchived) {
    await db.execute('ALTER TABLE clients ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
  }
}

export async function getDb(): Promise<LibsqlClient> {
  if (!client) {
    client = createDbClient();
    schemaReady = initializeSchema(client);
  }
  await schemaReady;
  return client;
}

// Convert a ResultSet row to a plain object (handles bigint → number for JSON serialization)
function normalizeValue(val: unknown): unknown {
  return typeof val === 'bigint' ? Number(val) : val;
}

export function toRow(result: ResultSet): Record<string, unknown> | null {
  if (!result.rows[0]) return null;
  return Object.fromEntries(
    result.columns.map((col, i) => [col, normalizeValue(result.rows[0][i])])
  );
}

export function toRows(result: ResultSet): Record<string, unknown>[] {
  return result.rows.map(row =>
    Object.fromEntries(result.columns.map((col, i) => [col, normalizeValue(row[i])]))
  );
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

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
}
