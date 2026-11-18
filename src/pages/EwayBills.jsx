import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import { Truck, Download, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { blobError, downloadEwayJson } from '../comonant/Bill/EwayBillPanel';

/**
 * Sales invoices whose goods need an e-way bill and that have none yet, with
 * a bulk download of the portal's upload JSON for the ones picked. Transport
 * details are filled per invoice (the invoice page's e-way bill panel); the
 * server refuses the file while any picked invoice still has an error.
 */

const DAYS = [7, 30, 90, 180];
const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v || 0));

export default function EwayBills() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [check, setCheck] = useState(null);       // { [invoice_id]: {ready, issues} }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    setCheck(null);
    setPicked(new Set());
    clientToken.get('eway/pending/', { params: { days } })
      .then((r) => { if (alive) setRows(r.data.invoices); })
      .catch((e) => { if (alive) { setRows([]); setError(e.response?.data?.error || 'Could not load invoices.'); } });
    return () => { alive = false; };
  }, [days]);

  const toggle = (id) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allPicked = rows?.length > 0 && picked.size === rows.length;

  const download = async () => {
    const ids = [...picked];
    if (!ids.length) return;
    setBusy(true);
    setError('');
    try {
      const r = await clientToken.get('eway/json/', { params: { ids: ids.join(',') } });
      setCheck(Object.fromEntries(r.data.bills.map((b) => [b.invoice_id, b])));
      if (!r.data.ready) {
        setError('Some invoices still have problems (listed below). Fix them on the invoice page, or untick them.');
        return;
      }
      await downloadEwayJson(ids, `bulk_${ids.length}`);
    } catch (e) {
      setError(await blobError(e, 'Could not prepare the e-way bill file.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-indigo-600 to-violet-600">
                <Truck size={20} />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight">E-way bills</h1>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              Sales invoices with goods over ₹50,000 and no e-way bill yet. Pick some and download one file for the portal’s bulk upload.
            </p>
          </div>
          <div className="flex gap-2">
            {DAYS.map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${days === d
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                Last {d} days
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {rows === null ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
              <p className="mt-2 text-sm font-semibold">Nothing pending</p>
              <p className="text-xs text-slate-500">No invoice in this period needs an e-way bill.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" aria-label="Pick all" checked={allPicked}
                        onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.invoice_id)))} />
                    </th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Goods value</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const c = check?.[r.invoice_id];
                    const errs = c ? c.issues.filter((i) => i.level === 'error') : [];
                    return (
                      <React.Fragment key={r.invoice_id}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <input type="checkbox" aria-label={`Pick invoice ${r.invoice_number || r.invoice_id}`}
                              checked={picked.has(r.invoice_id)} onChange={() => toggle(r.invoice_id)} />
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {c && (c.ready
                              ? <CheckCircle2 size={14} className="inline mr-1 text-emerald-600" />
                              : <XCircle size={14} className="inline mr-1 text-red-600" />)}
                            {r.invoice_number || `#${r.invoice_id}`}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{r.date}</td>
                          <td className="px-4 py-3 text-slate-600">{r.customer || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(r.consignment_value)}</td>
                          <td className="px-4 py-3">
                            <button type="button" aria-label="Open invoice" onClick={() => navigate(`/bill/${r.invoice_id}`)}
                              className="text-slate-400 hover:text-indigo-600"><ChevronRight size={16} /></button>
                          </td>
                        </tr>
                        {errs.length > 0 && (
                          <tr className="border-b border-slate-100 bg-red-50/40">
                            <td />
                            <td colSpan={5} className="px-4 py-2">
                              <ul className="text-xs text-red-700 space-y-0.5">
                                {errs.map((i, n) => <li key={n}>{i.message}</li>)}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={download} disabled={busy || picked.size === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Download size={16} /> {busy ? 'Preparing…' : `Download JSON for ${picked.size || 'picked'} invoice(s)`}
          </button>
          <span className="text-xs text-slate-500">
            Upload it on ewaybillgst.gov.in (e-Waybill → Generate Bulk), then enter each number on its invoice. At most 50 per file.
          </span>
        </div>
      </main>
    </div>
  );
}
