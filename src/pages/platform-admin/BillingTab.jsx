import { Fragment, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { CheckCircle2, XCircle, RefreshCw, UploadCloud, PlayCircle } from "lucide-react";
import {
    Card, ErrorNote, Notice, Pager, StatusBadge, Table, errText, list, money, when,
    useAdminList, useConfirm,
} from "./shared";

const SECTIONS = [
    { id: "health", label: "Health" },
    { id: "plans", label: "Razorpay plans" },
    { id: "subscriptions", label: "Subscriptions" },
    { id: "payments", label: "Payments" },
    { id: "webhooks", label: "Webhooks" },
    { id: "scheduled", label: "Scheduled changes" },
];

function Flag({ ok, label }) {
    return (
        <div className="pa-kv">
            <span>{label}</span>
            <span style={{ color: ok ? "var(--success)" : "var(--danger)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {ok ? "Configured" : "Missing"}
            </span>
        </div>
    );
}

function Health() {
    const [h, setH] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        clientToken.get("admin/billing/health/").then((r) => setH(r.data)).catch((e) => setError(errText(e)));
    }, []);
    return (
        <Card title="Billing health" sub="Is Razorpay wired up correctly?"
            actions={h && <StatusBadge status={h.test_mode ? "test mode" : "live mode"} tone={h.test_mode ? "warn" : "ok"} />}>
            <ErrorNote>{error}</ErrorNote>
            {!h ? !error && <div className="pa-loading">Loading…</div> : (
                <div className="pa-two">
                    <div>
                        <Flag ok={h.key_id_configured} label="RAZORPAY_KEY_ID" />
                        <Flag ok={h.key_secret_configured} label="RAZORPAY_KEY_SECRET" />
                        <Flag ok={h.webhook_secret_configured} label="RAZORPAY_WEBHOOK_SECRET" />
                    </div>
                    <div>
                        <div className="pa-kv"><span>Active Razorpay plans</span><span>{h.razorpay_plans}</span></div>
                        <div className="pa-kv"><span>Stale plans</span><span>{h.stale_plans.length ? h.stale_plans.join(", ") : "none"}</span></div>
                        <div className="pa-kv"><span>Live subscriptions</span><span>{h.live_subscriptions}</span></div>
                        <div className="pa-kv"><span>Failed webhooks</span><span>{h.failed_webhooks}</span></div>
                        <div className="pa-kv"><span>Pending scheduled changes</span><span>{h.pending_scheduled_changes}</span></div>
                    </div>
                </div>
            )}
        </Card>
    );
}

function RazorpayPlans() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);
    const [busy, setBusy] = useState(false);
    const [dialog, confirm] = useConfirm();

    const load = () => {
        setLoading(true);
        clientToken.get("admin/billing/razorpay-plans/").then((r) => setRows(list(r)))
            .catch((e) => setError(errText(e))).finally(() => setLoading(false));
    };
    useEffect(load, []);

    const sync = async () => {
        if (!await confirm({ title: "Sync plans to Razorpay?", body: "Creates Razorpay plans for any local plan price that has no matching Razorpay plan. Existing Razorpay plans are never edited.", confirmLabel: "Sync now" })) return;
        setBusy(true); setError(""); setReport(null);
        try {
            const r = await clientToken.post("admin/billing/sync-plans/");
            setReport(r.data.results); load();
        } catch (e) { setError(errText(e)); }
        setBusy(false);
    };

    return (
        <Card title="Razorpay plans" sub="Local plan prices mirrored as Razorpay plans"
            actions={<button className="pa-btn primary" onClick={sync} disabled={busy}><UploadCloud size={14} /> {busy ? "Syncing…" : "Sync plans"}</button>}>
            {dialog}
            <ErrorNote>{error}</ErrorNote>
            {report && (
                <Notice>
                    Synced: {report.map((r) => `${r.plan_code}/${r.period} → ${r.result}`).join(" · ") || "nothing to do"}
                </Notice>
            )}
            <Table loading={loading} rowCount={rows.length} empty="No Razorpay plans yet. Run Sync plans."
                columns={[{ label: "Plan" }, { label: "Period" }, { label: "Razorpay ID" }, { label: "Amount", className: "num" }, { label: "State" }]}>
                {rows.map((p) => (
                    <tr key={p.id}>
                        <td className="pa-strong">{p.plan_code}</td>
                        <td>{p.period}</td>
                        <td className="pa-code">{p.razorpay_plan_id}</td>
                        <td className="num">{money(p.amount_paise / 100)} {p.currency !== "INR" && p.currency}</td>
                        <td>
                            {p.is_stale ? <StatusBadge status="stale" tone="warn" /> : <StatusBadge status={p.is_active ? "active" : "inactive"} tone={p.is_active ? "ok" : ""} />}
                        </td>
                    </tr>
                ))}
            </Table>
        </Card>
    );
}

