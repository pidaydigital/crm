'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const ALL_MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

interface ClientRow {
  id: number;
  name: string;
  status: string;
  this_month: number;
  this_year: number;
  all_time: number;
  projected_all_time: number;
}

interface InvestmentData {
  year: number;
  currentMonth: string;
  allTime: number;
  projectedAllTime: number;
  thisYear: number;
  projectedYear: number;
  thisMonth: number;
  clientBreakdown: ClientRow[];
  monthlyTotals: { month: string; total: number }[];
  clientMonthly: { client_id: number; month: string; total: number }[];
}

function StatCard({
  label,
  value,
  sub,
  projected,
  projectedLabel,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  projected?: string;
  projectedLabel?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-6 ${highlight ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`text-3xl font-bold tabular-nums ${highlight ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-1.5 ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</p>
      )}
      {projected && (
        <div className={`mt-3 pt-3 border-t ${highlight ? 'border-slate-700' : 'border-slate-100'}`}>
          <p className={`text-xs ${highlight ? 'text-slate-500' : 'text-slate-400'}`}>
            {projectedLabel ?? 'Projected'}
          </p>
          <p className={`text-base font-semibold tabular-nums mt-0.5 ${highlight ? 'text-slate-300' : 'text-slate-500'}`}>
            {projected}
          </p>
        </div>
      )}
    </div>
  );
}

export default function InvestmentsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<InvestmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/investments?year=${year}`)
      .then(r => r.json())
      .then((d: InvestmentData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  // Build lookup: client_id -> month -> total
  const clientMonthLookup: Record<number, Record<string, number>> = {};
  data?.clientMonthly.forEach(({ client_id, month, total }) => {
    if (!clientMonthLookup[client_id]) clientMonthLookup[client_id] = {};
    const mon = month.slice(5, 7); // extract MM
    clientMonthLookup[client_id][mon] = total;
  });

  // Monthly totals lookup: MM -> total
  const monthTotalLookup: Record<string, number> = {};
  data?.monthlyTotals.forEach(({ month, total }) => {
    monthTotalLookup[month.slice(5, 7)] = total;
  });

  // Only show clients that have any budget data at all (all_time > 0) or all clients?
  // Show all clients, sorted by all_time desc
  const clients = data?.clientBreakdown ?? [];
  const activeClients = clients.filter(c => c.all_time > 0);
  const yearYearTotal = data?.thisYear ?? 0;

  // Full-year total per client (all 12 months, including future)
  function clientFullYearTotal(clientId: number) {
    return ALL_MONTHS.reduce((sum, m) => sum + (clientMonthLookup[clientId]?.[m] ?? 0), 0);
  }
  // Full-year combined total across all clients
  const fullYearCombinedTotal = Object.values(monthTotalLookup).reduce((s, v) => s + v, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Client Investments</h2>
          <p className="text-slate-500 text-sm mt-1">Total spend across all clients and services</p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <button
            onClick={() => setYear(y => y - 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 text-lg leading-none"
          >‹</button>
          <span className="font-bold text-slate-700 w-14 text-center tabular-nums text-sm">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 text-lg leading-none"
          >›</button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : !data ? (
        <div className="text-red-500 text-sm">Failed to load data.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label={formatMonthLabel(data.currentMonth)}
              value={formatCurrency(data.thisMonth)}
              sub="Current month spend"
            />
            <StatCard
              label={`${year} Year Total`}
              value={formatCurrency(data.thisYear)}
              sub="Actual spend to date"
              highlight
              projected={data.projectedYear !== data.thisYear ? formatCurrency(data.projectedYear) : undefined}
              projectedLabel={`Full ${year} if all months hit`}
            />
            <StatCard
              label="All Time"
              value={formatCurrency(data.allTime)}
              sub="Actual spend to date"
              projected={data.projectedAllTime !== data.allTime ? formatCurrency(data.projectedAllTime) : undefined}
              projectedLabel="Including future months"
            />
          </div>

          {/* Monthly breakdown grid for selected year */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Monthly Breakdown — {year}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Investment per client per month. Click a client name to open their profile.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse" style={{ minWidth: '960px' }}>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2.5 bg-slate-50 border-b border-r border-slate-200 font-semibold text-slate-600 sticky left-0 z-10 min-w-[160px]">
                      Client
                    </th>
                    {ALL_MONTHS.map((m, i) => (
                      <th key={m} className="px-2 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-center w-[72px]">
                        {MONTH_LABELS[i]}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 bg-slate-50 border-b border-l border-slate-200 font-semibold text-slate-600 text-right whitespace-nowrap min-w-[100px]">
                      {year} Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.filter(c => c.this_year > 0 || clientMonthLookup[c.id]).map(client => (
                    <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="px-4 py-2.5 bg-white border-r border-slate-100 sticky left-0 z-10 hover:bg-slate-50/40">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-slate-700 hover:text-blue-600 hover:underline"
                        >
                          {client.name}
                        </Link>
                      </td>
                      {ALL_MONTHS.map((month, i) => {
                        const amt = clientMonthLookup[client.id]?.[month] ?? 0;
                        const monthStr = `${year}-${month}`;
                        const isFuture = monthStr > data.currentMonth;
                        return (
                          <td key={month} className={`px-2 py-2.5 text-right whitespace-nowrap ${isFuture ? 'bg-slate-50/60' : ''}`}>
                            {amt > 0
                              ? <span className={isFuture ? 'text-slate-400' : 'text-slate-800 font-semibold'}>{formatCurrency(amt)}</span>
                              : <span className="text-slate-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 border-l border-slate-100 text-right font-bold text-slate-800 whitespace-nowrap">
                        {clientFullYearTotal(client.id) > 0 ? formatCurrency(clientFullYearTotal(client.id)) : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                    </tr>
                  ))}

                  {/* Combined totals row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-3 bg-slate-50 border-r border-slate-200 font-bold text-slate-700 sticky left-0 z-10">
                      All Clients
                    </td>
                    {ALL_MONTHS.map(month => {
                      const total = monthTotalLookup[month] ?? 0;
                      const isFuture = `${year}-${month}` > data.currentMonth;
                      return (
                        <td key={month} className={`px-2 py-3 text-right font-bold whitespace-nowrap ${isFuture ? 'text-slate-400' : 'text-slate-700'}`}>
                          {total > 0 ? formatCurrency(total) : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 border-l border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap">
                      {fullYearCombinedTotal > 0 ? formatCurrency(fullYearCombinedTotal) : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {clients.filter(c => c.this_year > 0).length === 0 && (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No investment data for {year}.
              </div>
            )}
          </div>

          {/* Per-client summary table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Client Summary</h3>
              <p className="text-xs text-slate-400 mt-0.5">Lifetime spend per client, sorted by all-time total.</p>
            </div>
            {activeClients.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No budget data yet.{' '}
                <Link href="/clients" className="text-blue-600 hover:underline">Go to Clients</Link> to add budgets.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      {formatMonthLabel(data.currentMonth)}
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {year} YTD
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      {year} Planned
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">All Time</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Projected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeClients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50">
                      <td className="px-3 sm:px-4 py-3">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active' ? 'bg-green-100 text-green-800' :
                          client.status === 'prospect' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 tabular-nums hidden md:table-cell">
                        {client.this_month > 0 ? formatCurrency(client.this_month) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-700 tabular-nums">
                        {client.this_year > 0 ? formatCurrency(client.this_year) : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-500 tabular-nums hidden lg:table-cell">
                        {clientFullYearTotal(client.id) > 0 ? formatCurrency(clientFullYearTotal(client.id)) : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(client.all_time)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-500 tabular-nums hidden lg:table-cell">
                        {client.projected_all_time > 0 ? formatCurrency(client.projected_all_time) : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                    <td className="px-3 sm:px-4 py-3 text-slate-700">All Clients</td>
                    <td className="px-4 py-3 hidden sm:table-cell" />
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums hidden md:table-cell">
                      {data.thisMonth > 0 ? formatCurrency(data.thisMonth) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right text-slate-700 tabular-nums">
                      {data.thisYear > 0 ? formatCurrency(data.thisYear) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums hidden lg:table-cell">
                      {data.projectedYear > 0 ? formatCurrency(data.projectedYear) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right text-slate-900 tabular-nums">
                      {formatCurrency(data.allTime)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums hidden lg:table-cell">
                      {formatCurrency(data.projectedAllTime)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
