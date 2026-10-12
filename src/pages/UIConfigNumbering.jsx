import React, { useEffect, useRef, useState } from "react";
import { clientToken } from "@/axios";

/* Same style helpers as UIConfig, kept in sync by hand (they are duplicated
   verbatim in profile.jsx too — this is the house pattern). */
const inp = {
    width: '100%', padding: '10px 13px', fontSize: '14px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    outline: 'none', color: '#0f172a', background: '#f8fafc',
    fontFamily: "'Inter','Segoe UI',sans-serif", fontWeight: 600,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
};
const focIn = e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; e.target.style.background = 'white'; };
const focOut = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

const label = {
    fontSize: '12px', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
};

/**
 * Invoice numbering settings.
 *
 * Validation and preview are deliberately server-side (GET with a ?template=
 * query): re-implementing the token grammar here would let the UI preview
 * something the server then rejects.
 */
const UIConfigNumbering = ({ canManage, showToast }) => {
    const [cfg, setCfg] = useState(null);          // null while loading
    const [preview, setPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const templateRef = useRef(null);

    useEffect(() => {
        clientToken.get('invoice-numbering/')
            .then((r) => { setCfg(r.data); setPreview(r.data); })
            .catch(() => showToast('error', 'Failed to load invoice numbering.'));
    }, []);

    // Debounced live preview, same shape as the bill editor's debounce
    useEffect(() => {
        if (!cfg) return;
        const t = setTimeout(() => {
            clientToken.get('invoice-numbering/', {
                params: {
                    template: cfg.template,
                    reset_period: cfg.reset_period,
                    next_number: cfg.next_number,
                },
                suppressErrorToast: true,
            }).then((r) => setPreview(r.data)).catch(() => { });
        }, 300);
        return () => clearTimeout(t);
    }, [cfg?.template, cfg?.reset_period, cfg?.next_number]);

    if (!cfg) {
        return <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading invoice numbering…</p>;
    }

    const set = (patch) => setCfg((prev) => ({ ...prev, ...patch }));

    const insertToken = (token) => {
        const el = templateRef.current;
        if (!el) return set({ template: cfg.template + token });
        const start = el.selectionStart ?? cfg.template.length;
        const end = el.selectionEnd ?? start;
        const next = cfg.template.slice(0, start) + token + cfg.template.slice(end);
        set({ template: next });
        // restore the caret after React re-renders the controlled input
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + token.length, start + token.length);
        });
    };

    const save = () => {
        setSaving(true);
        clientToken.post('invoice-numbering/', {
            enabled: cfg.enabled,
            template: cfg.template,
            reset_period: cfg.reset_period,
            next_number: Number(cfg.next_number) || 1,
        }, { suppressErrorToast: true })
            .then((r) => {
                setCfg(r.data);
                setPreview(r.data);
                showToast('success', 'Invoice numbering saved.');
            })
            .catch((e) => showToast('error', e.response?.data?.error || 'Failed to save.'))
            .finally(() => setSaving(false));
    };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Invoice Numbering
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '640px' }}>

                {/* Enable */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: canManage ? 'pointer' : 'default' }}>
                    <input
                        type="checkbox"
                        checked={!!cfg.enabled}
                        disabled={!canManage}
                        onChange={(e) => set({ enabled: e.target.checked })}
                        style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#4f46e5' }}
                    />
                    <span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                            Automatically number new invoices
                        </span>
                        <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                            Applies to sales invoices only — a purchase bill keeps the vendor's own
                            number. You can always type over the generated number on any invoice.
                        </span>
                    </span>
                </label>

                {/* Template */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={label}>Number format</span>
                    <input
                        ref={templateRef}
                        value={cfg.template}
                        disabled={!canManage}
                        onChange={(e) => set({ template: e.target.value })}
                        onFocus={focIn} onBlur={focOut}
                        style={{ ...inp, fontFamily: "'SFMono-Regular',Consolas,monospace" }}
                    />

                    {/* Live preview / error */}
                    <div style={{
                        marginTop: '6px', padding: '12px 14px', background: '#f8fafc',
                        border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px',
                    }}>
                        {preview && preview.valid === false ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>{preview.error}</span>
                        ) : (
                            <>
                                <span style={{ color: '#64748b' }}>Next invoice will be </span>
                                <span style={{ color: '#15803d', fontWeight: 800, fontFamily: "'SFMono-Regular',Consolas,monospace" }}>
                                    {preview?.preview}
                                </span>
                                <span style={{ color: '#94a3b8' }}>
                                    {' '}({preview?.length} of {cfg.max_length} characters)
                                </span>
                                {preview?.gst_warning && (
                                    <span style={{ display: 'block', marginTop: '6px', color: '#b45309', fontWeight: 600 }}>
                                        ⚠️ GST tax invoice numbers are limited to {cfg.gst_recommended_max_length} characters.
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Token cheat-sheet, served by the API so it cannot drift
                        from what the validator accepts */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                        {(cfg.tokens || []).map((t) => (
                            <button
                                key={t.token}
                                type="button"
                                disabled={!canManage}
                                onClick={() => insertToken(t.token)}
                                title={`${t.label} — e.g. ${t.example}`}
                                style={{
                                    padding: '4px 9px', fontSize: '12px', fontWeight: 700,
                                    fontFamily: "'SFMono-Regular',Consolas,monospace",
                                    color: '#4f46e5', background: '#eef2ff',
                                    border: '1px solid #c7d2fe', borderRadius: '8px',
                                    cursor: canManage ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {t.token}
                            </button>
                        ))}
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        Anything outside the braces is used literally. Click a token to insert it.
                    </span>
                </div>

                {/* Reset + next number */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={label}>Restart counter</span>
                        <select
                            value={cfg.reset_period}
                            disabled={!canManage}
                            onChange={(e) => set({ reset_period: e.target.value })}
                            onFocus={focIn} onBlur={focOut}
                            style={inp}
                        >
                            {(cfg.reset_options || []).map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={label}>Next number</span>
                        <input
                            type="number" min="1"
                            value={cfg.next_number}
                            disabled={!canManage}
                            onChange={(e) => set({ next_number: e.target.value })}
                            onFocus={focIn} onBlur={focOut}
                            style={inp}
                        />
                    </div>
                </div>

                {cfg.updated_at && (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Last changed {new Date(cfg.updated_at).toLocaleString()}
                        {cfg.updated_by ? ` by ${cfg.updated_by}` : ''}
                    </span>
                )}

                {canManage && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={save}
                            disabled={saving || (preview && preview.valid === false)}
                            style={{
                                padding: '11px 26px', fontSize: '14px', fontWeight: 700, color: 'white',
                                background: (saving || (preview && preview.valid === false))
                                    ? '#c7d2fe' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                border: 'none', borderRadius: '12px',
                                cursor: (saving || (preview && preview.valid === false)) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Numbering'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default UIConfigNumbering;
