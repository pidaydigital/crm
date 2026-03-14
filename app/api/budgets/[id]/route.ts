import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
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
    if (!db) return NextResponse.json({ error: 'Budget entry not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM budget_entries WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Budget entry not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE budget_entries
      SET service = ?, month = ?, amount = ?, notes = ?
      WHERE id = ?
    `).run(
      service.trim(),
      month,
      Number(amount),
      notes || null,
      id
    );

    const entry = db.prepare('SELECT * FROM budget_entries WHERE id = ?').get(id);
    return NextResponse.json(entry);
  } catch (error) {
    console.error('PUT /api/budgets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update budget entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Budget entry not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM budget_entries WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Budget entry not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM budget_entries WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/budgets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete budget entry' }, { status: 500 });
  }
}
