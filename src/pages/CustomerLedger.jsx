import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import {
  BookOpen, Download, AlertTriangle, Clock, TrendingUp, Wallet, Info,
} from 'lucide-react';

/**
 * Customer Ledger.
 *
 * The statement itself is scoped to the selected period, but everything
 * under "what they owe" is all-time on purpose: an amount outstanding
 * doesn't stop being outstanding because you narrowed the date filter.
 */

const PERIODS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'this_fy', label: 'This FY' },
  { key: 'all_time', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

const money = (v) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(v || 0);

const moneyShort = (v) => {
  const n = Math.abs(Number(v) || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const day = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—');

// oldest money is the most at-risk money, so the buckets darken with age
const BUCKET_TONE = [
  { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800', label: 'text-green-500' },
  { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', label: 'text-amber-500' },
  { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', label: 'text-amber-500' },
  { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', label: 'text-red-500' },
];

export default function CustomerLedger() {
  // the Customers page deep-links here with ?customer=<id>
  const [searchParams] = useSearchParams();
  const requestedCustomerId = searchParams.get('customer') || '';

  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(requestedCustomerId);

  const [period, setPeriod] = useState('this_fy');
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [d, setLedgerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /* Customers: the list is paginated, so a single GET returned only the
     first 10 and the rest were unselectable. Walk every page. */
  useEffect(() => {
    let alive = true;

    (async () => {
      const collected = [];
      let url = '/companies/?page_size=200';
      try {
        while (url) {
          const res = await clientToken.get(url);
          const body = res.data;
          collected.push(...(body.results || body || []));
          url = body.next
            ? body.next.replace(/^.*\/\/[^/]+/, '').replace(/^\/api/, '')
            : null;
          if (collected.length > 5000) break;   // guard against a bad `next`
        }
        if (!alive) return;
        collected.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCustomers(collected);
        // a deep-linked customer wins; only fall back to the first one when
        // we arrived here with nothing asked for
        const asked = requestedCustomerId
          && collected.some(c => String(c.id) === String(requestedCustomerId));
        if (asked) setSelectedCustomerId(String(requestedCustomerId));
        else if (collected.length) setSelectedCustomerId(String(collected[0].id));
      } catch {
        if (alive) setError('Failed to load customers');
      }
    })();

    return () => { alive = false; };
  }, [requestedCustomerId]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    if (period === 'custom' && !(dateFrom && dateTo)) return;
    let alive = true;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = period === 'custom'
          ? { start_date: dateFrom, end_date: dateTo }
          : { period };
        const res = await clientToken.get(`/ledger/customer/${selectedCustomerId}/`, { params });
        if (alive) setLedgerData(res.data);
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.error || 'Failed to fetch ledger data');
          setLedgerData(null);
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [selectedCustomerId, period, dateFrom, dateTo]);

  const visibleCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const trendMax = useMemo(() => Math.max(
    1, ...(d?.trend || []).flatMap(t => [t.billed, t.collected])), [d]);

  const exportCsv = () => {
    if (!d) return;
    const rows = [
      ['Statement of Account'],
      ['Customer', d.party.name],
      ['GSTIN', d.party.gst_number || '—'],
      ['Period', `${d.start_date} to ${d.end_date}`],
      [],
      ['Date', 'Particulars', 'Vch Type', 'Vch No', 'Debit', 'Credit', 'Balance'],
      [d.start_date, 'Opening Balance', '', '', '', '', d.opening_balance],
      ...d.transactions.map(t => [
        t.date, t.particulars, t.vch_type, t.vch_no || '',
        t.debit || '', t.credit || '', t.balance,
      ]),
      ['', 'Closing Balance', '', '', '', '', d.closing_balance],
      [],
      ['Outstanding', d.outstanding_total, `${d.outstanding_count} invoice(s)`],
      ...d.ageing.map(b => [b.label, b.amount, `${b.count} invoice(s)`]),
    ];
    const csv = rows
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${(d.party.name || 'customer').replace(/\W+/g, '-')}-${d.start_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const behaviour = d?.behaviour;
  const overdueAmount = (d?.ageing || [])
    .filter(b => b.from_days >= 31)
    .reduce((s, b) => s + b.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                <BookOpen size={20} />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
                Customer Ledger
              </h1>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              Statement of account, what's outstanding, and how this customer pays.
            </p>
          </div>

          {d && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Download size={16} /> Export statement
            </button>
          )}
        </div>

        {/* ── Customer picker + period ── */}
        <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-end gap-4">
          <div className="flex flex-col min-w-[240px] flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Customer <span className="text-slate-300 normal-case font-medium">({customers.length} total)</span>
            </label>
            <input
              type="search"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Search customers…"
              className="mb-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              size={1}
              className="px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" disabled>Select customer</option>
              {visibleCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {customerSearch && visibleCustomers.length === 0 && (
              <span className="text-xs text-slate-400 mt-1">No customer matches that.</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period</label>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
                    period === p.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {period === 'custom' && (
            <div className="flex gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        {isLoading && !d && (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {d && (
          <div className="space-y-6">

            {/* ── Party header — makes this a statement you can send ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-5 flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{d.party.name}</h2>
                {d.party.legal_name && d.party.legal_name !== d.party.name && (
                  <p className="text-sm text-slate-400">{d.party.legal_name}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  {d.party.gst_number
                    ? <span>GSTIN <strong className="text-slate-700">{d.party.gst_number}</strong></span>
                    : <span className="text-amber-600 font-semibold">No GSTIN on record</span>}
                  {d.party.state && (
                    <span>{d.party.state}
                      {d.party.state_code ? ` (${d.party.state_code})` : ''}</span>
                  )}
                  {d.party.phone_number && <span>{d.party.phone_number}</span>}
                  {d.party.email && <span>{d.party.email}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statement period</p>
                <p className="text-sm font-bold text-slate-700">{d.period_label}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {d.transactions.length} transaction{d.transactions.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* ── Period summary ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Opening Balance</p>
                <h3 className="text-xl font-bold text-slate-800">{money(d.opening_balance)}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Billed in period</p>
                <h3 className="text-xl font-bold text-green-600">{money(d.total_sales)}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Received in period</p>
                <h3 className="text-xl font-bold text-indigo-600">{money(d.total_receipts)}</h3>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-50 p-5 rounded-2xl shadow-sm border border-indigo-100">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Closing Balance</p>
                <h3 className="text-2xl font-bold text-indigo-700">{money(d.closing_balance)}</h3>
              </div>
            </div>

            {/* ── Ageing ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
                <Clock size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-800">Outstanding by age</h3>
                <span className="text-xs text-slate-400 font-medium">{d.ageing_basis}</span>
                <span className="ml-auto text-sm font-bold text-slate-900">
                  {money(d.outstanding_total)}
                  <span className="text-slate-400 font-medium ml-2 text-xs">
                    across {d.outstanding_count} invoice{d.outstanding_count === 1 ? '' : 's'}
                  </span>
                </span>
              </div>

              {d.outstanding_total === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">
                  Nothing outstanding — this account is fully settled.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                    {d.ageing.map((b, i) => {
                      const tone = BUCKET_TONE[i] || BUCKET_TONE[0];
                      const pct = d.outstanding_total
                        ? (b.amount / d.outstanding_total) * 100 : 0;
                      return (
                        <div key={b.label} className={`${tone.bg} ${tone.border} border rounded-2xl p-4`}>
                          <p className={`text-[11px] font-bold uppercase tracking-wider ${tone.label}`}>{b.label}</p>
                          <p className={`text-2xl font-bold mt-1 ${tone.text}`}>{moneyShort(b.amount)}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {b.count} invoice{b.count === 1 ? '' : 's'} · {pct.toFixed(0)}%
                          </p>
                          <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden">
                            <div className={`h-full ${tone.text.replace('text-', 'bg-')}`}
                              style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {overdueAmount > 0 && (
                    <div className="px-6 py-3 bg-red-50/60 border-t border-red-100 flex items-start gap-2 text-xs text-red-700 font-medium">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>
                        {money(overdueAmount)} has been outstanding more than 30 days.
                        {behaviour?.days_since_last_payment != null &&
                          ` Last payment was ${behaviour.days_since_last_payment} day(s) ago.`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Behaviour + trend ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <Wallet size={16} className="text-slate-400" />
                  <h3 className="font-bold text-slate-800">How they pay</h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-5">
                  <Metric
                    label="Avg days to pay"
                    value={behaviour?.avg_days_to_pay != null ? `${behaviour.avg_days_to_pay} days` : '—'}
                    hint={behaviour?.invoices_paid ? `over ${behaviour.invoices_paid} settled invoices` : 'nothing settled yet'}
                  />
                  <Metric
                    label="Slowest settlement"
                    value={behaviour?.slowest_days_to_pay != null ? `${behaviour.slowest_days_to_pay} days` : '—'}
                    hint={behaviour?.fastest_days_to_pay != null ? `fastest was ${behaviour.fastest_days_to_pay} days` : ''}
                  />
                  <Metric
                    label="Preferred method"
                    value={behaviour?.preferred_method
                      ? behaviour.preferred_method.replace('_', ' ')
                      : '—'}
                    hint={behaviour?.method_counts
                      ? Object.entries(behaviour.method_counts)
                        .map(([m, n]) => `${m.replace('_', ' ')} ×${n}`).join(', ')
                      : ''}
                    capitalize
                  />
                  <Metric
                    label="Last payment"
                    value={day(behaviour?.last_payment_date)}
                    hint={behaviour?.days_since_last_payment != null
                      ? `${behaviour.days_since_last_payment} days ago` : 'no payments recorded'}
                  />
                </div>
                <div className="px-6 pb-5 pt-1 border-t border-slate-50 grid grid-cols-2 gap-5">
                  <Metric label="Lifetime billed" value={money(d.lifetime.billed)}
                    hint={`${d.lifetime.invoice_count} invoices since ${day(d.lifetime.first_invoice_date)}`} />
                  <Metric label="Largest invoice" value={money(d.lifetime.largest_invoice)}
                    hint={`lifetime GST ${moneyShort(d.lifetime.gst)}`} />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <TrendingUp size={16} className="text-slate-400" />
                  <h3 className="font-bold text-slate-800">Billed vs collected</h3>
                  <span className="ml-auto flex items-center gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5 text-indigo-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Billed
                    </span>
                    <span className="flex items-center gap-1.5 text-green-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Collected
                    </span>
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-end gap-4 h-[190px]">
                    {d.trend.map(t => (
                      <div key={t.month} className="flex-1 flex flex-col items-center gap-2"
                        title={`${t.label}: billed ${money(t.billed)}, collected ${money(t.collected)}`}>
                        <div className="flex-1 w-full flex items-end justify-center gap-1">
                          <div className="w-1/2 bg-indigo-500 rounded-t transition-all"
                            style={{ height: `${Math.max((t.billed / trendMax) * 130, t.billed ? 3 : 1)}px` }} />
                          <div className="w-1/2 bg-green-500 rounded-t transition-all"
                            style={{ height: `${Math.max((t.collected / trendMax) * 130, t.collected ? 3 : 1)}px` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Open invoices ── */}
            {d.open_invoices.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Open invoices</h3>
                  <span className="text-xs text-slate-400 font-medium">oldest first — chase from the top</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <th className="px-6 py-3 font-bold">Invoice</th>
                        <th className="px-6 py-3 font-bold">Date</th>
                        <th className="px-6 py-3 font-bold text-right">Billed</th>
                        <th className="px-6 py-3 font-bold text-right">Received</th>
                        <th className="px-6 py-3 font-bold text-right">Still due</th>
                        <th className="px-6 py-3 font-bold text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.open_invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-sm font-bold text-slate-800">{inv.invoice_number}</td>
                          <td className="px-6 py-3 text-sm text-slate-500 whitespace-nowrap">{day(inv.date)}</td>
                          <td className="px-6 py-3 text-sm text-right text-slate-600">{money(inv.billed)}</td>
                          <td className="px-6 py-3 text-sm text-right text-slate-600">
                            {inv.paid ? money(inv.paid) : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-slate-900">{money(inv.due)}</td>
                          <td className="px-6 py-3 text-right">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                              inv.age_days > 90 ? 'bg-red-100 text-red-700'
                                : inv.age_days > 60 ? 'bg-amber-100 text-amber-700'
                                  : inv.age_days > 30 ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-100 text-green-800'}`}>
                              {inv.age_days}d
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── The ledger ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Statement of account</h3>
                <span className="text-xs text-slate-400 font-medium">{d.period_label}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-6 py-4 font-bold">Date</th>
                      <th className="px-6 py-4 font-bold">Particulars</th>
                      <th className="px-6 py-4 font-bold">Vch Type</th>
                      <th className="px-6 py-4 font-bold">Vch No.</th>
                      <th className="px-6 py-4 font-bold text-right">Debit</th>
                      <th className="px-6 py-4 font-bold text-right">Credit</th>
                      <th className="px-6 py-4 font-bold text-right bg-slate-50">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">{day(d.start_date)}</td>
                      <td className="px-6 py-4 font-bold text-slate-700" colSpan="5">Opening Balance</td>
                      <td className="px-6 py-4 font-bold text-right text-indigo-600 bg-indigo-50/30">
                        {money(d.opening_balance)}
                      </td>
                    </tr>

                    {isLoading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                          <div className="flex justify-center items-center gap-3">
                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span className="font-semibold text-indigo-600">Loading ledger…</span>
                          </div>
                        </td>
                      </tr>
                    ) : d.transactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500 font-medium">
                          No transactions in this period.
                          {d.outstanding_total > 0 && (
                            <span className="block text-sm text-slate-400 mt-1">
                              {money(d.outstanding_total)} is still outstanding from earlier — try “All time”.
                            </span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      d.transactions.map((t, idx) => (
                        <tr key={`${t.vch_type}-${t.vch_no || idx}-${idx}`}
                          className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{day(t.date)}</td>
                          <td className="px-6 py-4 font-medium text-slate-800">{t.particulars}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{t.vch_type}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{t.vch_no || '-'}</td>
                          <td className="px-6 py-4 text-right text-slate-700 font-medium">{t.debit ? money(t.debit) : '-'}</td>
                          <td className="px-6 py-4 text-right text-slate-700 font-medium">{t.credit ? money(t.credit) : '-'}</td>
                          <td className="px-6 py-4 text-right font-bold text-indigo-700 bg-indigo-50/30">
                            {money(t.balance)}
                          </td>
                        </tr>
                      ))
                    )}

                    {d.transactions.length > 0 && (
                      <tr className="bg-indigo-50/50">
                        <td className="px-6 py-4 font-bold text-indigo-700 uppercase text-xs tracking-wider"
                          colSpan="4">Closing Balance</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                          {money(d.transactions.reduce((s, t) => s + (t.debit || 0), 0))}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                          {money(d.transactions.reduce((s, t) => s + (t.credit || 0), 0))}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-lg text-indigo-700 bg-indigo-50">
                          {money(d.closing_balance)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-slate-400 px-2">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                The statement covers the selected period. Outstanding, ageing and
                payment behaviour are all-time — an unpaid invoice doesn't stop
                counting because the date filter moved.
              </span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, hint, capitalize }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold text-slate-900 mt-0.5 ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}
