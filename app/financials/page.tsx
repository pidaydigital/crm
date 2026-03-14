'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const TIMEFRAMES = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'all_time', label: 'All Time' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FinancialData {
  timeframe: string;
  label: string;
  dateFrom: string;
  dateTo: string;
  investmentTotal: number;
  expenseTotal: number;
  profit: number;
  investmentsByClient: { id: number; name: string; total: number }[];
  expensesByCategory: { category: string; total: number }[];
  projectedInvestmentTotal: number | null;
  projectedExpenseTotal: number | null;
  projectedProfit: number | null;
  projectedInvestmentsByClient: { id: number; name: string; total: number }[] | null;
  projectedExpensesByCategory: { category: string; total: number }[] | null;
}

export default function FinancialsPage() {
  const [timeframe, setTimeframe] = useState('this_month');
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/financials?timeframe=${timeframe}`)
      .then(r => r.json())
      .then((d: FinancialData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const profitMargin = data && data.investmentTotal > 0
    ? ((data.profit / data.investmentTotal) * 100).toFixed(1)
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financials</h2>
          <p className="text-slate-500 text-sm mt-1">Profit &amp; loss overview across client investments and expenses</p>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
        >
          {TIMEFRAMES.map(tf => (
            <option key={tf.value} value={tf.value}>{tf.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : !data ? (
        <div className="text-red-500 text-sm">Failed to load data.</div>
      ) : (
        <>
          {/* Period label */}
          <p className="text-sm text-slate-400 mb-4">{data.label}</p>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Revenue */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">Revenue</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900">{formatCurrency(data.investmentTotal)}</p>
              {data.projectedInvestmentTotal !== null ? (
                <p className="text-xs mt-1.5 text-slate-400">
                  {formatCurrency(data.projectedInvestmentTotal)} incl. future months
                </p>
              ) : (
                <p className="text-xs mt-1.5 text-slate-400">Client investments</p>
              )}
            </div>
            {/* Expenses */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">Expenses</p>
              <p className="text-3xl font-bold tabular-nums text-red-600">{formatCurrency(data.expenseTotal)}</p>
              {data.projectedExpenseTotal !== null ? (
                <p className="text-xs mt-1.5 text-slate-400">
                  {formatCurrency(data.projectedExpenseTotal)} incl. future months
                </p>
              ) : (
                <p className="text-xs mt-1.5 text-slate-400">Operating costs</p>
              )}
            </div>
            {/* Profit */}
            <div className={`rounded-xl border p-6 ${data.profit >= 0 ? 'bg-brand-800 border-brand-700' : 'bg-red-900 border-red-800'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400">Net Profit</p>
              <p className={`text-3xl font-bold tabular-nums ${data.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(data.profit)}
              </p>
              {data.projectedProfit !== null ? (
                <p className="text-xs mt-1.5 text-slate-400">
                  {formatCurrency(data.projectedProfit)} incl. future months
                  {profitMargin !== null && <span> &middot; {profitMargin}% margin</span>}
                </p>
              ) : profitMargin !== null ? (
                <p className="text-xs mt-1.5 text-slate-400">{profitMargin}% margin</p>
              ) : null}
            </div>
          </div>

          {/* P&L breakdown bar */}
          {data.investmentTotal > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
              <h3 className="font-semibold text-slate-700 text-sm mb-4">Profit &amp; Loss Breakdown</h3>
              <div className="flex rounded-lg overflow-hidden h-8">
                {data.profit > 0 && (
                  <div
                    className="bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold"
                    style={{ width: `${(data.profit / data.investmentTotal) * 100}%` }}
                  >
                    {((data.profit / data.investmentTotal) * 100).toFixed(0)}% Profit
                  </div>
                )}
                {data.expenseTotal > 0 && (
                  <div
                    className="bg-red-400 flex items-center justify-center text-white text-xs font-semibold"
                    style={{ width: `${(data.expenseTotal / data.investmentTotal) * 100}%` }}
                  >
                    {((data.expenseTotal / data.investmentTotal) * 100).toFixed(0)}% Expenses
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Profit
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Expenses
                </span>
              </div>
            </div>
          )}

          {/* Two-column breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Client */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-700">Revenue by Client</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{data.investmentsByClient.length} client{data.investmentsByClient.length !== 1 ? 's' : ''} with revenue</p>
                </div>
                <Link href="/investments" className="text-xs text-brand-600 hover:underline font-medium">
                  View all
                </Link>
              </div>
              {data.investmentsByClient.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">
                  No client investments for this period.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.investmentsByClient.map(client => {
                    const pct = data.investmentTotal > 0 ? (Number(client.total) / data.investmentTotal) * 100 : 0;
                    return (
                      <div key={client.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-sm font-medium text-slate-800 hover:text-brand-600 hover:underline truncate block"
                          >
                            {client.name}
                          </Link>
                          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                          {formatCurrency(Number(client.total))}
                        </span>
                      </div>
                    );
                  })}
                  {/* Total row */}
                  <div className="px-6 py-3 flex items-center justify-between bg-slate-50">
                    <span className="text-sm font-bold text-slate-700">Total</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(data.investmentTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expenses by Category */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-700">Expenses by Category</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{data.expensesByCategory.length} categor{data.expensesByCategory.length !== 1 ? 'ies' : 'y'} with expenses</p>
                </div>
                <Link href="/expenses" className="text-xs text-brand-600 hover:underline font-medium">
                  View all
                </Link>
              </div>
              {data.expensesByCategory.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">
                  No expenses for this period.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.expensesByCategory.map(cat => {
                    const pct = data.expenseTotal > 0 ? (Number(cat.total) / data.expenseTotal) * 100 : 0;
                    return (
                      <div key={cat.category} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-800 truncate block">{cat.category}</span>
                          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                          {formatCurrency(Number(cat.total))}
                        </span>
                      </div>
                    );
                  })}
                  {/* Total row */}
                  <div className="px-6 py-3 flex items-center justify-between bg-slate-50">
                    <span className="text-sm font-bold text-slate-700">Total</span>
                    <span className="text-sm font-bold text-red-600 tabular-nums">{formatCurrency(data.expenseTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
