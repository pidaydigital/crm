import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, category, amount, date, notes } = body;

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 });
    }
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE expenses SET description = ?, category = ?, amount = ?, date = ?, notes = ?
      WHERE id = ?
    `).run(
      description.trim(),
      category?.trim() || null,
      amount,
      date,
      notes?.trim() || null,
      Number(id)
    );

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(Number(id));
    return NextResponse.json(expense);
  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
