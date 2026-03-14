'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ContactWithClient {
  id: number;
  client_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
  client_name: string;
  client_status: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-700',
    prospect: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/contacts')
      .then(r => r.json())
      .then(d => { setContacts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.role?.toLowerCase().includes(q) ?? false) ||
      c.client_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contacts</h2>
          <p className="text-slate-500 text-sm mt-1">{contacts.length} contacts across all clients</p>
        </div>
      </div>

      <div className="mb-5">
        <input
          type="text"
          placeholder="Search contacts by name, email, role, or client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading contacts...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          {contacts.length === 0 ? (
            <>
              <p className="text-slate-500 mb-2">No contacts yet.</p>
              <p className="text-slate-400 text-sm">Add contacts from a client page.</p>
              <Link href="/clients" className="mt-3 inline-block text-blue-600 text-sm hover:underline">Go to Clients</Link>
            </>
          ) : (
            <p className="text-slate-500">No contacts match your search.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <span className="font-medium text-slate-800">{contact.name}</span>
                    <div className="sm:hidden text-xs text-slate-400 mt-0.5">
                      {contact.email && <a href={`mailto:${contact.email}`} className="text-blue-600">{contact.email}</a>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 hidden md:table-cell">{contact.role || '—'}</td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 hidden lg:table-cell">
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="hover:text-blue-600">{contact.phone}</a>
                    ) : '—'}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/clients/${contact.client_id}`} className="text-blue-600 hover:underline font-medium">
                        {contact.client_name}
                      </Link>
                      <StatusBadge status={contact.client_status} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 hidden lg:table-cell">{formatDate(contact.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
