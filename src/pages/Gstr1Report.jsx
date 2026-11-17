import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import {
  FileCheck2, CheckCircle2, XCircle, AlertTriangle, Download, Info, ChevronRight, Receipt,
} from 'lucide-react';

/**
 * GSTR-1 (outward supplies) for one return period.
 *
 * The server builds every table and runs the pre-filing checks; this page
 * shows the table totals, the problems to fix, and downloads the portal /
 * offline-tool JSON. The server refuses the download (409) while any error
 * remains, so the button is disabled in that state as well.
 */

const PERIODS = [
  { key: 'last_month', label: 'Last month' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_quarter', label: 'Last quarter' },
  { key: 'this_quarter', label: 'This quarter' },
];

const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(Number(v || 0));

function IssueRow({ issue }) {
  const navigate = useNavigate();
  const isError = issue.level === 'error';
  const ref = issue.ref;
  const open = ref?.kind === 'invoice' ? () => navigate(`/bill/${ref.id}`) : null;
  const Icon = isError ? XCircle : AlertTriangle;
  return (
    <button
      type="button"
      onClick={open || undefined}
      disabled={!open}
      className={`w-full text-left flex items-start gap-3 px-6 py-3.5 border-t border-slate-100 first:border-t-0 ${
        open ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${isError ? 'text-red-600' : 'text-amber-600'}`} />
      <div className="flex-1 min-w-0">
        {ref && (
          <p className="text-xs font-bold text-slate-500 mb-0.5">
            {ref.kind === 'note' ? 'Note' : 'Invoice'} {ref.number || `#${ref.id}`}
            {ref.date ? ` · ${ref.date}` : ''}
          </p>
        )}
        <p className="text-sm text-slate-800">{issue.message}</p>
      </div>
      {open && <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300" />}
    </button>
  );
}

export default function Gstr1Report() {
  const [period, setPeriod] = useState('last_month');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      setDownloadError(null);
      try {
        const res = await clientToken.get('/gstr1/', { params: { period } });
        if (alive) setData(res.data);
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.error || err.response?.data?.detail || 'Could not load GSTR-1.');
          setData(null);
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [period]);

  const d = data;
  const errors = useMemo(() => (d?.issues || []).filter(i => i.level === 'error'), [d]);
  const warnings = useMemo(() => (d?.issues || []).filter(i => i.level !== 'error'), [d]);

  const download = async () => {
    if (!d) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await clientToken.get('/gstr1/', {
        params: { period, download: 1 }, responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_${d.gstin || 'NA'}_${d.fp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Could not prepare the GSTR-1 file.';
      const blob = err.response?.data;
      if (blob instanceof Blob) {
        try { msg = JSON.parse(await blob.text()).error || msg; } catch { /* keep default */ }
      }
      setDownloadError(msg);
    } finally {
      setDownloading(false);
    }
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
                <FileCheck2 size={20} />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">GSTR-1</h1>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              Outward supplies return: table totals, problems to fix, and the file to upload on the GST portal.
            </p>
          </div>

          {d && (
            <button
              onClick={download}
              disabled={!d.ready_to_file || downloading}
              title={d.ready_to_file ? '' : 'Fix the errors below first'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <Download size={16} /> {downloading ? 'Preparing…' : 'Download GSTR-1 JSON'}
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
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {p.label}
            </button>
          ))}
          {d && (
            <span className="ml-auto text-sm font-semibold text-slate-500">
              {d.period_label}
              <span className="text-slate-300 mx-2">·</span>
              GSTIN {d.gstin || '—'}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}
        {downloadError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
            {downloadError}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !d ? null : (
          <div className="space-y-6">

            {/* ── Status ── */}
            <div className={`rounded-2xl border-2 px-6 py-4 flex items-center gap-3 bg-white ${
              d.ready_to_file ? 'border-green-500' : 'border-red-500'}`}>
              {d.ready_to_file
                ? <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                : <XCircle size={24} className="text-red-600 shrink-0" />}
              <p className="font-bold text-slate-900">
                {d.ready_to_file
                  ? `Ready to file${d.warning_count ? ` · ${d.warning_count} warning(s) to review` : ''}`
                  : `${d.error_count} error(s) to fix before filing`}
              </p>
            </div>

            {/* ── Tables ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Receipt size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-800">Tables</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3">Table</th>
                      <th className="px-6 py-3 text-right">Invoices</th>
                      <th className="px-6 py-3 text-right">Taxable value</th>
                      <th className="px-6 py-3 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.tables.map(t => (
                      <tr key={t.table} className="border-b border-slate-50">
                        <td className="px-6 py-3.5 font-medium text-slate-700">{t.label}</td>
                        <td className="px-6 py-3.5 text-right text-slate-600">{t.count || '—'}</td>
                        <td className="px-6 py-3.5 text-right text-slate-900">{money(t.taxable)}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">{money(t.tax)}</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/40">
                      <td className="px-6 py-4 font-bold text-slate-900" colSpan={2}>Total</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{money(d.total_taxable)}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-700">{money(d.total_tax)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-3 text-xs text-slate-500 border-t border-slate-100">
                Table 12 (HSN summary): {d.hsn_rows} row(s) · Table 13 (documents issued): {d.documents.length} series
              </p>
            </div>

            {/* ── Table 13 ── */}
            {d.documents.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Documents issued (Table 13)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-6 py-3">From</th>
                        <th className="px-6 py-3">To</th>
                        <th className="px-6 py-3 text-right">Total</th>
                        <th className="px-6 py-3 text-right">Cancelled</th>
                        <th className="px-6 py-3 text-right">Net issued</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.documents.map(doc => (
                        <tr key={doc.num} className="border-b border-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-700">{doc.from}</td>
                          <td className="px-6 py-3 font-medium text-slate-700">{doc.to}</td>
                          <td className="px-6 py-3 text-right">{doc.totnum}</td>
                          <td className="px-6 py-3 text-right">{doc.cancel}</td>
                          <td className="px-6 py-3 text-right font-bold">{doc.net_issue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Issues ── */}
            {errors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-100 bg-red-50/60">
                  <h3 className="font-bold text-red-800">Fix before filing ({errors.length})</h3>
                </div>
                {errors.map((i, n) => <IssueRow key={`e${n}`} issue={i} />)}
              </div>
            )}
            {warnings.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/60">
                  <h3 className="font-bold text-amber-800">Review ({warnings.length})</h3>
                </div>
                {warnings.map((i, n) => <IssueRow key={`w${n}`} issue={i} />)}
              </div>
            )}

            {/* ── How to file ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">How to file</h3>
              </div>
              <ul className="text-sm text-slate-500 space-y-1.5 list-disc pl-5">
                <li>
                  On the GST portal go to Returns → GSTR-1 → Prepare offline → Upload, and upload the
                  downloaded file.
                </li>
                <li>Check the portal's summary against the totals on this page before you submit.</li>
                <li>Clicking an invoice in the lists above opens it so you can fix it.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
