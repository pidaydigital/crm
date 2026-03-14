import { NextRequest, NextResponse } from 'next/server';
import { getDb, toRow } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const clientResult = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
    const client = toRow(clientResult);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = currentMonth.slice(0, 4);

    const [cmResult, ytdResult, atResult] = await Promise.all([
      db.execute({
        sql: 'SELECT COALESCE(SUM(amount), 0) as current_month_investment FROM budget_entries WHERE client_id = ? AND month = ?',
        args: [id, currentMonth],
      }),
      db.execute({
        sql: 'SELECT COALESCE(SUM(amount), 0) as ytd_investment FROM budget_entries WHERE client_id = ? AND month LIKE ? AND month <= ?',
        args: [id, `${currentYear}-%`, currentMonth],
      }),
      db.execute({
        sql: 'SELECT COALESCE(SUM(amount), 0) as all_time_investment FROM budget_entries WHERE client_id = ? AND month <= ?',
        args: [id, currentMonth],
      }),
    ]);

    const current_month_investment = Number(toRow(cmResult)?.current_month_investment ?? 0);
    const ytd_investment = Number(toRow(ytdResult)?.ytd_investment ?? 0);
    const all_time_investment = Number(toRow(atResult)?.all_time_investment ?? 0);

    return NextResponse.json({ ...client, current_month_investment, ytd_investment, all_time_investment });
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

    const db = await getDb();
    const existing = toRow(await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [id] }));
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await db.execute({
      sql: `UPDATE clients SET name = ?, industry = ?, status = ?, website = ?, notes = ? WHERE id = ?`,
      args: [name.trim(), industry || null, status || 'active', website || null, notes || null, id],
    });

    const result = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
    return NextResponse.json(toRow(result));
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

    const db = await getDb();
    const existing = toRow(await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [id] }));
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await db.execute({ sql: 'UPDATE clients SET archived = ? WHERE id = ?', args: [archived ? 1 : 0, id] });
    const result = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
    return NextResponse.json(toRow(result));
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
    const db = await getDb();
    const existing = toRow(await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [id] }));
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await db.execute({ sql: 'DELETE FROM clients WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
