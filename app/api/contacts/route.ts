import { NextResponse } from 'next/server';
import { getDb, toRows } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute(`
      SELECT co.*, c.name as client_name, c.status as client_status
      FROM contacts co
      JOIN clients c ON c.id = co.client_id
      WHERE c.archived = 0 AND c.status != 'inactive'
      ORDER BY co.name ASC
    `);
    return NextResponse.json(toRows(result));
  } catch (error) {
    console.error('GET /api/contacts error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
