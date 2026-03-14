'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  activeClients: number;
  prospectClients: number;
  totalClients: number;
  currentMonthBudget: number;
  currentMonth: string;
  recentClients: Array<{
    id: number;
    name: string;
    industry: string | null;
    status: string;
    created_at: string;
  }>;
  recentContacts: Array<{
    id: number;
    name: string;
    email: string | null;
    role: string | null;
    client_name: string;
    client_id: number;
    created_at: string;
  }>;
  topClientsBudget: Array<{
    id: number;
    name: string;
    status: string;
    total_budget: number;
  }>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-700',
    prospect: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatMonth(month: string) {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-red-500">Failed to load dashboard data.</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">{formatMonth(data.currentMonth)}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Active Clients</p>
          <p className="text-3xl font-bold text-slate-800">{data.activeClients}</p>
          <p className="text-xs text-slate-400 mt-1">{data.totalClients} total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Prospects</p>
          <p className="text-3xl font-bold text-blue-600">{data.prospectClients}</p>
          <p className="text-xs text-slate-400 mt-1">In pipeline</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Budget This Month</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(data.currentMonthBudget)}</p>
          <p className="text-xs text-slate-400 mt-1">Across all clients</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Clients</p>
          <p className="text-3xl font-bold text-slate-800">{data.totalClients}</p>
          <p className="text-xs text-slate-400 mt-1">All statuses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top clients by budget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Top Clients by Budget</h3>
            <span className="text-xs text-slate-400">{formatMonth(data.currentMonth)}</span>
          </div>
          {data.topClientsBudget.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No budget data this month</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.topClientsBudget.map((client) => (
                <li key={client.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Link href={`/clients/${client.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600">
                      {client.name}
                    </Link>
                    <StatusBadge status={client.status} />
                  </div>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(client.total_budget)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent clients */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Recent Clients</h3>
            <Link href="/clients/new" className="text-xs text-blue-600 hover:underline font-medium">+ Add Client</Link>
          </div>
          {data.recentClients.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">
              No clients yet.{' '}
              <Link href="/clients/new" className="text-blue-600 hover:underline">Add your first client</Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentClients.map((client) => (
                <li key={client.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <Link href={`/clients/${client.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600">
                      {client.name}
                    </Link>
                    {client.industry && (
                      <p className="text-xs text-slate-400">{client.industry}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={client.status} />
                    <span className="text-xs text-slate-400">{formatDate(client.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent contacts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Recent Contacts</h3>
            <Link href="/contacts" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
          </div>
          {data.recentContacts.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No contacts yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Role</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50">
                      <td className="px-4 sm:px-6 py-3">
                        <span className="font-medium text-slate-800">{contact.name}</span>
                        <div className="sm:hidden text-xs text-slate-400 mt-0.5">{contact.email || ''}</div>
                      </td>
                      <td className="px-6 py-3 text-slate-500 hidden sm:table-cell">{contact.email || '—'}</td>
                      <td className="px-6 py-3 text-slate-500 hidden md:table-cell">{contact.role || '—'}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <Link href={`/clients/${contact.client_id}`} className="text-blue-600 hover:underline">
                          {contact.client_name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-400 hidden md:table-cell">{formatDate(contact.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
