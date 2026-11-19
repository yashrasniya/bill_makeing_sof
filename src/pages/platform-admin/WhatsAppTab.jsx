import { useCallback, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { Check } from "lucide-react";
import { Card, ErrorNote, Notice, errText } from "./shared";

export default function WhatsAppTab() {
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(null);
    const [tokenInput, setTokenInput] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        clientToken.get("admin/whatsapp-account/")
            .then((r) => { setForm(r.data); setSaved(r.data); })
            .catch((e) => setError(errText(e)));
    }, []);
    useEffect(() => { load(); }, [load]);

    const dirty = form && (tokenInput || JSON.stringify(form) !== JSON.stringify(saved));

    const save = async () => {
        setError(""); setNotice(""); setBusy(true);
        try {
            const payload = { ...form };
            delete payload.access_token_masked;
            delete payload.has_access_token;
            if (tokenInput) payload.access_token = tokenInput;
            const r = await clientToken.put("admin/whatsapp-account/", payload);
            setForm(r.data); setSaved(r.data); setTokenInput("");
            setNotice("Shared WhatsApp account saved.");
        } catch (e) { setError(errText(e)); }
        setBusy(false);
    };

    if (!form) return <Card>{error ? <ErrorNote>{error}</ErrorNote> : <div className="pa-loading">Loading…</div>}</Card>;

    const field = (key, label, props = {}) => (
        <label className="pa-field">{label}
            <input className="pa-input" value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
        </label>
    );

    return (
        <Card title="Shared WhatsApp account"
            sub={<>Companies on plans with the <b>whatsapp_shared_number</b> feature send through this account. The default daily limit applies per company unless the plan sets its own <code>sends_per_day</code>.</>}
            actions={<span className={`pa-badge ${form.is_active ? "ok" : ""}`}>{saved?.is_active ? "active" : "inactive"}</span>}>
            <div className="pa-grid" style={{ marginBottom: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                {field("name", "Name")}
                {field("default_daily_limit", "Default daily limit (per company)", { type: "number", min: 0 })}
                {field("phone_number_id", "Phone Number ID")}
                {field("business_account_id", "Business Account ID")}
                {field("default_template_name", "Default template name")}
                <label className="pa-field">
                    <span>Access token {form.has_access_token && <span style={{ color: "var(--success-money)" }}>(set: {form.access_token_masked})</span>}</span>
                    <input className="pa-input" type="password" autoComplete="off" placeholder="Paste a new token to replace"
                        value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
                </label>
            </div>
            <label className="pa-check" style={{ marginBottom: 14 }}>
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active (companies can send through this account)
            </label>
            <ErrorNote>{error}</ErrorNote>
            <Notice>{notice}</Notice>
            <div className="pa-row">
                <button className="pa-btn primary" onClick={save} disabled={!dirty || busy}><Check size={14} /> {busy ? "Saving…" : "Save account"}</button>
                {dirty && <span className="pa-muted">Unsaved changes</span>}
            </div>
        </Card>
    );
}
