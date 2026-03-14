import { NextRequest, NextResponse } from 'next/server';
import { getDb, toRows, toRow } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get('archived') === 'true' ? 1 : 0;
    const inactive = searchParams.get('inactive') === 'true';
    const db = await getDb();

    let statusFilter: string;
    if (inactive) {
      statusFilter = "AND c.status = 'inactive'";
    } else if (archived === 0) {
      statusFilter = "AND c.status != 'inactive'";
    } else {
      statusFilter = '';
    }

    const result = await db.execute({
      sql: `
        SELECT
          c.*,
          COUNT(DISTINCT co.id) as contact_count,
          COALESCE((
            SELECT SUM(amount) FROM budget_entries
            WHERE client_id = c.id AND month = strftime('%Y-%m', 'now')
          ), 0) as current_month_budget
        FROM clients c
        LEFT JOIN contacts co ON co.client_id = c.id
        WHERE c.archived = ? ${statusFilter}
        GROUP BY c.id
        ORDER BY c.name ASC
      `,
      args: [archived],
    });
    return NextResponse.json(toRows(result));
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

    const db = await getDb();
    const insertResult = await db.execute({
      sql: `INSERT INTO clients (name, industry, status, website, notes) VALUES (?, ?, ?, ?, ?)`,
      args: [name.trim(), industry || null, status || 'active', website || null, notes || null],
    });

    const selectResult = await db.execute({
      sql: 'SELECT * FROM clients WHERE id = ?',
      args: [Number(insertResult.lastInsertRowid)],
    });
    return NextResponse.json(toRow(selectResult), { status: 201 });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