function Subscriptions({ goTo }) {
    const [status, setStatus] = useState("");
    const q = useAdminList("admin/billing/subscriptions/", { status });
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);

    const reconcile = async (s) => {
        setBusyId(s.id); setError("");
        try { await clientToken.post(`admin/billing/subscriptions/${s.id}/reconcile/`); q.reload(); }
        catch (e) { setError(errText(e)); }
        setBusyId(null);
    };

    return (
        <Card title="Razorpay subscriptions" sub="Reconcile re-fetches a subscription from Razorpay and re-applies it — use it when a webhook was missed.">
            <div className="pa-filters">
                <select className="pa-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                    <option value="">All statuses</option>
                    {["created", "authenticated", "active", "pending", "halted", "cancelled", "completed", "expired"].map((s) => <option key={s}>{s}</option>)}
                </select>
            </div>
            <ErrorNote>{error || q.error}</ErrorNote>
            <Table loading={q.loading} rowCount={q.rows.length} empty="No subscriptions."
                columns={[{ label: "Company" }, { label: "Plan" }, { label: "Status" }, { label: "Current period" }, { label: "Paid", className: "num" }, { label: "Synced" }, { label: "", className: "actions" }]}>
                {q.rows.map((s) => (
                    <tr key={s.id}>
                        <td>
                            <button className="pa-btn ghost sm" onClick={() => goTo("companies", { search: String(s.company), open: String(s.company) })}>
                                {s.company_name || `#${s.company}`}
                            </button>
                        </td>
                        <td>{s.plan_name} <span className="pa-muted">/ {s.period}</span></td>
                        <td><StatusBadge status={s.status} />{s.cancel_at_cycle_end && <span className="pa-muted"> · cancels at end</span>}</td>
                        <td className="pa-muted">{s.current_start ? `${new Date(s.current_start).toLocaleDateString("en-IN")} → ${new Date(s.current_end).toLocaleDateString("en-IN")}` : "—"}</td>
                        <td className="num">{s.paid_count}/{s.total_count}</td>
                        <td className="pa-muted">{when(s.last_synced_at)}</td>
                        <td className="actions">
                            <button className="pa-btn sm" disabled={busyId === s.id} onClick={() => reconcile(s)}>
                                <RefreshCw size={12} /> {busyId === s.id ? "…" : "Reconcile"}
                            </button>
                        </td>
                    </tr>
                ))}
            </Table>
            <Pager {...q} />
        </Card>
    );
}

function Payments() {
    const [status, setStatus] = useState("");
    const q = useAdminList("admin/billing/payments/", { status });
    return (
        <Card title="Payments">
            <div className="pa-filters">
                <select className="pa-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                    <option value="">All statuses</option>
                    {["created", "authorized", "captured", "failed", "refunded"].map((s) => <option key={s}>{s}</option>)}
                </select>
            </div>
            <ErrorNote>{q.error}</ErrorNote>
            <Table loading={q.loading} rowCount={q.rows.length} empty="No payments."
                columns={[{ label: "When" }, { label: "Company" }, { label: "Plan" }, { label: "Status" }, { label: "Method" }, { label: "Payment ID" }, { label: "Amount", className: "num" }]}>
                {q.rows.map((p) => (
                    <tr key={p.id} title={p.error_description || p.description || ""}>
                        <td className="pa-muted">{when(p.paid_at || p.created_at)}</td>
                        <td>{p.company_name || `#${p.company}`}</td>
                        <td>{p.plan_code || "—"}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>{p.method || "—"}</td>
                        <td className="pa-code">{p.razorpay_payment_id}</td>
                        <td className="num">{money(p.amount)}</td>
                    </tr>
                ))}
            </Table>
            <Pager {...q} />
        </Card>
    );
}

