import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month'); // YYYY-MM

    const db = getDb();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Scorecards
    const thisMonthTotal = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE strftime('%Y-%m', date) = ?
    `).get(currentMonth) as { total: number }).total;

    const thisYearTotal = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE strftime('%Y', date) = ?
    `).get(new Date().getFullYear().toString()) as { total: number }).total;

    const allTimeTotal = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    `).get() as { total: number }).total;

    // Monthly totals for the selected year (or current year)
    const selectedYear = year ?? new Date().getFullYear().toString();
    const monthlyTotals = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month
    `).all(selectedYear) as { month: string; total: number }[];

    // Expense list — optionally filtered by month
    let expenses;
    if (month) {
      expenses = db.prepare(`
        SELECT * FROM expenses
        WHERE strftime('%Y-%m', date) = ?
        ORDER BY date DESC, id DESC
      `).all(month);
    } else if (year) {
      expenses = db.prepare(`
        SELECT * FROM expenses
        WHERE strftime('%Y', date) = ?
        ORDER BY date DESC, id DESC
      `).all(year);
    } else {
      expenses = db.prepare(`
        SELECT * FROM expenses ORDER BY date DESC, id DESC
      `).all();
    }

    return NextResponse.json({
      currentMonth,
      thisMonthTotal,
      thisYearTotal,
      allTimeTotal,
      monthlyTotals,
      expenses,
    });
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const result = db.prepare(`
      INSERT INTO expenses (description, category, amount, date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      description.trim(),
      category?.trim() || null,
      amount,
      date,
      notes?.trim() || null
    );

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
