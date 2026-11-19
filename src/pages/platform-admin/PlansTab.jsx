import { useCallback, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { Plus, Trash2, Pencil, Check, X, Copy, Braces } from "lucide-react";
import { Card, ErrorNote, Notice, Table, errText, list, money, useConfirm } from "./shared";

/* ---------------------------------------------------------- limits editor */

const toRows = (limits) => Object.entries(limits || {}).map(([k, v]) => ({ k, v: String(v) }));

function parseValue(v) {
    const t = v.trim();
    if (t === "") return "";
    if (t === "true" || t === "false") return t === "true";
    if (!Number.isNaN(Number(t))) return Number(t);
    return t;
}

function LimitsEditor({ limits, onSave, onCancel }) {
    const [rows, setRows] = useState(toRows(limits));
    const [raw, setRaw] = useState(null); // string when in raw-JSON mode
    const [error, setError] = useState("");

    const set = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

    const build = () => {
        if (raw !== null) {
            const parsed = JSON.parse(raw || "{}");
            if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) throw new Error("Limits must be a JSON object.");
            return parsed;
        }
        const out = {};
        for (const r of rows) {
            const k = r.k.trim();
            if (!k) continue;
            if (!/^[a-z][a-z0-9_]*$/.test(k)) throw new Error(`"${k}" — use snake_case keys.`);
            if (k in out) throw new Error(`"${k}" is listed twice.`);
            out[k] = parseValue(r.v);
        }
        return out;
    };

    const save = () => {
        setError("");
        try { onSave(build()); } catch (e) { setError(e.message); }
    };

    const toggleRaw = () => {
        setError("");
        if (raw === null) {
            try { setRaw(JSON.stringify(build(), null, 2)); } catch (e) { setError(e.message); }
        } else {
            try { setRows(toRows(build())); setRaw(null); } catch (e) { setError(e.message); }
        }
    };

    return (
        <div className="pa-limits" onClick={(e) => e.stopPropagation()}>
            {raw !== null ? (
                <textarea className="pa-input" rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} aria-label="Limits JSON" />
            ) : (
                <>
                    {rows.length === 0 && <span className="pa-muted">No limits — the feature is unlimited.</span>}
                    {rows.map((r, i) => (
                        <div key={i} className="pa-limit-row">
                            <input className="pa-input" placeholder="key, e.g. users" value={r.k} onChange={(e) => set(i, { k: e.target.value })} aria-label="Limit name" />
                            <input className="pa-input" placeholder="value" value={r.v} onChange={(e) => set(i, { v: e.target.value })} aria-label="Limit value" />
                            <button className="pa-btn ghost sm icon" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove limit"><X size={12} /></button>
                        </div>
                    ))}
                </>
            )}
            {error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
            <div className="pa-row">
                {raw === null && <button className="pa-btn ghost sm" onClick={() => setRows([...rows, { k: "", v: "" }])}><Plus size={12} /> Limit</button>}
                <button className="pa-btn ghost sm" onClick={toggleRaw} title="Edit as JSON"><Braces size={12} /> {raw === null ? "JSON" : "Fields"}</button>
                <span style={{ flex: 1 }} />
                <button className="pa-btn ghost sm" onClick={onCancel}>Cancel</button>
                <button className="pa-btn primary sm" onClick={save}><Check size={12} /> Save</button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------ plan editor */

function PlanEditor({ plan: initial, features, onSaved, onClose }) {
    const [plan, setPlan] = useState(initial);
    const blank = (p) => ({
        name: p?.name || "", code: p?.code || "", description: p?.description || "",
        monthly_price: p?.monthly_price ?? 0, yearly_price: p?.yearly_price ?? 0, is_active: p?.is_active ?? true,
    });
    const [form, setForm] = useState(blank(initial));
    const [saved, setSaved] = useState(blank(initial));
    const [planFeatures, setPlanFeatures] = useState(initial?.plan_features || []);
    const [editingLimits, setEditingLimits] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [dialog, confirm] = useConfirm();
    const dirty = JSON.stringify(form) !== JSON.stringify(saved);

    const save = async () => {
        setError(""); setNotice("");
        if (!form.name.trim() || !form.code.trim()) { setError("Name and code are required."); return; }
        try {
            const r = plan?.id
                ? await clientToken.patch(`admin/plans/${plan.id}/`, form)
                : await clientToken.post("admin/plans/", form);
            setPlan(r.data); setForm(blank(r.data)); setSaved(blank(r.data));
            setNotice(plan?.id ? "Plan saved." : "Plan created — now pick its features.");
            onSaved();
        } catch (e) { setError(errText(e)); }
    };

    const refreshFeatures = async () => {
        const fresh = await clientToken.get(`admin/plans/${plan.id}/features/`);
        setPlanFeatures(fresh.data);
        onSaved();
    };

    const toggleFeature = async (feature) => {
        const existing = planFeatures.find((pf) => pf.feature === feature.id);
        setError("");
        try {
            if (existing) await clientToken.delete(`admin/plans/${plan.id}/features/${existing.id}/`);
            else await clientToken.post(`admin/plans/${plan.id}/features/`, { feature: feature.id, limits: {} });
            await refreshFeatures();
        } catch (e) { setError(errText(e)); }
    };

    const saveLimits = async (pf, limits) => {
        setError("");
        try {
            await clientToken.put(`admin/plans/${plan.id}/features/${pf.id}/`, { limits });
            setEditingLimits(null);
            await refreshFeatures();
        } catch (e) { setError(errText(e)); }
    };

    const close = async () => {
        if (dirty && !await confirm({ title: "Discard unsaved changes?", body: "Your edits to this plan's details haven't been saved.", confirmLabel: "Discard", danger: true })) return;
        onClose();
    };

    return (
        <Card className="focus" title={plan?.id ? `Edit plan: ${plan.name}` : "New plan"}
            sub={plan?.id ? `${plan.subscriber_count ?? 0} working subscription(s). Feature and limit changes apply to them immediately.` : null}
            actions={<button className="pa-btn ghost icon" onClick={close} aria-label="Close editor"><X size={15} /></button>}>
            {dialog}
            <div className="pa-grid" style={{ marginBottom: 12 }}>
                <label className="pa-field">Name<input className="pa-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label className="pa-field">Code{plan?.id && " (fixed)"}<input className="pa-input" placeholder="pro" value={form.code} disabled={!!plan?.id} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
                <label className="pa-field">Monthly price (₹)<input className="pa-input" type="number" min="0" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} /></label>
                <label className="pa-field">Yearly price (₹)<input className="pa-input" type="number" min="0" value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: e.target.value })} /></label>
            </div>
            <label className="pa-field" style={{ marginBottom: 12 }}>Description
                <input className="pa-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="pa-row" style={{ marginBottom: 12 }}>
                <label className="pa-check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active (can be assigned and bought)</label>
                <span style={{ flex: 1 }} />
                <button className="pa-btn primary" onClick={save} disabled={plan?.id && !dirty}><Check size={14} /> {plan?.id ? "Save details" : "Create plan"}</button>
            </div>
            <ErrorNote>{error}</ErrorNote>
            <Notice>{notice}</Notice>

            {plan?.id ? (
                <>
                    <div className="pa-section-title">Features ({planFeatures.length} of {features.length})</div>
                    <div className="pa-feature-list">
                        {features.map((f) => {
                            const pf = planFeatures.find((x) => x.feature === f.id);
                            const limitText = pf && Object.entries(pf.limits || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
                            return (
                                <div key={f.id} className={`pa-feature ${pf ? "on" : ""}`}>
                                    <div className="pa-feature-top">
                                        <input type="checkbox" checked={!!pf} onChange={() => toggleFeature(f)} aria-label={`Include ${f.name}`} style={{ marginTop: 2 }} />
                                        <div className="grow">
                                            <div className="pa-feature-name">{f.name}</div>
                                            <div className="pa-code">{f.code}</div>
                                            {f.description && <div className="pa-muted">{f.description}</div>}
                                            {pf && editingLimits !== pf.id && (
                                                <div className="pa-muted" style={{ marginTop: 4 }}>{limitText || "Unlimited"}</div>
                                            )}
                                        </div>
                                        {pf && editingLimits !== pf.id && (
                                            <button className="pa-btn ghost sm icon" onClick={() => setEditingLimits(pf.id)} aria-label={`Edit limits for ${f.name}`} title="Edit limits"><Pencil size={12} /></button>
                                        )}
                                    </div>
                                    {pf && editingLimits === pf.id && (
                                        <LimitsEditor limits={pf.limits} onCancel={() => setEditingLimits(null)} onSave={(l) => saveLimits(pf, l)} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : <p className="pa-muted">Create the plan first, then pick its features.</p>}
        </Card>
    );
}

/* -------------------------------------------------------------- plans tab */

export default function PlansTab({ goTo }) {
    const [plans, setPlans] = useState([]);
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // plan, {} for new, or null
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [dialog, confirm] = useConfirm();

    const load = useCallback(() => {
        setLoading(true);
        return Promise.all([
            clientToken.get("admin/plans/").then((r) => setPlans(list(r))),
            clientToken.get("admin/features/").then((r) => setFeatures(list(r))),
        ]).catch((e) => setError(errText(e))).finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    const remove = async (p) => {
        if (!await confirm({ title: `Delete plan "${p.name}"?`, body: "This can't be undone. Past subscriptions keep their history.", confirmLabel: "Delete plan", danger: true })) return;
        setError("");
        try { await clientToken.delete(`admin/plans/${p.id}/`); load(); }
        catch (e) { setError(errText(e)); }
    };

    const duplicate = async (p) => {
        setError(""); setNotice("");
        try {
            let code = `${p.code}_copy`;
            for (let i = 2; plans.some((x) => x.code === code); i++) code = `${p.code}_copy${i}`;
            const { data: copy } = await clientToken.post("admin/plans/", {
                name: `${p.name} (copy)`, code, description: p.description,
                monthly_price: p.monthly_price, yearly_price: p.yearly_price, is_active: false,
            });
            for (const pf of p.plan_features || []) {
                await clientToken.post(`admin/plans/${copy.id}/features/`, { feature: pf.feature, limits: pf.limits || {} });
            }
            await load();
            const { data: fresh } = await clientToken.get(`admin/plans/${copy.id}/`);
            setEditing(fresh);
            setNotice(`Created "${copy.name}" as inactive. Edit it, then activate.`);
        } catch (e) { setError(errText(e)); }
    };

    return (
        <>
            {dialog}
            {editing !== null && (
                <PlanEditor key={editing.id || "new"} plan={editing.id ? editing : null} features={features}
                    onSaved={load} onClose={() => setEditing(null)} />
            )}
            <Card title="Subscription plans" sub="Click a plan's pencil to edit its prices, features and limits."
                actions={<button className="pa-btn primary" onClick={() => setEditing({})}><Plus size={14} /> New plan</button>}>
                <ErrorNote>{error}</ErrorNote>
                <Notice>{notice}</Notice>
                <Table loading={loading} rowCount={plans.length} empty="No plans yet."
                    columns={[{ label: "Plan" }, { label: "Monthly", className: "num" }, { label: "Yearly", className: "num" }, { label: "Features" }, { label: "Companies", className: "num" }, { label: "Status" }, { label: "", className: "actions" }]}>
                    {plans.map((p) => (
                        <tr key={p.id} className={editing?.id === p.id ? "sel" : ""}>
                            <td>
                                <div className="pa-strong">{p.name}</div>
                                <div className="pa-code">{p.code}</div>
                            </td>
                            <td className="num">{money(p.monthly_price)}</td>
                            <td className="num">{money(p.yearly_price)}</td>
                            <td className="wrap-cell">{(p.plan_features || []).map((pf) => pf.feature_name || pf.feature_code).join(", ") || "—"}</td>
                            <td className="num">
                                {p.subscriber_count > 0
                                    ? <button className="pa-btn ghost sm" onClick={() => goTo("companies", { plan: p.code })}>{p.subscriber_count}</button>
                                    : 0}
                            </td>
                            <td><StatusBadgeLite active={p.is_active} /></td>
                            <td className="actions">
                                <button className="pa-btn ghost sm icon" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} title="Edit"><Pencil size={13} /></button>
                                <button className="pa-btn ghost sm icon" onClick={() => duplicate(p)} aria-label={`Duplicate ${p.name}`} title="Duplicate"><Copy size={13} /></button>
                                <button className="pa-btn danger sm icon" onClick={() => remove(p)} disabled={p.subscriber_count > 0}
                                    aria-label={`Delete ${p.name}`}
                                    title={p.subscriber_count > 0 ? "Has working subscriptions — deactivate it instead" : "Delete"}>
                                    <Trash2 size={13} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </>
    );
}

function StatusBadgeLite({ active }) {
    return <span className={`pa-badge ${active ? "ok" : ""}`}>{active ? "active" : "inactive"}</span>;
}
