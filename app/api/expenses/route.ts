import { NextRequest, NextResponse } from 'next/server';
import { getDb, toRow, toRows } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month'); // YYYY-MM

    const db = await getDb();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Scorecards
    const [cmResult, yearResult, atResult] = await Promise.all([
      db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`,
        args: [currentMonth],
      }),
      db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y', date) = ?`,
        args: [new Date().getFullYear().toString()],
      }),
      db.execute(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`),
    ]);

    const thisMonthTotal = Number(toRow(cmResult)?.total ?? 0);
    const thisYearTotal = Number(toRow(yearResult)?.total ?? 0);
    const allTimeTotal = Number(toRow(atResult)?.total ?? 0);

    // Monthly totals for the selected year (or current year)
    const selectedYear = year ?? new Date().getFullYear().toString();
    const monthlyResult = await db.execute({
      sql: `
        SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE strftime('%Y', date) = ?
        GROUP BY month
        ORDER BY month
      `,
      args: [selectedYear],
    });
    const monthlyTotals = toRows(monthlyResult);

    // Expense list — optionally filtered by month
    let expensesResult;
    if (month) {
      expensesResult = await db.execute({
        sql: `SELECT * FROM expenses WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC, id DESC`,
        args: [month],
      });
    } else if (year) {
      expensesResult = await db.execute({
        sql: `SELECT * FROM expenses WHERE strftime('%Y', date) = ? ORDER BY date DESC, id DESC`,
        args: [year],
      });
    } else {
      expensesResult = await db.execute(`SELECT * FROM expenses ORDER BY date DESC, id DESC`);
    }

    return NextResponse.json({
      currentMonth,
      thisMonthTotal,
      thisYearTotal,
      allTimeTotal,
      monthlyTotals,
      expenses: toRows(expensesResult),
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

    const db = await getDb();
    const insertResult = await db.execute({
      sql: `INSERT INTO expenses (description, category, amount, date, notes) VALUES (?, ?, ?, ?, ?)`,
      args: [description.trim(), category?.trim() || null, amount, date, notes?.trim() || null],
    });

    const selectResult = await db.execute({
      sql: 'SELECT * FROM expenses WHERE id = ?',
      args: [Number(insertResult.lastInsertRowid)],
    });
    return NextResponse.json(toRow(selectResult), { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
