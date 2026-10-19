import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clientToken } from "@/axios";
import { fetchUser } from "@/store/userSlice";

/* First-run pieces for the Home page. They mirror the mobile app's Home: a soft "confirm your email" reminder and a
   "Get set up" checklist driven by the same `onboarding/` endpoint (the server ticks steps off from real data). */

const card = {
    background: 'white', borderRadius: '20px', padding: '22px 24px', marginBottom: '20px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
};
const linkBtn = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontSize: '13px', fontWeight: 700, color: '#4f46e5',
};

/** Soft reminder (not a gate). Only a definite `false` counts so an older server never nags everyone. */
export function VerifyEmailBanner() {
    const dispatch = useDispatch();
    const { userInfo } = useSelector(s => s.user);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');

    if (!userInfo?.email || userInfo.email_verified !== false) return null;

    const resend = async () => {
        setBusy(true); setNote('');
        try {
            const { data } = await clientToken.post('resend-verification/');
            setNote(data.email_verified ? 'Your email is already confirmed.' : `We sent a link to ${data.sent_to}.`);
        } catch (e) {
            setNote(e.response?.data?.detail || 'Could not send the email. Try again in a minute.');
        } finally { setBusy(false); }
    };

    const check = async () => {
        setBusy(true); setNote('');
        try {
            const user = await dispatch(fetchUser()).unwrap();
            if (user.email_verified === false) setNote('Not verified yet. Open the link in the email we sent, then check again.');
        } catch { setNote('Could not check right now.'); }
        finally { setBusy(false); }
    };

    return (
        <div style={{
            background: '#fef3c7', border: '1px solid #fef3c7', borderRadius: '16px',
            padding: '14px 18px', marginBottom: '20px', animation: 'fadeUp 0.4s ease both',
        }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400e' }}>Confirm your email</div>
            <div style={{ fontSize: '13px', color: '#a16207', margin: '4px 0 10px' }}>
                We sent a link to {userInfo.email}. It keeps your account safe and lets you recover it.
            </div>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', opacity: busy ? 0.5 : 1 }}>
                <button style={linkBtn} disabled={busy} onClick={resend}>Resend email</button>
                <button style={linkBtn} disabled={busy} onClick={check}>I&apos;ve verified</button>
                {note && <span style={{ fontSize: '12px', color: '#92400e' }}>{note}</span>}
            </div>
        </div>
    );
}

const STEP_ROUTE = { customer: '/Customers', invoice: '/newbill', share: '/bill_list' };
const STEP_HINT = {
    company: 'Name, address and GST details are saved.',
    customer: 'Who you bill. You can import them later.',
    invoice: 'Pick a template and add your items.',
    share: 'Send the PDF or a WhatsApp link.',
};

/** "Get set up" card. `data` is the `onboarding/` payload; the parent owns the fetch so it can also react to it. */
export function FirstRunChecklist({ data, onDismissed, can }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    if (!data?.visible) return null;

    const allowed = (k) => (k === 'customer' ? can('customer.manage') : k === 'invoice' ? can('invoice.create') : true);
    const steps = data.steps.filter(s => s.done || allowed(s.key));
    const doneCount = steps.filter(s => s.done).length;
    const next = steps.find(s => !s.done);
    const pct = (doneCount / Math.max(steps.length, 1)) * 100;

    const dismiss = async () => {
        setBusy(true);
        try {
            const { data: fresh } = await clientToken.post('onboarding/', { dismiss: true });
            onDismissed(fresh);
        } catch { /* keep the card; the user can retry */ }
        finally { setBusy(false); }
    };

    return (
        <div style={{ ...card, animation: 'fadeUp 0.5s ease 0.05s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ flex: 1, fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>Get set up</h2>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{doneCount} of {steps.length} done</span>
                <button onClick={dismiss} disabled={busy} title="Hide checklist" aria-label="Hide checklist"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: '#eef2ff', overflow: 'hidden', margin: '14px 0 6px' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#4f46e5', transition: 'width 0.4s' }} />
            </div>
            {steps.map(s => {
                const isNext = next?.key === s.key;
                const route = STEP_ROUTE[s.key];
                const clickable = !s.done && route;
                return (
                    <div key={s.key}
                        onClick={clickable ? () => navigate(route) : undefined}
                        role={clickable ? 'button' : undefined}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 10px',
                            borderTop: '1px solid #f1f5f9', borderRadius: '10px',
                            background: isNext ? '#f5f3ff' : 'transparent',
                            cursor: clickable ? 'pointer' : 'default',
                        }}>
                        <span style={{
                            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                            border: s.done ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                            background: s.done ? '#dcfce7' : 'transparent', color: '#16a34a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800,
                        }}>{s.done ? '✓' : ''}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '15px', fontWeight: isNext ? 800 : 600,
                                color: s.done ? '#94a3b8' : '#1e293b',
                                textDecoration: s.done ? 'line-through' : 'none',
                            }}>{s.title}</div>
                            {!s.done && STEP_HINT[s.key] && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{STEP_HINT[s.key]}</div>
                            )}
                        </div>
                        {isNext && <span style={{ color: '#4f46e5', fontWeight: 800, fontSize: '13px' }}>Start →</span>}
                    </div>
                );
            })}
        </div>
    );
}

/** Greyed-out stat tiles so a brand-new user sees what the dashboard will become. */
export function SkeletonKpis() {
    const tiles = [
        { label: 'Sales', sub: 'Your billing this month' },
        { label: 'Outstanding', sub: 'Waiting to be paid' },
        { label: 'Overdue', sub: 'Past their due date' },
        { label: 'GST collected', sub: 'Output tax on sales' },
    ];
    return (
        <div style={{ marginBottom: '16px' }}>
            <div className="inv_kpis" style={{ marginBottom: 0 }}>
                {tiles.map(t => (
                    <div key={t.label} className="inv_kpi" style={{ border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                        <span style={{ color: '#94a3b8' }}>{t.label}</span>
                        <strong style={{ color: '#cbd5e1' }}>₹0</strong>
                        <small style={{ color: '#94a3b8' }}>{t.sub}</small>
                    </div>
                ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', margin: '12px 0 0' }}>
                These fill in automatically as soon as you raise your first bill.
            </p>
        </div>
    );
}
