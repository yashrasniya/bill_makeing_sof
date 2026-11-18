import React, { useEffect, useMemo, useState } from 'react';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import { CalendarRange, Info } from 'lucide-react';
import {
  Card, ErrorBox, IssueLists, PageHeader, Pills, Spinner, TaxTable, money,
} from '../comonant/GstReturnBits';

/** GSTR-9 (annual return) figures for a financial year, from the books. */

const fyOf = (d) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
const fyLabel = (y) => `FY ${y}-${String(y + 1).slice(2)}`;

export default function Gstr9Report() {
  const current = fyOf(new Date());
  const options = useMemo(() => [current - 1, current, current - 2].map(y => ({
    key: String(y), label: y === current ? `${fyLabel(y)} (so far)` : fyLabel(y),
  })), [current]);
  const [fy, setFy] = useState(String(current - 1));
  const [d, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await clientToken.get('/gstr9/', { params: { fy } });
        if (alive) setData(res.data);
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.error || err.response?.data?.detail || 'Could not load GSTR-9.');
          setData(null);
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fy]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PageHeader icon={CalendarRange} title="GSTR-9"
          subtitle="Annual return figures for a financial year, from your books." />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Pills options={options} value={fy} onChange={setFy} />
          {d && (
            <span className="ml-auto text-sm font-semibold text-slate-500">
              {d.fy_label}<span className="text-slate-300 mx-2">·</span>GSTIN {d.gstin || '—'}
              <span className="text-slate-300 mx-2">·</span>{d.sales_counted} sales invoices
            </span>
          )}
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        {isLoading ? <Spinner /> : !d ? null : (
          <div className="space-y-6">
            <IssueLists issues={d.issues} />

            <Card title="4 · Outward supplies on which tax is payable">
              <TaxTable rows={d.table4} boldKeys={['4N']} />
            </Card>
            <Card title="5 · Outward supplies on which tax is not payable">
              <TaxTable rows={d.table5} boldKeys={['5N']} />
            </Card>
            <Card title="6 · Input tax credit availed">
              <TaxTable rows={d.table6} showTaxable={false} />
            </Card>
            <Card title="7 · Input tax credit reversed">
              <TaxTable rows={[...d.table7, d.net_itc]} showTaxable={false} boldKeys={['7I', '7J']} />
            </Card>
            <Card title={`17 · HSN summary of outward supplies (${d.table17.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3">HSN</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Taxable value</th>
                      <th className="px-4 py-3 text-right">IGST</th>
                      <th className="px-4 py-3 text-right">CGST</th>
                      <th className="px-6 py-3 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {d.table17.map(r => (
                      <tr key={`${r.hsn}-${r.rate}-${r.uqc}`} className="border-b border-slate-50">
                        <td className="px-6 py-3 font-bold">{r.hsn}</td>
                        <td className="px-4 py-3">{r.desc}</td>
                        <td className="px-4 py-3">{r.uqc}</td>
                        <td className="px-4 py-3 text-right">{r.qty}</td>
                        <td className="px-4 py-3 text-right">{r.rate}%</td>
                        <td className="px-4 py-3 text-right">{money(r.taxable)}</td>
                        <td className="px-4 py-3 text-right">{money(r.igst)}</td>
                        <td className="px-4 py-3 text-right">{money(r.cgst)}</td>
                        <td className="px-6 py-3 text-right">{money(r.sgst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">About these figures</h3>
              </div>
              <ul className="text-sm text-slate-500 space-y-1.5 list-disc pl-5">
                <li>From your books, not from the returns as filed. Where a return was changed on the portal, the portal figure wins.</li>
                <li>Table 6 isn't split into inputs, capital goods and input services; that isn't recorded on purchases.</li>
                <li>Advances (4F) and amendments (4K/4L, 10, 11) aren't tracked yet.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
