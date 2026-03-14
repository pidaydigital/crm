import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE contacts
      SET name = ?, email = ?, phone = ?, role = ?, notes = ?
      WHERE id = ?
    `).run(
      name.trim(),
      email || null,
      phone || null,
      role || null,
      notes || null,
      id
    );

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    return NextResponse.json(contact);
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
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contacts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
