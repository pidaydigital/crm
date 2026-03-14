import { NextRequest, NextResponse } from 'next/server';
import { getDb, toRow } from '@/lib/db';

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

    const db = await getDb();
    const existing = toRow(await db.execute({ sql: 'SELECT id FROM expenses WHERE id = ?', args: [Number(id)] }));
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await db.execute({
      sql: `UPDATE expenses SET description = ?, category = ?, amount = ?, date = ?, notes = ? WHERE id = ?`,
      args: [description.trim(), category?.trim() || null, amount, date, notes?.trim() || null, Number(id)],
    });

    const result = await db.execute({ sql: 'SELECT * FROM expenses WHERE id = ?', args: [Number(id)] });
    return NextResponse.json(toRow(result));
  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const existing = toRow(await db.execute({ sql: 'SELECT id FROM expenses WHERE id = ?', args: [Number(id)] }));
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    await db.execute({ sql: 'DELETE FROM expenses WHERE id = ?', args: [Number(id)] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
