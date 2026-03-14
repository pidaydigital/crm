import { NextResponse } from 'next/server';
import { getDb, toRow, toRows } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [
      activeResult,
      prospectResult,
      totalResult,
      budgetResult,
      recentClientsResult,
      recentContactsResult,
      topClientsResult,
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
      db.execute(`SELECT * FROM clients WHERE archived = 0 AND status != 'inactive' ORDER BY created_at DESC LIMIT 5`),
      db.execute(`
        SELECT co.*, c.name as client_name
        FROM contacts co
        JOIN clients c ON c.id = co.client_id
        WHERE c.archived = 0 AND c.status != 'inactive'
        ORDER BY co.created_at DESC
        LIMIT 5
      `),
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
    ]);

    return NextResponse.json({
      activeClients: Number(toRow(activeResult)?.count ?? 0),
      prospectClients: Number(toRow(prospectResult)?.count ?? 0),
      totalClients: Number(toRow(totalResult)?.count ?? 0),
      currentMonthBudget: Number(toRow(budgetResult)?.total ?? 0),
      currentMonth,
      recentClients: toRows(recentClientsResult),
      recentContacts: toRows(recentContactsResult),
      topClientsBudget: toRows(topClientsResult),
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
