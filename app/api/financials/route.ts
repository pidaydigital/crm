import { NextRequest, NextResponse } from 'next/server';
import { getDb, toRow, toRows } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') ?? 'this_month';

    const db = await getDb();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    let dateFrom: string;
    let dateTo: string;
    let label: string;

    switch (timeframe) {
      case 'this_month': {
        dateFrom = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        dateTo = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
        label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        break;
      }
      case 'last_month': {
        const lmDate = new Date(currentYear, currentMonth - 1, 1);
        const lmYear = lmDate.getFullYear();
        const lmMonth = lmDate.getMonth();
        dateFrom = `${lmYear}-${String(lmMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(lmYear, lmMonth + 1, 0).getDate();
        dateTo = `${lmYear}-${String(lmMonth + 1).padStart(2, '0')}-${lastDay}`;
        label = lmDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        break;
      }
      case 'this_quarter': {
        const qStart = Math.floor(currentMonth / 3) * 3;
        dateFrom = `${currentYear}-${String(qStart + 1).padStart(2, '0')}-01`;
        const qEnd = qStart + 2;
        const lastDay = new Date(currentYear, qEnd + 1, 0).getDate();
        dateTo = `${currentYear}-${String(qEnd + 1).padStart(2, '0')}-${lastDay}`;
        label = `Q${Math.floor(qStart / 3) + 1} ${currentYear}`;
        break;
      }
      case 'last_quarter': {
        let qStart = Math.floor(currentMonth / 3) * 3 - 3;
        let qYear = currentYear;
        if (qStart < 0) { qStart += 12; qYear -= 1; }
        dateFrom = `${qYear}-${String(qStart + 1).padStart(2, '0')}-01`;
        const qEnd = qStart + 2;
        const lastDay = new Date(qYear, qEnd + 1, 0).getDate();
        dateTo = `${qYear}-${String(qEnd + 1).padStart(2, '0')}-${lastDay}`;
        label = `Q${Math.floor(qStart / 3) + 1} ${qYear}`;
        break;
      }
      case 'this_year': {
        dateFrom = `${currentYear}-01-01`;
        dateTo = `${currentYear}-12-31`;
        label = String(currentYear);
        break;
      }
      case 'last_year': {
        dateFrom = `${currentYear - 1}-01-01`;
        dateTo = `${currentYear - 1}-12-31`;
        label = String(currentYear - 1);
        break;
      }
      case 'all_time': {
        dateFrom = '2000-01-01';
        dateTo = '2099-12-31';
        label = 'All Time';
        break;
      }
      default: {
        dateFrom = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        dateTo = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
        label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
    }

    // For investments (budget_entries), convert date range to YYYY-MM range
    const monthFrom = dateFrom.slice(0, 7);
    const monthTo = dateTo.slice(0, 7);
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    // Cap at current month so we only show actuals (not future planned months)
    const actualMonthTo = monthTo > currentMonthStr ? currentMonthStr : monthTo;
    const currentMonthLastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentMonthEndDate = `${currentMonthStr}-${String(currentMonthLastDay).padStart(2, '0')}`;
    const actualDateTo = dateTo > currentMonthEndDate ? currentMonthEndDate : dateTo;
    const hasFutureData = monthTo > currentMonthStr;

    const queries: Promise<any>[] = [
      // Total investments (actuals only, through current month)
      db.execute({
        sql: `
          SELECT COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month >= ? AND b.month <= ? AND c.archived = 0
        `,
        args: [monthFrom, actualMonthTo],
      }),
      // Investments by client (actuals)
      db.execute({
        sql: `
          SELECT c.id, c.name, COALESCE(SUM(b.amount), 0) as total
          FROM budget_entries b
          JOIN clients c ON c.id = b.client_id
          WHERE b.month >= ? AND b.month <= ? AND c.archived = 0
          GROUP BY c.id
          HAVING total > 0
          ORDER BY total DESC
        `,
        args: [monthFrom, actualMonthTo],
      }),
      // Total expenses (actuals only)
      db.execute({
        sql: `
          SELECT COALESCE(SUM(amount), 0) as total
          FROM expenses
          WHERE date >= ? AND date <= ?
        `,
        args: [dateFrom, actualDateTo],
      }),
      // Expenses by category (actuals)
      db.execute({
        sql: `
          SELECT COALESCE(category, 'Uncategorized') as category, COALESCE(SUM(amount), 0) as total
          FROM expenses
          WHERE date >= ? AND date <= ?
          GROUP BY category
          HAVING total > 0
          ORDER BY total DESC
        `,
        args: [dateFrom, actualDateTo],
      }),
    ];

    // If timeframe extends into the future, also fetch projected (full range) totals
    if (hasFutureData) {
      queries.push(
        // Projected investment total (full range)
        db.execute({
          sql: `
            SELECT COALESCE(SUM(b.amount), 0) as total
            FROM budget_entries b
            JOIN clients c ON c.id = b.client_id
            WHERE b.month >= ? AND b.month <= ? AND c.archived = 0
          `,
          args: [monthFrom, monthTo],
        }),
        // Projected investments by client (full range)
        db.execute({
          sql: `
            SELECT c.id, c.name, COALESCE(SUM(b.amount), 0) as total
            FROM budget_entries b
            JOIN clients c ON c.id = b.client_id
            WHERE b.month >= ? AND b.month <= ? AND c.archived = 0
            GROUP BY c.id
            HAVING total > 0
            ORDER BY total DESC
          `,
          args: [monthFrom, monthTo],
        }),
        // Projected expense total (full range)
        db.execute({
          sql: `
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE date >= ? AND date <= ?
          `,
          args: [dateFrom, dateTo],
        }),
        // Projected expenses by category (full range)
        db.execute({
          sql: `
            SELECT COALESCE(category, 'Uncategorized') as category, COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE date >= ? AND date <= ?
            GROUP BY category
            HAVING total > 0
            ORDER BY total DESC
          `,
          args: [dateFrom, dateTo],
        }),
      );
    }

    const results = await Promise.all(queries);

    const investmentTotal = Number(toRow(results[0])?.total ?? 0);
    const expenseTotal = Number(toRow(results[2])?.total ?? 0);

    const projectedInvestmentTotal = hasFutureData ? Number(toRow(results[4])?.total ?? 0) : null;
    const projectedExpenseTotal = hasFutureData ? Number(toRow(results[6])?.total ?? 0) : null;
    const projectedProfit = projectedInvestmentTotal !== null && projectedExpenseTotal !== null
      ? projectedInvestmentTotal - projectedExpenseTotal
      : null;

    return NextResponse.json({
      timeframe,
      label,
      dateFrom,
      dateTo,
      investmentTotal,
      expenseTotal,
      profit: investmentTotal - expenseTotal,
      investmentsByClient: toRows(results[1]),
      expensesByCategory: toRows(results[3]),
      projectedInvestmentTotal,
      projectedExpenseTotal,
      projectedProfit,
      projectedInvestmentsByClient: hasFutureData ? toRows(results[5]) : null,
      projectedExpensesByCategory: hasFutureData ? toRows(results[7]) : null,
    });
  } catch (error) {
    console.error('GET /api/financials error:', error);
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
  }
}
