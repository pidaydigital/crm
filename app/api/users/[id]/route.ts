import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, getSession } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const db = await getDb();

  // Check user exists
  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Handle username change
  if (body.username !== undefined) {
    const taken = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ? AND id != ?',
      args: [body.username, id],
    });
    if (taken.rows.length > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
    await db.execute({ sql: 'UPDATE users SET username = ? WHERE id = ?', args: [body.username, id] });
  }

  // Handle password change
  if (body.password !== undefined) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const hash = await hashPassword(body.password);
    await db.execute({ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [hash, id] });
  }

  const updated = await db.execute({
    sql: 'SELECT id, username, role, created_at FROM users WHERE id = ?',
    args: [id],
  });
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Prevent deleting yourself
  if (Number(id) === session.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  // Ensure at least one user remains
  const db = await getDb();
  const countResult = await db.execute('SELECT COUNT(*) as count FROM users');
  const count = Number(countResult.rows[0][0]);
  if (count <= 1) {
    return NextResponse.json({ error: 'Cannot delete the last user' }, { status: 400 });
  }

  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
