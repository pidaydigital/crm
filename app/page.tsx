'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  activeClients: number;
  currentMonth: string;
  currentYear: string;
  ytdRevenue: number;
  projectedRevenue: number;
  ytdExpenses: number;
  topClientsBudget: Array<{
    id: number;
    name: string;
    status: string;
    total_budget: number;
    ytd_budget: number;
  }>;
  topExpenses: Array<{
    id: number;
    description: string;
    category: string | null;
    amount: number;
    date: string;
  }>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-700',
    prospect: 'bg-brand-100 text-brand-700',
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
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">YTD Revenue</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(data.ytdRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">{data.currentYear} year to date</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Projected {data.currentYear} Revenue</p>
          <p className="text-3xl font-bold text-brand-600">{formatCurrency(data.projectedRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">Full year projection</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">YTD Expenses</p>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(data.ytdExpenses)}</p>
          <p className="text-xs text-slate-400 mt-1">{data.currentYear} year to date</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Active Clients</p>
          <p className="text-3xl font-bold text-slate-800">{data.activeClients}</p>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">YTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topClientsBudget.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Link href={`/clients/${client.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                            {client.name}
                          </Link>
                          <StatusBadge status={client.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(client.total_budget)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(client.ytd_budget)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Expenses This Month */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Top Expenses</h3>
            <span className="text-xs text-slate-400">{formatMonth(data.currentMonth)}</span>
          </div>
          {data.topExpenses.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No expenses this month</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.topExpenses.map((expense) => (
                <li key={expense.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-medium text-slate-800">{expense.description}</span>
                    {expense.category && (
                      <p className="text-xs text-slate-400">{expense.category}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(expense.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
