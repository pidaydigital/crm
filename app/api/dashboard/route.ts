import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const currentMonth = new Date().toISOString().slice(0, 7);

    const activeClients = db.prepare(
      "SELECT COUNT(*) as count FROM clients WHERE status = 'active' AND archived = 0"
    ).get() as { count: number };

    const prospectClients = db.prepare(
      "SELECT COUNT(*) as count FROM clients WHERE status = 'prospect' AND archived = 0"
    ).get() as { count: number };

    const totalClients = db.prepare(
      'SELECT COUNT(*) as count FROM clients WHERE archived = 0'
    ).get() as { count: number };

    const currentMonthBudget = db.prepare(`
      SELECT COALESCE(SUM(b.amount), 0) as total
      FROM budget_entries b
      JOIN clients c ON c.id = b.client_id
      WHERE b.month = ? AND c.archived = 0
    `).get(currentMonth) as { total: number };

    const recentClients = db.prepare(
      "SELECT * FROM clients WHERE archived = 0 ORDER BY created_at DESC LIMIT 5"
    ).all();

    const recentContacts = db.prepare(`
      SELECT co.*, c.name as client_name
      FROM contacts co
      JOIN clients c ON c.id = co.client_id
      WHERE c.archived = 0
      ORDER BY co.created_at DESC
      LIMIT 5
    `).all();

    const topClientsBudget = db.prepare(`
      SELECT c.id, c.name, c.status, COALESCE(SUM(b.amount), 0) as total_budget
      FROM clients c
      LEFT JOIN budget_entries b ON b.client_id = c.id AND b.month = ?
      WHERE c.archived = 0
      GROUP BY c.id
      ORDER BY total_budget DESC
      LIMIT 5
    `).all(currentMonth);

    return NextResponse.json({
      activeClients: activeClients.count,
      prospectClients: prospectClients.count,
      totalClients: totalClients.count,
      currentMonthBudget: currentMonthBudget.total,
      currentMonth,
      recentClients,
      recentContacts,
      topClientsBudget,
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
