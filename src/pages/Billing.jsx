import { useCallback, useEffect, useMemo, useState } from "react";
import PageIcon from '../comonant/PageIcon';
import { useDispatch, useSelector } from "react-redux";
import { clientToken } from "@/axios";
import { fetchAccess } from "@/store/accessSlice";
import {
    Check, CreditCard, Loader2, AlertTriangle, Clock, ShieldCheck,
    ArrowUpRight, ArrowDownRight, X,
} from "lucide-react";

/* ------------------------------------------------------------------ styles */
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16 };
const btnPrimary = { background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" };
const btnGhost = { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger = { ...btnGhost, color: "#b91c1c", borderColor: "#fecaca" };
const th = { textAlign: "left", padding: "8px 12px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0" };
const td = { padding: "8px 12px", fontSize: 13, color: "#0f172a", borderBottom: "1px solid #f1f5f9" };

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function errText(e) {
    const d = e?.response?.data;
    if (!d) return e?.message || "Request failed";
    if (typeof d === "string") return d;
    if (d.detail) return d.detail;
    return Object.values(d).flat().join(" ");
}
/** The billing API sets `retryable` on transient Razorpay failures
 *  (rate limit, gateway blip, network) so we can offer a retry rather than
 *  making the user guess whether clicking again is safe. It is — nothing has
 *  been charged at that point. */
const isRetryable = (e) => e?.response?.data?.retryable === true;
const asList = (r) => (Array.isArray(r.data) ? r.data : r.data?.results || []);
const money = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 })
        .format(Number(n || 0));
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Load the Razorpay Checkout script once, and tell the caller if it failed
 *  (ad-blockers and corporate proxies block it, which must not look like a
 *  silent no-op when the user clicks Subscribe). */
function useRazorpayScript() {
    const [state, setState] = useState(() => (window.Razorpay ? "ready" : "idle"));
    useEffect(() => {
        if (window.Razorpay) { setState("ready"); return; }
        let script = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = CHECKOUT_SRC;
            script.async = true;
            document.body.appendChild(script);
        }
        setState("loading");
        const ok = () => setState("ready");
        const bad = () => setState("error");
        script.addEventListener("load", ok);
        script.addEventListener("error", bad);
        return () => {
            script.removeEventListener("load", ok);
            script.removeEventListener("error", bad);
        };
    }, []);
    return state;
}

