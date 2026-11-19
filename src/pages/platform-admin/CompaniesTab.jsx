import { useCallback, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { Search, X, CalendarPlus, Check, Ban } from "lucide-react";
import {
    Card, ErrorNote, Notice, Pager, StatusBadge, Table, addDays, daysUntil, errText,
    list, today, when, useAdminList, useConfirm, useDebounced,
} from "./shared";

function EndsCell({ sub }) {
    if (!sub) return <span className="pa-muted">—</span>;
    const d = daysUntil(sub.end_date);
    const tone = d < 0 ? "bad" : d <= 7 ? "warn" : null;
    return (
        <span>
            {sub.end_date}
            {tone && <> <span className={`pa-badge ${tone}`}>{d < 0 ? `${-d}d ago` : `${d}d left`}</span></>}
        </span>
    );
}

function CompanyDrawer({ company, plans, onClose, onChanged, goTo }) {
    const [history, setHistory] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [assign, setAssign] = useState({ subscription_plan: "", status: "active", end_date: addDays(today(), 365) });
    const [customEnd, setCustomEnd] = useState("");
    const [dialog, confirm] = useConfirm();
    const sub = company.active_subscription;

    const loadHistory = useCallback(() => {
        clientToken.get(`admin/companies/${company.id}/subscription/`)
            .then((r) => setHistory(r.data)).catch((e) => setError(errText(e)));
    }, [company.id]);
    useEffect(() => { loadHistory(); }, [loadHistory]);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const run = async (fn, msg) => {
        setBusy(true); setError(""); setNotice("");
        try { await fn(); setNotice(msg); loadHistory(); onChanged(); }
        catch (e) { setError(errText(e)); }
        setBusy(false);
    };

    const update = (payload, msg) => run(() => clientToken.put(`admin/companies/${company.id}/subscription/`, payload), msg);

    const extend = (days) => {
        // extend from the later of today and the current end date
        const base = sub.end_date > today() ? sub.end_date : today();
        const end = addDays(base, days);
        update({ end_date: end }, `Extended to ${end}.`);
    };

    const doAssign = async () => {
        const plan = plans.find((p) => String(p.id) === String(assign.subscription_plan));
        if (sub && !await confirm({
            title: `Switch to ${plan?.name}?`,
            body: `${company.company_name}'s current ${sub.plan_name} subscription will be cancelled and replaced.`,
            confirmLabel: "Assign plan",
        })) return;
        run(() => clientToken.post(`admin/companies/${company.id}/subscription/`, assign), `Assigned ${plan?.name}.`);
    };

    const cancel = async () => {
        if (!await confirm({
            title: "Cancel subscription?", danger: true, confirmLabel: "Cancel subscription",
            body: `${company.company_name} loses ${sub.plan_name} features right away.`,
        })) return;
        update({ status: "canceled" }, "Subscription cancelled.");
    };

    return (
        <div className="pa-backdrop" onClick={onClose}>
            <aside className="pa-drawer" role="dialog" aria-modal="true" aria-label={company.company_name} onClick={(e) => e.stopPropagation()}>
                {dialog}
                <div className="pa-drawer-head">
                    <div>
                        <h3>{company.company_name || `Company #${company.id}`}</h3>
                        <div className="pa-muted">#{company.id} · {company.users_count} user(s)</div>
                    </div>
                    <button className="pa-btn ghost icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
                </div>
                <ErrorNote>{error}</ErrorNote>
                <Notice>{notice}</Notice>

                <div className="pa-kv"><span>Email</span><span>{company.company_email_id || "—"}</span></div>
                <div className="pa-kv"><span>Phone</span><span>{company.company_phone || "—"}</span></div>
                <div className="pa-kv"><span>GSTIN</span><span>{company.company_gst_number || "—"}</span></div>
                <div className="pa-kv"><span>Location</span><span>{[company.city, company.state].filter(Boolean).join(", ") || "—"}</span></div>
                <div className="pa-kv"><span>Verified</span><span>{company.is_varified ? "Yes" : "No"}</span></div>
                <div className="pa-kv"><span>Trial used</span><span>{company.trial_used_at ? when(company.trial_used_at) : "No"}</span></div>

                <div className="pa-section-title">Current subscription</div>
                {sub ? (
                    <>
                        <div className="pa-kv"><span>Plan</span><span>{sub.plan_name} <span className="pa-code">({sub.plan_code})</span></span></div>
                        <div className="pa-kv"><span>Status</span><span><StatusBadge status={sub.status} /></span></div>
                        <div className="pa-kv"><span>Period</span><span>{sub.start_date} → <EndsCell sub={sub} /></span></div>
                        <div className="pa-kv">
                            <span>Auto-renew</span>
                            <span>
                                <label className="pa-check">
                                    <input type="checkbox" checked={sub.auto_renew} disabled={busy}
                                        onChange={(e) => update({ auto_renew: e.target.checked }, `Auto-renew ${e.target.checked ? "on" : "off"}.`)} />
                                    {sub.auto_renew ? "On" : "Off"}
                                </label>
                            </span>
                        </div>
                        <div className="pa-row" style={{ marginTop: 12 }}>
                            <button className="pa-btn sm" disabled={busy} onClick={() => extend(30)}><CalendarPlus size={13} /> +30 days</button>
                            <button className="pa-btn sm" disabled={busy} onClick={() => extend(365)}><CalendarPlus size={13} /> +1 year</button>
                            {sub.status !== "active" && (
                                <button className="pa-btn sm" disabled={busy} onClick={() => update({ status: "active" }, "Marked active.")}><Check size={13} /> Mark active</button>
                            )}
                            <button className="pa-btn danger sm" disabled={busy} onClick={cancel}><Ban size={13} /> Cancel</button>
                        </div>
                        <div className="pa-row" style={{ marginTop: 8 }}>
                            <input className="pa-input" type="date" style={{ flex: "1 1 150px", height: 30 }} value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)} aria-label="Custom end date" />
                            <button className="pa-btn sm" disabled={busy || !customEnd}
                                onClick={() => update({ end_date: customEnd }, `End date set to ${customEnd}.`)}>Set end date</button>
                        </div>
                    </>
                ) : <p className="pa-muted">No working subscription — the company has no plan features.</p>}

                <div className="pa-section-title">{sub ? "Switch plan" : "Assign plan"}</div>
                <div className="pa-grid">
                    <label className="pa-field">Plan
                        <select className="pa-select" value={assign.subscription_plan}
                            onChange={(e) => setAssign({ ...assign, subscription_plan: e.target.value })}>
                            <option value="">Select plan…</option>
                            {plans.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                        </select>
                    </label>
                    <label className="pa-field">Status
                        <select className="pa-select" value={assign.status} onChange={(e) => setAssign({ ...assign, status: e.target.value })}>
                            <option value="active">active</option>
                            <option value="trialing">trialing</option>
                        </select>
                    </label>
                    <label className="pa-field">Ends
                        <input className="pa-input" type="date" value={assign.end_date} min={today()}
                            onChange={(e) => setAssign({ ...assign, end_date: e.target.value })} />
                    </label>
                </div>
                <div className="pa-row" style={{ marginTop: 10 }}>
                    <button className="pa-btn primary" disabled={busy || !assign.subscription_plan} onClick={doAssign}>
                        <Check size={14} /> {sub ? "Switch plan" : "Assign plan"}
                    </button>
                </div>

                <div className="pa-section-title">History</div>
                {!history ? <div className="pa-loading">Loading…</div> : history.length === 0 ? (
                    <p className="pa-muted">No subscriptions yet.</p>
                ) : (
                    <div className="pa-table-wrap">
                        <table className="pa-table" style={{ minWidth: 0 }}>
                            <thead><tr><th>Plan</th><th>Status</th><th>From</th><th>To</th></tr></thead>
                            <tbody>
                                {history.map((h) => (
                                    <tr key={h.id}>
                                        <td>{h.plan_name}</td>
                                        <td><StatusBadge status={h.status} /></td>
                                        <td>{h.start_date}</td>
                                        <td>{h.end_date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="pa-row" style={{ marginTop: 16 }}>
                    <button className="pa-btn ghost sm" onClick={() => goTo("audit", { company: String(company.id) })}>View audit log</button>
                </div>
            </aside>
        </div>
    );
}

export default function CompaniesTab({ preset, goTo }) {
    const [search, setSearch] = useState(preset.search || "");
    const [plan, setPlan] = useState(preset.plan || "");
    const [status, setStatus] = useState(preset.status || "");
    const [ending, setEnding] = useState(preset.ending_within || "");
    const [ordering, setOrdering] = useState("-id");
    const [plans, setPlans] = useState([]);
    const [openId, setOpenId] = useState(preset.open ? Number(preset.open) : null);
    const debounced = useDebounced(search.trim());

    const q = useAdminList("admin/companies/", { search: debounced, plan, status, ending_within: ending, ordering });

    useEffect(() => {
        clientToken.get("admin/plans/").then((r) => setPlans(list(r))).catch(() => {});
    }, []);

    const open = q.rows.find((c) => c.id === openId);
    const filtered = search || plan || status || ending;

    return (
        <Card title="Companies" sub="Click a company to manage its subscription.">
            <div className="pa-filters">
                <div className="pa-search">
                    <Search size={16} />
                    <input className="pa-input" placeholder="Search name, email, phone, GSTIN or #id"
                        value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search companies" />
                </div>
                <select className="pa-select" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">
                    <option value="">All plans</option>
                    {plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
                </select>
                <select className="pa-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                    <option value="">Any status</option>
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past due</option>
                    <option value="none">No plan</option>
                </select>
                <select className="pa-select" value={ending} onChange={(e) => setEnding(e.target.value)} aria-label="Ending within">
                    <option value="">Any end date</option>
                    <option value="7">Ends within 7 days</option>
                    <option value="30">Ends within 30 days</option>
                    <option value="0">Ended or ends today</option>
                </select>
                <select className="pa-select" value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Sort">
                    <option value="-id">Newest first</option>
                    <option value="id">Oldest first</option>
                    <option value="name">Name A–Z</option>
                    <option value="-users">Most users</option>
                </select>
                {filtered && (
                    <button className="pa-btn ghost" onClick={() => { setSearch(""); setPlan(""); setStatus(""); setEnding(""); }}>
                        <X size={14} /> Clear
                    </button>
                )}
            </div>
            <ErrorNote>{q.error}</ErrorNote>
            <Table loading={q.loading} rowCount={q.rows.length}
                empty={filtered ? "No companies match these filters." : "No companies yet."}
                columns={[{ label: "Company" }, { label: "Users", className: "num" }, { label: "Plan" }, { label: "Status" }, { label: "Ends" }]}>
                {q.rows.map((c) => (
                    <tr key={c.id} className={`click ${openId === c.id ? "sel" : ""}`} onClick={() => setOpenId(c.id)}
                        tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(c.id)}>
                        <td>
                            <div className="pa-strong">{c.company_name || `#${c.id}`}</div>
                            <div className="pa-muted">#{c.id}{c.company_email_id && ` · ${c.company_email_id}`}</div>
                        </td>
                        <td className="num">{c.users_count}</td>
                        <td>{c.active_subscription?.plan_name || <span className="pa-badge bad">none</span>}</td>
                        <td><StatusBadge status={c.active_subscription?.status} /></td>
                        <td><EndsCell sub={c.active_subscription} /></td>
                    </tr>
                ))}
            </Table>
            <Pager {...q} />
            {open && <CompanyDrawer company={open} plans={plans} onClose={() => setOpenId(null)} onChanged={q.reload} goTo={goTo} />}
        </Card>
    );
}
