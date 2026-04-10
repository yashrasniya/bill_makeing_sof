import Navbar from "../comonant/navbar.jsx";
import History from "../comonant/history";
import { useState, useEffect } from "react";
import { clientToken } from "@/axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

/* ── tiny inline sparkline bar ── */
function MiniBar({ pct, positive }) {
    const clamped = Math.min(Math.abs(pct || 0), 100);
    return (
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', marginTop: '10px' }}>
            <div style={{
                height: '100%', borderRadius: '99px',
                width: clamped + '%',
                background: positive ? 'rgba(255,255,255,0.85)' : 'rgba(252,165,165,0.9)',
                transition: 'width 0.8s ease',
            }} />
        </div>
    );
}

/* ── KPI card ── */
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
            {/* bg orb */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />

            {/* Icon */}
            <div style={{ fontSize: '26px', marginBottom: '10px' }}>{icon}</div>

            {/* Value */}
            <div style={{ fontSize: '26px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {value}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: '4px' }}>{label}</div>

            {/* Growth badge */}
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

            {pct !== undefined && <MiniBar pct={pct} positive={isPos} />}

            {sub && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '8px' }}>{sub}</div>
            )}
        </div>
    );
}

/* ── Quick action button ── */
function QuickAction({ icon, label, onClick, accent }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                background: 'white', border: `2px solid ${accent}18`,
                borderRadius: '16px', padding: '18px 20px', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                minWidth: '100px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${accent}28`; e.currentTarget.style.borderColor = `${accent}55`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = `${accent}18`; }}
        >
            <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `${accent}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
            }}>{icon}</div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{label}</span>
        </button>
    );
}

function Home() {
    const [filters, setFilters] = useState({ page: 1 });
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    
    // debounce search
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    useEffect(() => {
         setFilters(prev => ({ ...prev, date_from: dateFrom, date_to: dateTo, ordering: sortOrder, page: 1 }));
    }, [dateFrom, dateTo, sortOrder]);
    const [info, setInfo] = useState({
        name: '',
        month_total_final_amount: 0,
        month_gst_final_amount: 0,
        percentage_change: 0,
        percentage_gst_amount: 0,
        invoices_this_month_count: 0,
        invoices_prv_month_count: 0,
    });
    const navigate = useNavigate();
    const { userInfo } = useSelector(s => s.user);

    useEffect(() => {
        clientToken.get('user_info/').then(r => {
            if (r.status === 200) setInfo(r.data);
        }).catch(() => { });
    }, []);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            <Navbar />

            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px 60px' }}>

                {/* ── Welcome strip ── */}
                <div style={{
                    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)',
                    borderRadius: '24px',
                    padding: '28px 36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 12px 40px rgba(79,70,229,0.3)',
                    animation: 'fadeUp 0.4s ease both',
                }}>
                    {/* Orbs */}
                    <div style={{ position: 'absolute', top: '-40px', right: '10%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-50px', right: '30%', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

                    <div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 500 }}>
                            📅 {today}
                        </p>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                            Welcome back{info.name ? `, ${info.name}` : ''}! 👋
                        </h1>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                            Here's your business snapshot for this month.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/newBill')}
                        style={{
                            background: 'white', color: '#4f46e5',
                            fontWeight: 800, fontSize: '14px',
                            padding: '12px 24px', borderRadius: '14px',
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            flexShrink: 0,
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; }}
                    >
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                            <path d="M9 3v12M3 9h12" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        Create Bill
                    </button>
                </div>

                {/* ── KPI Cards row ── */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
                    <KpiCard
                        icon="💰"
                        label="This Month Sales"
                        value={`₹${(info.month_total_final_amount || 0).toLocaleString('en-IN')}`}
                        pct={info.percentage_change}
                        sub={`${info.invoices_this_month_count || 0} invoices this month`}
                        color="linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)"
                        delay={0.05}
                    />
                    <KpiCard
                        icon="🧾"
                        label="This Month GST"
                        value={`₹${(info.month_gst_final_amount || 0).toLocaleString('en-IN')}`}
                        pct={info.percentage_gst_amount}
                        sub={`Prev: ${info.invoices_prv_month_count || 0} invoices`}
                        color="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                        delay={0.1}
                    />
                    <KpiCard
                        icon="📄"
                        label="Bills This Month"
                        value={info.invoices_this_month_count || 0}
                        color="linear-gradient(135deg, #f43f5e 0%, #be123c 100%)"
                        delay={0.15}
                    />
                    <KpiCard
                        icon="📉"
                        label="Previous Month Bills"
                        value={info.invoices_prv_month_count || 0}
                        color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        delay={0.2}
                    />
                </div>

                {/* ── Quick Actions ── */}
                <div style={{
                    background: 'white', borderRadius: '20px',
                    padding: '20px 24px', marginBottom: '28px',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    animation: 'fadeUp 0.5s ease 0.25s both',
                }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
                        Quick Actions
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <QuickAction icon="➕" label="New Bill" onClick={() => navigate('/newBill')} accent="#4f46e5" />
                        <QuickAction icon="📋" label="Templates" onClick={() => navigate('/newBillWithTemplate')} accent="#7c3aed" />
                        <QuickAction icon="👥" label="Customers" onClick={() => navigate('/Customers')} accent="#0ea5e9" />
                        <QuickAction icon="📂" label="All Bills" onClick={() => navigate('/bill_list')} accent="#f43f5e" />
                        <QuickAction icon="🏢" label="My Company" onClick={() => navigate('/CompanyForm')} accent="#f59e0b" />
                        <QuickAction icon="👤" label="Profile" onClick={() => navigate('/profile')} accent="#ec4899" />
                    </div>
                </div>

                {/* ── Filters ── */}
                <div style={{
                    background: 'white', borderRadius: '20px',
                    padding: '20px 24px', marginBottom: '28px',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    animation: 'fadeUp 0.5s ease 0.25s both',
                    display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end'
                }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Search Invoices</label>
                        <input
                            type="text"
                            placeholder="Search by invoice # or customer..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '12px',
                                border: '1.5px solid #e2e8f0', outline: 'none',
                                fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#4f46e5'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                    <div style={{ flex: '0 1 auto' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>From Date</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '12px',
                                border: '1.5px solid #e2e8f0', outline: 'none',
                                fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#4f46e5'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                    <div style={{ flex: '0 1 auto' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>To Date</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '12px',
                                border: '1.5px solid #e2e8f0', outline: 'none',
                                fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#4f46e5'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                    <div style={{ flex: '0 1 auto' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Sort By</label>
                        <select
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 30px 10px 14px', borderRadius: '12px',
                                border: '1.5px solid #e2e8f0', outline: 'none',
                                fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s',
                                appearance: 'none',
                                background: 'white url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E") no-repeat right 12px center'
                            }}
                            onFocus={e => e.target.style.borderColor = '#4f46e5'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        >
                            <option value="">Default (Newest)</option>
                            <option value="date">Date (Oldest First)</option>
                            <option value="-total_final_amount">Amount (High to Low)</option>
                            <option value="total_final_amount">Amount (Low to High)</option>
                        </select>
                    </div>
                    <button
                        onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setSortOrder(''); }}
                        style={{
                            padding: '10px 20px', borderRadius: '12px', background: '#f1f5f9',
                            color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer',
                            fontSize: '14px', height: '41px', transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.background = '#e2e8f0'}
                        onMouseLeave={e => e.target.style.background = '#f1f5f9'}
                    >
                        Clear
                    </button>
                </div>

                {/* ── Recent Invoices ── */}
                <div style={{
                    background: 'white', borderRadius: '20px',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    animation: 'fadeUp 0.5s ease 0.3s both',
                }}>
                    <History filters={filters} />
                </div>
            </div>

            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 700px) {
                    .kpi-row { flex-direction: column !important; }
                }
            `}</style>
        </div>
    );
}

export { Home };