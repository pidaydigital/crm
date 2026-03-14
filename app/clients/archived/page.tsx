'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function ArchivedClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [unarchivingId, setUnarchivingId] = useState<number | null>(null);

  useEffect(() => {
    fetchArchivedClients();
  }, []);

  function fetchArchivedClients() {
    setLoading(true);
    fetch('/api/clients?archived=true')
      .then(r => r.json())
      .then(d => { setClients(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function handleUnarchive(id: number, name: string) {
    if (!confirm(`Unarchive "${name}"? They will reappear in the main client list.`)) return;
    setUnarchivingId(id);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== id));
      } else {
        alert('Failed to unarchive client');
      }
    } finally {
      setUnarchivingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/clients" className="text-slate-400 hover:text-slate-600 text-sm">
              ← Clients
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Archived Clients</h2>
          <p className="text-slate-500 text-sm mt-1">{clients.length} archived client{clients.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No archived clients.</p>
          <Link href="/clients" className="mt-4 inline-block text-blue-600 text-sm hover:underline">
            Back to Clients
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Contacts</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <Link href={`/clients/${client.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                      {client.name}
                    </Link>
                    <div className="sm:hidden text-xs text-slate-400 mt-0.5">
                      {client.industry && <span>{client.industry} · </span>}
                      <span className="capitalize">{client.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">{client.industry || '—'}</td>
                  <td className="px-6 py-4 text-slate-500 capitalize hidden sm:table-cell">{client.status}</td>
                  <td className="px-6 py-4 text-slate-600 hidden sm:table-cell">{client.contact_count}</td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <button
                      onClick={() => handleUnarchive(client.id, client.name)}
                      disabled={unarchivingId === client.id}
                      className="text-slate-600 hover:text-green-600 text-xs font-medium px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50"
                    >
                      {unarchivingId === client.id ? 'Unarchiving...' : 'Unarchive'}
                    </button>
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
