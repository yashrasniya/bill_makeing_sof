import React, { useState } from "react";
import { clientToken } from "@/axios";

const inputStyle = {
    width: '100%', padding: '10px 13px', fontSize: '14px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    outline: 'none', color: '#0f172a', background: '#f8fafc',
    fontFamily: 'Inter, sans-serif', fontWeight: 600,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
};
const onFocusIn = e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; e.target.style.background = 'white'; };
const onFocusOut = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

export default function CustomerDropdown({ companyName, InvoiceData, setRefresh, setInvoiceData }) {
    const [showPopup, setShowPopup] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone_number: '', address: '' });
    const [saving, setSaving] = useState(false);

    const handleAdd = () => {
        setSaving(true);
        const form = new FormData();
        Object.keys(newCustomer).forEach(key => form.append(key, newCustomer[key]));

        clientToken.post('companies/', form)
            .then(res => {
                if (res.status === 200) {
                    setNewCustomer({ name: '', phone_number: '', address: '' });
                    setRefresh(e => !e);
                    setShowPopup(false);
                }
            })
            .catch(e => alert(`Error: ${e.response?.status || e.message}`))
            .finally(() => setSaving(false));
    };

    return (
        <>
            {/* ── Inline selector row ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Customer
                </p>
                <div style={{ display: 'flex', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0', overflow: 'hidden', minWidth: '220px' }}>
                    <select
                        id="receiver"
                        value={InvoiceData?.receiver || ""}
                        style={{
                            flex: 1, padding: '9px 12px', border: 'none', outline: 'none',
                            background: 'transparent', fontFamily: 'Inter, sans-serif',
                            fontSize: '14px', fontWeight: 700, color: '#0f172a', cursor: 'pointer',
                        }}
                        onChange={e => {
                            if (e.target.value) {
                                setInvoiceData({ ...InvoiceData, receiver: e.target.value });
                                setRefresh(p => !p);
                            }
                        }}
                    >
                        <option value="">— Select customer —</option>
                        {companyName.map(obj => (
                            <option key={obj.id} value={obj.id}>{obj.name}</option>
                        ))}
                    </select>

                    {/* + Add button */}
                    <button
                        type="button"
                        onClick={() => setShowPopup(true)}
                        title="Add new customer"
                        style={{
                            padding: '0 14px', border: 'none',
                            borderLeft: '1.5px solid #e2e8f0',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: 'white', fontWeight: 900, fontSize: '18px',
                            cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                            transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Add Customer Popup ── */}
            {showPopup && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setShowPopup(false); }}
                >
                    <div style={{
                        background: 'white', borderRadius: '24px',
                        padding: '32px 28px', width: 'min(420px, 92vw)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                        position: 'relative',
                        animation: 'popIn 0.2s ease',
                    }}>
                        {/* Close */}
                        <button
                            type="button"
                            onClick={() => setShowPopup(false)}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: '#f1f5f9', border: 'none', borderRadius: '8px',
                                width: '32px', height: '32px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '16px', color: '#64748b',
                            }}
                        >✕</button>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '18px',
                            }}>👥</div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Add New Customer</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Fill in customer details below</p>
                            </div>
                        </div>

                        {/* Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                                    Customer Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="e.g. Acme Pvt. Ltd."
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    onFocus={onFocusIn} onBlur={onFocusOut}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                                    Mobile Number
                                </label>
                                <input
                                    type="text"
                                    name="phone_number"
                                    placeholder="e.g. 9876543210"
                                    value={newCustomer.phone_number}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                                    onFocus={onFocusIn} onBlur={onFocusOut}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                                    Address
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="e.g. 123, MG Road, Bangalore"
                                    value={newCustomer.address}
                                    onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                    onFocus={onFocusIn} onBlur={onFocusOut}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '22px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowPopup(false)}
                                style={{
                                    padding: '10px 20px', borderRadius: '10px',
                                    border: '1.5px solid #e2e8f0', background: 'white',
                                    color: '#374151', fontSize: '14px', fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={saving || !newCustomer.name}
                                style={{
                                    padding: '10px 24px', borderRadius: '10px',
                                    border: 'none',
                                    background: saving || !newCustomer.name
                                        ? 'linear-gradient(135deg, #a5b4fc, #c4b5fd)'
                                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: 'white', fontSize: '14px', fontWeight: 700,
                                    cursor: saving || !newCustomer.name ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                                    transition: 'opacity 0.15s',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}
                            >
                                {saving ? (
                                    <>
                                        <svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                            <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        Saving...
                                    </>
                                ) : '+ Add Customer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}
