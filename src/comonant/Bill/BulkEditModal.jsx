import React, { useMemo, useState } from "react";
import { clientToken } from "@/axios";

const formatHeaderTitle = (title) => {
    if (!title) return '';
    return title.replace(/_/g, ' ').replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
};

/* Build { [productId]: { [fieldId]: value } } from the rows coming off the API */
const buildDrafts = (rows, fields) => {
    const drafts = {};
    rows.forEach((row) => {
        const values = {};
        fields.forEach((f) => {
            const prop = row.product_properties?.find(
                (p) => +p.new_product_in_frontend?.id === +f.id
            );
            values[f.id] = prop ? (prop.value ?? '') : '';
        });
        drafts[row.id] = values;
    });
    return drafts;
};

/* A blank row seeded with each field's configured default, matching what the
   single-product popup starts from. */
const blankValues = (fields) => {
    const values = {};
    fields.forEach((f) => { values[f.id] = f.default_value || ''; });
    return values;
};

/**
 * Spreadsheet-style editor for every line item on the invoice at once.
 * Existing rows push only the cells the user actually touched; rows added here
 * are created on save.
 */
const BulkEditModal = ({
    rows,
    billBodyItems,
    invoiceId,
    calculateProductTotals,
    onClose,
    onSaved,
    showToast,
}) => {
    const fields = useMemo(
        () => [...billBodyItems].sort((a, b) => a.id - b.id),
        [billBodyItems]
    );

    // the modal is mounted only while open, so a cancelled edit never leaks
    // into the next session
    const [drafts, setDrafts] = useState(() => buildDrafts(rows, fields));
    // rows added in this session, keyed by a temporary client-side id
    const [newKeys, setNewKeys] = useState([]);
    const [nextKey, setNextKey] = useState(1);
    const [saving, setSaving] = useState(false);
    const [fillField, setFillField] = useState('');
    const [fillValue, setFillValue] = useState('');

    const allKeys = [...rows.map((r) => r.id), ...newKeys];

    const setCell = (key, field, value) => {
        // calculable columns only accept numbers, same rule as the single-row popup
        if (field.is_calculable && value !== '' && isNaN(value)) return;
        setDrafts((prev) => ({
            ...prev,
            [key]: { ...prev[key], [field.id]: value },
        }));
    };

    const addRow = () => {
        const key = `new_${nextKey}`;
        setNextKey((n) => n + 1);
        setNewKeys((prev) => [...prev, key]);
        setDrafts((prev) => ({ ...prev, [key]: blankValues(fields) }));
    };

    const removeNewRow = (key) => {
        setNewKeys((prev) => prev.filter((k) => k !== key));
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const applyToAll = () => {
        const field = fields.find((f) => +f.id === +fillField);
        if (!field) return;
        if (field.is_calculable && fillValue !== '' && isNaN(fillValue)) {
            showToast(`${formatHeaderTitle(field.input_title)} must be a number`, 'warning');
            return;
        }
        setDrafts((prev) => {
            const next = { ...prev };
            allKeys.forEach((key) => {
                next[key] = { ...next[key], [field.id]: fillValue };
            });
            return next;
        });
    };

    /* live totals — mirrors what the table shows once the rows are saved */
    const rowTotals = (key) => {
        const values = drafts[key] || {};
        const props = fields.map((f) => ({
            value: values[f.id] ?? '',
            new_product_in_frontend: f,
        }));
        const t = calculateProductTotals(props);
        // the API's DecimalField rejects NaN, which an empty/odd row can produce
        const safe = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0).toFixed(2);
        return { gst_amount: safe(t.gst_amount), total_amount: safe(t.total_amount) };
    };

    const isBlank = (key) =>
        fields.every((f) => `${drafts[key]?.[f.id] ?? ''}`.trim() === '');

    const changedRows = rows.filter((row) => {
        const original = buildDrafts([row], fields)[row.id];
        const current = drafts[row.id] || {};
        return fields.some((f) => `${current[f.id] ?? ''}` !== `${original[f.id] ?? ''}`);
    });
    // an untouched blank row the user added and never filled is simply dropped
    const rowsToCreate = newKeys.filter((key) => !isBlank(key));

    const grand = allKeys.reduce(
        (acc, key) => {
            const t = rowTotals(key);
            acc.total += parseFloat(t.total_amount) || 0;
            acc.gst += parseFloat(t.gst_amount) || 0;
            return acc;
        },
        { total: 0, gst: 0 }
    );

    const saveRow = async (row) => {
        const original = buildDrafts([row], fields)[row.id];
        const current = drafts[row.id] || {};
        const totals = rowTotals(row.id);

        // property writes are sequenced per product so newly created ones can
        // be attached together in the single closing update below
        const createdPropertyIds = [];
        for (const field of fields) {
            const value = current[field.id] ?? '';
            if (`${value}` === `${original[field.id] ?? ''}`) continue;

            const prop = row.product_properties?.find(
                (p) => +p.new_product_in_frontend?.id === +field.id
            );

            if (prop?.id !== undefined) {
                const form = new FormData();
                form.append('value', value);
                await clientToken.post(`product/properties/${prop.id}/update/`, form);
            } else if (value !== '') {
                const form = new FormData();
                form.append('new_product_in_frontend', field.id);
                form.append('value', value);
                const res = await clientToken.post('product/properties/', form);
                if (res.status === 200) createdPropertyIds.push(res.data.id);
            }
        }

        // ProductSerializer is a full (non-partial) update — gst_amount and
        // total_amount are required on every write, including the one that
        // attaches new properties (the view splits the list on commas)
        const productForm = new FormData();
        productForm.append('gst_amount', totals.gst_amount);
        productForm.append('total_amount', totals.total_amount);
        if (createdPropertyIds.length) {
            productForm.append('product_properties', createdPropertyIds.join(','));
        }
        await clientToken.post(`product/${row.id}/update/`, productForm);
    };

    const createRow = async (key) => {
        const values = drafts[key] || {};
        const totals = rowTotals(key);

        // same three-step dance the single-product popup performs:
        // create the product, attach it to the invoice, then add its properties
        const form = new FormData();
        form.append('product_properties', '');
        form.append('gst_amount', totals.gst_amount);
        form.append('total_amount', totals.total_amount);
        const created = await clientToken.post('product/', form);
        const productId = created.data.id;

        await clientToken.post(`invoice/${invoiceId}/product/add/`,
            { product_id: productId });

        const createdPropertyIds = [];
        for (const field of fields) {
            const value = values[field.id] ?? '';
            if (`${value}`.trim() === '') continue;
            const propForm = new FormData();
            propForm.append('new_product_in_frontend', field.id);
            propForm.append('value', value);
            const res = await clientToken.post('product/properties/', propForm);
            if (res.status === 200) createdPropertyIds.push(res.data.id);
        }

        if (createdPropertyIds.length) {
            const productForm = new FormData();
            productForm.append('product_properties', createdPropertyIds.join(','));
            productForm.append('gst_amount', totals.gst_amount);
            productForm.append('total_amount', totals.total_amount);
            await clientToken.post(`product/${productId}/update/`, productForm);
        }
    };

    const pending = changedRows.length + rowsToCreate.length;

    const handleSave = async () => {
        if (pending === 0) {
            showToast('No changes to save', 'warning');
            return;
        }
        setSaving(true);
        const results = await Promise.allSettled([
            ...changedRows.map(saveRow),
            ...rowsToCreate.map(createRow),
        ]);
        setSaving(false);

        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed) {
            console.error(results.filter((r) => r.status === 'rejected'));
            showToast(`${failed} of ${pending} line items failed to save`, 'error');
        } else {
            const bits = [];
            if (changedRows.length) bits.push(`${changedRows.length} updated`);
            if (rowsToCreate.length) bits.push(`${rowsToCreate.length} added`);
            showToast(`Line items: ${bits.join(', ')}`, 'success');
        }
        onSaved();
        onClose();
    };

    const cellStyle = {
        width: '100%', minWidth: '110px', padding: '7px 9px',
        border: '1.5px solid #e2e8f0', borderRadius: '8px',
        fontSize: '13px', color: '#0f172a', outline: 'none',
        background: 'white', boxSizing: 'border-box',
    };
    const headCellStyle = {
        padding: '8px 10px', fontSize: '11px', fontWeight: 700,
        color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
        textAlign: 'left', whiteSpace: 'nowrap', background: '#f8fafc',
        position: 'sticky', top: 0, zIndex: 1,
    };
    const ghostBtn = {
        padding: '8px 16px', fontSize: '13px', fontWeight: 700,
        color: '#4f46e5', background: 'white',
        border: '1.5px solid #c7d2fe', borderRadius: '10px', cursor: 'pointer',
    };

    const renderRow = (key, index, isNew) => {
        const totals = rowTotals(key);
        return (
            <tr key={key} style={isNew ? { background: '#f5f3ff' } : undefined}>
                <td style={{ padding: '6px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
                    {isNew ? (
                        <button
                            type="button"
                            onClick={() => removeNewRow(key)}
                            title="Remove this new row"
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#ef4444', fontSize: '14px', fontWeight: 700, padding: 0,
                            }}
                        >✕</button>
                    ) : index + 1}
                </td>
                {fields.map((f) => (
                    <td key={f.id} style={{ padding: '6px' }}>
                        {f.presets ? (
                            <select
                                value={drafts[key]?.[f.id] ?? ''}
                                onChange={(e) => setCell(key, f, e.target.value)}
                                style={cellStyle}
                            >
                                <option value="">--</option>
                                {f.presets.split(',').map((p) => (
                                    <option key={p.trim()} value={p.trim()}>{p.trim()}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={drafts[key]?.[f.id] ?? ''}
                                onChange={(e) => setCell(key, f, e.target.value)}
                                style={cellStyle}
                            />
                        )}
                    </td>
                ))}
                <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                    {totals.gst_amount}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {totals.total_amount}
                </td>
            </tr>
        );
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <div style={{
                background: 'white', borderRadius: '20px', padding: '24px',
                width: 'min(1100px, 95vw)', maxHeight: '92vh',
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                            Bulk Edit Line Items
                        </h3>
                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                            {rows.length === 0
                                ? 'No line items yet — use Add Row to create them.'
                                : `Editing ${rows.length} line item${rows.length === 1 ? '' : 's'} — only changed cells are saved.`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* fill a single column across every row being edited */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', background: '#f8fafc', borderRadius: '12px',
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Apply to all
                    </span>
                    <select
                        value={fillField}
                        onChange={(e) => setFillField(e.target.value)}
                        style={{ ...cellStyle, width: 'auto', minWidth: '170px' }}
                    >
                        <option value="">Select a column…</option>
                        {fields.map((f) => (
                            <option key={f.id} value={f.id}>{formatHeaderTitle(f.input_title)}</option>
                        ))}
                    </select>
                    <input
                        value={fillValue}
                        onChange={(e) => setFillValue(e.target.value)}
                        placeholder="Value"
                        style={{ ...cellStyle, width: 'auto', minWidth: '150px' }}
                    />
                    <button
                        onClick={applyToAll}
                        disabled={!fillField}
                        style={{
                            ...ghostBtn,
                            color: fillField ? '#4f46e5' : '#94a3b8',
                            border: `1.5px solid ${fillField ? '#c7d2fe' : '#e2e8f0'}`,
                            cursor: fillField ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Apply
                    </button>
                </div>

                <div style={{ overflow: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ ...headCellStyle, width: '44px', textAlign: 'center' }}>#</th>
                                {fields.map((f) => (
                                    <th key={f.id} style={headCellStyle}>{formatHeaderTitle(f.input_title)}</th>
                                ))}
                                <th style={{ ...headCellStyle, textAlign: 'right' }}>GST Amt</th>
                                <th style={{ ...headCellStyle, textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => renderRow(row.id, index, false))}
                            {newKeys.map((key, i) => renderRow(key, rows.length + i, true))}
                        </tbody>
                    </table>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={addRow}
                        disabled={!invoiceId}
                        title={invoiceId ? 'Add a blank line item'
                            : 'Save the invoice before adding line items'}
                        style={{
                            ...ghostBtn,
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            color: invoiceId ? '#4f46e5' : '#94a3b8',
                            border: `1.5px dashed ${invoiceId ? '#c7d2fe' : '#e2e8f0'}`,
                            cursor: invoiceId ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add Row
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        <strong style={{ color: '#0f172a' }}>{changedRows.length}</strong> changed ·
                        {' '}<strong style={{ color: '#0f172a' }}>{rowsToCreate.length}</strong> new ·
                        {' '}GST ₹{grand.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ·
                        {' '}Total ₹{grand.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            disabled={saving}
                            style={{
                                padding: '9px 18px', fontSize: '14px', fontWeight: 600, color: '#64748b',
                                background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || pending === 0}
                            style={{
                                padding: '9px 24px', fontSize: '14px', fontWeight: 700, color: 'white',
                                background: saving || pending === 0
                                    ? '#c7d2fe' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                border: 'none', borderRadius: '10px',
                                cursor: saving || pending === 0 ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 14px rgba(79,70,229,0.2)',
                            }}
                        >
                            {saving ? 'Saving…' : 'Save All'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkEditModal;
