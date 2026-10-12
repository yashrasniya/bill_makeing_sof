import React, { useState, useEffect } from 'react';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import { BookOpen, Calendar, IndianRupee } from 'lucide-react';

export default function SupplierLedger() {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(defaultStart);
  const [dateTo, setDateTo] = useState(defaultEnd);

  const [ledgerData, setLedgerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch suppliers (vendors)
    clientToken.get('/vendors/')
      .then(res => {
        const vends = res.data.results || res.data;
        setSuppliers(vends);
        if (vends.length > 0) {
          setSelectedSupplierId(vends[0].id);
        }
      })
      .catch(err => console.error("Failed to load suppliers", err));
  }, []);

  useEffect(() => {
    if (selectedSupplierId && dateFrom && dateTo) {
      fetchLedger();
    }
  }, [selectedSupplierId, dateFrom, dateTo]);

  const fetchLedger = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await clientToken.get(`/ledger/vendor/${selectedSupplierId}/`, {
        params: { start_date: dateFrom, end_date: dateTo }
      });
      setLedgerData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch ledger data");
      setLedgerData(null);
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <BookOpen size={32} className="text-rose-600" />
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600">
                Supplier Ledger
              </h1>
            </div>
            <p className="mt-2 text-gray-500 font-medium">
              View comprehensive transaction history and running balances.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-3">
              <div className="flex flex-col px-2 min-w-[200px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none cursor-pointer truncate"
                >
                  <option value="" disabled>Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="w-px bg-gray-200 mx-1 hidden sm:block"></div>

              <div className="flex flex-col px-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none"
                />
              </div>

              <div className="w-px bg-gray-200 mx-1 hidden sm:block"></div>

              <div className="flex flex-col px-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        {ledgerData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Opening Balance</p>
                <h3 className="text-xl font-bold text-gray-800">{formatCurrency(ledgerData.opening_balance)}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Purchases</p>
                <h3 className="text-xl font-bold text-rose-600">{formatCurrency(ledgerData.total_purchases)}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Payments Made</p>
                <h3 className="text-xl font-bold text-emerald-600">{formatCurrency(ledgerData.total_payments_made)}</h3>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-5 rounded-2xl shadow-sm border border-rose-100">
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Closing Balance</p>
                <h3 className="text-2xl font-bold text-rose-700">{formatCurrency(ledgerData.closing_balance)}</h3>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                      <th className="px-6 py-4 font-bold">Date</th>
                      <th className="px-6 py-4 font-bold">Particulars</th>
                      <th className="px-6 py-4 font-bold">Vch Type</th>
                      <th className="px-6 py-4 font-bold">Vch No.</th>
                      <th className="px-6 py-4 font-bold text-right">Debit</th>
                      <th className="px-6 py-4 font-bold text-right">Credit</th>
                      <th className="px-6 py-4 font-bold text-right bg-gray-50">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening Balance Row */}
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-500">{dateFrom}</td>
                      <td className="px-6 py-4 font-bold text-gray-700" colSpan="5">Opening Balance</td>
                      <td className="px-6 py-4 font-bold text-right text-rose-600 bg-rose-50/30">
                        {formatCurrency(ledgerData.opening_balance)}
                      </td>
                    </tr>

                    {isLoading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <div className="flex justify-center items-center gap-3">
                            <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-semibold text-rose-600">Loading ledger...</span>
                          </div>
                        </td>
                      </tr>
                    ) : ledgerData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">
                          No transactions found for the selected date range.
                        </td>
                      </tr>
                    ) : (
                      ledgerData.transactions.map((t, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.date}</td>
                          <td className="px-6 py-4 font-medium text-gray-800">{t.particulars}</td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t.vch_type}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{t.vch_no || '-'}</td>
                          <td className="px-6 py-4 text-right text-gray-700 font-medium">{t.debit ? formatCurrency(t.debit) : '-'}</td>
                          <td className="px-6 py-4 text-right text-gray-700 font-medium">{t.credit ? formatCurrency(t.credit) : '-'}</td>
                          <td className="px-6 py-4 text-right font-bold text-rose-700 bg-rose-50/30">
                            {formatCurrency(t.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
