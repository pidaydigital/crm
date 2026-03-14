import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get('archived') === 'true' ? 1 : 0;
    const db = getDb();
    if (!db) return NextResponse.json([]);
    const clients = db.prepare(`
      SELECT
        c.*,
        COUNT(DISTINCT co.id) as contact_count,
        COALESCE((
          SELECT SUM(amount) FROM budget_entries
          WHERE client_id = c.id AND month = strftime('%Y-%m', 'now')
        ), 0) as current_month_budget
      FROM clients c
      LEFT JOIN contacts co ON co.client_id = c.id
      WHERE c.archived = ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all(archived);
    return NextResponse.json(clients);
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, industry, status, website, notes } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    const result = db.prepare(`
      INSERT INTO clients (name, industry, status, website, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      industry || null,
      status || 'active',
      website || null,
      notes || null
    );

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
