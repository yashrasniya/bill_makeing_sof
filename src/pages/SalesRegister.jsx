import React, { useState, useEffect } from 'react';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import { 
  Download, ChevronLeft, ChevronRight, FileText, 
  TrendingUp, TrendingDown, Users, Calendar, 
  FileCheck, FileClock, Search, FileBarChart2, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

/* ── KPI Card Component ── */
function KpiCard({ icon, label, value, sub, pct, color, delay = 0 }) {
  const isPos = (pct || 0) >= 0;
  return (
    <div style={{
      background: color,
      borderRadius: '20px',
      padding: '24px 22px 20px',
      flex: 1,
      minWidth: '200px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      position: 'relative',
      overflow: 'hidden',
      animation: `fadeUp 0.5s ease ${delay}s both`,
      cursor: 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'; }}
    >
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
      <div style={{ fontSize: '26px', marginBottom: '10px', color: 'white' }}>{icon}</div>
      <div style={{ fontSize: '26px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: '4px' }}>{label}</div>
      {pct !== undefined && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          marginTop: '10px', padding: '3px 10px', borderRadius: '99px',
          background: isPos ? 'rgba(255,255,255,0.2)' : 'rgba(252,165,165,0.25)',
          fontSize: '12px', fontWeight: 700, color: 'white',
        }}>
          {isPos ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
        </div>
      )}
      {sub && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '8px' }}>{sub}</div>
      )}
    </div>
  );
}

const COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6', '#06b6d4'];

