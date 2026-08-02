import Navbar from "../comonant/navbar.jsx";
import { useState, useEffect, useMemo } from "react";
import { clientToken } from "@/axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

/* ─────────────────────────── formatting ─────────────────────────── */

const RANGES = [
    { key: 'this_month', label: 'This month' },
    { key: 'last_month', label: 'Last month' },
    { key: 'last_30', label: 'Last 30 days' },
    { key: 'this_fy', label: 'This FY' },
];

/** Indian-style short money: ₹1.2L, ₹3.4Cr — full value stays in the tooltip. */
function money(n, { short = false } = {}) {
    const v = Number(n || 0);
    if (short) {
        if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
        if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
        if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
    }
    return `₹${v.toLocaleString('en-IN')}`;
}

const STATUS_STYLE = {
    paid: { bg: '#dcfce7', fg: '#15803d', label: 'Paid' },
    partially_paid: { bg: '#fef3c7', fg: '#b45309', label: 'Partial' },
    unpaid: { bg: '#e0e7ff', fg: '#4338ca', label: 'Unpaid' },
    overdue: { bg: '#fee2e2', fg: '#b91c1c', label: 'Overdue' },
};

function StatusChip({ status }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.unpaid;
    return (
        <span style={{
            background: s.bg, color: s.fg, fontSize: '11px', fontWeight: 700,
            padding: '3px 9px', borderRadius: '99px', whiteSpace: 'nowrap',
        }}>{s.label}</span>
    );
}

/* ─────────────────────────── primitives ─────────────────────────── */

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

/**
 * KPI card.
 * `pct === null` means "no comparable previous period" — we show a neutral
 * "New" pill instead of inventing a growth number.
 */
function KpiCard({ icon, label, value, title, sub, pct, color, delay = 0, onClick }) {
    const hasPct = pct !== undefined && pct !== null;
    const isPos = (pct || 0) >= 0;
    const clickable = typeof onClick === 'function';
    return (
        <div
            onClick={onClick}
            title={title}
            style={{
                background: color,
                borderRadius: '20px',
                padding: '24px 22px 20px',
                flex: 1,
                minWidth: '200px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                position: 'relative',
                overflow: 'hidden',
                animation: `fadeUp 0.5s ease ${delay}s both`,
                cursor: clickable ? 'pointer' : 'default',
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

            {pct !== undefined && (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    marginTop: '10px', padding: '3px 10px', borderRadius: '99px',
                    background: !hasPct ? 'rgba(255,255,255,0.15)'
                        : isPos ? 'rgba(255,255,255,0.2)' : 'rgba(252,165,165,0.25)',
                    fontSize: '12px', fontWeight: 700, color: 'white',
                }}>
                    {hasPct ? `${isPos ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}%` : 'No prior period'}
                </div>
            )}

            {hasPct && <MiniBar pct={pct} positive={isPos} />}

            {sub && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '8px' }}>{sub}</div>
            )}
        </div>
    );
}

