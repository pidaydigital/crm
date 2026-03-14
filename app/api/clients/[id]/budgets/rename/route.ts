import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { oldName, newName } = body;

    if (!oldName || !newName || typeof oldName !== 'string' || typeof newName !== 'string') {
      return NextResponse.json({ error: 'oldName and newName are required' }, { status: 400 });
    }

    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      return NextResponse.json({ error: 'New service name cannot be empty' }, { status: 400 });
    }

    const db = await getDb();

    await db.execute({
      sql: `UPDATE budget_entries SET service = ? WHERE client_id = ? AND service = ?`,
      args: [trimmedNew, id, oldName],
    });

    return NextResponse.json({ success: true, newName: trimmedNew });
  } catch (error) {
    console.error('PUT /api/clients/[id]/budgets/rename error:', error);
    return NextResponse.json({ error: 'Failed to rename service' }, { status: 500 });
  }
}
