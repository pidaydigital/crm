'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Client, Contact, BudgetEntry } from '@/lib/db';

// ---- helpers ----
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-700',
    prospect: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

// ---- client info form ----
interface ClientFormData {
  name: string;
  industry: string;
  status: string;
  website: string;
  notes: string;
}

function ClientInfoSection({ client, onUpdate }: { client: Client; onUpdate: (c: Client) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientFormData>({
    name: client.name,
    industry: client.industry ?? '',
    status: client.status,
    website: client.website ?? '',
    notes: client.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          industry: form.industry.trim() || null,
          status: form.status,
          website: form.website.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Save failed'); return; }
      const updated = await res.json();
      onUpdate(updated);
      setEditing(false);
    } finally { setSaving(false); }
  }

  function handleCancel() {
    setForm({ name: client.name, industry: client.industry ?? '', status: client.status, website: client.website ?? '', notes: client.notes ?? '' });
    setEditing(false); setError('');
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-semibold text-slate-800">{client.name}</h3>
              <StatusBadge status={client.status} />
            </div>
            {client.industry && <p className="text-sm text-slate-500">{client.industry}</p>}
          </div>
          <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline font-medium">Edit</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 font-medium">Website</span>
            <div className="mt-0.5">
              {client.website ? (
                <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {client.website}
                </a>
              ) : <span className="text-slate-400">—</span>}
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Added</span>
            <div className="mt-0.5 text-slate-700">
              {new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {client.notes && (
            <div className="sm:col-span-2">
              <span className="text-slate-500 font-medium">Notes</span>
              <div className="mt-0.5 text-slate-700 whitespace-pre-wrap">{client.notes}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Edit Client Info</h3>
      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={form.name} onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Industry</label>
            <input type="text" name="industry" value={form.industry} onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
          <input type="text" name="website" value={form.website} onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handleCancel} className="text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---- contact form ----
interface ContactFormData {
  name: string; email: string; phone: string; role: string; notes: string;
}
const emptyContactForm: ContactFormData = { name: '', email: '', phone: '', role: '', notes: '' };

function ContactRow({
  contact,
  onUpdate,
  onDelete,
}: {
  contact: Contact;
  onUpdate: (c: Contact) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ContactFormData>({
    name: contact.name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    role: contact.role ?? '',
    notes: contact.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, role: form.role.trim() || null, notes: form.notes.trim() || null }),
      });
      if (res.ok) { const updated = await res.json(); onUpdate(updated); setEditing(false); }
    } finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <tr className="hover:bg-slate-50">
        <td className="px-4 py-3 font-medium text-slate-800">{contact.name}</td>
        <td className="px-4 py-3 text-slate-500">{contact.email ? <a href={`mailto:${contact.email}`} className="hover:text-blue-600">{contact.email}</a> : '—'}</td>
        <td className="px-4 py-3 text-slate-500">{contact.phone || '—'}</td>
        <td className="px-4 py-3 text-slate-500">{contact.role || '—'}</td>
        <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{contact.notes || '—'}</td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline mr-3">Edit</button>
          <button onClick={() => onDelete(contact.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline">Delete</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50">
      <td className="px-4 py-2">
        <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Name*"
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </td>
      <td className="px-4 py-2">
        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email"
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </td>
      <td className="px-4 py-2">
        <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone"
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </td>
      <td className="px-4 py-2">
        <input type="text" name="role" value={form.role} onChange={handleChange} placeholder="Role/Title"
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </td>
      <td className="px-4 py-2">
        <input type="text" name="notes" value={form.notes} onChange={handleChange} placeholder="Notes"
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <button onClick={handleSave} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 mr-1 disabled:opacity-60">
          {saving ? '...' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
      </td>
    </tr>
  );
}

function ContactsSection({ clientId }: { clientId: number }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<ContactFormData>(emptyContactForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/contacts`)
      .then(r => r.json())
      .then(d => { setContacts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  function handleNewChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setNewForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAddContact() {
    if (!newForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newForm.name.trim(), email: newForm.email.trim() || null, phone: newForm.phone.trim() || null, role: newForm.role.trim() || null, notes: newForm.notes.trim() || null }),
      });
      if (res.ok) {
        const contact = await res.json();
        setContacts(prev => [...prev, contact]);
        setNewForm(emptyContactForm);
        setAddingNew(false);
      }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this contact?')) return;
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (res.ok) setContacts(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Contacts <span className="text-slate-400 font-normal text-sm">({contacts.length})</span></h3>
        {!addingNew && (
          <button onClick={() => setAddingNew(true)} className="text-xs text-blue-600 hover:underline font-medium">+ Add Contact</button>
        )}
      </div>
      {loading ? (
        <div className="px-6 py-4 text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map(contact => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onUpdate={updated => setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))}
                  onDelete={handleDelete}
                />
              ))}
              {addingNew && (
                <tr className="bg-green-50">
                  <td className="px-4 py-2">
                    <input type="text" name="name" value={newForm.name} onChange={handleNewChange} placeholder="Name*" autoFocus
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="email" name="email" value={newForm.email} onChange={handleNewChange} placeholder="Email"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" name="phone" value={newForm.phone} onChange={handleNewChange} placeholder="Phone"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" name="role" value={newForm.role} onChange={handleNewChange} placeholder="Role/Title"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" name="notes" value={newForm.notes} onChange={handleNewChange} placeholder="Notes"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={handleAddContact} disabled={saving}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 mr-1 disabled:opacity-60">
                      {saving ? '...' : 'Add'}
                    </button>
                    <button onClick={() => { setAddingNew(false); setNewForm(emptyContactForm); }}
                      className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                  </td>
                </tr>
              )}
              {contacts.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">
                    No contacts yet.{' '}
                    <button onClick={() => setAddingNew(true)} className="text-blue-600 hover:underline">Add a contact</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- budget section (grid: services × Jan–Dec) ----
const ALL_MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function BudgetSection({ clientId }: { clientId: number }) {
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pendingServices, setPendingServices] = useState<string[]>([]);
  const [addingService, setAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [editingCell, setEditingCell] = useState<{ service: string; month: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [cellSaving, setCellSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/budgets`)
      .then(r => r.json())
      .then((d: BudgetEntry[]) => { setEntries(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  const allServices = Array.from(new Set([
    ...entries.map(e => e.service),
    ...pendingServices,
  ])).sort();

  function getEntry(service: string, month: string): BudgetEntry | null {
    return entries.find(e => e.service === service && e.month === `${year}-${month}`) ?? null;
  }

  function startEdit(service: string, month: string) {
    const entry = getEntry(service, month);
    setEditingCell({ service, month });
    setEditValue(entry ? String(entry.amount) : '');
  }

  async function commitCell(service: string, month: string, value: string) {
    const monthStr = `${year}-${month}`;
    const existing = getEntry(service, month);
    const trimmed = value.trim();
    const amount = parseFloat(trimmed);
    setCellSaving(true);
    try {
      if (trimmed === '' || isNaN(amount) || amount < 0) {
        if (existing) {
          const res = await fetch(`/api/budgets/${existing.id}`, { method: 'DELETE' });
          if (res.ok) setEntries(prev => prev.filter(e => e.id !== existing.id));
        }
      } else if (existing) {
        const res = await fetch(`/api/budgets/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service, month: monthStr, amount, notes: existing.notes ?? null }),
        });
        if (res.ok) {
          const updated: BudgetEntry = await res.json();
          setEntries(prev => prev.map(e => e.id === existing.id ? updated : e));
        }
      } else {
        const res = await fetch(`/api/clients/${clientId}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service, month: monthStr, amount, notes: null }),
        });
        if (res.ok) {
          const created: BudgetEntry = await res.json();
          setEntries(prev => [...prev, created]);
          setPendingServices(prev => prev.filter(s => s !== service));
        }
      }
    } finally {
      setCellSaving(false);
      setEditingCell(null);
    }
  }

  function handleCellKeyDown(e: React.KeyboardEvent, service: string, month: string) {
    if (e.key === 'Enter') commitCell(service, month, editValue);
    else if (e.key === 'Escape') setEditingCell(null);
  }

  function handleAddService() {
    const name = newServiceName.trim();
    if (!name || allServices.includes(name)) return;
    setPendingServices(prev => [...prev, name]);
    setNewServiceName('');
    setAddingService(false);
  }

  async function deleteServiceRow(service: string) {
    if (!confirm(`Delete all budget entries for "${service}"?`)) return;
    const toDelete = entries.filter(e => e.service === service);
    await Promise.all(toDelete.map(e => fetch(`/api/budgets/${e.id}`, { method: 'DELETE' })));
    setEntries(prev => prev.filter(e => e.service !== service));
    setPendingServices(prev => prev.filter(s => s !== service));
  }

  function getMonthTotal(month: string) {
    return entries
      .filter(e => e.month === `${year}-${month}`)
      .reduce((s, e) => s + e.amount, 0);
  }

  function getServiceYearTotal(service: string) {
    return entries
      .filter(e => e.service === service && e.month.startsWith(`${year}-`))
      .reduce((s, e) => s + e.amount, 0);
  }

  const yearTotal = entries
    .filter(e => e.month.startsWith(`${year}-`))
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Budget</h3>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setYear(y => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 text-base leading-none"
            >‹</button>
            <span className="font-semibold text-slate-700 w-12 text-center tabular-nums">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 text-base leading-none"
            >›</button>
          </div>
          <button
            onClick={() => setAddingService(true)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            + Add Service
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-4 text-sm text-slate-400">Loading...</div>
      ) : allServices.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">
          No services yet.{' '}
          <button onClick={() => setAddingService(true)} className="text-blue-600 hover:underline">
            Add a service
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th className="text-left px-4 py-2.5 bg-slate-50 border-b border-r border-slate-200 font-semibold text-slate-600 sticky left-0 z-10 min-w-[140px]">
                  Service
                </th>
                {ALL_MONTHS.map((m, i) => (
                  <th key={m} className="px-2 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-center w-[72px]">
                    {MONTH_LABELS[i]}
                  </th>
                ))}
                <th className="px-3 py-2.5 bg-slate-50 border-b border-l border-slate-200 font-semibold text-slate-600 text-right whitespace-nowrap min-w-[90px]">
                  {year} Total
                </th>
                <th className="bg-slate-50 border-b border-slate-200 w-6" />
              </tr>
            </thead>
            <tbody>
              {allServices.map(service => {
                const rowTotal = getServiceYearTotal(service);
                return (
                  <tr key={service} className="group border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="px-4 py-2 bg-white group-hover:bg-slate-50/40 border-r border-slate-100 font-medium text-slate-700 sticky left-0 z-10 whitespace-nowrap">
                      {service}
                    </td>
                    {ALL_MONTHS.map(month => {
                      const entry = getEntry(service, month);
                      const isEditing = editingCell?.service === service && editingCell?.month === month;
                      return (
                        <td key={month} className="px-1 py-1">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => commitCell(service, month, editValue)}
                              onKeyDown={e => handleCellKeyDown(e, service, month)}
                              autoFocus
                              min="0"
                              placeholder="0"
                              className="w-full border border-blue-400 rounded px-1.5 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50"
                              disabled={cellSaving}
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(service, month)}
                              className={`w-full px-1.5 py-1.5 rounded text-right hover:bg-blue-50 transition-colors ${
                                entry
                                  ? 'text-slate-800 font-semibold hover:text-blue-700'
                                  : 'text-slate-300 hover:text-blue-400'
                              }`}
                            >
                              {entry ? formatCurrency(entry.amount) : '—'}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 border-l border-slate-100 text-right font-bold whitespace-nowrap text-slate-800">
                      {rowTotal > 0 ? formatCurrency(rowTotal) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <button
                        onClick={() => deleteServiceRow(service)}
                        title="Remove service row"
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-base leading-none w-5 h-5 flex items-center justify-center mx-auto"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-4 py-2.5 bg-slate-50 border-r border-slate-200 font-bold text-slate-700 sticky left-0 z-10">
                  Total
                </td>
                {ALL_MONTHS.map(month => {
                  const total = getMonthTotal(month);
                  return (
                    <td key={month} className="px-2 py-2.5 text-right font-bold whitespace-nowrap text-slate-700">
                      {total > 0 ? formatCurrency(total) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 border-l border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap">
                  {yearTotal > 0 ? formatCurrency(yearTotal) : '—'}
                </td>
                <td className="bg-slate-50" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Add service inline form */}
      {addingService && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
          <input
            type="text"
            value={newServiceName}
            onChange={e => setNewServiceName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddService();
              if (e.key === 'Escape') { setAddingService(false); setNewServiceName(''); }
            }}
            placeholder="Service name (e.g. SEO, PPC, Social Media)"
            autoFocus
            className="border border-slate-300 rounded px-3 py-1.5 text-xs w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAddService}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
          >
            Add
          </button>
          <button
            onClick={() => { setAddingService(false); setNewServiceName(''); }}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ---- investment scorecards ----
function InvestmentScorecards({ client }: { client: Client & { current_month_investment: number; ytd_investment: number; all_time_investment: number; projected_year_investment: number } }) {
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const currentYear = new Date().getFullYear();

  const cards = [
    { label: 'Current Month Investment', sub: currentMonth, value: client.current_month_investment },
    { label: 'YTD Investment', sub: `Jan – ${currentMonth}`, value: client.ytd_investment },
    { label: `${currentYear} Projected Investment`, sub: 'YTD actual + remaining months projected', value: client.projected_year_investment },
    { label: 'All Time Investment', sub: 'Actual spend to date', value: client.all_time_investment },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(card.value)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---- main page ----
export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => { if (r.status === 404) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then(d => { if (d) { setClient(d); setLoading(false); } })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleDeleteClient() {
    if (!client) return;
    if (!confirm(`Delete client "${client.name}"? This will also delete all contacts and budget entries.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/clients');
      else alert('Failed to delete client');
    } finally { setDeleting(false); }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading client...</div>;
  }
  if (notFound || !client) {
    return (
      <div className="p-8">
        <div className="text-red-500 mb-4">Client not found.</div>
        <Link href="/clients" className="text-blue-600 hover:underline text-sm">← Back to Clients</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </Link>
        <button
          onClick={handleDeleteClient}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete Client'}
        </button>
      </div>

      <ClientInfoSection client={client} onUpdate={setClient} />
      <InvestmentScorecards client={client as Client & { current_month_investment: number; ytd_investment: number; all_time_investment: number; projected_year_investment: number }} />
      <ContactsSection clientId={Number(id)} />
      <BudgetSection clientId={Number(id)} />
    </div>
  );
}
