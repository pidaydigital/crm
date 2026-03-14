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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export default function InactiveClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchInactiveClients();
  }, []);

  function fetchInactiveClients() {
    setLoading(true);
    fetch('/api/clients?inactive=true')
      .then(r => r.json())
      .then(d => { setClients(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function handleActivate(client: Client) {
    if (!confirm(`Make "${client.name}" active again?`)) return;
    setActivatingId(client.id);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: client.name,
          industry: client.industry,
          status: 'active',
          website: client.website,
          notes: client.notes,
        }),
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== client.id));
      } else {
        alert('Failed to activate client');
      }
    } finally {
      setActivatingId(null);
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
          <h2 className="text-2xl font-bold text-slate-800">Inactive Clients</h2>
          <p className="text-slate-500 text-sm mt-1">{clients.length} inactive client{clients.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No inactive clients.</p>
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Contacts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Budget</th>
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
                      {client.industry && <span>{client.industry}</span>}
                      {client.current_month_budget > 0 && <span className="ml-2">{formatCurrency(client.current_month_budget)}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">{client.industry || '—'}</td>
                  <td className="px-6 py-4 text-slate-600 hidden sm:table-cell">{client.contact_count}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium hidden sm:table-cell">
                    {client.current_month_budget > 0 ? formatCurrency(client.current_month_budget) : '—'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <button
                      onClick={() => handleActivate(client)}
                      disabled={activatingId === client.id}
                      className="text-slate-600 hover:text-green-600 text-xs font-medium px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50"
                    >
                      {activatingId === client.id ? 'Activating...' : 'Make Active'}
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
