import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const contacts = db.prepare(`
      SELECT co.*, c.name as client_name, c.status as client_status
      FROM contacts co
      JOIN clients c ON c.id = co.client_id
      WHERE c.archived = 0
      ORDER BY co.name ASC
    `).all();
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('GET /api/contacts error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
