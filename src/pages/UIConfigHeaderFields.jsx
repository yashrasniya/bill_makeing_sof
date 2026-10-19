import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { clientToken } from "@/axios";
import { fetchAccess } from "@/store/accessSlice";
import { GST_STATES } from "@/constants/gst";

/* Same style helpers as UIConfig / UIConfigNumbering, kept in sync by hand
   (the house pattern). */
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

const toggleLabel = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#334155' };
const box = { width: '18px', height: '18px', accentColor: '#4f46e5' };

/**
 * Which optional invoice header fields a company shows, and what a new
 * invoice starts with. Two independent questions per field: show it?
 * fill in a default? A hidden field with a default is still filled in, which
 * is the point for shops that always do the same thing.
 *
 * Rules and validation live on the server (invoice/header_config.py).
 */
const UIConfigHeaderFields = ({ canManage, showToast }) => {
    const [catalog, setCatalog] = useState(null);   // null while loading
    const [fields, setFields] = useState({});
    const [features, setFeatures] = useState(null); // { line_item_images: { available, enabled } }
    const dispatch = useDispatch();
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        clientToken.get('invoice-header-config/')
            .then((r) => { setCatalog(r.data.catalog); setFields(r.data.fields); setFeatures(r.data.features || null); })
            .catch(() => showToast('error', 'Failed to load invoice fields.'));
    }, []);

    if (!catalog) {
        return <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading invoice fields…</p>;
    }

    const patch = (key, change) => {
        setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...change } }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const save = () => {
        const problems = {};
        catalog.forEach((f) => {
            const entry = fields[f.key];
            const empty = entry.default === null || entry.default === undefined || String(entry.default).trim() === '';
            if (entry.use_default && empty) {
                problems[f.key] = f.type === 'text'
                    ? 'Enter the default text, or turn the default off.'
                    : 'Choose a default value, or turn the default off.';
            }
        });
        setErrors(problems);
        if (Object.keys(problems).length) return;

        setSaving(true);
        const body = { fields };
        if (features?.line_item_images?.available) {
            body.features = { line_item_images: !!features.line_item_images.enabled };
        }
        clientToken.post('invoice-header-config/', body, { suppressErrorToast: true })
            .then((r) => {
                setFields(r.data.fields);
                setFeatures(r.data.features || null);
                // the bill editor reads this from the access store
                dispatch(fetchAccess());
                showToast('success', 'Invoice fields saved.');
            })
            .catch((e) => showToast('error', e.response?.data?.error || 'Failed to save.'))
            .finally(() => setSaving(false));
    };

    const control = (f, entry) => {
        const common = {
            id: `hdr_default_${f.key}`,
            'aria-label': `Default ${f.label.toLowerCase()}`,
            disabled: !canManage,
            style: inp, onFocus: focIn, onBlur: focOut,
        };
        if (f.type === 'text') {
            return (
                <textarea
                    {...common}
                    rows={3}
                    maxLength={2000}
                    value={entry.default ?? ''}
                    onChange={(e) => patch(f.key, { default: e.target.value })}
                    style={{ ...inp, resize: 'vertical', fontWeight: 500 }}
                />
            );
        }
        const options = f.type === 'state'
            ? GST_STATES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` }))
            : f.options;
        return (
            <select
                {...common}
                value={entry.default ?? ''}
                onChange={(e) => patch(f.key, { default: e.target.value === '' ? null : (f.type === 'choice' ? e.target.value : Number(e.target.value)) })}
            >
                <option value="">Choose…</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        );
    };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Invoice Fields
                </span>
            </div>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b', maxWidth: '640px' }}>
                Choose which optional fields appear on the invoice, and what new invoices start with.
                A hidden field with a default is still filled in. Changing this never alters invoices you have already made.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px' }}>
                {catalog.map((f) => {
                    const entry = fields[f.key];
                    return (
                        <div key={f.key} style={{ border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{f.label}</div>
                            {f.help && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{f.help}</div>}

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px', marginTop: '12px' }}>
                                <label style={toggleLabel}>
                                    <input
                                        type="checkbox"
                                        style={box}
                                        checked={!!entry.visible}
                                        disabled={!canManage}
                                        onChange={(e) => patch(f.key, { visible: e.target.checked })}
                                    />
                                    Show on invoice
                                </label>
                                <label style={toggleLabel}>
                                    <input
                                        type="checkbox"
                                        style={box}
                                        checked={!!entry.use_default}
                                        disabled={!canManage}
                                        onChange={(e) => patch(f.key, { use_default: e.target.checked })}
                                    />
                                    Fill in a default for new invoices
                                </label>
                            </div>

                            {entry.use_default && (
                                <div style={{ marginTop: '12px' }}>
                                    <label htmlFor={`hdr_default_${f.key}`} style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                        Default value
                                    </label>
                                    {control(f, entry)}
                                    {errors[f.key] && (
                                        <div role="alert" style={{ fontSize: '13px', color: '#b91c1c', marginTop: '6px' }}>{errors[f.key]}</div>
                                    )}
                                    {!entry.visible && (
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                            Hidden, so the editor won't show it, but new invoices still get this value.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {features?.line_item_images?.available && (
                    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Line item images</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            Let line items carry an attached photo on invoices. Off by default.
                        </div>
                        <label style={{ ...toggleLabel, marginTop: '12px' }}>
                            <input
                                type="checkbox"
                                style={box}
                                checked={!!features.line_item_images.enabled}
                                disabled={!canManage}
                                onChange={(e) => setFeatures((prev) => ({
                                    ...prev,
                                    line_item_images: { ...prev.line_item_images, enabled: e.target.checked },
                                }))}
                            />
                            Allow photos on line items
                        </label>
                    </div>
                )}

                {canManage ? (
                    <div>
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            style={{
                                padding: '10px 24px', fontSize: '14px', fontWeight: 700, color: 'white',
                                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none',
                                borderRadius: '10px', cursor: saving ? 'wait' : 'pointer',
                                boxShadow: '0 4px 14px rgba(79,70,229,0.25)',
                                fontFamily: "'Inter','Segoe UI',sans-serif",
                            }}
                        >
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                ) : (
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                        You can view these settings, but only people who manage templates can change them.
                    </p>
                )}
            </div>
        </>
    );
};

export default UIConfigHeaderFields;
