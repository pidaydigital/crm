import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ?? new Date().getFullYear().toString();
    const currentMonth = new Date().toISOString().slice(0, 7);

    const db = getDb();
    if (!db) {
      return NextResponse.json({
        year: Number(year),
        currentMonth,
        allTime: 0,
        projectedAllTime: 0,
        thisYear: 0,
        projectedYear: 0,
        thisMonth: 0,
        clientBreakdown: [],
        monthlyTotals: [],
        clientMonthly: [],
      });
    }

    // Actuals: only months up to and including the current month, excluding archived clients
    const allTime = (db.prepare(`
      SELECT COALESCE(SUM(b.amount), 0) as total
      FROM budget_entries b
      JOIN clients c ON c.id = b.client_id
      WHERE b.month <= ? AND c.archived = 0
    `).get(currentMonth) as { total: number }).total;

    const thisYear = (db.prepare(`
      SELECT COALESCE(SUM(b.amount), 0) as total
      FROM budget_entries b
      JOIN clients c ON c.id = b.client_id
      WHERE b.month LIKE ? AND b.month <= ? AND c.archived = 0
    `).get(`${year}-%`, currentMonth) as { total: number }).total;

    const thisMonth = (db.prepare(`
      SELECT COALESCE(SUM(b.amount), 0) as total
      FROM budget_entries b
      JOIN clients c ON c.id = b.client_id
      WHERE b.month = ? AND c.archived = 0
    `).get(currentMonth) as { total: number }).total;

    // Projections: all entered data regardless of future months, excluding archived clients
    const projectedYear = (db.prepare(`
      SELECT COALESCE(SUM(b.amount), 0) as total
      FROM budget_entries b
      JOIN clients c ON c.id = b.client_id
      WHERE b.month LIKE ? AND c.archived = 0
    `).get(`${year}-%`) as { total: number }).total;

    const projectedAllTime = (db.prepare(`
      SELECT COALESCE(SUM(b.amount), 0) as total
      FROM budget_entries b
      JOIN clients c ON c.id = b.client_id
      WHERE c.archived = 0
    `).get() as { total: number }).total;

    // Per-client breakdown (actuals for scorecards), excluding archived clients
    const clientBreakdown = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.status,
        COALESCE(SUM(CASE WHEN b.month = ? THEN b.amount ELSE 0 END), 0) AS this_month,
        COALESCE(SUM(CASE WHEN b.month LIKE ? AND b.month <= ? THEN b.amount ELSE 0 END), 0) AS this_year,
        COALESCE(SUM(CASE WHEN b.month <= ? THEN b.amount ELSE 0 END), 0) AS all_time,
        COALESCE(SUM(b.amount), 0) AS projected_all_time
      FROM clients c
      LEFT JOIN budget_entries b ON b.client_id = c.id
      WHERE c.archived = 0
      GROUP BY c.id
      ORDER BY all_time DESC
    `).all(currentMonth, `${year}-%`, currentMonth, currentMonth) as {
      id: number;
      name: string;
      status: string;
      this_month: number;
      this_year: number;
      all_time: number;
      projected_all_time: number;
    }[];

    // Monthly totals for selected year — all months including future (for the grid), excluding archived clients
    const monthlyTotals = db.prepare(`
      SELECT b.month, COALESCE(SUM(b.amount), 0) as total
      FROM budget_entries b
      JOIN clients c ON c.id = b.client_id
      WHERE b.month LIKE ? AND c.archived = 0
      GROUP BY b.month
      ORDER BY b.month
    `).all(`${year}-%`) as { month: string; total: number }[];

    // Per-client per-month for selected year — all months including future (for the grid), excluding archived clients
    const clientMonthly = db.prepare(`
      SELECT c.id as client_id, b.month, COALESCE(SUM(b.amount), 0) as total
      FROM clients c
      JOIN budget_entries b ON b.client_id = c.id
      WHERE b.month LIKE ? AND c.archived = 0
      GROUP BY c.id, b.month
      ORDER BY c.name, b.month
    `).all(`${year}-%`) as { client_id: number; month: string; total: number }[];

    return NextResponse.json({
      year: Number(year),
      currentMonth,
      allTime,
      projectedAllTime,
      thisYear,
      projectedYear,
      thisMonth,
      clientBreakdown,
      monthlyTotals,
      clientMonthly,
    });
  } catch (error) {
    console.error('GET /api/investments error:', error);
    return NextResponse.json({ error: 'Failed to fetch investment data' }, { status: 500 });
  }
}
