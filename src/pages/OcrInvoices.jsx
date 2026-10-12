import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../comonant/navbar.jsx";
import { clientToken } from "@/axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

/* ── status presentation ── */
const STATE_META = {
    completed: { label: "Completed", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    processing: { label: "Processing", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
    failed: { label: "Failed", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

/* WhatsApp intake — invoices sent from a registered mobile number land in this list */
const WHATSAPP_NUMBER_DISPLAY = "+91 81928 43910";
const WHATSAPP_NUMBER_E164 = "918192843910";

const money = (v) => {
    const n = Number(v);
    if (v === null || v === undefined || v === "" || Number.isNaN(n)) return "—";
    return `₹${n.toLocaleString("en-IN")}`;
};

const when = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

function StatCard({ icon, label, value, sub, color, delay = 0 }) {
    return (
        <div style={{
            background: color, borderRadius: '20px', padding: '22px 20px 18px',
            flex: 1, minWidth: '190px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            position: 'relative', overflow: 'hidden',
            animation: `fadeUp 0.5s ease ${delay}s both`,
        }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '25px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginTop: '4px' }}>{label}</div>
            {sub && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '6px' }}>{sub}</div>}
        </div>
    );
}

function StatePill({ state, status }) {
    const meta = STATE_META[state] || STATE_META.processing;
    return (
        <span
            title={status || meta.label}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px', borderRadius: '999px',
                background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
                fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
            }}
        >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.color }} />
            {meta.label}
        </span>
    );
}

