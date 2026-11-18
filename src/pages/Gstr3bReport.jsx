import React, { useEffect, useState } from 'react';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import { Calculator, Info } from 'lucide-react';
import {
  Card, ErrorBox, IssueLists, PageHeader, Pills, Spinner, TaxTable, money,
} from '../comonant/GstReturnBits';

/**
 * GSTR-3B for a period: what to type into the portal. Nothing is filed or
 * downloaded; outward figures come from the same classification as GSTR-1.
 */

const PERIODS = [
  { key: 'last_month', label: 'Last month' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_quarter', label: 'Last quarter' },
  { key: 'this_quarter', label: 'This quarter' },
];

export default function Gstr3bReport() {
  const [period, setPeriod] = useState('last_month');
  const [d, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await clientToken.get('/gstr3b/', { params: { period } });
        if (alive) setData(res.data);
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.error || err.response?.data?.detail || 'Could not load GSTR-3B.');
          setData(null);
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [period]);

  const pay = d?.payment;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PageHeader icon={Calculator} title="GSTR-3B"
          subtitle="Tax to pay, input credit and the figures to type into the portal." />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Pills options={PERIODS} value={period} onChange={setPeriod} />
          {d && (
            <span className="ml-auto text-sm font-semibold text-slate-500">
              {d.period_label}<span className="text-slate-300 mx-2">·</span>GSTIN {d.gstin || '—'}
              <span className="text-slate-300 mx-2">·</span>{d.sales_counted} sales, {d.purchases_counted} purchases
            </span>
          )}
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        {isLoading ? <Spinner /> : !d ? null : (
          <div className="space-y-6">
            <IssueLists issues={d.issues} />

            {/* ── 6.1 ── */}
            <Card title="6.1 · Tax to pay" subtitle="Credit is used in the legal order: IGST credit first, CGST and SGST credit never against each other.">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3">Tax</th>
                      <th className="px-4 py-3 text-right">Due</th>
                      <th className="px-4 py-3 text-right">From IGST credit</th>
                      <th className="px-4 py-3 text-right">From CGST credit</th>
                      <th className="px-4 py-3 text-right">From SGST credit</th>
                      <th className="px-4 py-3 text-right">Cash</th>
                      <th className="px-6 py-3 text-right">Reverse charge (cash)</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {pay.rows.map(r => (
                      <tr key={r.head} className="border-b border-slate-50">
                        <td className="px-6 py-3 font-bold text-slate-800">{r.head}</td>
                        <td className="px-4 py-3 text-right">{money(r.liability)}</td>
                        <td className="px-4 py-3 text-right">{money(r.paid_igst_credit)}</td>
                        <td className="px-4 py-3 text-right">{money(r.paid_cgst_credit)}</td>
                        <td className="px-4 py-3 text-right">{money(r.paid_sgst_credit)}</td>
                        <td className="px-4 py-3 text-right font-bold">{money(r.cash)}</td>
                        <td className="px-6 py-3 text-right font-bold">{money(r.reverse_charge_cash)}</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/40">
                      <td className="px-6 py-4 font-bold" colSpan={6}>Pay in cash</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-700">{money(pay.cash_total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-3 text-xs text-slate-500 border-t border-slate-100">
                Credit carried forward: IGST {money(pay.credit_carried_forward.igst)} · CGST{' '}
                {money(pay.credit_carried_forward.cgst)} · SGST {money(pay.credit_carried_forward.sgst)}
              </p>
            </Card>

            <Card title="3.1 · Outward and reverse-charge supplies">
              <TaxTable rows={d.outward} />
              {d.buyer_pays_reverse_charge.taxable > 0 && (
                <p className="px-6 py-3 text-xs text-slate-500 border-t border-slate-100">
                  Not your liability: {money(d.buyer_pays_reverse_charge.taxable)} of supplies where the buyer pays
                  the GST ({money(d.buyer_pays_reverse_charge.igst + d.buyer_pays_reverse_charge.cgst + d.buyer_pays_reverse_charge.sgst)}) under reverse charge.
                </p>
              )}
            </Card>

            {d.inter_state_unregistered.length > 0 && (
              <Card title="3.2 · Inter-state supplies to unregistered and composition buyers">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-6 py-3">Place of supply</th>
                        <th className="px-4 py-3">Buyers</th>
                        <th className="px-4 py-3 text-right">Taxable value</th>
                        <th className="px-6 py-3 text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {d.inter_state_unregistered.map(r => (
                        <tr key={`${r.buyer}${r.pos}`} className="border-b border-slate-50">
                          <td className="px-6 py-3">{r.pos} · {r.state}</td>
                          <td className="px-4 py-3">{r.buyer === 'composition' ? 'Composition dealers' : 'Unregistered'}</td>
                          <td className="px-4 py-3 text-right">{money(r.taxable)}</td>
                          <td className="px-6 py-3 text-right">{money(r.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card title="4 · Input tax credit">
              <TaxTable rows={d.itc} showTaxable={false} boldKeys={['4A', '4C']} />
            </Card>

            <Card title="5 · Exempt, nil-rated and non-GST purchases">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3">Nature of supplies</th>
                      <th className="px-4 py-3 text-right">Inter-state</th>
                      <th className="px-6 py-3 text-right">Intra-state</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {d.inward_exempt.map(r => (
                      <tr key={r.label} className="border-b border-slate-50">
                        <td className="px-6 py-3">{r.label}</td>
                        <td className="px-4 py-3 text-right">{money(r.inter)}</td>
                        <td className="px-6 py-3 text-right">{money(r.intra)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">Before you file</h3>
              </div>
              <ul className="text-sm text-slate-500 space-y-1.5 list-disc pl-5">
                <li>Type these figures into GSTR-3B on the portal; nothing is filed from here.</li>
                <li>Compare with the portal's auto-filled figures (from your GSTR-1 and your GSTR-2B) and look into any difference.</li>
                <li>Input credit here is from your purchase bills. You can only claim what appears in your GSTR-2B.</li>
                <li>Interest and late fee are not included.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
