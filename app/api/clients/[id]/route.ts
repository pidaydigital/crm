import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = currentMonth.slice(0, 4);

    const { current_month_investment } = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as current_month_investment FROM budget_entries WHERE client_id = ? AND month = ?'
    ).get(id, currentMonth) as { current_month_investment: number };

    const { ytd_investment } = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as ytd_investment FROM budget_entries WHERE client_id = ? AND month LIKE ? AND month <= ?'
    ).get(id, `${currentYear}-%`, currentMonth) as { ytd_investment: number };

    const { all_time_investment } = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as all_time_investment FROM budget_entries WHERE client_id = ? AND month <= ?'
    ).get(id, currentMonth) as { all_time_investment: number };

    return NextResponse.json({ ...client as object, current_month_investment, ytd_investment, all_time_investment });
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, industry, status, website, notes } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE clients
      SET name = ?, industry = ?, status = ?, website = ?, notes = ?
      WHERE id = ?
    `).run(
      name.trim(),
      industry || null,
      status || 'active',
      website || null,
      notes || null,
      id
    );

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return NextResponse.json(client);
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { archived } = body;

    if (typeof archived !== 'boolean') {
      return NextResponse.json({ error: 'archived must be a boolean' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    db.prepare('UPDATE clients SET archived = ? WHERE id = ?').run(archived ? 1 : 0, id);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return NextResponse.json(client);
  } catch (error) {
    console.error('PATCH /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
