import { NextRequest, NextResponse } from 'next/server';
import { getDb, toRow, toRows } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM contacts WHERE client_id = ? ORDER BY name ASC',
      args: [id],
    });
    return NextResponse.json(toRows(result));
  } catch (error) {
    console.error('GET /api/clients/[id]/contacts error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, role, notes } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();
    const client = toRow(await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [id] }));
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const insertResult = await db.execute({
      sql: `INSERT INTO contacts (client_id, name, email, phone, role, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, name.trim(), email || null, phone || null, role || null, notes || null],
    });

    const selectResult = await db.execute({
      sql: 'SELECT * FROM contacts WHERE id = ?',
      args: [Number(insertResult.lastInsertRowid)],
    });
    return NextResponse.json(toRow(selectResult), { status: 201 });
  } catch (error) {
    console.error('POST /api/clients/[id]/contacts error:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
