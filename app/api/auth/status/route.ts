import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute('SELECT COUNT(*) as count FROM users');
    const count = Number(result.rows[0][0]);
    return NextResponse.json({ hasUsers: count > 0 });
  } catch {
    return NextResponse.json({ hasUsers: false });
  }
}
