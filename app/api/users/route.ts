import { NextResponse } from 'next/server';
import { getDb, toRows } from '@/lib/db';
import { hashPassword, getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const result = await db.execute('SELECT id, username, role, created_at FROM users ORDER BY created_at ASC');
  return NextResponse.json(toRows(result));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username, password } = await request.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const result = await db.execute({
    sql: 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) RETURNING id, username, role, created_at',
    args: [username, passwordHash, 'owner'],
  });

  return NextResponse.json(result.rows[0], { status: 201 });
}
