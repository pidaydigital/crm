import { NextRequest, NextResponse } from 'next/server';
import { getDb, toRow } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, role, notes } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();
    const existing = toRow(await db.execute({ sql: 'SELECT id FROM contacts WHERE id = ?', args: [id] }));
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await db.execute({
      sql: `UPDATE contacts SET name = ?, email = ?, phone = ?, role = ?, notes = ? WHERE id = ?`,
      args: [name.trim(), email || null, phone || null, role || null, notes || null, id],
    });

    const result = await db.execute({ sql: 'SELECT * FROM contacts WHERE id = ?', args: [id] });
    return NextResponse.json(toRow(result));
  } catch (error) {
    console.error('PUT /api/contacts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const existing = toRow(await db.execute({ sql: 'SELECT id FROM contacts WHERE id = ?', args: [id] }));
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await db.execute({ sql: 'DELETE FROM contacts WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contacts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