function QuickAction({ icon, label, onClick, accent }) {
    return (
        <button
            onClick={onClick}
            className="quick-action-btn"
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

function Panel({ title, action, children, delay = 0, style }) {
    return (
        <div style={{
            background: 'white', borderRadius: '20px', padding: '20px 24px 22px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            animation: `fadeUp 0.5s ease ${delay}s both`,
            display: 'flex', flexDirection: 'column',
            ...style,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                    {title}
                </p>
                {action}
            </div>
            {children}
        </div>
    );
}

function LinkBtn({ label, onClick }) {
    return (
        <button onClick={onClick} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '12px', fontWeight: 700, color: '#4f46e5', whiteSpace: 'nowrap',
        }}>{label} →</button>
    );
}

function EmptyNote({ children }) {
    return (
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0', textAlign: 'center', padding: '18px 0' }}>
            {children}
        </p>
    );
}

/* ─────────────────────── sales trend (inline SVG) ─────────────────────── */

function TrendChart({ data }) {
    const max = Math.max(...data.map(d => d.total), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '170px', paddingTop: '8px' }}>
            {data.map((d, i) => {
                const h = Math.max((d.total / max) * 130, d.total > 0 ? 4 : 2);
                const isLast = i === data.length - 1;
                return (
                    <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                         title={`${d.label}: ${money(d.total)} · ${d.count} invoice${d.count === 1 ? '' : 's'}`}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                            {d.total > 0 ? money(d.total, { short: true }) : ''}
                        </span>
                        <div style={{
                            width: '100%', maxWidth: '46px', height: `${h}px`, borderRadius: '8px 8px 4px 4px',
                            background: isLast
                                ? 'linear-gradient(180deg, #4f46e5 0%, #6d28d9 100%)'
                                : '#e0e7ff',
                            transition: 'height 0.6s ease',
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: isLast ? '#4f46e5' : '#94a3b8' }}>{d.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ─────────────────────────────── page ─────────────────────────────── */

const EMPTY_INFO = {
    name: '',
    month_total_final_amount: 0,
    month_gst_final_amount: 0,
    percentage_change: null,
    percentage_gst_amount: null,
    invoices_this_month_count: 0,
    invoices_prv_month_count: 0,
    receivable_amount: 0,
    receivable_count: 0,
    overdue_amount: 0,
    overdue_count: 0,
    range_label: '',
    has_any_invoice: true,   // assume yes until told otherwise, so we don't flash the empty state
};

const EMPTY_EXTRAS = {
    trend: [], recent_invoices: [], top_customers: [],
    low_stock: [], payment_methods: [], gst_due: [],
};

function Home() {
    const [info, setInfo] = useState(EMPTY_INFO);
    const [extras, setExtras] = useState(EMPTY_EXTRAS);
    const [range, setRange] = useState('this_month');
    const [loaded, setLoaded] = useState(false);

    const navigate = useNavigate();
    const { userInfo } = useSelector(s => s.user);
    const { permissions, features, isTenantAdmin, status: accessStatus } = useSelector(s => s.access);

    // show everything while access info loads; filter once it's known
    const can = (perm) => accessStatus !== 'succeeded' || permissions.includes(perm);
    const hasFeat = (f) => accessStatus !== 'succeeded' || features.includes(f);
    const isAdmin = accessStatus !== 'succeeded' || isTenantAdmin || userInfo?.is_company_admin;
    const showKpis = can('invoice.view');
    // report pages are guarded by BOTH the feature and the permission —
    // mirror that here so we never link somewhere the user just bounces off
    const canReport = can('report.view') && hasFeat('advanced_reports');
    const canInventory = can('inventory.manage') && hasFeat('inventory');

    useEffect(() => {
        let alive = true;
        clientToken.get(`user_info/?range=${range}`).then(r => {
            if (alive && r.status === 200) setInfo({ ...EMPTY_INFO, ...r.data });
        }).catch(() => { }).finally(() => { if (alive) setLoaded(true); });
        return () => { alive = false; };
    }, [range]);

    useEffect(() => {
        let alive = true;
        clientToken.get(`dashboard/?range=${range}`).then(r => {
            if (alive && r.status === 200) setExtras({ ...EMPTY_EXTRAS, ...r.data });
        }).catch(() => { });
        return () => { alive = false; };
    }, [range]);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // first-run: account exists but nothing has ever been billed
    const isNewUser = loaded && showKpis && info.has_any_invoice === false;

    const nextGst = useMemo(() => (extras.gst_due || [])[0], [extras.gst_due]);
    const trendHasData = (extras.trend || []).some(d => d.total > 0);
    const topCustomerMax = (extras.top_customers[0]?.total) || 1;

    const goToInvoices = (query) => navigate(query ? `/bill_list?${query}` : '/bill_list');

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            <Navbar />

            <div className="home-container" style={{ maxWidth: '1280px', margin: '0 auto' }}>

                {/* ── Welcome strip ── */}
                <div className="welcome-strip" style={{
                    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)',
                    borderRadius: '24px',
                    marginBottom: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 12px 40px rgba(79,70,229,0.3)',
                    animation: 'fadeUp 0.4s ease both',
                }}>
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
                            {isNewUser
                                ? "Let's get your first bill out the door."
                                : `Here's your business snapshot${info.range_label ? ` for ${info.range_label}` : ''}.`}
                        </p>
                    </div>

                    {can('invoice.create') && <button
                        onClick={() => navigate('/newBill')}
                        className="welcome-strip-btn"
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
                    </button>}
                </div>

                {/* ── Range selector ── */}
                {showKpis && !isNewUser && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {RANGES.map(r => (
                            <button
                                key={r.key}
                                onClick={() => setRange(r.key)}
                                style={{
                                    border: 'none', cursor: 'pointer',
                                    padding: '8px 16px', borderRadius: '99px',
                                    fontSize: '13px', fontWeight: 700,
                                    background: range === r.key ? '#4f46e5' : 'white',
                                    color: range === r.key ? 'white' : '#64748b',
                                    boxShadow: range === r.key
                                        ? '0 4px 12px rgba(79,70,229,0.3)'
                                        : '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'all 0.15s',
                                }}
                            >{r.label}</button>
                        ))}
                    </div>
                )}

                {/* ── First-run empty state (replaces the zero-filled cards) ── */}
                {isNewUser && (
                    <div style={{
                        background: 'white', borderRadius: '20px', padding: '48px 24px',
                        textAlign: 'center', marginBottom: '28px',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                        animation: 'fadeUp 0.5s ease 0.05s both',
                    }}>
                        <div style={{ fontSize: '44px', marginBottom: '12px' }}>🧾</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                            No invoices yet
                        </h2>
                        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '420px', margin: '0 auto 20px' }}>
                            Your sales, GST and outstanding payments will show up here as soon as
                            you raise your first bill.
                        </p>
                        {can('invoice.create') && (
                            <button onClick={() => navigate('/newBill')} style={{
                                background: '#4f46e5', color: 'white', border: 'none',
                                padding: '12px 28px', borderRadius: '14px', cursor: 'pointer',
                                fontSize: '14px', fontWeight: 800,
                                boxShadow: '0 4px 16px rgba(79,70,229,0.35)',
                            }}>Create your first bill</button>
                        )}
                    </div>
                )}

                {/* ── KPI Cards ── */}
                {showKpis && !isNewUser && <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
                    <KpiCard
                        icon="💰"
                        label={`Sales · ${info.range_label || 'this month'}`}
                        value={money(info.month_total_final_amount)}
                        pct={info.percentage_change}
                        sub={`${info.invoices_this_month_count || 0} invoice${info.invoices_this_month_count === 1 ? '' : 's'} · prev ${info.invoices_prv_month_count || 0}`}
                        color="linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)"
                        delay={0.05}
                        onClick={() => goToInvoices()}
                    />
                    <KpiCard
                        icon="⏳"
                        label="Outstanding"
                        value={money(info.receivable_amount)}
                        title="Billed but not yet received, net of part-payments"
                        sub={`${info.receivable_count || 0} bill${info.receivable_count === 1 ? '' : 's'} awaiting payment`}
                        color="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                        delay={0.1}
                        onClick={() => goToInvoices('status_group=open')}
                    />
                    <KpiCard
                        icon={info.overdue_amount > 0 ? '🚨' : '✅'}
                        label="Overdue"
                        value={money(info.overdue_amount)}
                        title={info.overdue_after_days
                            ? `Unpaid for more than ${info.overdue_after_days} days, or marked overdue`
                            : undefined}
                        sub={info.overdue_count
                            ? `${info.overdue_count} bill${info.overdue_count === 1 ? '' : 's'} unpaid ${info.overdue_after_days}+ days — chase these`
                            : 'Nothing past due. Nice.'}
                        color={info.overdue_amount > 0
                            ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}
                        delay={0.15}
                        onClick={() => goToInvoices('status_group=overdue')}
                    />
                    <KpiCard
                        icon="🧾"
                        label="GST collected"
                        value={money(info.month_gst_final_amount)}
                        pct={info.percentage_gst_amount}
                        sub={nextGst
                            ? `${nextGst.form} due in ${nextGst.days_left} day${nextGst.days_left === 1 ? '' : 's'}`
                            : 'Output tax on sales'}
                        color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        delay={0.2}
                        onClick={canReport ? () => navigate('/gst-summary') : undefined}
                    />
                </div>}

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
                        {can('invoice.create') && <QuickAction icon="➕" label="New Bill" onClick={() => navigate('/newBill')} accent="#4f46e5" />}
                        {hasFeat('template_designer') && can('template.manage') && <QuickAction icon="📋" label="Templates" onClick={() => navigate('/available-templates')} accent="#7c3aed" />}
                        {can('customer.manage') && <QuickAction icon="👥" label="Customers" onClick={() => navigate('/Customers')} accent="#0ea5e9" />}
                        {can('invoice.view') && <QuickAction icon="📂" label="All Invoices" onClick={() => navigate('/bill_list')} accent="#f43f5e" />}
                        {canReport && <QuickAction icon="📊" label="GST Summary" onClick={() => navigate('/gst-summary')} accent="#10b981" />}
                        {isAdmin && <QuickAction icon="🏢" label="My Company" onClick={() => navigate('/CompanyForm')} accent="#f59e0b" />}
                        <QuickAction icon="👤" label="Profile" onClick={() => navigate('/profile')} accent="#ec4899" />
                    </div>
                </div>

                {!isNewUser && showKpis && (
                    <>
                        {/* ── Trend + recent activity ── */}
                        <div className="dash-grid" style={{ marginBottom: '28px' }}>
                            <Panel
                                title="Sales — last 6 months"
                                delay={0.3}
                                action={canReport ? <LinkBtn label="Reports" onClick={() => navigate('/sales-register')} /> : null}
                                style={{ flex: '1 1 460px' }}
                            >
                                {trendHasData
                                    ? <TrendChart data={extras.trend} />
                                    : <EmptyNote>Not enough history yet — this fills in as you bill.</EmptyNote>}
                            </Panel>

                            <Panel
                                title="Recent invoices"
                                delay={0.35}
                                action={<LinkBtn label="View all" onClick={() => goToInvoices()} />}
                                style={{ flex: '1 1 380px' }}
                            >
                                {extras.recent_invoices.length === 0 && <EmptyNote>No invoices yet.</EmptyNote>}
                                {extras.recent_invoices.map(inv => (
                                    <div
                                        key={inv.id}
                                        onClick={() => navigate(`/invoice/${inv.id}/view`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {inv.customer}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                {inv.invoice_number}{inv.date ? ` · ${new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                            {money(inv.total)}
                                        </div>
                                        <StatusChip status={inv.payment_status} />
                                    </div>
                                ))}
                            </Panel>
                        </div>

                        {/* ── Customers / stock / payment mix ── */}
                        <div className="dash-grid">
                            {can('customer.manage') && (
                                <Panel
                                    title={`Top customers · ${info.range_label || 'this month'}`}
                                    delay={0.4}
                                    action={canReport ? <LinkBtn label="Ledger" onClick={() => navigate('/customer-ledger')} /> : null}
                                    style={{ flex: '1 1 320px' }}
                                >
                                    {extras.top_customers.length === 0 && <EmptyNote>No customer sales in this period.</EmptyNote>}
                                    {extras.top_customers.map((c, i) => {
                                        return (
                                            <div key={c.id} style={{ marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {i + 1}. {c.name}
                                                    </span>
                                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>{money(c.total, { short: true })}</span>
                                                </div>
                                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px' }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '99px',
                                                        width: `${Math.max((c.total / topCustomerMax) * 100, 3)}%`,
                                                        background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </Panel>
                            )}

                            {extras.low_stock.length > 0 && (
                                <Panel
                                    title="Low stock"
                                    delay={0.45}
                                    action={canInventory ? <LinkBtn label="Inventory" onClick={() => navigate('/inventory')} /> : null}
                                    style={{ flex: '1 1 320px' }}
                                >
                                    {extras.low_stock.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 0' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.sku}</div>
                                            </div>
                                            <span style={{
                                                background: p.current_stock <= 0 ? '#fee2e2' : '#fef3c7',
                                                color: p.current_stock <= 0 ? '#b91c1c' : '#b45309',
                                                fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                                                borderRadius: '99px', whiteSpace: 'nowrap',
                                            }}>
                                                {p.current_stock} left / reorder at {p.reorder_level}
                                            </span>
                                        </div>
                                    ))}
                                </Panel>
                            )}

                            {extras.payment_methods.length > 0 && (
                                <Panel title="How you got paid" delay={0.5} style={{ flex: '1 1 280px' }}>
                                    {extras.payment_methods.map(m => (
                                        <div key={m.method} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13px' }}>
                                            <span style={{ color: '#64748b', fontWeight: 600, textTransform: 'capitalize' }}>
                                                {m.method.replace('_', ' ')}
                                            </span>
                                            <span style={{ fontWeight: 800, color: '#1e293b' }}>{money(m.total, { short: true })}</span>
                                        </div>
                                    ))}
                                </Panel>
                            )}

                            {(extras.gst_due || []).length > 0 && (
                                <Panel
                                    title="GST filing"
                                    delay={0.55}
                                    action={canReport ? <LinkBtn label="Summary" onClick={() => navigate('/gst-summary')} /> : null}
                                    style={{ flex: '1 1 280px' }}
                                >
                                    {extras.gst_due.map(g => (
                                        <div key={g.form} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{g.form}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>for {g.period}</div>
                                            </div>
                                            <span style={{
                                                background: g.days_left <= 3 ? '#fee2e2' : '#f1f5f9',
                                                color: g.days_left <= 3 ? '#b91c1c' : '#475569',
                                                fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
                                            }}>
                                                {g.days_left === 0 ? 'Due today' : `${g.days_left}d left`}
                                            </span>
                                        </div>
                                    ))}
                                    <p style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '8px' }}>
                                        Standard deadlines. Confirm against the GST portal.
                                    </p>
                                </Panel>
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

                .home-container {
                    padding: 28px 24px 60px;
                }
                .welcome-strip {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 28px 36px;
                }
                .dash-grid {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                    align-items: flex-start;
                }

                @media (max-width: 768px) {
                    .home-container {
                        padding: 20px 16px 80px;
                    }
                    .welcome-strip {
                        flex-direction: column;
                        align-items: flex-start;
                        padding: 24px 20px;
                        gap: 20px;
                    }
                    .welcome-strip-btn {
                        width: 100%;
                        justify-content: center;
                    }
                    .quick-action-btn {
                        flex: 1 1 calc(50% - 12px);
                    }
                    .dash-grid > div {
                        flex: 1 1 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}

export { Home };
