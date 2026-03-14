import { NextResponse } from 'next/server';
import { getDb, toRow, toRows } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ?? new Date().getFullYear().toString();
    const currentMonth = new Date().toISOString().slice(0, 7);

    const db = await getDb();

    const [
      allTimeResult,
      thisYearResult,
      thisMonthResult,
      projectedYearResult,
      projectedAllTimeResult,
      clientBreakdownResult,
      monthlyTotalsResult,
      clientMonthlyResult,
    ] = await Promise.all([
      db.execute({
        sql: `
          SELECT COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month <= ? AND c.archived = 0
        `,
        args: [currentMonth],
      }),
      db.execute({
        sql: `
          SELECT COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month LIKE ? AND b.month <= ? AND c.archived = 0
        `,
        args: [`${year}-%`, currentMonth],
      }),
      db.execute({
        sql: `
          SELECT COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month = ? AND c.archived = 0
        `,
        args: [currentMonth],
      }),
      db.execute({
        sql: `
          SELECT COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month LIKE ? AND c.archived = 0
        `,
        args: [`${year}-%`],
      }),
      db.execute(`
        SELECT COALESCE(SUM(b.amount), 0) as total
        FROM budget_entries b
        JOIN clients c ON c.id = b.client_id
        WHERE c.archived = 0
      `),
      db.execute({
        sql: `
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
        `,
        args: [currentMonth, `${year}-%`, currentMonth, currentMonth],
      }),
      db.execute({
        sql: `
          SELECT b.month, COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month LIKE ? AND c.archived = 0
          GROUP BY b.month
          ORDER BY b.month
        `,
        args: [`${year}-%`],
      }),
      db.execute({
        sql: `
          SELECT c.id as client_id, b.month, COALESCE(SUM(b.amount), 0) as total
          FROM clients c
          JOIN budget_entries b ON b.client_id = c.id
          WHERE b.month LIKE ? AND c.archived = 0
          GROUP BY c.id, b.month
          ORDER BY c.name, b.month
        `,
        args: [`${year}-%`],
      }),
    ]);

    return NextResponse.json({
      year: Number(year),
      currentMonth,
      allTime: Number(toRow(allTimeResult)?.total ?? 0),
      projectedAllTime: Number(toRow(projectedAllTimeResult)?.total ?? 0),
      thisYear: Number(toRow(thisYearResult)?.total ?? 0),
      projectedYear: Number(toRow(projectedYearResult)?.total ?? 0),
      thisMonth: Number(toRow(thisMonthResult)?.total ?? 0),
      clientBreakdown: toRows(clientBreakdownResult),
      monthlyTotals: toRows(monthlyTotalsResult),
      clientMonthly: toRows(clientMonthlyResult),
    });
  } catch (error) {
    console.error('GET /api/investments error:', error);
    return NextResponse.json({ error: 'Failed to fetch investment data' }, { status: 500 });
  }
}