const OcrInvoices = () => {
    const { features, status: accessStatus } = useSelector((state) => state.access);
    const hasOcrFeature = accessStatus === 'succeeded' && features.includes('ocr_purchase_invoice');

    const [data, setData] = useState({ usage: null, counts: null, jobs: [] });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);
    const [toast, setToast] = useState(null);
    const [busyJob, setBusyJob] = useState(null);
    const [copiedNumber, setCopiedNumber] = useState(false);

    const fileRef = useRef(null);
    const navigate = useNavigate();

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const copyWhatsappNumber = () => {
        const write = navigator.clipboard?.writeText(WHATSAPP_NUMBER_DISPLAY);
        if (!write) {
            showToast('error', `Copy failed — the number is ${WHATSAPP_NUMBER_DISPLAY}`);
            return;
        }
        write
            .then(() => {
                setCopiedNumber(true);
                setTimeout(() => setCopiedNumber(false), 2000);
            })
            .catch(() => showToast('error', `Copy failed — the number is ${WHATSAPP_NUMBER_DISPLAY}`));
    };

    const fetchJobs = useCallback(() => {
        return clientToken.get('purchase/ocr-jobs/')
            .then(res => {
                setData({
                    usage: res.data?.usage || null,
                    counts: res.data?.counts || null,
                    jobs: Array.isArray(res.data?.jobs) ? res.data.jobs : [],
                });
            })
            .catch(err => {
                console.error("Failed to load OCR jobs:", err);
                showToast('error', err.response?.data?.error || 'Failed to load OCR history.');
            })
            .finally(() => {
                setLoading(false);
                setRefreshing(false);
            });
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const handleRefresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        fetchJobs();
    };

    const upload = (file) => {
        if (!file) return;
        if (!hasOcrFeature) {
            showToast('error', 'Your current subscription does not include OCR invoice scanning.');
            return;
        }

        const form = new FormData();
        form.append("file", file);
        form.append("invoice_type", "purchase");

        setUploading(true);
        clientToken.post('purchase/upload/', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
            .then(() => {
                showToast('success', `"${file.name}" uploaded — extraction started.`);
                fetchJobs();
            })
            .catch(err => {
                console.error("Upload failed:", err);
                showToast('error', err.response?.data?.error || 'Failed to upload invoice. Please try again.');
            })
            .finally(() => {
                setUploading(false);
                if (fileRef.current) fileRef.current.value = '';
            });
    };

    // Re-polls one job against the pipeline, then refreshes the list so the
    // extracted fields and counts stay in sync with the new status.
    const refreshJob = (job) => {
        if (!job.job_id || busyJob) return;
        setBusyJob(job.job_id);
        clientToken.get(`purchase/status/${job.job_id}/`)
            .then(res => {
                showToast('success', `Status: ${res.data?.status || 'updated'}`);
                return fetchJobs();
            })
            .catch(err => {
                console.error("Status check failed:", err);
                showToast('error', err.response?.data?.error || 'Could not check job status.');
            })
            .finally(() => setBusyJob(null));
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (uploading) return;
        const file = e.dataTransfer?.files?.[0];
        if (file) upload(file);
    };

    const usage = data.usage;
    const counts = data.counts || { completed: 0, processing: 0, failed: 0 };
    const monthlyLimit = usage?.monthly_limit;
    const monthlyLabel = monthlyLimit === null || monthlyLimit === undefined
        ? 'Unlimited on your plan'
        : `of ${monthlyLimit} this month`;
    const monthlyExhausted = typeof monthlyLimit === 'number'
        && monthlyLimit > 0 && (usage?.this_month || 0) >= monthlyLimit;
    const dailyExhausted = usage && usage.today >= usage.daily_limit;
    const uploadBlocked = uploading || !hasOcrFeature || monthlyExhausted || dailyExhausted;

    const visibleJobs = filter === 'all'
        ? data.jobs
        : data.jobs.filter(j => j.state === filter);

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <Navbar />

            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    color: toast.type === 'success' ? '#166534' : '#dc2626',
                    padding: '12px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxWidth: '380px',
                    animation: 'fadeUp 0.3s ease',
                }}>
                    {toast.type === 'success' ? '✅ ' : '❌ '}{toast.msg}
                </div>
            )}

            <div className="ocr-container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
                {/* Header */}
                <div className="ocr-header" style={{ marginBottom: '24px', animation: 'fadeUp 0.4s ease both' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                            OCR Invoice Scanning
                        </h1>
                        <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            Upload a purchase invoice and let OCR read the details for you.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            title="Refresh OCR history"
                            style={{
                                background: '#f8fafc', color: '#4f46e5', fontWeight: 800, fontSize: '14px',
                                padding: '12px 20px', borderRadius: '14px', border: '2px solid #e2e8f0',
                                cursor: refreshing ? 'wait' : 'pointer', opacity: refreshing ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#f1f5f9'; } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                 style={refreshing ? { animation: 'spin 0.8s linear infinite' } : undefined}>
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>

                        <button
                            onClick={() => navigate('/purchase_invoices')}
                            style={{
                                background: '#4f46e5', color: 'white', fontWeight: 800, fontSize: '14px',
                                padding: '12px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(79,70,229,0.25)', transition: 'transform 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            Purchase Dashboard →
                        </button>
                    </div>
                </div>

                {!hasOcrFeature && accessStatus === 'succeeded' && (
                    <div style={{
                        background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e',
                        padding: '14px 18px', borderRadius: '14px', marginBottom: '20px',
                        fontSize: '14px', fontWeight: 600,
                    }}>
                        ⚠️ OCR invoice scanning is not part of your current plan. You can review past
                        extractions below, but new uploads are disabled.{' '}
                        <span onClick={() => navigate('/billing')} style={{ color: '#b45309', textDecoration: 'underline', cursor: 'pointer' }}>
                            View plans
                        </span>
                    </div>
                )}

                {/* Upload area */}
                <input
                    ref={fileRef}
                    type="file"
                    id="ocr-upload"
                    style={{ display: 'none' }}
                    accept="application/pdf,image/*"
                    onChange={(e) => upload(e.target.files?.[0])}
                />
                <div
                    onClick={() => { if (!uploadBlocked) fileRef.current?.click(); }}
                    onDragOver={(e) => { e.preventDefault(); if (!uploadBlocked) setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    style={{
                        background: dragOver ? '#eef2ff' : 'white',
                        border: `2px dashed ${dragOver ? '#4f46e5' : '#cbd5e1'}`,
                        borderRadius: '20px', padding: '32px 24px', marginBottom: '24px',
                        textAlign: 'center', cursor: uploadBlocked ? 'not-allowed' : 'pointer',
                        opacity: uploadBlocked && !uploading ? 0.65 : 1,
                        transition: 'all 0.2s', animation: 'fadeUp 0.45s ease 0.05s both',
                    }}
                >
                    {uploading ? (
                        <>
                            <div style={{ width: '34px', height: '34px', margin: '0 auto 12px', border: '3px solid #e0e7ff', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#4f46e5' }}>Uploading and queuing extraction...</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '34px', marginBottom: '8px' }}>📄</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                                {dragOver ? 'Drop the file to upload' : 'Drop an invoice here, or click to browse'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                                PDF or image · one file at a time
                                {dailyExhausted && ' · daily upload limit reached'}
                                {monthlyExhausted && !dailyExhausted && ' · monthly scan quota reached'}
                            </div>
                        </>
                    )}
                </div>

                {/* WhatsApp upload route */}
                <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    border: '1.5px solid #bbf7d0', borderRadius: '20px',
                    padding: '20px 22px', marginBottom: '24px',
                    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                    animation: 'fadeUp 0.45s ease 0.08s both',
                }}>
                    <div style={{
                        width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                        background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                            <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/>
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.23 8.24z"/>
                        </svg>
                    </div>

                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#065f46', marginBottom: '4px' }}>
                            Or send your invoice on WhatsApp
                        </div>
                        <div style={{ fontSize: '13.5px', color: '#047857', fontWeight: 500, lineHeight: 1.5 }}>
                            Send a PDF or photo of your invoice to{' '}
                            <strong style={{ fontWeight: 800 }}>{WHATSAPP_NUMBER_DISPLAY}</strong>{' '}
                            from your <strong style={{ fontWeight: 800 }}>registered mobile number</strong> — it will be
                            scanned automatically and show up here.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={copyWhatsappNumber}
                            style={{
                                padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 800,
                                border: '1.5px solid #bbf7d0', background: 'white', color: '#047857', cursor: 'pointer',
                            }}
                        >
                            {copiedNumber ? 'Copied!' : 'Copy number'}
                        </button>
                        <a
                            href={`https://wa.me/${WHATSAPP_NUMBER_E164}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 800,
                                background: '#25D366', color: 'white', textDecoration: 'none',
                                boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
                            }}
                        >
                            Open WhatsApp
                        </a>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ marginLeft: '12px', color: '#4f46e5', fontWeight: 600 }}>Loading OCR data...</p>
                    </div>
                ) : (
                    <>
                        {/* Usage */}
                        <div style={{ display: 'flex', gap: '18px', marginBottom: '26px', flexWrap: 'wrap' }}>
                            <StatCard
                                icon="📅"
                                label="Scans This Month"
                                value={usage?.this_month ?? 0}
                                sub={monthlyLabel}
                                color="linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)"
                                delay={0.05}
                            />
                            <StatCard
                                icon="⚡"
                                label="Uploads Today"
                                value={`${usage?.today ?? 0} / ${usage?.daily_limit ?? 10}`}
                                sub="Resets at midnight"
                                color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                                delay={0.1}
                            />
                            <StatCard
                                icon="✅"
                                label="Completed"
                                value={counts.completed || 0}
                                sub={`${counts.processing || 0} processing · ${counts.failed || 0} failed`}
                                color="linear-gradient(135deg, #10b981 0%, #047857 100%)"
                                delay={0.15}
                            />
                            <StatCard
                                icon="🗂️"
                                label="Total Scanned"
                                value={usage?.total ?? 0}
                                sub="All time, company-wide"
                                color="linear-gradient(135deg, #f43f5e 0%, #be123c 100%)"
                                delay={0.2}
                            />
                        </div>

                        {/* History */}
                        <div style={{
                            background: 'white', borderRadius: '20px', padding: '24px',
                            boxShadow: '0 2px 16px rgba(0,0,0,0.06)', animation: 'fadeUp 0.5s ease 0.25s both',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    Recent OCR Extractions
                                </h2>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['all', 'completed', 'processing', 'failed'].map(key => (
                                        <button
                                            key={key}
                                            onClick={() => setFilter(key)}
                                            style={{
                                                padding: '6px 14px', borderRadius: '999px', fontSize: '13px',
                                                fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                                                border: `1.5px solid ${filter === key ? '#4f46e5' : '#e2e8f0'}`,
                                                background: filter === key ? '#eef2ff' : 'white',
                                                color: filter === key ? '#4f46e5' : '#64748b',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {key}{key !== 'all' && ` (${counts[key] || 0})`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {visibleJobs.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '30px', marginBottom: '10px' }}>🔍</div>
                                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        {filter === 'all' ? 'No invoices scanned yet' : `No ${filter} extractions`}
                                    </h4>
                                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                                        {filter === 'all'
                                            ? 'Upload a PDF or image above to run your first extraction.'
                                            : 'Try a different filter.'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {visibleJobs.map(job => {
                                        const open = expanded === job.id;
                                        const ex = job.extracted || {};
                                        return (
                                            <div key={job.id} style={{
                                                border: '1.5px solid #e2e8f0', borderRadius: '14px',
                                                background: open ? '#f8fafc' : 'white', transition: 'all 0.15s',
                                            }}>
                                                <div
                                                    onClick={() => setExpanded(open ? null : job.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '12px',
                                                        padding: '14px 16px', cursor: 'pointer', flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                                                        <div title={job.file_name} style={{
                                                            fontSize: '14px', fontWeight: 700, color: '#0f172a',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        }}>
                                                            {job.file_name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                                            {when(job.created_at)}
                                                            {job.uploaded_by && ` · ${job.uploaded_by}`}
                                                        </div>
                                                    </div>

                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', minWidth: '110px' }}>
                                                        {ex.invoice_number || '—'}
                                                    </div>
                                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', minWidth: '90px', textAlign: 'right' }}>
                                                        {money(ex.total_amount)}
                                                    </div>

                                                    <StatePill state={job.state} status={job.status} />

                                                    <span style={{
                                                        fontSize: '12px', color: '#94a3b8',
                                                        transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
                                                    }}>▼</span>
                                                </div>

                                                {open && (
                                                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                                                            {[
                                                                ['Invoice Number', ex.invoice_number || '—'],
                                                                ['Invoice Date', ex.date || '—'],
                                                                ['Vendor', ex.vendor_name || (ex.vendor_id ? `#${ex.vendor_id}` : '—')],
                                                                ['Total Amount', money(ex.total_amount)],
                                                                ['GST Amount', money(ex.gst_amount)],
                                                                ['Invoice Type', job.invoice_type || 'purchase'],
                                                                ['Pipeline Status', job.status || '—'],
                                                                ['Job ID', job.job_id || '—'],
                                                            ].map(([label, value]) => (
                                                                <div key={label}>
                                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                        {label}
                                                                    </div>
                                                                    <div title={String(value)} style={{
                                                                        fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginTop: '3px',
                                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                    }}>
                                                                        {value}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                            {job.file_url && (
                                                                <a
                                                                    href={job.file_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{
                                                                        padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                                                                        border: '1.5px solid #e2e8f0', color: '#4f46e5', background: 'white',
                                                                        textDecoration: 'none',
                                                                    }}
                                                                >
                                                                    View original file
                                                                </a>
                                                            )}
                                                            {job.state !== 'completed' && job.job_id && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); refreshJob(job); }}
                                                                    disabled={busyJob === job.job_id}
                                                                    style={{
                                                                        padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                                                                        border: 'none', background: '#e0e7ff', color: '#4f46e5',
                                                                        cursor: busyJob === job.job_id ? 'wait' : 'pointer',
                                                                    }}
                                                                >
                                                                    {busyJob === job.job_id ? 'Checking...' : 'Check status'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
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
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }

                .ocr-container { padding: 28px 24px 60px; }
                .ocr-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                @media (max-width: 768px) {
                    .ocr-container { padding: 20px 16px 80px; }
                    .ocr-header { flex-direction: column; align-items: flex-start; }
                }
            `}</style>
        </div>
    );
};

export default OcrInvoices;
