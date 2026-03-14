import { NextResponse } from 'next/server';
import { getDb, toRow, toRows } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Build list of last 6 months (YYYY-MM) for the monthly chart
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const [
      activeResult,
      prospectResult,
      totalResult,
      budgetResult,
      topClientsResult,
      topExpensesResult,
      monthlyRevenueResult,
      monthlyExpensesResult,
    ] = await Promise.all([
      db.execute(`SELECT COUNT(*) as count FROM clients WHERE status = 'active' AND archived = 0`),
      db.execute(`SELECT COUNT(*) as count FROM clients WHERE status = 'prospect' AND archived = 0`),
      db.execute(`SELECT COUNT(*) as count FROM clients WHERE archived = 0 AND status != 'inactive'`),
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
      // Monthly revenue (budget_entries) for last 6 months
      db.execute({
        sql: `
          SELECT b.month, COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month >= ? AND b.month <= ? AND c.archived = 0
          GROUP BY b.month
          ORDER BY b.month
        `,
        args: [months[0], months[months.length - 1]],
      }),
      // Monthly expenses for last 6 months
      db.execute({
        sql: `
          SELECT substr(date, 1, 7) as month, COALESCE(SUM(amount), 0) as total
          FROM expenses
          WHERE date >= ? AND date <= ?
          GROUP BY substr(date, 1, 7)
          ORDER BY month
        `,
        args: [`${months[0]}-01`, `${months[months.length - 1]}-31`],
      }),
    ]);

    // Build monthly chart data with all 6 months filled in
    const revenueByMonth: Record<string, number> = {};
    const expensesByMonth: Record<string, number> = {};
    for (const row of toRows(monthlyRevenueResult)) {
      revenueByMonth[row.month as string] = Number(row.total);
    }
    for (const row of toRows(monthlyExpensesResult)) {
      expensesByMonth[row.month as string] = Number(row.total);
    }
    const monthlyChart = months.map(m => ({
      month: m,
      revenue: revenueByMonth[m] ?? 0,
      expenses: expensesByMonth[m] ?? 0,
    }));

    return NextResponse.json({
      activeClients: Number(toRow(activeResult)?.count ?? 0),
      prospectClients: Number(toRow(prospectResult)?.count ?? 0),
      totalClients: Number(toRow(totalResult)?.count ?? 0),
      currentMonthBudget: Number(toRow(budgetResult)?.total ?? 0),
      currentMonth,
      topClientsBudget: toRows(topClientsResult),
      topExpenses: toRows(topExpensesResult),
      monthlyChart,
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
