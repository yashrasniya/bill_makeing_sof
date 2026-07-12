import React, { useState, useEffect } from "react";
import Navbar from "../comonant/navbar.jsx";
import { clientToken } from "@/axios";
import { useNavigate } from "react-router-dom";

function KpiCard({ icon, label, value, sub, color, delay = 0 }) {
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
            <div style={{ fontSize: '26px', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {value}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: '4px' }}>{label}</div>
            {sub && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '8px' }}>{sub}</div>
            )}
        </div>
    );
}

const PurchaseInvoices = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pendingJobs, setPendingJobs] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const fetchData = () => {
        const fetchSummary = clientToken.get('purchase-summary/').then(res => res.data);
        const fetchPending = clientToken.get('purchase/pending-jobs/').then(res => res.data);
        
        Promise.all([fetchSummary, fetchPending])
            .then(([summaryData, pendingData]) => {
                setSummary(summaryData);
                setPendingJobs(pendingData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching dashboard data:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefreshStatus = (job_id) => {
        clientToken.get(`purchase/status/${job_id}/`)
            .then(res => {
                const newStatus = res.data.status;
                if (newStatus === "success" || newStatus === "done") {
                    setPendingJobs(prev => prev.filter(job => job.job_id !== job_id));
                    fetchData(); // Refetch summary to show new invoice
                } else {
                    setPendingJobs(prev => prev.map(job => job.job_id === job_id ? { ...job, status: newStatus } : job));
                }
            })
            .catch(err => console.error("Error refreshing status:", err));
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <Navbar />

            <div className="main-container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div className="purchase-header" style={{
                    marginBottom: '28px',
                    animation: 'fadeUp 0.4s ease both',
                    position: 'relative',
                    zIndex: 100,
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                            Purchase Dashboard
                        </h1>
                        <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            Overview of your purchase invoices and vendor expenses.
                        </p>
                    </div>

                    <div className="header-actions">
                        <input
                            type="file"
                            id="invoice-upload"
                            style={{ display: 'none' }}
                            accept="application/pdf,image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                const formData = new FormData();
                                formData.append("file", file);

                                setLoading(true);
                                clientToken.post('purchase/upload/', formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                })
                                .then(res => {
                                    setLoading(false);
                                    if (res.status === 200 || res.status === 201) {
                                        alert("Invoice uploaded and sent for background processing!");
                                        fetchData();
                                    }
                                })
                                .catch(err => {
                                    setLoading(false);
                                    console.error("Upload failed:", err);
                                    const errorMessage = err.response?.data?.error || "Failed to upload/process invoice. Please try again.";
                                    alert(errorMessage);
                                });
                            }}
                        />
                        <button
                            onClick={() => document.getElementById('invoice-upload').click()}
                            className="action-btn"
                            style={{
                                background: '#f8fafc', color: '#4f46e5',
                                fontWeight: 800, fontSize: '14px',
                                padding: '12px 24px', borderRadius: '14px',
                                border: '2px solid #e2e8f0', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload PDF/Image
                        </button>

                        <button
                            onClick={() => navigate('/newBill')}
                            className="action-btn"
                            style={{
                                background: '#4f46e5', color: 'white',
                                fontWeight: 800, fontSize: '14px',
                                padding: '12px 24px', borderRadius: '14px',
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(79,70,229,0.25)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.25)'; }}
                        >
                            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                <path d="M9 3v12M3 9h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                            Add Manually
                        </button>

                        {/* Pending Jobs Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                style={{
                                    background: '#f8fafc', color: '#475569',
                                    fontWeight: 700, fontSize: '14px',
                                    padding: '10px 16px', borderRadius: '14px',
                                    border: '2px solid #e2e8f0', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    position: 'relative',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                {pendingJobs.length > 0 && (
                                    <span style={{
                                        background: '#ef4444', color: 'white', fontSize: '11px',
                                        padding: '2px 6px', borderRadius: '10px',
                                        position: 'absolute', top: '-8px', right: '-8px'
                                    }}>
                                        {pendingJobs.length}
                                    </span>
                                )}
                            </button>
                            
                            {dropdownOpen && (
                                <div style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                                    width: '320px', background: 'white', borderRadius: '16px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 9999,
                                    padding: '12px', border: '1px solid #e2e8f0'
                                }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 4px' }}>
                                        Pending Extractions
                                    </h3>
                                    {pendingJobs.length === 0 ? (
                                        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px' }}>No pending tasks.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {pendingJobs.map(job => (
                                                <div key={job.job_id} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '10px', background: '#f8fafc', borderRadius: '10px'
                                                }}>
                                                    <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.file_name}>
                                                            {job.file_name}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
                                                            Status: {job.status}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRefreshStatus(job.job_id)}
                                                        style={{
                                                            background: '#e0e7ff', color: '#4f46e5', border: 'none',
                                                            borderRadius: '8px', padding: '6px', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                        title="Refresh Status"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="23 4 23 10 17 10" />
                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                        <p style={{ marginLeft: '12px', color: '#4f46e5', fontWeight: 600 }}>Loading Data...</p>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
                            <KpiCard
                                icon="📦"
                                label="Total Purchase Amount"
                                value={`₹${(summary?.total_purchases_amount || 0).toLocaleString('en-IN')}`}
                                sub={`Across ${summary?.total_count || 0} invoices`}
                                color="linear-gradient(135deg, #f43f5e 0%, #be123c 100%)"
                                delay={0.05}
                            />
                            <KpiCard
                                icon="📅"
                                label="This Month Purchases"
                                value={`₹${(summary?.this_month_purchases_amount || 0).toLocaleString('en-IN')}`}
                                sub={`${summary?.this_month_count || 0} invoices this month`}
                                color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                                delay={0.1}
                            />
                            <KpiCard
                                icon="🧾"
                                label="Total Purchase GST"
                                value={`₹${(summary?.total_purchases_gst || 0).toLocaleString('en-IN')}`}
                                color="linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)"
                                delay={0.15}
                            />
                        </div>

                        <div style={{
                            background: 'white', borderRadius: '20px',
                            padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                            animation: 'fadeUp 0.5s ease 0.25s both',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Recent Purchases</h2>
                                <button
                                    onClick={() => navigate('/bill_list')}
                                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                                >
                                    View All Invoices →
                                </button>
                            </div>

                            {summary?.recent_purchases?.length > 0 ? (
                                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                                <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Invoice No.</th>
                                                <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Date</th>
                                                <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Vendor</th>
                                                <th style={{ padding: '12px 8px', color: '#64748b', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.recent_purchases.map(inv => (
                                                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => navigate(`/invoice/${inv.id}/view`)} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '14px 8px', fontWeight: 700, color: '#0f172a' }}>{inv.invoice_number || '-'}</td>
                                                    <td style={{ padding: '14px 8px', color: '#475569', fontSize: '14px' }}>{inv.date}</td>
                                                    <td style={{ padding: '14px 8px', color: '#475569', fontSize: '14px' }}>{inv.vendor_name}</td>
                                                    <td style={{ padding: '14px 8px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>₹{(inv.amount || 0).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '14px' }}>No purchase invoices found.</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .main-container {
                    padding: 28px 24px 60px;
                }
                
                .purchase-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .header-actions {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                @media (max-width: 768px) {
                    .main-container {
                        padding: 20px 16px 60px;
                    }
                    .purchase-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 20px;
                    }
                    .header-actions {
                        width: 100%;
                        flex-wrap: wrap;
                    }
                    .action-btn {
                        flex: 1;
                        justify-content: center;
                        min-width: 140px;
                    }
                }
            `}</style>
        </div>
    );
};

export default PurchaseInvoices;
