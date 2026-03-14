'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Client {
  id: number;
  name: string;
  industry: string | null;
  status: string;
  website: string | null;
  notes: string | null;
  created_at: string;
  contact_count: number;
  current_month_budget: number;
}

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

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  function fetchClients() {
    setLoading(true);
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { setClients(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function handleArchive(id: number, name: string) {
    if (!confirm(`Archive "${name}"? They will be hidden from the main client list.`)) return;
    setArchivingId(id);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== id));
      } else {
        alert('Failed to archive client');
      }
    } finally {
      setArchivingId(null);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete client "${name}"? This will also delete all contacts and budget entries.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== id));
      } else {
        alert('Failed to delete client');
      }
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clients</h2>
          <p className="text-slate-500 text-sm mt-1">{clients.length} total clients</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/clients/archived"
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
            </svg>
            Archived
          </Link>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading clients...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          {clients.length === 0 ? (
            <>
              <p className="text-slate-500 mb-4">No clients yet. Add your first client to get started.</p>
              <Link href="/clients/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Add Client
              </Link>
            </>
          ) : (
            <p className="text-slate-500">No clients match your search.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Contacts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Website</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <Link href={`/clients/${client.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                      {client.name}
                    </Link>
                    <div className="sm:hidden text-xs text-slate-400 mt-0.5">
                      <StatusBadge status={client.status} />
                      {client.current_month_budget > 0 && <span className="ml-2">{formatCurrency(client.current_month_budget)}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 hidden md:table-cell">{client.industry || '—'}</td>
                  <td className="px-6 py-4 hidden sm:table-cell"><StatusBadge status={client.status} /></td>
                  <td className="px-6 py-4 text-slate-600 hidden lg:table-cell">{client.contact_count}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium hidden sm:table-cell">
                    {client.current_month_budget > 0 ? formatCurrency(client.current_month_budget) : '—'}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {client.website ? (
                      <a
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline truncate max-w-[160px] block"
                      >
                        {client.website}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                      <button
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="text-slate-600 hover:text-blue-600 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleArchive(client.id, client.name)}
                        disabled={archivingId === client.id}
                        className="text-slate-400 hover:text-amber-600 text-xs font-medium px-2 py-1 rounded hover:bg-amber-50 disabled:opacity-50 hidden sm:inline-flex"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => handleDelete(client.id, client.name)}
                        disabled={deletingId === client.id}
                        className="text-slate-400 hover:text-red-600 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50 hidden sm:inline-flex"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
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
