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
      sql: 'SELECT * FROM budget_entries WHERE client_id = ? ORDER BY month DESC, service ASC',
      args: [id],
    });
    return NextResponse.json(toRows(result));
  } catch (error) {
    console.error('GET /api/clients/[id]/budgets error:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { service, month, amount, notes } = body;

    if (!service || typeof service !== 'string' || service.trim() === '') {
      return NextResponse.json({ error: 'Service is required' }, { status: 400 });
    }
    if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Month must be in YYYY-MM format' }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 });
    }

    const db = await getDb();
    const client = toRow(await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [id] }));
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const insertResult = await db.execute({
      sql: `INSERT INTO budget_entries (client_id, service, month, amount, notes) VALUES (?, ?, ?, ?, ?)`,
      args: [id, service.trim(), month, Number(amount), notes || null],
    });

    const selectResult = await db.execute({
      sql: 'SELECT * FROM budget_entries WHERE id = ?',
      args: [Number(insertResult.lastInsertRowid)],
    });
    return NextResponse.json(toRow(selectResult), { status: 201 });
  } catch (error) {
    console.error('POST /api/clients/[id]/budgets error:', error);
    return NextResponse.json({ error: 'Failed to create budget entry' }, { status: 500 });
  }
}
