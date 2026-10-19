import React, { useState, useEffect, useMemo } from 'react';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import {
  FileBarChart2, Receipt, RefreshCw, Activity, AlertTriangle,
  Download, Info, MapPin,
} from 'lucide-react';

/**
 * GST Summary.
 *
 * Periods are calendar months / quarters, never a rolling window — a
 * rolling range can coincidentally equal a filing period and then quietly
 * drift the following day, which is harder to catch than being obviously
 * wrong.
 */

const PERIODS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'last_quarter', label: 'Last quarter' },
  { key: 'this_fy', label: 'This FY' },
  { key: 'custom', label: 'Custom' },
];

// GST returns are filed in whole rupees
const money = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Math.round(v || 0));

export default function GSTSummaryReport() {
  const [period, setPeriod] = useState('this_month');
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (period === 'custom' && !(dateFrom && dateTo)) return;
    let alive = true;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = period === 'custom'
          ? { start_date: dateFrom, end_date: dateTo }
          : { period };
        const res = await clientToken.get('/gst-summary/', { params });
        if (alive) setSummaryData(res.data);
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.error || 'Failed to fetch GST Summary data');
          setSummaryData(null);
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [period, dateFrom, dateTo]);

  const d = summaryData;
  const split = d?.tax_split;
  const hasActivity = !!d && (d.sales_invoice_count > 0 || d.purchase_invoice_count > 0);

  const errors = useMemo(
    () => (d?.data_quality || []).filter(i => i.level === 'error'), [d]);
  const warnings = useMemo(
    () => (d?.data_quality || []).filter(i => i.level !== 'error'), [d]);

  const exportCsv = () => {
    if (!d) return;
    const rows = [
      ['GST Summary', d.period_label],
      ['Period', `${d.start_date} to ${d.end_date}`],
      [],
      ['Line', 'Amount (INR)'],
      ['Total Taxable Sales (A)', d.total_sales_taxable],
      ['Total Output GST (B)', d.output_gst],
      ['  CGST', split.cgst],
      ['  SGST', split.sgst],
      ['  IGST', split.igst],
      ['  Unclassified', split.unclassified],
      ['Total Taxable Purchases (C)', d.total_purchases_taxable],
      ['Total Input GST (D)', d.input_gst],
      ['Net GST Payable (B - D)', d.net_gst_payable],
      [],
      ['Sales invoices', d.sales_invoice_count],
      ['Purchase invoices', d.purchase_invoice_count],
      ['Credit notes', `${d.credit_note_count} (${d.credit_note_value})`],
      ['Debit notes', `${d.debit_note_count} (${d.debit_note_value})`],
    ];
    if (d.data_quality?.length) {
      rows.push([], ['Data quality issues']);
      d.data_quality.forEach(i => rows.push([i.level, i.title, i.detail]));
    }
    const csv = rows
      .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-summary-${d.start_date}-to-${d.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                <FileBarChart2 size={20} />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
                GST Summary Report
              </h1>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              Output GST, Input GST and net liability for a filing period.
            </p>
          </div>

          {d && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Download size={16} /> Export CSV
            </button>
          )}
        </div>

        {/* ── Period selector ── */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                period === p.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-3 ml-1">
              <div className="flex flex-col px-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none" />
              </div>
              <div className="w-px bg-slate-200 mx-1 hidden sm:block" />
              <div className="flex flex-col px-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none" />
              </div>
            </div>
          )}

          {d && (
            <span className="ml-auto text-sm font-semibold text-slate-500">
              {d.period_label}
              <span className="text-slate-300 mx-2">·</span>
              {d.sales_invoice_count} sales, {d.purchase_invoice_count} purchases
            </span>
          )}
        </div>

        {period === 'custom' && (
          <div className="mb-6 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Info size={15} className="mt-0.5 shrink-0" />
            <span>
              A custom range usually won't line up with a return period. GSTR-1
              and GSTR-3B are filed per calendar month — use the month presets
              for anything you intend to file.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        {/* ── Data quality ── */}
        {d && (errors.length > 0 || warnings.length > 0) && (
          <div className="mb-6 space-y-3">
            {[...errors, ...warnings].map(issue => {
              const isError = issue.level === 'error';
              return (
                <div key={issue.code}
                  className={`rounded-2xl border px-5 py-4 flex gap-3 ${
                    isError
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                  <AlertTriangle size={18}
                    className={`mt-0.5 shrink-0 ${isError ? 'text-red-600' : 'text-amber-600'}`} />
                  <div>
                    <p className={`font-bold text-sm ${isError ? 'text-red-800' : 'text-amber-800'}`}>
                      {issue.title}
                    </p>
                    <p className={`text-sm mt-1 ${isError ? 'text-red-700' : 'text-amber-700'}`}>
                      {issue.detail}
                    </p>
                    {issue.fix && (
                      <p className={`text-xs mt-1.5 font-semibold ${isError ? 'text-red-500' : 'text-amber-600'}`}>
                        Fix: {issue.fix}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !d ? null : !hasActivity ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
            <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">Nothing to report for {d.period_label}</h3>
            <p className="text-slate-500 text-sm mt-1">
              No sales or purchase invoices fall in this period.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Top level metrics ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-green-50 rounded-bl-[100px] -z-10 opacity-50" />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Output GST</p>
                    <p className="text-xs text-slate-400 font-medium">GST collected on sales</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-2xl text-green-600"><Receipt size={24} /></div>
                </div>
                <h3 className="text-4xl font-bold text-slate-900 mb-2">{money(d.output_gst)}</h3>
                <div className="text-sm text-slate-500 font-medium">
                  From <span className="text-slate-800 font-bold">{money(d.total_sales_taxable)}</span> in taxable sales
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-amber-50 rounded-bl-[100px] -z-10 opacity-50" />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Input GST</p>
                    <p className="text-xs text-slate-400 font-medium">GST paid on purchases</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><RefreshCw size={24} /></div>
                </div>
                <h3 className="text-4xl font-bold text-slate-900 mb-2">{money(d.input_gst)}</h3>
                <div className="text-sm text-slate-500 font-medium">
                  From <span className="text-slate-800 font-bold">{money(d.total_purchases_taxable)}</span> in taxable purchases
                </div>
                {d.input_gst === 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-2">
                    No input credit in this period — verify before filing.
                  </p>
                )}
              </div>

              <div className={`p-6 rounded-2xl shadow-sm border transition-shadow relative overflow-hidden ${
                d.net_gst_payable >= 0
                  ? 'bg-gradient-to-br from-red-50 to-red-50 border-red-100'
                  : 'bg-gradient-to-br from-green-50 to-green-50 border-green-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${
                      d.net_gst_payable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Net GST {d.net_gst_payable >= 0 ? 'Payable' : 'Credit'}
                    </p>
                    <p className={`text-xs font-medium ${
                      d.net_gst_payable >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                      Output GST − Input GST
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl ${
                    d.net_gst_payable >= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                    <Activity size={24} />
                  </div>
                </div>
                <h3 className={`text-4xl font-bold mb-2 ${
                  d.net_gst_payable >= 0 ? 'text-red-700' : 'text-green-800'}`}>
                  {money(Math.abs(d.net_gst_payable))}
                </h3>
                <div className={`text-sm font-medium ${
                  d.net_gst_payable >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {d.net_gst_payable >= 0
                    ? 'Liability before eligible ITC adjustments.'
                    : 'Credit available to offset future liabilities.'}
                </div>
              </div>
            </div>

            {/* ── CGST / SGST / IGST ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-800">Output tax by place of supply</h3>
                <span className="text-xs text-slate-400 font-medium ml-1">
                  required for GSTR-1 / GSTR-3B
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
                {[
                  { label: 'CGST', hint: 'Intra-state', value: split.cgst, tone: 'text-indigo-700' },
                  { label: 'SGST', hint: 'Intra-state', value: split.sgst, tone: 'text-indigo-700' },
                  { label: 'IGST', hint: 'Inter-state', value: split.igst, tone: 'text-indigo-700' },
                  {
                    label: 'Unclassified', hint: `${split.unclassified_invoices} invoice(s)`,
                    value: split.unclassified,
                    tone: split.unclassified ? 'text-red-700' : 'text-slate-400',
                  },
                ].map(cell => (
                  <div key={cell.label} className="px-6 py-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cell.label}</p>
                    <p className="text-[11px] text-slate-400 font-medium mb-2">{cell.hint}</p>
                    <p className={`text-2xl font-bold ${cell.tone}`}>{money(cell.value)}</p>
                  </div>
                ))}
              </div>

              {split.unclassified > 0 && (
                <div className="px-6 py-3 bg-red-50/50 border-t border-red-100 text-xs text-red-700 font-medium">
                  Unclassified tax is excluded from the CGST/SGST and IGST figures above.
                  It is not guessed into either bucket — add the missing state codes to resolve it.
                </div>
              )}
            </div>

            {/* ── Breakdown ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">GST Calculation Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-600 w-1/2">Total Taxable Sales (A)</td>
                      <td className="px-6 py-4 font-bold text-right text-slate-900">{money(d.total_sales_taxable)}</td>
                    </tr>
                    <tr className="border-b border-slate-50 bg-green-50/30">
                      <td className="px-6 py-4 font-medium text-green-800">Total Output GST Collected (B)</td>
                      <td className="px-6 py-4 font-bold text-right text-green-800">{money(d.output_gst)}</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-600">Total Taxable Purchases (C)</td>
                      <td className="px-6 py-4 font-bold text-right text-slate-900">{money(d.total_purchases_taxable)}</td>
                    </tr>
                    <tr className="border-b border-slate-50 bg-amber-50/30">
                      <td className="px-6 py-4 font-medium text-amber-700">Total Input GST Paid (D)</td>
                      <td className="px-6 py-4 font-bold text-right text-amber-700">{money(d.input_gst)}</td>
                    </tr>

                    {(d.credit_note_count > 0 || d.debit_note_count > 0) && (
                      <>
                        <tr className="border-b border-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-600">
                            Credit notes issued
                            <span className="text-slate-400 font-normal"> ({d.credit_note_count})</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-right text-slate-900">({money(d.credit_note_value)})</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-600">
                            Debit notes issued
                            <span className="text-slate-400 font-normal"> ({d.debit_note_count})</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-right text-slate-900">{money(d.debit_note_value)}</td>
                        </tr>
                      </>
                    )}

                    <tr className={d.net_gst_payable >= 0 ? 'bg-red-50/50' : 'bg-green-50/50'}>
                      <td className={`px-6 py-4 font-bold uppercase tracking-wider text-sm ${
                        d.net_gst_payable >= 0 ? 'text-red-700' : 'text-green-800'}`}>
                        Net GST Payable / (Credit) = (B − D)
                      </td>
                      <td className={`px-6 py-4 font-bold text-xl text-right ${
                        d.net_gst_payable >= 0 ? 'text-red-700' : 'text-green-800'}`}>
                        {d.net_gst_payable >= 0
                          ? money(d.net_gst_payable)
                          : `(${money(Math.abs(d.net_gst_payable))})`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── What this report does not cover ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">Before you file</h3>
              </div>
              <ul className="text-sm text-slate-500 space-y-1.5 list-disc pl-5">
                <li>
                  Input GST here is the tax recorded on purchases. It is <strong>not</strong> the
                  same as eligible ITC — blocked credits under s.17(5) and supplier
                  filing status still apply.
                </li>
                {d.credit_note_count > 0 && (
                  <li>
                    Credit and debit notes are listed but <strong>not netted</strong> into the tax
                    figures: the note records a value, not a tax component.
                  </li>
                )}
                {!d.rate_breakdown_available && (
                  <li>
                    No rate-wise (0/5/12/18/28) breakdown — invoice line items don't
                    carry reliable per-line tax, which GSTR-1 table 12 needs.
                  </li>
                )}
                <li>Amounts are rounded to whole rupees, as returns are filed.</li>
              </ul>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
