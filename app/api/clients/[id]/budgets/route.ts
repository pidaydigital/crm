import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const budgets = db.prepare(
      'SELECT * FROM budget_entries WHERE client_id = ? ORDER BY month DESC, service ASC'
    ).all(id);
    return NextResponse.json(budgets);
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

    const db = getDb();
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const result = db.prepare(`
      INSERT INTO budget_entries (client_id, service, month, amount, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      service.trim(),
      month,
      Number(amount),
      notes || null
    );

    const entry = db.prepare('SELECT * FROM budget_entries WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients/[id]/budgets error:', error);
    return NextResponse.json({ error: 'Failed to create budget entry' }, { status: 500 });
  }
}
