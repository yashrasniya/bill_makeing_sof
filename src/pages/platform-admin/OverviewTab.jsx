import { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Card, ErrorNote, errText, money } from "./shared";

function Kpi({ label, value, hint }) {
    return (
        <div className="pa-kpi">
            <div className="pa-kpi-label">{label}</div>
            <div className="pa-kpi-value">{value}</div>
            {hint && <div className="pa-kpi-hint">{hint}</div>}
        </div>
    );
}

export default function OverviewTab({ goTo }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true); setError("");
        clientToken.get("admin/overview/")
            .then((r) => setData(r.data))
            .catch((e) => setError(errText(e)))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    if (!data) {
        return <Card>{error ? <ErrorNote>{error}</ErrorNote> : <div className="pa-loading">Loading overview…</div>}</Card>;
    }

    const s = data.subscriptions;
    const b = data.billing;
    const attention = [
        data.trials_ending_7d > 0 && {
            text: `${data.trials_ending_7d} trial(s) end within 7 days`,
            action: () => goTo("companies", { status: "trialing", ending_within: "7" }),
        },
        data.subs_ending_30d > 0 && {
            text: `${data.subs_ending_30d} paid subscription(s) end within 30 days`,
            action: () => goTo("companies", { ending_within: "30" }),
        },
        s.past_due > 0 && {
            text: `${s.past_due} compan${s.past_due === 1 ? "y is" : "ies are"} past due`,
            action: () => goTo("companies", { status: "past_due" }),
        },
        s.none > 0 && {
            text: `${s.none} compan${s.none === 1 ? "y has" : "ies have"} no working plan`,
            action: () => goTo("companies", { status: "none" }),
        },
        b?.failed_webhooks > 0 && {
            text: `${b.failed_webhooks} Razorpay webhook(s) failed`,
            action: () => goTo("billing", { section: "webhooks" }),
        },
        b?.stale_plans?.length > 0 && {
            text: `${b.stale_plans.length} Razorpay plan(s) out of date with local prices`,
            action: () => goTo("billing", { section: "plans" }),
        },
        b?.pending_scheduled_changes > 0 && {
            text: `${b.pending_scheduled_changes} scheduled plan change(s) pending`,
            action: () => goTo("billing", { section: "scheduled" }),
        },
        b && !(b.key_id_configured && b.key_secret_configured && b.webhook_secret_configured) && {
            text: "Razorpay keys or webhook secret are not configured",
            action: () => goTo("billing"),
        },
    ].filter(Boolean);

    const max = Math.max(1, ...data.plans.map((p) => p.subscribers));

    return (
        <>
            <div className="pa-kpis">
                <Kpi label="Companies" value={data.companies.toLocaleString("en-IN")} hint={`${data.users} users`} />
                <Kpi label="Paying" value={s.active + s.past_due} hint={s.past_due ? `${s.past_due} past due` : "active subscriptions"} />
                <Kpi label="On trial" value={s.trialing} hint={`${data.trials_ending_7d} ending this week`} />
                <Kpi label="No plan" value={s.none} />
                <Kpi label="MRR (est.)" value={money(data.mrr_estimate)} hint="active + past due, at monthly price" />
                <Kpi label="New users (30d)" value={data.signups_30d} />
            </div>

            <div className="pa-two">
                <Card title="Needs attention"
                    actions={<button className="pa-btn ghost sm" onClick={load} disabled={loading} aria-label="Refresh"><RefreshCw size={13} /> Refresh</button>}>
                    <ErrorNote>{error}</ErrorNote>
                    {attention.length === 0 ? (
                        <div className="pa-empty"><CheckCircle2 size={18} color="var(--success-money)" /><br />All clear.</div>
                    ) : (
                        <ul className="pa-attn">
                            {attention.map((a, i) => (
                                <li key={i}>
                                    <AlertTriangle size={15} color="var(--warning)" aria-label="Warning" />
                                    <span className="grow">{a.text}</span>
                                    <button onClick={a.action}>View →</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Companies per plan" sub="Working subscriptions (active, trialing, past due)">
                    {data.plans.length === 0 ? <div className="pa-empty">No plans yet.</div> : (
                        <div className="pa-bars" role="table" aria-label="Companies per plan">
                            {data.plans.map((p) => (
                                <div key={p.id} className="pa-bar-row" role="row"
                                    title={`${p.name} (${p.code}): ${p.subscribers} compan${p.subscribers === 1 ? "y" : "ies"}`}>
                                    <span role="cell" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {p.name}{!p.is_active && <span className="pa-muted"> (inactive)</span>}
                                    </span>
                                    <div className="pa-bar-track" aria-hidden="true">
                                        <div className="pa-bar-fill" style={{ width: `${(p.subscribers / max) * 100}%` }} />
                                    </div>
                                    <span role="cell" className="num">{p.subscribers}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}
