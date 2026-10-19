import React, { useState, useEffect } from 'react';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import { Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export default function PurchaseRegister() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Date filters
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(defaultStart);
  const [dateTo, setDateTo] = useState(defaultEnd);

  useEffect(() => {
    fetchInvoices();
  }, [page, dateFrom, dateTo]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = {
        invoice_type: 'purchase',
        page: page,
      };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await clientToken.get('/invoice/', { params });
      if (response.status === 200) {
        setInvoices(response.data.results || []);
        if (response.data.next) {
          const urlObj = new URL(response.data.next);
          setCurrentPage(parseInt(urlObj.searchParams.get("page"), 10) - 1);
        } else {
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error("Failed to fetch purchase invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const handleExport = async (type) => {
    try {
      const data = {
        type: type,
        invoice_type: 'purchase',
        date_from: dateFrom,
        date_to: dateTo
      };
      const response = await clientToken.post('/bulk_export/', data, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: type === 'CSV' ? 'text/csv' : 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Purchase_Register_${dateFrom}_to_${dateTo}.${type === 'CSV' ? 'csv' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to export as ${type}`, error);
      alert(`Failed to export as ${type}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                <FileText size={20} />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
                Purchase Register
              </h1>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              List of all purchase invoices and their details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-3">
              <div className="flex flex-col px-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div className="w-px bg-slate-200 mx-1 hidden sm:block"></div>

              <div className="flex flex-col px-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleExport('CSV')}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-semibold hover:bg-green-100 transition-colors border border-green-200"
              >
                <Download size={16} /> Excel / CSV
              </button>
              <button 
                onClick={() => handleExport('PDF')}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors border border-red-200"
              >
                <Download size={16} /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {!isLoading && invoices.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', marginBottom: '16px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>No Purchases Found</h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>It looks like you don't have any purchase records yet. Get started by recording your first purchase!</p>
                <button
                    onClick={() => navigate("/newBill?type=purchase")}
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 14px rgba(79,70,229,0.3)', color: 'white', fontWeight: 700, fontSize: '14px', padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                        <path d="M9 3v12M3 9h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    Record Purchase
                </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-4 font-bold">Invoice Number</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Supplier Name</th>
                    <th className="px-6 py-4 font-bold">Supplier GSTIN</th>
                    <th className="px-6 py-4 font-bold text-right">Purchase Amount</th>
                    <th className="px-6 py-4 font-bold text-right">GST Amount</th>
                    <th className="px-6 py-4 font-bold text-right">Total Amount</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Payment Method</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex justify-center items-center gap-3">
                          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-semibold text-red-600">Loading invoices...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice, idx) => {
                      const taxableAmount = parseFloat(invoice.total_final_amount || 0) - parseFloat(invoice.gst_final_amount || 0);
                      return (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-red-600">{invoice.invoice_number || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{invoice.date || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{invoice.vendor_name || '-'}</td>
                        <td className="px-6 py-4 text-slate-500">{invoice.vendor_gst_number || '-'}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(taxableAmount)}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(invoice.gst_final_amount)}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(invoice.total_final_amount)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                            ${invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                              invoice.payment_status === 'overdue' ? 'bg-red-100 text-red-700' : 
                              invoice.payment_status === 'partially_paid' ? 'bg-amber-100 text-amber-700' : 
                              'bg-slate-100 text-slate-700'}`}
                          >
                            {invoice.payment_status || 'unpaid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 capitalize text-slate-500">{invoice.payment_method?.replace('_', ' ') || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}
          
          {/* Pagination */}
          {!isLoading && invoices.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <span className="text-sm font-medium text-slate-500">
                Page {currentPage}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => page > 1 && setPage(page - 1)}
                  disabled={page === 1}
                  className={`p-2 rounded-lg border flex items-center justify-center transition-colors
                    ${page > 1 ? 'bg-white border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer' : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed'}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  className="p-2 rounded-lg border bg-white border-slate-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
