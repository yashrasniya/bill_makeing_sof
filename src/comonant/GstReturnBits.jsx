import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, XCircle } from 'lucide-react';

/** Shared pieces of the GSTR-1 / 3B / 9 pages. */

export const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(Number(v || 0));

export function Card({ title, subtitle, children, tone = 'slate' }) {
  const border = { slate: 'border-slate-100', red: 'border-red-100', amber: 'border-amber-100' }[tone];
  const head = {
    slate: 'border-slate-100 bg-slate-50/50 text-slate-800',
    red: 'border-red-100 bg-red-50/60 text-red-800',
    amber: 'border-amber-100 bg-amber-50/60 text-amber-800',
  }[tone];
  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${border} overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${head}`}>
        <h3 className="font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Rows of { key, label, taxable, igst, cgst, sgst }. `boldKeys` marks totals. */
export function TaxTable({ rows, showTaxable = true, boldKeys = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <th className="px-6 py-3">Table</th>
            {showTaxable && <th className="px-4 py-3 text-right">Taxable value</th>}
            <th className="px-4 py-3 text-right">IGST</th>
            <th className="px-4 py-3 text-right">CGST</th>
            <th className="px-6 py-3 text-right">SGST</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(r => {
            const bold = boldKeys.includes(r.key);
            return (
              <tr key={r.key} className={`border-b border-slate-50 ${bold ? 'bg-indigo-50/40 font-bold' : ''}`}>
                <td className="px-6 py-3 text-slate-700">
                  {r.key && <span className="font-bold text-slate-900 mr-2">{r.key}</span>}{r.label}
                </td>
                {showTaxable && <td className="px-4 py-3 text-right text-slate-900">{money(r.taxable)}</td>}
                <td className="px-4 py-3 text-right text-slate-900">{money(r.igst)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{money(r.cgst)}</td>
                <td className="px-6 py-3 text-right text-slate-900">{money(r.sgst)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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

/** Errors, then warnings; nothing when there are none. */
export function IssueLists({ issues, errorTitle = 'Fix first' }) {
  const errors = (issues || []).filter(i => i.level === 'error');
  const warnings = (issues || []).filter(i => i.level !== 'error');
  return (
    <>
      {errors.length > 0 && (
        <Card title={`${errorTitle} (${errors.length})`} tone="red">
          {errors.map((i, n) => <IssueRow key={`e${n}`} issue={i} />)}
        </Card>
      )}
      {warnings.length > 0 && (
        <Card title={`Review (${warnings.length})`} tone="amber">
          {warnings.map((i, n) => <IssueRow key={`w${n}`} issue={i} />)}
        </Card>
      )}
    </>
  );
}

export function Pills({ options, value, onChange }) {
  return options.map(p => (
    <button
      key={p.key}
      onClick={() => onChange(p.key)}
      className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
        value === p.key
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
    >
      {p.label}
    </button>
  ));
}

export function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
            <Icon size={20} />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{title}</h1>
        </div>
        <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ErrorBox({ children }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
      {children}
    </div>
  );
}