export default function SalesRegister() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [customersList, setCustomersList] = useState([]);
  
  // Date filters
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(defaultStart);
  const [dateTo, setDateTo] = useState(defaultEnd);

  // Advanced Filters
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchReportData();
    fetchInvoices();
  }, [page, dateFrom, dateTo, selectedCustomer, selectedStatus, selectedPayment]);

  const fetchCustomers = async () => {
    try {
      const response = await clientToken.get('/companies/');
      if (response.status === 200) {
        setCustomersList(response.data.results || response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  const fetchReportData = async () => {
    setIsReportLoading(true);
    try {
      const params = {
        start_date: dateFrom,
        end_date: dateTo,
        ...(selectedCustomer && { customer: selectedCustomer }),
        ...(selectedStatus && { payment_status: selectedStatus }),
        ...(selectedPayment && { payment_method: selectedPayment }),
      };
      const response = await clientToken.get('/sales-report/', { params });
      if (response.status === 200) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch report data", error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = {
        invoice_type: 'sales',
        page: page,
      };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (selectedCustomer) params.customer = selectedCustomer;
      if (selectedStatus) params.payment_status = selectedStatus;
      if (selectedPayment) params.payment_method = selectedPayment;

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
      console.error("Failed to fetch sales invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const handleExport = async (type) => {
    try {
      const data = {
        type: type,
        invoice_type: 'sales',
        date_from: dateFrom,
        date_to: dateTo
      };
      if (selectedCustomer) data.customer = [selectedCustomer];
      const response = await clientToken.post('/bulk_export/', data, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: type === 'CSV' ? 'text/csv' : 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sales_Report_${dateFrom}_to_${dateTo}.${type === 'CSV' ? 'csv' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to export as ${type}`, error);
      alert(`Failed to export as ${type}`);
    }
  };

  const clearFilters = () => {
    setSelectedCustomer('');
    setSelectedStatus('');
    setSelectedPayment('');
    setDateFrom(defaultStart);
    setDateTo(defaultEnd);
    setPage(1);
  };

  // Table Totals
  const tableTotals = invoices.reduce((acc, inv) => {
    acc.gross += parseFloat(inv.total_final_amount || 0);
    acc.gst += parseFloat(inv.gst_final_amount || 0);
    return acc;
  }, { gross: 0, gst: 0 });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <style>{`
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header & Main Filters */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <FileBarChart2 size={32} className="text-indigo-600" />
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Sales Report Dashboard
              </h1>
            </div>
            <p className="mt-2 text-gray-500 font-medium">
              Comprehensive analytics, trends, and details of all sales invoices.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-3">
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

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl transition-colors border shadow-sm flex items-center justify-center
                ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-[fadeUp_0.3s_ease_both]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Advanced Filters</h3>
              <button onClick={clearFilters} className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1">
                <X size={14} /> Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Customer</label>
                <select 
                  value={selectedCustomer} 
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                >
                  <option value="">All Customers</option>
                  {customersList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Status</label>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                >
                  <option value="">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Method</label>
                <select 
                  value={selectedPayment} 
                  onChange={(e) => setSelectedPayment(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                >
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {isReportLoading ? (
           <div className="flex justify-center items-center py-10">
             <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : reportData && (
          <div className="flex overflow-x-auto gap-5 pb-6 mb-4 hide-scrollbar snap-x">
            <div className="snap-start min-w-[240px]">
              <KpiCard icon={<TrendingUp size={28}/>} label="Total Sales" value={formatCurrency(reportData.summary.total_sales)} pct={reportData.summary.sales_growth_pct} sub={`${reportData.summary.total_invoices} invoices`} color="linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)" delay={0.05} />
            </div>
            <div className="snap-start min-w-[240px]">
              <KpiCard icon={<FileCheck size={28}/>} label="Amount Paid" value={formatCurrency(reportData.summary.paid_amount)} color="linear-gradient(135deg, #10b981 0%, #059669 100%)" delay={0.1} />
            </div>
            <div className="snap-start min-w-[240px]">
              <KpiCard icon={<FileClock size={28}/>} label="Outstanding Balance" value={formatCurrency(reportData.summary.unpaid_amount)} color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" delay={0.15} />
            </div>
            <div className="snap-start min-w-[240px]">
              <KpiCard icon={<FileText size={28}/>} label="Total GST Collected" value={formatCurrency(reportData.summary.gst_collected)} color="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" delay={0.2} />
            </div>
            <div className="snap-start min-w-[240px]">
              <KpiCard icon={<Users size={28}/>} label="Repeat Customers" value={`${Math.round(reportData.kpis.repeat_customer_pct)}%`} sub={`${reportData.kpis.new_customers} new customers`} color="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" delay={0.25} />
            </div>
          </div>
        )}

        {/* Charts Section */}
        {reportData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Sales Trend */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-[fadeUp_0.5s_ease_0.3s_both]">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Sales Trend</h3>
              <div className="h-[300px] w-full">
                {reportData.charts.sales_trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.charts.sales_trend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis tickFormatter={(val) => `₹${val/1000}k`} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <RechartsTooltip formatter={(value) => [formatCurrency(value), "Sales"]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 font-medium">No trend data available</div>
                )}
              </div>
            </div>

            {/* Payment Status Distribution */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-[fadeUp_0.5s_ease_0.35s_both]">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Payment Status</h3>
              <div className="h-[300px] w-full flex items-center justify-center">
                {reportData.charts.payment_status_distribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.charts.payment_status_distribution}
                        cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5}
                        dataKey="value" stroke="none"
                      >
                        {reportData.charts.payment_status_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 font-medium">No payment data available</div>
                )}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2 animate-[fadeUp_0.5s_ease_0.4s_both]">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Top 10 Customers</h3>
              <div className="h-[350px] w-full">
                {reportData.charts.top_customers?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.charts.top_customers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tickFormatter={(val) => `₹${val/1000}k`} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} width={120} />
                      <RechartsTooltip formatter={(value) => [formatCurrency(value), "Revenue"]} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="sales" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 font-medium">No customer data available</div>
                )}
              </div>
            </div>
            
          </div>
        )}

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('CSV')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-semibold hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              <Download size={16} /> Export Excel
            </button>
            <button 
              onClick={() => handleExport('PDF')}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-semibold hover:bg-rose-100 transition-colors border border-rose-200"
            >
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Enhanced Table Area */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <th className="px-6 py-4 font-bold">Date & No.</th>
                  <th className="px-6 py-4 font-bold">Customer Details</th>
                  <th className="px-6 py-4 font-bold text-right">Taxable</th>
                  <th className="px-6 py-4 font-bold text-right">CGST</th>
                  <th className="px-6 py-4 font-bold text-right">SGST</th>
                  <th className="px-6 py-4 font-bold text-right">Total Amount</th>
                  <th className="px-6 py-4 font-bold">Status & Method</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center gap-3">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-semibold text-indigo-600">Loading details...</span>
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No invoices found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice, idx) => {
                    const totalAmount = parseFloat(invoice.total_final_amount || 0);
                    const gstAmount = parseFloat(invoice.gst_final_amount || 0);
                    const taxableAmount = totalAmount - gstAmount;
                    const halfGst = gstAmount / 2;
                    
                    return (
                      <tr key={invoice.id || idx} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-indigo-600">{invoice.invoice_number || '-'}</div>
                          <div className="text-xs text-gray-500 font-medium">{invoice.date || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{invoice.receiver_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 flex gap-2">
                            <span>GSTIN: <span className="font-medium text-gray-700">{invoice.receiver_gst_number || '-'}</span></span>
                            {invoice.receiver_state && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>{invoice.receiver_state}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600 font-medium">{formatCurrency(taxableAmount)}</td>
                        <td className="px-6 py-4 text-right text-gray-500 text-sm">{formatCurrency(halfGst)}</td>
                        <td className="px-6 py-4 text-right text-gray-500 text-sm">{formatCurrency(halfGst)}</td>
                        <td className="px-6 py-4 text-right font-extrabold text-gray-900 text-lg">{formatCurrency(totalAmount)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                              ${invoice.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                                invoice.payment_status === 'overdue' ? 'bg-rose-100 text-rose-700' : 
                                invoice.payment_status === 'partially_paid' ? 'bg-amber-100 text-amber-700' : 
                                'bg-gray-100 text-gray-700'}`}
                            >
                              {invoice.payment_status || 'unpaid'}
                            </span>
                            {invoice.payment_method && invoice.payment_method !== 'other' && (
                              <span className="text-xs font-medium text-gray-500 capitalize bg-white border px-1.5 rounded">
                                {invoice.payment_method.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              
              {/* Report Footer Summary */}
              {!isLoading && invoices.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan="2" className="px-6 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider">
                      Page Totals ({invoices.length} Invoices)
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(tableTotals.gross - tableTotals.gst)}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600 text-sm">{formatCurrency(tableTotals.gst / 2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600 text-sm">{formatCurrency(tableTotals.gst / 2)}</td>
                    <td className="px-6 py-4 text-right font-black text-indigo-700 text-xl">{formatCurrency(tableTotals.gross)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          
          {/* Pagination */}
          {!isLoading && invoices.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
              <span className="text-sm font-medium text-gray-500">
                Page {currentPage}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => page > 1 && setPage(page - 1)}
                  disabled={page === 1}
                  className={`p-2 rounded-lg border flex items-center justify-center transition-colors
                    ${page > 1 ? 'bg-white border-gray-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer' : 'bg-gray-50 border-transparent text-gray-300 cursor-not-allowed'}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  className="p-2 rounded-lg border bg-white border-gray-200 text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
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
