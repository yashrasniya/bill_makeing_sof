import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AlertCircle, ArrowRight, Clock } from "lucide-react";
import { planStatus } from "@/utility/planStatus";

/* Colours come from style/tokens.css so the banner follows dark mode. */
const TONES = {
    calm: { bg: "var(--brand-soft, #eef2ff)", border: "var(--brand-soft-border, #c7d2fe)", fg: "var(--brand-dark)" },
    soon: { bg: "var(--warning-bg)", border: "var(--warning-bg)", fg: "var(--warning)" },
    last: { bg: "var(--danger-bg)", border: "var(--danger-border)", fg: "var(--danger-strong)" },
};

const BODY = {
    trial: [
        "Upgrade any time — you keep every remaining trial day, and your first charge is when the trial ends.",
        "Ask your company admin to upgrade to keep Pro features after the trial.",
    ],
    ending: [
        "It won't renew on its own. Renew to keep your plan's features; after it ends you move to Free.",
        "It won't renew on its own. Ask your company admin to renew it to keep your plan's features.",
    ],
    past_due: [
        "We couldn't charge your renewal. Update your payment to keep your plan's features.",
        "The renewal payment failed. Ask your company admin to update it to keep your plan's features.",
    ],
};
const CTA = { trial: "Upgrade", ending: "Renew", past_due: "Update payment" };

/**
 * Home-page notice for a free trial counting down, a paid plan that won't
 * renew (last 7 days), or a failed renewal inside its grace period. Only
 * billing admins (`subscription.manage`) get the button to /billing.
 */
export default function PlanBanner() {
    const navigate = useNavigate();
    const { subscription, permissions, status } = useSelector((s) => s.access);
    if (status !== "succeeded") return null;
    const info = planStatus(subscription);
    if (!info) return null;

    const canManage = permissions.includes("subscription.manage");
    const t = TONES[info.tone];
    const Icon = info.tone === "calm" ? Clock : AlertCircle;

    return (
        <div role={info.tone === "calm" ? "status" : "alert"} style={{
            background: t.bg, border: `1px solid ${t.border}`, borderRadius: "var(--radius-card)",
            padding: "14px 18px", marginBottom: 20, display: "flex", gap: 16, alignItems: "center",
            flexWrap: "wrap", animation: "fadeUp 0.4s ease both",
        }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: t.fg }}>
                    <Icon size={18} aria-hidden="true" /> {info.title}
                </div>
                <div style={{ fontSize: 13, color: t.fg, marginTop: 4, opacity: 0.9 }}>
                    {BODY[info.kind][canManage ? 0 : 1]}
                </div>
            </div>
            {canManage && (
                <button type="button" className="inv_btn primary" onClick={() => navigate("/billing")}>
                    {CTA[info.kind]} <ArrowRight size={14} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