function Webhooks() {
    const [status, setStatus] = useState("");
    const [open, setOpen] = useState(null);
    const q = useAdminList("admin/billing/webhook-events/", { status });
    return (
        <Card title="Webhook events" sub="Click a row to see the error.">
            <div className="pa-filters">
                <select className="pa-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                    <option value="">All statuses</option>
                    {["received", "processed", "ignored", "failed"].map((s) => <option key={s}>{s}</option>)}
                </select>
            </div>
            <ErrorNote>{q.error}</ErrorNote>
            <Table loading={q.loading} rowCount={q.rows.length} empty="No webhook events."
                columns={[{ label: "Received" }, { label: "Event" }, { label: "Status" }, { label: "Company" }, { label: "Event ID" }]}>
                {q.rows.map((w) => (
                    <Fragment key={w.id}>
                        <tr className="click" onClick={() => setOpen(open === w.id ? null : w.id)}>
                            <td className="pa-muted">{when(w.received_at)}</td>
                            <td className="pa-strong">{w.event}</td>
                            <td><StatusBadge status={w.status} /></td>
                            <td>{w.company ? `#${w.company}` : "—"}</td>
                            <td className="pa-code">{w.event_id}</td>
                        </tr>
                        {open === w.id && (
                            <tr><td colSpan={5} className="pa-muted" style={{ whiteSpace: "pre-wrap" }}>
                                {w.error || "No error recorded."} {w.processed_at && `· processed ${when(w.processed_at)}`}
                            </td></tr>
                        )}
                    </Fragment>
                ))}
            </Table>
            <Pager {...q} />
        </Card>
    );
}

function Scheduled() {
    const q = useAdminList("admin/billing/scheduled-changes/");
    const [dialog, confirm] = useConfirm();
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const apply = async () => {
        if (!await confirm({ title: "Apply due plan changes now?", body: "Runs the downgrade job for every pending change whose effective date has passed. Tenants are moved to their new plan immediately.", confirmLabel: "Apply now" })) return;
        setError(""); setNotice("");
        try {
            const r = await clientToken.post("admin/billing/apply-scheduled/");
            setNotice(`${r.data.applied} change(s) applied.`); q.reload();
        } catch (e) { setError(errText(e)); }
    };

    return (
        <Card title="Scheduled plan changes" sub="Downgrades that take effect at the end of the paid period."
            actions={<button className="pa-btn primary" onClick={apply}><PlayCircle size={14} /> Apply due now</button>}>
            {dialog}
            <ErrorNote>{error || q.error}</ErrorNote>
            <Notice>{notice}</Notice>
            <Table loading={q.loading} rowCount={q.rows.length} empty="No scheduled changes."
                columns={[{ label: "Created" }, { label: "Change" }, { label: "Period" }, { label: "Effective" }, { label: "Status" }, { label: "Applied" }]}>
                {q.rows.map((c) => (
                    <tr key={c.id}>
                        <td className="pa-muted">{when(c.created_at)}</td>
                        <td>{c.from_plan_code} → <b>{c.to_plan_code}</b></td>
                        <td>{c.period}</td>
                        <td>{c.effective_date}</td>
                        <td><StatusBadge status={c.status} /></td>
                        <td className="pa-muted">{when(c.applied_at)}</td>
                    </tr>
                ))}
            </Table>
            <Pager {...q} />
        </Card>
    );
}

export default function BillingTab({ goTo, preset }) {
    const section = SECTIONS.some((s) => s.id === preset.section) ? preset.section : "health";
    const body = {
        health: <Health />,
        plans: <RazorpayPlans />,
        subscriptions: <Subscriptions goTo={goTo} />,
        payments: <Payments />,
        webhooks: <Webhooks />,
        scheduled: <Scheduled />,
    }[section];
    return (
        <>
            <div className="pa-filters" role="tablist" aria-label="Billing sections">
                {SECTIONS.map((s) => (
                    <button key={s.id} role="tab" aria-selected={section === s.id}
                        className={`pa-tab ${section === s.id ? "on" : ""}`}
                        onClick={() => goTo("billing", { section: s.id })}>
                        {s.label}
                    </button>
                ))}
            </div>
            {body}
        </>
    );
}
