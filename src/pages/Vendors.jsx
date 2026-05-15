import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../comonant/navbar.jsx";
import { clientToken } from "@/axios";

/* ── shared input style ───────────────────────── */
const inp = {
    width: "100%", padding: "10px 14px", fontSize: "14px",
    border: "1.5px solid #e2e8f0", borderRadius: "12px",
    outline: "none", color: "#0f172a", background: "#f8fafc",
    fontFamily: "Inter, sans-serif", fontWeight: 600,
    transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
};
const focusIn  = e => { e.target.style.borderColor = "#4f46e5"; e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.12)"; e.target.style.background = "white"; };
const focusOut = e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none";  e.target.style.background = "#f8fafc"; };

const EMPTY = { name: "", phone_number: "", email: "", address: "", gst_number: "", state: "" };

/* ── Vendor card ──────────────────────────────── */
function VendorCard({ vendor, onDelete }) {
    const [confirm, setConfirm] = useState(false);
    return (
        <div style={{
            background: "white", borderRadius: "18px", padding: "20px 22px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #f1f5f9",
            transition: "box-shadow 0.2s, transform 0.2s", animation: "fadeUp 0.4s ease both",
            display: "flex", flexDirection: "column", gap: "8px",
        }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(79,70,229,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
            {/* avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{
                    width: "44px", height: "44px", borderRadius: "14px", flexShrink: 0,
                    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", fontWeight: 900, color: "white",
                }}>
                    {vendor.name?.[0]?.toUpperCase() || "V"}
                </div>
                <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>{vendor.name}</p>
                    {vendor.gst_number && (
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>GST: {vendor.gst_number}</p>
                    )}
                </div>
            </div>

            {/* details */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginTop: "4px" }}>
                {vendor.phone_number && <Detail icon="📞" text={vendor.phone_number} />}
                {vendor.email       && <Detail icon="✉️"  text={vendor.email} />}
                {vendor.state       && <Detail icon="📍" text={vendor.state} />}
                {vendor.address     && <Detail icon="🏢" text={vendor.address} truncate />}
            </div>

            {/* actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                {confirm ? (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "#64748b" }}>Delete this vendor?</span>
                        <button onClick={() => onDelete(vendor.id)} style={dangerBtn}>Yes, delete</button>
                        <button onClick={() => setConfirm(false)} style={ghostBtn}>Cancel</button>
                    </div>
                ) : (
                    <button onClick={() => setConfirm(true)} style={ghostBtn}>🗑 Delete</button>
                )}
            </div>
        </div>
    );
}

function Detail({ icon, text, truncate }) {
    return (
        <span style={{
            display: "flex", alignItems: "center", gap: "5px",
            fontSize: "13px", color: "#475569", fontWeight: 500,
            maxWidth: truncate ? "200px" : "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: truncate ? "nowrap" : "normal",
        }}>
            {icon} {text}
        </span>
    );
}

const ghostBtn = {
    padding: "7px 16px", borderRadius: "10px", border: "1.5px solid #e2e8f0",
    background: "white", color: "#64748b", fontWeight: 700, fontSize: "13px",
    cursor: "pointer", transition: "all 0.15s",
};
const dangerBtn = {
    padding: "7px 16px", borderRadius: "10px", border: "none",
    background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: "13px",
    cursor: "pointer",
};

/* ── Main page ────────────────────────────────── */
export default function Vendors() {
    const [vendors, setVendors]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm]         = useState(EMPTY);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState("");

    const fetchVendors = useCallback(() => {
        setLoading(true);
        clientToken.get(`vendors/?page_size=999${search ? `&search=${search}` : ""}`)
            .then(res => setVendors(res.data.results || res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [search]);

    useEffect(() => { fetchVendors(); }, [fetchVendors]);

    const handleSave = () => {
        if (!form.name.trim()) { setError("Vendor name is required."); return; }
        setSaving(true); setError("");
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
        clientToken.post("vendors/", fd)
            .then(() => { setForm(EMPTY); setShowForm(false); fetchVendors(); })
            .catch(() => setError("Failed to save. Please try again."))
            .finally(() => setSaving(false));
    };

    const handleDelete = (id) => {
        clientToken.delete(`vendors/${id}/`)
            .then(() => fetchVendors())
            .catch(err => console.error(err));
    };

    const filtered = vendors.filter(v =>
        v.name?.toLowerCase().includes(search.toLowerCase()) ||
        v.gst_number?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <Navbar />
            <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 24px 60px" }}>

                {/* ── Header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", animation: "fadeUp 0.4s ease both" }}>
                    <div>
                        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px", margin: 0 }}>
                            Vendors
                        </h1>
                        <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "6px", marginBottom: 0 }}>
                            Manage all your purchase vendors in one place.
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setError(""); }}
                        style={{
                            background: "#4f46e5", color: "white", fontWeight: 800, fontSize: "14px",
                            padding: "12px 24px", borderRadius: "14px", border: "none", cursor: "pointer",
                            boxShadow: "0 4px 16px rgba(79,70,229,0.25)",
                            display: "flex", alignItems: "center", gap: "8px",
                            transition: "transform 0.15s, box-shadow 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(79,70,229,0.35)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)";    e.currentTarget.style.boxShadow = "0 4px 16px rgba(79,70,229,0.25)"; }}
                    >
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                            <path d="M9 3v12M3 9h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        Add Vendor
                    </button>
                </div>

                {/* ── Search ── */}
                <div style={{ marginBottom: "24px", animation: "fadeUp 0.45s ease 0.05s both" }}>
                    <input
                        placeholder="🔍  Search by name or GST..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onFocus={focusIn} onBlur={focusOut}
                        style={{ ...inp, maxWidth: "400px" }}
                    />
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "40px 0" }}>
                        <div style={{ width: "28px", height: "28px", border: "3px solid #e0e7ff", borderTop: "3px solid #4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        <p style={{ color: "#4f46e5", fontWeight: 600, margin: 0 }}>Loading vendors…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        background: "white", borderRadius: "20px", padding: "60px 24px",
                        textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                        animation: "fadeUp 0.5s ease 0.1s both",
                    }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏭</div>
                        <p style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>No vendors yet</p>
                        <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>
                            Click <strong>Add Vendor</strong> to get started.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "20px",
                    }}>
                        {filtered.map(v => (
                            <VendorCard key={v.id} vendor={v} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add Vendor Modal ── */}
            {showForm && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 9999,
                        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
                >
                    <div style={{
                        background: "white", borderRadius: "24px",
                        padding: "36px 32px", width: "min(520px, 96vw)",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                        animation: "popIn 0.22s ease",
                        maxHeight: "90vh", overflowY: "auto",
                        position: "relative",
                    }}>
                        {/* close */}
                        <button
                            onClick={() => setShowForm(false)}
                            style={{
                                position: "absolute", top: "16px", right: "16px",
                                background: "#f1f5f9", border: "none", borderRadius: "8px",
                                width: "32px", height: "32px", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "16px", color: "#64748b",
                            }}
                        >✕</button>

                        {/* heading */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                            <div style={{
                                width: "42px", height: "42px", borderRadius: "12px",
                                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px",
                            }}>🏭</div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#0f172a" }}>Add New Vendor</h2>
                                <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>Fill in the vendor details below</p>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px",
                                padding: "10px 14px", marginBottom: "16px", color: "#991b1b", fontSize: "13px", fontWeight: 600,
                            }}>⚠️ {error}</div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <Field label="Vendor Name *" col={2}>
                                <input placeholder="e.g. Acme Suppliers Pvt. Ltd." value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} style={inp} />
                            </Field>
                            <Field label="Phone Number">
                                <input placeholder="e.g. 9876543210" value={form.phone_number}
                                    onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} style={inp} />
                            </Field>
                            <Field label="Email">
                                <input placeholder="vendor@example.com" value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} style={inp} />
                            </Field>
                            <Field label="GST Number">
                                <input placeholder="e.g. 27AAAAA0000A1Z5" value={form.gst_number}
                                    onChange={e => setForm(f => ({ ...f, gst_number: e.target.value.toUpperCase() }))}
                                    onFocus={focusIn} onBlur={focusOut} style={inp} />
                            </Field>
                            <Field label="State">
                                <input placeholder="e.g. Maharashtra" value={form.state}
                                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} style={inp} />
                            </Field>
                            <Field label="Address" col={2}>
                                <input placeholder="e.g. 123, Industrial Area, Pune" value={form.address}
                                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} style={inp} />
                            </Field>
                        </div>

                        {/* actions */}
                        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    padding: "11px 28px", borderRadius: "12px", border: "none",
                                    background: saving ? "linear-gradient(135deg,#a5b4fc,#c4b5fd)" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                                    color: "white", fontWeight: 800, fontSize: "14px",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
                                    display: "flex", alignItems: "center", gap: "8px",
                                }}
                            >
                                {saving ? (
                                    <>
                                        <div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                        Saving…
                                    </>
                                ) : "Save Vendor"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
                @keyframes popIn  { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes spin   { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
            `}</style>
        </div>
    );
}

/* tiny layout helper */
function Field({ label, children, col }) {
    return (
        <div style={{ gridColumn: col === 2 ? "1 / -1" : "auto" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                {label}
            </label>
            {children}
        </div>
    );
}
