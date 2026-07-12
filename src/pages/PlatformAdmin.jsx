import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { clientToken } from "@/axios";
import {
    CreditCard, Puzzle, Building2, ScrollText, Plus, Trash2, Pencil,
    Check, X,
} from "lucide-react";

/* shared styles */
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16 };
const btnPrimary = { background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnGhost = { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const inputStyle = { border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box" };
const th = { textAlign: "left", padding: "8px 12px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0" };
const td = { padding: "8px 12px", fontSize: 13, color: "#0f172a", borderBottom: "1px solid #f1f5f9" };

function errText(e) {
    const d = e?.response?.data;
    if (!d) return "Request failed";
    if (typeof d === "string") return d;
    if (d.detail) return d.detail;
    return Object.values(d).flat().join(" ");
}
const list = (r) => (Array.isArray(r.data) ? r.data : r.data.results || r.data);

/* --------------------------------------------------------------- Plans */

function PlanEditor({ plan, features, onSaved, onCancel }) {
    const [form, setForm] = useState({
        name: plan?.name || "", code: plan?.code || "", description: plan?.description || "",
        monthly_price: plan?.monthly_price || 0, yearly_price: plan?.yearly_price || 0,
        is_active: plan?.is_active ?? true,
    });
    const [planFeatures, setPlanFeatures] = useState(plan?.plan_features || []);
    const [error, setError] = useState("");

    const save = async () => {
        setError("");
        try {
            let planId = plan?.id;
            if (planId) await clientToken.patch(`admin/plans/${planId}/`, form);
            else planId = (await clientToken.post("admin/plans/", form)).data.id;
            onSaved();
        } catch (e) { setError(errText(e)); }
    };

    const toggleFeature = async (feature) => {
        if (!plan?.id) { setError("Save the plan first, then attach features."); return; }
        const existing = planFeatures.find((pf) => pf.feature === feature.id);
        try {
            if (existing) {
                await clientToken.delete(`admin/plans/${plan.id}/features/${existing.id}/`);
            } else {
                await clientToken.post(`admin/plans/${plan.id}/features/`, { feature: feature.id, limits: {} });
            }
            const fresh = await clientToken.get(`admin/plans/${plan.id}/features/`);
            setPlanFeatures(fresh.data);
        } catch (e) { setError(errText(e)); }
    };

    const editLimits = async (pf) => {
        const raw = window.prompt(`Limits for ${pf.feature_code} (JSON, e.g. {"users": 5})`, JSON.stringify(pf.limits || {}));
        if (raw === null) return;
        try {
            const limits = JSON.parse(raw || "{}");
            await clientToken.put(`admin/plans/${plan.id}/features/${pf.id}/`, { limits });
            const fresh = await clientToken.get(`admin/plans/${plan.id}/features/`);
            setPlanFeatures(fresh.data);
        } catch (e) { setError(e.message || errText(e)); }
    };

    return (
        <div style={{ ...card, border: "1px solid #c7d2fe" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{plan?.id ? `Edit plan: ${plan.name}` : "New plan"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <input style={inputStyle} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input style={inputStyle} placeholder="Code (unique)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!plan?.id} />
                <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
                </label>
                <input style={inputStyle} type="number" placeholder="Monthly price" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} />
                <input style={inputStyle} type="number" placeholder="Yearly price" value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: e.target.value })} />
                <input style={inputStyle} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {plan?.id && (
                <>
                    <p style={{ fontSize: 12, color: "#64748b" }}>Features (click to toggle, pencil to edit limits)</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {features.map((f) => {
                            const pf = planFeatures.find((x) => x.feature === f.id);
                            return (
                                <span key={f.id} style={{
                                    padding: "4px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer",
                                    border: pf ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                                    background: pf ? "#eef2ff" : "#fff", color: pf ? "#4f46e5" : "#64748b",
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                }}>
                                    <span onClick={() => toggleFeature(f)}>{f.code}</span>
                                    {pf && (
                                        <Pencil size={11} onClick={() => editLimits(pf)} />
                                    )}
                                    {pf && Object.keys(pf.limits || {}).length > 0 && (
                                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{JSON.stringify(pf.limits)}</span>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                </>
            )}
            {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
                <button style={btnPrimary} onClick={save}><Check size={14} /> Save</button>
                <button style={btnGhost} onClick={onCancel}><X size={14} /> Close</button>
            </div>
        </div>
    );
}

function PlansTab() {
    const [plans, setPlans] = useState([]);
    const [features, setFeatures] = useState([]);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        clientToken.get("admin/plans/").then((r) => setPlans(list(r)));
        clientToken.get("admin/features/").then((r) => setFeatures(list(r)));
    }, []);
    useEffect(load, [load]);

    const remove = async (p) => {
        if (!window.confirm(`Delete plan "${p.name}"?`)) return;
        try { await clientToken.delete(`admin/plans/${p.id}/`); load(); }
        catch (e) { setError(errText(e)); }
    };

    return (
        <div>
            {editing !== null && (
                <PlanEditor plan={editing.id ? editing : null} features={features}
                    onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
            )}
            <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>Subscription plans</h3>
                    <button style={btnPrimary} onClick={() => setEditing({})}><Plus size={14} /> New plan</button>
                </div>
                {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Plan</th><th style={th}>Code</th><th style={th}>Monthly</th><th style={th}>Yearly</th><th style={th}>Features</th><th style={th}>Active</th><th style={th}></th></tr></thead>
                    <tbody>
                        {plans.map((p) => (
                            <tr key={p.id}>
                                <td style={td}>{p.name}</td>
                                <td style={td}>{p.code}</td>
                                <td style={td}>₹{p.monthly_price}</td>
                                <td style={td}>₹{p.yearly_price}</td>
                                <td style={{ ...td, fontSize: 12, color: "#64748b", maxWidth: 300 }}>
                                    {(p.plan_features || []).map((pf) => pf.feature_code).join(", ") || "—"}
                                </td>
                                <td style={td}>{p.is_active ? "yes" : "no"}</td>
                                <td style={{ ...td, whiteSpace: "nowrap" }}>
                                    <button style={btnGhost} onClick={() => setEditing(p)}><Pencil size={13} /></button>{" "}
                                    <button style={{ ...btnGhost, color: "#ef4444" }} onClick={() => remove(p)}><Trash2 size={13} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------- Features */

function FeaturesTab() {
    const [features, setFeatures] = useState([]);
    const [form, setForm] = useState({ name: "", code: "", description: "" });
    const [error, setError] = useState("");

    const load = useCallback(() => {
        clientToken.get("admin/features/").then((r) => setFeatures(list(r)));
    }, []);
    useEffect(load, [load]);

    const save = async () => {
        setError("");
        try {
            await clientToken.post("admin/features/", form);
            setForm({ name: "", code: "", description: "" });
            load();
        } catch (e) { setError(errText(e)); }
    };
    const remove = async (f) => {
        if (!window.confirm(`Delete feature "${f.code}"? It will disappear from all plans.`)) return;
        await clientToken.delete(`admin/features/${f.id}/`); load();
    };

    return (
        <div style={card}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Feature catalog</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 8, marginBottom: 16 }}>
                <input style={inputStyle} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input style={inputStyle} placeholder="code_snake_case" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                <input style={inputStyle} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <button style={btnPrimary} onClick={save}><Plus size={14} /> Add</button>
            </div>
            {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Code</th><th style={th}>Name</th><th style={th}>Description</th><th style={th}></th></tr></thead>
                <tbody>
                    {features.map((f) => (
                        <tr key={f.id}>
                            <td style={td}>{f.code}</td>
                            <td style={td}>{f.name}</td>
                            <td style={{ ...td, color: "#64748b", fontSize: 12 }}>{f.description}</td>
                            <td style={td}><button style={{ ...btnGhost, color: "#ef4444" }} onClick={() => remove(f)}><Trash2 size={13} /></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ------------------------------------------------------------ Companies */

function CompaniesTab() {
    const [companies, setCompanies] = useState([]);
    const [plans, setPlans] = useState([]);
    const [assigning, setAssigning] = useState(null);
    const [form, setForm] = useState({ subscription_plan: "", status: "active", end_date: "" });
    const [error, setError] = useState("");

    const load = useCallback(() => {
        clientToken.get("admin/companies/").then((r) => setCompanies(list(r)));
        clientToken.get("admin/plans/").then((r) => setPlans(list(r)));
    }, []);
    useEffect(load, [load]);

    const assign = async () => {
        setError("");
        try {
            const payload = { subscription_plan: form.subscription_plan, status: form.status };
            if (form.end_date) payload.end_date = form.end_date;
            await clientToken.post(`admin/companies/${assigning.id}/subscription/`, payload);
            setAssigning(null); load();
        } catch (e) { setError(errText(e)); }
    };

    const cancelSub = async (c) => {
        if (!window.confirm(`Cancel ${c.company_name}'s current subscription?`)) return;
        try {
            await clientToken.put(`admin/companies/${c.id}/subscription/`, { status: "canceled" });
            load();
        } catch (e) { setError(errText(e)); }
    };

    return (
        <div>
            {assigning && (
                <div style={{ ...card, border: "1px solid #c7d2fe" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Assign subscription — {assigning.company_name}</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <select style={inputStyle} value={form.subscription_plan} onChange={(e) => setForm({ ...form, subscription_plan: e.target.value })}>
                            <option value="">Select plan…</option>
                            {plans.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                        </select>
                        <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            <option value="active">active</option>
                            <option value="trialing">trialing</option>
                        </select>
                        <input style={inputStyle} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} title="End date (default: +1 year)" />
                    </div>
                    {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                        <button style={btnPrimary} onClick={assign} disabled={!form.subscription_plan}><Check size={14} /> Assign</button>
                        <button style={btnGhost} onClick={() => setAssigning(null)}><X size={14} /> Cancel</button>
                    </div>
                </div>
            )}
            <div style={card}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Companies</h3>
                {error && !assigning && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Company</th><th style={th}>Users</th><th style={th}>Plan</th><th style={th}>Status</th><th style={th}>Ends</th><th style={th}></th></tr></thead>
                    <tbody>
                        {companies.map((c) => (
                            <tr key={c.id}>
                                <td style={td}>{c.company_name || `#${c.id}`}</td>
                                <td style={td}>{c.users_count}</td>
                                <td style={td}>{c.active_subscription?.plan_name || <span style={{ color: "#ef4444" }}>none</span>}</td>
                                <td style={td}>{c.active_subscription?.status || "—"}</td>
                                <td style={td}>{c.active_subscription?.end_date || "—"}</td>
                                <td style={{ ...td, whiteSpace: "nowrap" }}>
                                    <button style={btnGhost} onClick={() => { setAssigning(c); setForm({ subscription_plan: "", status: "active", end_date: "" }); }}>
                                        <CreditCard size={13} /> Assign plan
                                    </button>{" "}
                                    {c.active_subscription && (
                                        <button style={{ ...btnGhost, color: "#ef4444" }} onClick={() => cancelSub(c)}>Cancel</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ------------------------------------------------- Platform WhatsApp account */

function WhatsAppAccountTab() {
    const [form, setForm] = useState(null);
    const [tokenInput, setTokenInput] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(() => {
        clientToken.get("admin/whatsapp-account/").then((r) => setForm(r.data));
    }, []);
    useEffect(load, [load]);

    const save = async () => {
        setError(""); setNotice("");
        try {
            const payload = { ...form };
            delete payload.access_token_masked;
            delete payload.has_access_token;
            if (tokenInput) payload.access_token = tokenInput;
            const r = await clientToken.put("admin/whatsapp-account/", payload);
            setForm(r.data); setTokenInput("");
            setNotice("Shared WhatsApp account saved.");
        } catch (e) { setError(errText(e)); }
    };

    if (!form) return <div style={card}><p style={{ color: "#64748b" }}>Loading…</p></div>;

    return (
        <div style={card}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Shared WhatsApp account</h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>
                Companies on plans with the <b>whatsapp_shared_number</b> feature send through
                this account. The default daily limit applies per company unless the plan sets
                its own <code>sends_per_day</code>.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#64748b" }}>Name
                    <input style={inputStyle} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label style={{ fontSize: 12, color: "#64748b" }}>Default daily limit (per company)
                    <input style={inputStyle} type="number" min="0" value={form.default_daily_limit}
                        onChange={(e) => setForm({ ...form, default_daily_limit: e.target.value })} />
                </label>
                <label style={{ fontSize: 12, color: "#64748b" }}>Phone Number ID
                    <input style={inputStyle} value={form.phone_number_id || ""} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} />
                </label>
                <label style={{ fontSize: 12, color: "#64748b" }}>Business Account ID
                    <input style={inputStyle} value={form.business_account_id || ""} onChange={(e) => setForm({ ...form, business_account_id: e.target.value })} />
                </label>
                <label style={{ fontSize: 12, color: "#64748b" }}>Default template name
                    <input style={inputStyle} value={form.default_template_name || ""} onChange={(e) => setForm({ ...form, default_template_name: e.target.value })} />
                </label>
                <label style={{ fontSize: 12, color: "#64748b" }}>
                    Access token {form.has_access_token && <span style={{ color: "#16a34a" }}>(set: {form.access_token_masked})</span>}
                    <input style={inputStyle} type="password" placeholder="Paste new token to replace"
                        value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
                </label>
            </div>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <input type="checkbox" checked={!!form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active (companies can send through this account)
            </label>
            {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
            {notice && <p style={{ color: "#16a34a", fontSize: 12 }}>{notice}</p>}
            <button style={btnPrimary} onClick={save}><Check size={14} /> Save account</button>
        </div>
    );
}

/* ------------------------------------------------------------ Audit log */

function PlatformAuditTab() {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        clientToken.get("admin/audit-log/").then((r) => setLogs(list(r)));
    }, []);
    return (
        <div style={card}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Platform audit log</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>When</th><th style={th}>Who</th><th style={th}>Action</th><th style={th}>Resource</th><th style={th}>Details</th></tr></thead>
                <tbody>
                    {logs.map((l) => (
                        <tr key={l.id}>
                            <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(l.timestamp).toLocaleString()}</td>
                            <td style={td}>{l.user_name || "system"}</td>
                            <td style={td}>{l.action}</td>
                            <td style={td}>{l.resource_type} #{l.resource_id}</td>
                            <td style={{ ...td, maxWidth: 360, fontSize: 11, color: "#64748b" }}>
                                {l.new_data ? JSON.stringify(l.new_data) : "—"}
                            </td>
                        </tr>
                    ))}
                    {logs.length === 0 && <tr><td style={td} colSpan={5}>No entries yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

/* ----------------------------------------------------------------- Page */

export default function PlatformAdmin() {
    const { isProductOwner, status } = useSelector((s) => s.access);
    const [tab, setTab] = useState("plans");

    if (status === "succeeded" && !isProductOwner) {
        return (
            <div style={{ background: "#fff", minHeight: "100vh", padding: 40 }}>
                <p>You need product owner access to view this page.</p>
            </div>
        );
    }

    const tabs = [
        { id: "plans", label: "Plans", icon: <CreditCard size={15} /> },
        { id: "features", label: "Features", icon: <Puzzle size={15} /> },
        { id: "companies", label: "Companies", icon: <Building2 size={15} /> },
        { id: "whatsapp", label: "WhatsApp", icon: <CreditCard size={15} /> },
        { id: "audit", label: "Audit log", icon: <ScrollText size={15} /> },
    ];

    return (
        <div style={{ background: "#fff", minHeight: "100vh" }}>
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Platform Admin</h2>
            <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 20px" }}>
                Manage subscription plans, features and tenant subscriptions.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            ...btnGhost,
                            background: tab === t.id ? "#4f46e5" : "transparent",
                            color: tab === t.id ? "#fff" : "#64748b",
                            border: tab === t.id ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                        }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>
            {tab === "plans" && <PlansTab />}
            {tab === "features" && <FeaturesTab />}
            {tab === "companies" && <CompaniesTab />}
            {tab === "whatsapp" && <WhatsAppAccountTab />}
            {tab === "audit" && <PlatformAuditTab />}
        </div>
        </div>
    );
}
