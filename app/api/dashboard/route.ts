import { NextResponse } from 'next/server';
import { getDb, toRow, toRows } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = String(new Date().getFullYear());

    const [
      activeResult,
      topClientsResult,
      topExpensesResult,
      ytdRevenueResult,
      projectedRevenueResult,
      ytdExpensesResult,
    ] = await Promise.all([
      db.execute(`SELECT COUNT(*) as count FROM clients WHERE status = 'active' AND archived = 0`),
      db.execute({
        sql: `
          SELECT c.id, c.name, c.status, COALESCE(SUM(b.amount), 0) as total_budget
          FROM clients c
          LEFT JOIN budget_entries b ON b.client_id = c.id AND b.month = ?
          WHERE c.archived = 0 AND c.status != 'inactive'
          GROUP BY c.id
          ORDER BY total_budget DESC
          LIMIT 5
        `,
        args: [currentMonth],
      }),
      // Top expenses for current month
      db.execute({
        sql: `
          SELECT id, description, category, amount, date
          FROM expenses
          WHERE date >= ? AND date <= ?
          ORDER BY amount DESC
          LIMIT 5
        `,
        args: [`${currentMonth}-01`, `${currentMonth}-31`],
      }),
      // YTD Revenue: sum of budget_entries from Jan to current month
      db.execute({
        sql: `
          SELECT COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month >= ? AND b.month <= ? AND c.archived = 0
        `,
        args: [`${currentYear}-01`, currentMonth],
      }),
      // Projected full-year revenue: sum of all budget_entries for the year
      db.execute({
        sql: `
          SELECT COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month >= ? AND b.month <= ? AND c.archived = 0
        `,
        args: [`${currentYear}-01`, `${currentYear}-12`],
      }),
      // YTD Expenses
      db.execute({
        sql: `
          SELECT COALESCE(SUM(amount), 0) as total
          FROM expenses
          WHERE date >= ? AND date <= ?
        `,
        args: [`${currentYear}-01-01`, `${currentMonth}-31`],
      }),
    ]);

    return NextResponse.json({
      activeClients: Number(toRow(activeResult)?.count ?? 0),
      currentMonth,
      currentYear,
      ytdRevenue: Number(toRow(ytdRevenueResult)?.total ?? 0),
      projectedRevenue: Number(toRow(projectedRevenueResult)?.total ?? 0),
      ytdExpenses: Number(toRow(ytdExpensesResult)?.total ?? 0),
      topClientsBudget: toRows(topClientsResult),
      topExpenses: toRows(topExpensesResult),
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
