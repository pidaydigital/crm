import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const db = await getDb();

    // Only allow setup if no users exist
    const countResult = await db.execute('SELECT COUNT(*) as count FROM users');
    const count = Number(countResult.rows[0][0]);
    if (count > 0) {
      return NextResponse.json({ error: 'Setup already completed' }, { status: 403 });
    }

    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const result = await db.execute({
      sql: 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) RETURNING id, username',
      args: [username, passwordHash, 'owner'],
    });

    const user = result.rows[0];
    const token = await createSessionToken({
      userId: Number(user[0]),
      username: String(user[1]),
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
