'use client';

import { useEffect, useState, useCallback } from 'react';

const ALL_MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CATEGORIES = [
  'Advertising',
  'Equipment',
  'Insurance',
  'Meals & Entertainment',
  'Office Supplies',
  'Professional Services',
  'Rent & Utilities',
  'Software & Subscriptions',
  'Travel',
  'Other',
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

interface Expense {
  id: number;
  description: string;
  category: string | null;
  amount: number;
  date: string;
  notes: string | null;
}

interface ExpenseData {
  currentMonth: string;
  thisMonthTotal: number;
  thisYearTotal: number;
  allTimeTotal: number;
  monthlyTotals: { month: string; total: number }[];
  expenses: Expense[];
}

interface FormState {
  description: string;
  category: string;
  amount: string;
  date: string;
  notes: string;
}

const emptyForm: FormState = {
  description: '',
  category: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

function StatCard({
  label, value, sub, highlight,
}: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-6 ${highlight ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`text-3xl font-bold tabular-nums ${highlight ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className={`text-xs mt-1.5 ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

function Modal({
  title, onClose, children,
}: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter by month
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/expenses?year=${year}`)
      .then(r => r.json())
      .then((d: ExpenseData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openAdd() {
    setEditingExpense(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditingExpense(e);
    setForm({
      description: e.description,
      category: e.category ?? '',
      amount: String(e.amount),
      date: e.date,
      notes: e.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingExpense(null);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    if (isNaN(amount) || amount < 0) { setFormError('Enter a valid amount.'); return; }
    if (!form.date) { setFormError('Date is required.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        description: form.description.trim(),
        category: form.category || null,
        amount,
        date: form.date,
        notes: form.notes.trim() || null,
      };
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? 'Failed to save.');
        setSaving(false);
        return;
      }
      closeForm();
      fetchData();
    } catch {
      setFormError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deletingId === null) return;
    setDeleting(true);
    try {
      await fetch(`/api/expenses/${deletingId}`, { method: 'DELETE' });
      setDeletingId(null);
      fetchData();
    } finally {
      setDeleting(false);
    }
  }

  // Monthly totals lookup: MM -> total
  const monthTotalLookup: Record<string, number> = {};
  data?.monthlyTotals.forEach(({ month, total }) => {
    monthTotalLookup[month.slice(5, 7)] = total;
  });

  // Filtered expense list
  const displayedExpenses = data?.expenses.filter(e => {
    if (filterMonth === 'all') return true;
    return e.date.slice(0, 7) === `${year}-${filterMonth}`;
  }) ?? [];

  const maxMonthlyTotal = Math.max(...Object.values(monthTotalLookup), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
          <p className="text-slate-500 text-sm mt-1">Track and manage your business expenses</p>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> Add Expense
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : !data ? (
        <div className="text-red-500 text-sm">Failed to load data.</div>
      ) : (
        <>
          {/* Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label={formatMonthLabel(data.currentMonth)}
              value={formatCurrency(data.thisMonthTotal)}
              sub="Current month expenses"
            />
            <StatCard
              label={`${year} Year Total`}
              value={formatCurrency(data.thisYearTotal)}
              sub="Total spend this year"
              highlight
            />
            <StatCard
              label="All Time"
              value={formatCurrency(data.allTimeTotal)}
              sub="Total spend to date"
            />
          </div>

          {/* Monthly breakdown bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Monthly Totals — {year}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Click a month to filter the expense list below.</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-end gap-2 h-32">
                {ALL_MONTHS.map((m, i) => {
                  const total = monthTotalLookup[m] ?? 0;
                  const heightPct = total > 0 ? Math.max((total / maxMonthlyTotal) * 100, 4) : 0;
                  const isSelected = filterMonth === m;
                  const isCurrent = `${year}-${m}` === data.currentMonth;
                  return (
                    <button
                      key={m}
                      onClick={() => setFilterMonth(isSelected ? 'all' : m)}
                      className="flex-1 flex flex-col items-center gap-1 group"
                      title={`${MONTH_LABELS[i]}: ${formatCurrency(total)}`}
                    >
                      <span className={`text-xs tabular-nums font-medium transition-colors ${total > 0 ? (isSelected ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700') : 'text-transparent'}`}>
                        {total > 0 ? formatCurrency(total) : '—'}
                      </span>
                      <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
                        <div
                          className={`w-full rounded-t transition-all ${
                            total === 0 ? 'bg-slate-100' :
                            isSelected ? 'bg-slate-800' :
                            isCurrent ? 'bg-slate-600 group-hover:bg-slate-700' :
                            'bg-slate-300 group-hover:bg-slate-400'
                          }`}
                          style={{ height: total > 0 ? `${heightPct}%` : '4px' }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                        {MONTH_LABELS[i]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Expense list */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-700">
                  {filterMonth === 'all'
                    ? `All Expenses — ${year}`
                    : `Expenses — ${formatMonthLabel(`${year}-${filterMonth}`)}`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{displayedExpenses.length} expense{displayedExpenses.length !== 1 ? 's' : ''}</p>
              </div>
              {filterMonth !== 'all' && (
                <button
                  onClick={() => setFilterMonth('all')}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {displayedExpenses.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">
                No expenses found.{' '}
                <button onClick={openAdd} className="text-blue-600 hover:underline">Add one.</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Notes</th>
                    <th className="px-3 sm:px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50 group">
                      <td className="px-3 sm:px-4 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className="font-medium text-slate-800">{expense.description}</span>
                        <div className="md:hidden text-xs text-slate-400 mt-0.5">
                          {expense.category && <span className="inline-flex px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{expense.category}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {expense.category ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {expense.category}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate hidden lg:table-cell">
                        {expense.notes || <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => openEdit(expense)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(expense.id)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={2} className="px-3 sm:px-4 py-3 font-semibold text-slate-700 text-sm">Total</td>
                    <td className="hidden md:table-cell" />
                    <td className="px-3 sm:px-4 py-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(displayedExpenses.reduce((s, e) => s + e.amount, 0))}
                    </td>
                    <td className="hidden lg:table-cell" />
                    <td />
                  </tr>
                </tfoot>
              </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <Modal title={editingExpense ? 'Edit Expense' : 'Add Expense'} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Adobe Creative Cloud"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                <option value="">— No category —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : editingExpense ? 'Save Changes' : 'Add Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deletingId !== null && (
        <Modal title="Delete Expense" onClose={() => setDeletingId(null)}>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-600 mb-5">Are you sure you want to delete this expense? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
