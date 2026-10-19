import React, { useState, useEffect } from 'react';
import PageIcon from '../comonant/PageIcon';
import { clientToken } from '../axios';
import Navbar from '../comonant/navbar';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, IndianRupee, FileText, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function Reports() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [interval, setInterval] = useState('daily');
  
  // Default to past 30 days
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const [summary, setSummary] = useState({ totalInflow: 0, totalOutflow: 0, net: 0 });

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, interval]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await clientToken.get(`/cash-flow/?start_date=${startDate}&end_date=${endDate}&interval=${interval}`);
      const fetchedData = response.data;
      setData(fetchedData);

      // Calculate totals for summary cards
      const totals = fetchedData.reduce(
        (acc, curr) => ({
          totalInflow: acc.totalInflow + curr.inflow,
          totalOutflow: acc.totalOutflow + curr.outflow,
          net: acc.net + curr.net,
        }),
        { totalInflow: 0, totalOutflow: 0, net: 0 }
      );
      setSummary(totals);
    } catch (error) {
      console.error("Failed to fetch cash flow data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <PageIcon icon={BarChart3} />
                  <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
              Financial Reports
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Track your cash flow, revenue, and overall business health.
            </p>
              </div>
              </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-end gap-3">
              <button 
                onClick={() => navigate('/purchase-register')}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors border border-red-200"
              >
                <FileText size={16} /> Purchase Register
              </button>
              <button 
                onClick={() => navigate('/supplier-ledger')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-semibold hover:bg-amber-100 transition-colors border border-amber-200"
              >
                <FileText size={16} /> Supplier Ledger
              </button>
            </div>
            <div className="flex flex-wrap gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex flex-col px-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="w-px bg-slate-200 mx-1 hidden sm:block"></div>
            
            <div className="flex flex-col px-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <div className="w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex flex-col px-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
              />
            </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={64} className="text-green-500" />
            </div>
            <div className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Total Inflow
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(summary.totalInflow)}</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingDown size={64} className="text-red-500" />
            </div>
            <div className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Total Outflow
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(summary.totalOutflow)}</h3>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 shadow-md border border-indigo-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee size={64} className="text-white" />
            </div>
            <div className="text-sm font-semibold text-indigo-100 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-300"></div>
              Net Cash Flow
            </div>
            <h3 className="text-3xl font-bold text-white">{formatCurrency(summary.net)}</h3>
          </div>
        </div>

        {/* Chart Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900">Cash Flow Trends</h2>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </div>
            )}
          </div>

          <div className="w-full h-[400px]">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                  />
                  
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value) => [formatCurrency(value), undefined]}
                  />
                  
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 600 }}
                  />
                  
                  <Area 
                    type="monotone" 
                    name="Inflow (Revenue)"
                    dataKey="inflow" 
                    stroke="#16a34a" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorInflow)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#16a34a' }}
                  />
                  
                  <Area 
                    type="monotone" 
                    name="Outflow (Expenses)"
                    dataKey="outflow" 
                    stroke="#dc2626" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorOutflow)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#dc2626' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              !isLoading && (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Calendar size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No data available for this range</p>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
