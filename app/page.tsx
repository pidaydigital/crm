'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  activeClients: number;
  prospectClients: number;
  totalClients: number;
  currentMonthBudget: number;
  currentMonth: string;
  topClientsBudget: Array<{
    id: number;
    name: string;
    status: string;
    total_budget: number;
  }>;
  topExpenses: Array<{
    id: number;
    description: string;
    category: string | null;
    amount: number;
    date: string;
  }>;
  monthlyChart: Array<{
    month: string;
    revenue: number;
    expenses: number;
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

        {/* Revenue & Expenses by Month */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Revenue &amp; Expenses by Month</h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Expenses
              </span>
            </div>
          </div>
          {(() => {
            const maxVal = Math.max(...data.monthlyChart.map(m => Math.max(m.revenue, m.expenses)), 1);
            return (
              <div className="px-6 py-6">
                <div className="flex items-end gap-3 sm:gap-5" style={{ height: '200px' }}>
                  {data.monthlyChart.map((m) => {
                    const revHeight = (m.revenue / maxVal) * 100;
                    const expHeight = (m.expenses / maxVal) * 100;
                    const [year, mon] = m.month.split('-');
                    const label = new Date(Number(year), Number(mon) - 1, 1).toLocaleString('en-US', { month: 'short' });
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full">
                        <div className="flex-1 flex items-end gap-1 w-full">
                          <div className="flex-1 flex flex-col justify-end h-full">
                            <div
                              className="bg-slate-700 rounded-t w-full transition-all"
                              style={{ height: `${revHeight}%`, minHeight: m.revenue > 0 ? '4px' : '0' }}
                              title={`Revenue: ${formatCurrency(m.revenue)}`}
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-end h-full">
                            <div
                              className="bg-red-400 rounded-t w-full transition-all"
                              style={{ height: `${expHeight}%`, minHeight: m.expenses > 0 ? '4px' : '0' }}
                              title={`Expenses: ${formatCurrency(m.expenses)}`}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 mt-1">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