/* ------------------------------------------------------------------ badges */
function StatusPill({ status }) {
    const map = {
        active: ["#166534", "#dcfce7", "Active"],
        trialing: ["#4338ca", "#eef2ff", "Trial"],
        past_due: ["#92400e", "#fef3c7", "Payment failed"],
        canceled: ["#991b1b", "#fee2e2", "Cancelled"],
        expired: ["#991b1b", "#fee2e2", "Expired"],
    };
    const [color, background, label] = map[status] || ["#334155", "#f1f5f9", status || "—"];
    return (
        <span style={{ color, background, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
            {label}
        </span>
    );
}

/* ------------------------------------------------------- terminal states */
function FullPageMessage({ tone, title, body, onRetry }) {
    const error = tone === "error";
    return (
        <div style={{ padding: 32, maxWidth: 560, margin: "0 auto" }}>
            <div style={{
                ...card,
                background: error ? "#fef2f2" : "#f8fafc",
                borderColor: error ? "#fecaca" : "#e2e8f0",
            }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <AlertTriangle size={20} color={error ? "#b91c1c" : "#64748b"}
                                   style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                            {title}
                        </h2>
                        <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                            {body}
                        </p>
                        {onRetry && (
                            <button style={{ ...btnGhost, marginTop: 14 }} onClick={onRetry}>
                                Try again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ page */
export default function Billing() {
    const dispatch = useDispatch();
    const { permissions, status: accessStatus } = useSelector((s) => s.access);
    const canManage = permissions.includes("subscription.manage");

    const [period, setPeriod] = useState("monthly");
    const [plans, setPlans] = useState([]);
    const [state, setState] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyPlan, setBusyPlan] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [retryPlan, setRetryPlan] = useState(null);

    const scriptState = useRazorpayScript();
    const [loadError, setLoadError] = useState("");

    const fetchAll = useCallback(async () => {
        const [planRes, stateRes, payRes] = await Promise.all([
            clientToken.get("billing/plans/"),
            clientToken.get("billing/subscription/"),
            clientToken.get("billing/payments/"),
        ]);
        return {
            plans: planRes.data.plans || [],
            state: stateRes.data,
            payments: asList(payRes),
        };
    }, []);

    const apply = useCallback((data) => {
        setPlans(data.plans);
        setState(data.state);
        setPayments(data.payments);
        setLoadError("");
    }, []);

    /** Refresh after a mutation. Never flips the page back to its skeleton. */
    const load = useCallback(async () => {
        try {
            apply(await fetchAll());
        } catch (e) {
            setError(errText(e));
        }
    }, [fetchAll, apply]);

    // Initial load. The `ignore` latch is per-effect-invocation, so React's
    // StrictMode double-mount discards the first result instead of wedging a
    // component-level flag off and never turning it back on.
    const [reloadKey, setReloadKey] = useState(0);
    useEffect(() => {
        let ignore = false;
        setLoading(true);
        (async () => {
            try {
                const data = await fetchAll();
                if (!ignore) apply(data);
            } catch (e) {
                if (!ignore) setLoadError(errText(e));
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [fetchAll, apply, reloadKey]);

    const entitlement = state?.entitlement;
    const live = state?.billing_subscription;
    const scheduled = state?.scheduled_change;
    const currentCode = entitlement?.plan_code;

    const currentPlan = useMemo(
        () => plans.find((p) => p.code === currentCode),
        [plans, currentCode]);

    const priceOf = useCallback(
        (plan) => Number(period === "yearly" ? plan.yearly_price : plan.monthly_price),
        [period]);

    /** Open Razorpay Checkout for a subscription that the backend just created. */
    const openCheckout = useCallback((payload) => new Promise((resolve, reject) => {
        if (!window.Razorpay) {
            reject(new Error("Razorpay Checkout could not load. Disable your ad-blocker and retry."));
            return;
        }
        const rzp = new window.Razorpay({
            key: payload.razorpay_key_id,
            subscription_id: payload.subscription_id,
            name: "Invoice App",
            description: `${payload.plan_name || payload.plan_code} · ${payload.period}`,
            prefill: payload.prefill || {},
            theme: { color: "#4f46e5" },
            handler: (response) => resolve(response),
            modal: {
                ondismiss: () => reject(new Error("Payment window closed before completion.")),
            },
        });
        rzp.on("payment.failed", (resp) =>
            reject(new Error(resp?.error?.description || "Payment failed.")));
        rzp.open();
    }), []);

    const runCheckout = useCallback(async (payload) => {
        const response = await openCheckout(payload);
        // Verified server-side. Entitlement is still granted by the webhook;
        // this just lets the page update without waiting for it.
        await clientToken.post("billing/verify/", {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
        });
    }, [openCheckout]);

    const choosePlan = useCallback(async (plan) => {
        setError(""); setNotice(""); setRetryPlan(null); setBusyPlan(plan.code);
        try {
            const isFirst = !live;
            const endpoint = isFirst ? "billing/subscribe/" : "billing/change-plan/";
            const { data } = await clientToken.post(endpoint, {
                plan_code: plan.code, period,
            });

            if (isFirst || data.requires_checkout) {
                await runCheckout({ ...data, plan_name: plan.name, period });
                setNotice("Payment received. Your plan is being activated.");
            } else if (data.effect === "upgraded") {
                setNotice(`Upgraded to ${plan.name}. Available immediately.`);
            } else if (data.effect === "downgrade_scheduled") {
                setNotice(
                    `Downgrade to ${plan.name} scheduled for ${day(data.effective_date)}. ` +
                    `You keep your current plan until then.`);
            } else if (data.effect === "switched_to_free") {
                setNotice("Switched to the Free plan.");
            }
            await load();
            dispatch(fetchAccess());          // refresh feature gates
        } catch (e) {
            setError(e?.response ? errText(e) : e.message);
            setRetryPlan(isRetryable(e) ? plan : null);
        } finally {
            setBusyPlan(null);
        }
    }, [live, period, runCheckout, load, dispatch]);

    const doCancel = useCallback(async (atCycleEnd) => {
        setConfirm(null); setError(""); setNotice(""); setBusyPlan("__cancel__");
        try {
            const { data } = await clientToken.post("billing/cancel/", {
                at_cycle_end: atCycleEnd,
            });
            setNotice(data.at_cycle_end
                ? "Subscription will end when the current period finishes. You keep access until then."
                : "Subscription cancelled. You are now on the Free plan.");
            await load();
            dispatch(fetchAccess());
        } catch (e) {
            setError(errText(e));
        } finally {
            setBusyPlan(null);
        }
    }, [load, dispatch]);

    /* ------------------------------------------------------------- render */

    // Fail visibly. A spinner that can never resolve is indistinguishable from
    // a hung page, so every terminal state below says what went wrong and
    // offers a way forward.
    if (accessStatus === "failed") {
        return (
            <FullPageMessage
                tone="error"
                title="Could not load your account permissions"
                body="The request for your access context failed, so billing can't tell what you're allowed to do."
                onRetry={() => dispatch(fetchAccess())}
            />
        );
    }

    if (accessStatus !== "succeeded" || loading) {
        return (
            <div style={{ padding: 32, display: "flex", alignItems: "center", gap: 10, color: "#64748b" }}>
                <Loader2 size={18} className="animate-spin" /> Loading billing…
            </div>
        );
    }

    if (loadError) {
        const denied = /permission|credential|authenticat/i.test(loadError);
        return (
            <FullPageMessage
                tone="error"
                title={denied ? "You don't have access to billing" : "Could not load billing"}
                body={denied
                    ? "You need the “View subscription” permission. Ask a company admin to grant it under Access Control."
                    : loadError}
                onRetry={denied ? null : () => setReloadKey((k) => k + 1)}
            />
        );
    }

    if (!state) {
        return (
            <FullPageMessage
                tone="error"
                title="Billing returned no data"
                body="The server responded but sent nothing back. This usually means the billing app is not installed or migrated."
                onRetry={() => setReloadKey((k) => k + 1)}
            />
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
                <PageIcon icon={CreditCard} />
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Plan &amp; Billing
                </h1>
                {state?.test_mode && (
                    <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                        TEST MODE — no real money
                    </span>
                )}
            </div>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 0, marginBottom: 20 }}>
                Upgrades apply immediately. Downgrades take effect at the end of your current billing period, so you never lose time you have paid for.
            </p>

            {error && (
                <div style={{ ...card, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13 }}>
                        {error}
                        {retryPlan && (
                            <div style={{ marginTop: 10 }}>
                                <button style={{ ...btnGhost, borderColor: "#fca5a5", color: "#991b1b" }}
                                        disabled={busyPlan !== null}
                                        onClick={() => choosePlan(retryPlan)}>
                                    Try {retryPlan.name} again
                                </button>
                                <span style={{ marginLeft: 10, color: "#b91c1c", fontSize: 12 }}>
                                    Nothing was charged.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {notice && (
                <div style={{ ...card, background: "#dcfce7", borderColor: "#dcfce7", color: "#166534", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13 }}>{notice}</div>
                </div>
            )}
            {scriptState === "error" && (
                <div style={{ ...card, background: "#fef3c7", borderColor: "#fef3c7", color: "#92400e", fontSize: 13 }}>
                    Razorpay Checkout could not load — usually an ad-blocker or a corporate proxy.
                    Allow <code>checkout.razorpay.com</code> and reload before subscribing.
                </div>
            )}

            {/* ------------------------------------------------ current plan */}
            <div style={card}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: .4 }}>
                            Current plan
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                            <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                                {entitlement?.plan_name || "No plan"}
                            </span>
                            <StatusPill status={entitlement?.status} />
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                            {entitlement?.end_date
                                ? `${live?.cancel_at_cycle_end ? "Ends" : "Renews"} on ${day(entitlement.end_date)}`
                                : "No renewal date"}
                            {live?.period ? ` · billed ${live.period}` : ""}
                        </div>
                    </div>

                    {live && canManage && (
                        <div style={{ display: "flex", gap: 8 }}>
                            {!live.cancel_at_cycle_end && (
                                <button style={btnDanger}
                                        disabled={busyPlan === "__cancel__"}
                                        onClick={() => setConfirm("cancel")}>
                                    {busyPlan === "__cancel__"
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <X size={14} />}
                                    Cancel subscription
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {entitlement?.status === "past_due" && (
                    <div style={{ marginTop: 14, background: "#fef3c7", border: "1px solid #fef3c7", borderRadius: 8, padding: "10px 14px", color: "#92400e", fontSize: 13, display: "flex", gap: 8 }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>
                            Your last payment did not go through. Razorpay will retry automatically.
                            You keep access during a short grace period — update your payment method to avoid interruption.
                        </span>
                    </div>
                )}

                {scheduled && (
                    <div style={{ marginTop: 14, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "10px 14px", color: "#4338ca", fontSize: 13, display: "flex", gap: 8 }}>
                        <Clock size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>
                            Scheduled change to <strong>{scheduled.to_plan_name}</strong> on{" "}
                            <strong>{day(scheduled.effective_date)}</strong>. Until then nothing changes.
                        </span>
                    </div>
                )}
            </div>

            {/* --------------------------------------------------- period toggle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
                    {["monthly", "yearly"].map((p) => (
                        <button key={p} onClick={() => setPeriod(p)}
                                style={{
                                    border: "none", cursor: "pointer", borderRadius: 8,
                                    padding: "7px 18px", fontSize: 13, fontWeight: 600,
                                    background: period === p ? "#fff" : "transparent",
                                    color: period === p ? "#0f172a" : "#64748b",
                                    boxShadow: period === p ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                                }}>
                            {p === "monthly" ? "Monthly" : "Yearly"}
                            {p === "yearly" && (
                                <span style={{ marginLeft: 6, color: "#16a34a", fontSize: 11 }}>save ~17%</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ---------------------------------------------------- plan cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
                {plans.map((plan) => {
                    const price = priceOf(plan);
                    const isCurrent = plan.code === currentCode;
                    const currentPrice = currentPlan ? priceOf(currentPlan) : -1;
                    const direction = price > currentPrice ? "up" : price < currentPrice ? "down" : "same";
                    const busy = busyPlan === plan.code;

                    return (
                        <div key={plan.code}
                             style={{
                                 ...card, marginBottom: 0, display: "flex", flexDirection: "column",
                                 borderColor: isCurrent ? "#4f46e5" : "#e2e8f0",
                                 borderWidth: isCurrent ? 2 : 1,
                             }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                                    {plan.name}
                                </h3>
                                {isCurrent && (
                                    <span style={{ background: "#eef2ff", color: "#4f46e5", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                                        CURRENT
                                    </span>
                                )}
                            </div>

                            <div style={{ margin: "12px 0 4px" }}>
                                <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
                                    {price > 0 ? money(price) : "Free"}
                                </span>
                                {price > 0 && (
                                    <span style={{ fontSize: 13, color: "#64748b" }}>
                                        /{period === "yearly" ? "year" : "month"}
                                    </span>
                                )}
                            </div>

                            {plan.description && (
                                <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 10px" }}>
                                    {plan.description}
                                </p>
                            )}

                            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 16px", flexGrow: 1 }}>
                                {plan.features.map((f) => (
                                    <li key={f.code}
                                        style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#334155", padding: "3px 0" }}>
                                        <Check size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <span>
                                            {f.name}
                                            {f.limits && Object.keys(f.limits).length > 0 && (
                                                <span style={{ color: "#94a3b8" }}>
                                                    {" — "}
                                                    {Object.entries(f.limits)
                                                        .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`)
                                                        .join(", ")}
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                style={{
                                    ...btnPrimary,
                                    background: isCurrent ? "#e2e8f0" : direction === "down" ? "#fff" : "#4f46e5",
                                    color: isCurrent ? "#94a3b8" : direction === "down" ? "#4f46e5" : "#fff",
                                    border: direction === "down" && !isCurrent ? "1px solid #c7d2fe" : "none",
                                    cursor: isCurrent || !canManage || busy ? "not-allowed" : "pointer",
                                    opacity: !canManage && !isCurrent ? 0.6 : 1,
                                }}
                                disabled={isCurrent || !canManage || busy || busyPlan !== null}
                                onClick={() => setConfirm({ plan, direction })}>
                                {busy && <Loader2 size={14} className="animate-spin" />}
                                {isCurrent ? "Your plan"
                                    : direction === "up" ? <>Upgrade <ArrowUpRight size={14} /></>
                                        : direction === "down" ? <>Downgrade <ArrowDownRight size={14} /></>
                                            : "Choose"}
                            </button>

                            {!canManage && !isCurrent && (
                                <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>
                                    Needs the “Manage subscription &amp; billing” permission
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ------------------------------------------------ payment history */}
            <div style={card}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                    Payment history
                </h3>
                {payments.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No payments yet.</p>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                            <tr>
                                <th style={th}>Date</th>
                                <th style={th}>Plan</th>
                                <th style={th}>Amount</th>
                                <th style={th}>Method</th>
                                <th style={th}>Status</th>
                                <th style={th}>Payment ID</th>
                            </tr>
                            </thead>
                            <tbody>
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td style={td}>{day(p.paid_at || p.created_at)}</td>
                                    <td style={td}>{p.plan_code || "—"}</td>
                                    <td style={td}>{money(p.amount)}</td>
                                    <td style={td}>{p.method || "—"}</td>
                                    <td style={td}>
                                        <span style={{
                                            color: p.status === "captured" ? "#166534" : "#991b1b",
                                            background: p.status === "captured" ? "#dcfce7" : "#fee2e2",
                                            borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                                        }}>
                                            {p.status}
                                        </span>
                                        {p.error_description && (
                                            <div style={{ fontSize: 11, color: "#991b1b", marginTop: 2 }}>
                                                {p.error_description}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                                        {p.razorpay_payment_id}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* -------------------------------------------------- confirm modal */}
            {confirm && (
                <ConfirmDialog
                    confirm={confirm}
                    entitlement={entitlement}
                    period={period}
                    priceOf={priceOf}
                    onClose={() => setConfirm(null)}
                    onCancelSub={doCancel}
                    onConfirmPlan={(plan) => { setConfirm(null); choosePlan(plan); }}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ modal */
function ConfirmDialog({ confirm, entitlement, period, priceOf, onClose, onCancelSub, onConfirmPlan }) {
    const isCancel = confirm === "cancel";
    const plan = isCancel ? null : confirm.plan;
    const direction = isCancel ? null : confirm.direction;
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (isCancel || !plan) return;
        let ignore = false;
        clientToken
            .get(`billing/preview/?plan_code=${encodeURIComponent(plan.code)}&period=${period}`)
            .then((r) => { if (!ignore) setPreview(r.data); })
            .catch(() => { /* preview is advisory only */ });
        return () => { ignore = true; };
    }, [isCancel, plan, period]);

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={onClose}>
            <div style={{ ...card, maxWidth: 460, width: "100%", marginBottom: 0 }}
                 onClick={(e) => e.stopPropagation()}>
                {isCancel ? (
                    <>
                        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>
                            Cancel subscription?
                        </h3>
                        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                            You can keep your plan until{" "}
                            <strong>{day(entitlement?.end_date)}</strong> — you have already paid for it —
                            or end it right now and drop to Free immediately.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                            <button style={{ ...btnPrimary, background: "#4f46e5" }}
                                    onClick={() => onCancelSub(true)}>
                                Keep access until {day(entitlement?.end_date)}
                            </button>
                            <button style={{ ...btnPrimary, background: "#fff", color: "#b91c1c", border: "1px solid #fecaca" }}
                                    onClick={() => onCancelSub(false)}>
                                End now and lose remaining time
                            </button>
                            <button style={{ ...btnGhost, width: "100%", justifyContent: "center" }} onClick={onClose}>
                                Keep my subscription
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>
                            {direction === "down" ? "Downgrade" : "Switch"} to {plan.name}?
                        </h3>
                        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                            {direction === "down" ? (
                                <>
                                    Your plan changes on{" "}
                                    <strong>{day(preview?.effective || entitlement?.end_date)}</strong>.
                                    You keep everything you have now until then, and nothing is charged today.
                                </>
                            ) : (
                                <>
                                    {plan.name} becomes available immediately at{" "}
                                    <strong>{money(priceOf(plan))}</strong> per{" "}
                                    {period === "yearly" ? "year" : "month"}.
                                </>
                            )}
                        </p>

                        {preview && (
                            <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, fontSize: 12, color: "#475569", marginTop: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                    <span>Days left in current period</span>
                                    <strong>{preview.days_remaining}</strong>
                                </div>
                                {Number(preview.unused_credit) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                        <span>Unused value on current plan</span>
                                        <strong>{money(preview.unused_credit)}</strong>
                                    </div>
                                )}
                                {preview.requires_new_mandate && (
                                    <div style={{ color: "#92400e", marginTop: 6 }}>
                                        Changing billing period needs a new payment mandate, so you will be
                                        asked to authorise the payment again.
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <button style={{ ...btnGhost, flex: 1, justifyContent: "center" }} onClick={onClose}>
                                Cancel
                            </button>
                            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => onConfirmPlan(plan)}>
                                Confirm
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
