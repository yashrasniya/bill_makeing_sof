// Small pieces the invoice list and the purchase page share, so a status looks
// the same everywhere (DESIGN_SYSTEM.md, "Payment status badges").

// Unpaid is the neutral indigo tint so that red stays reserved for "overdue".
export const STATUS = {
    unpaid: { label: "Unpaid", bg: "#eef2ff", fg: "#4338ca" },
    partially_paid: { label: "Partial", bg: "#fef3c7", fg: "#b45309" },
    paid: { label: "Paid", bg: "#dcfce7", fg: "#166534" },
    overdue: { label: "Overdue", bg: "#fecdd3", fg: "#9f1239" },
};

// Overdue is derived on the server (an open bill past the cut-off), so it can
// be true while the stored status still says "unpaid".
export const statusOf = (obj) => (obj.is_overdue ? STATUS.overdue : STATUS[obj.payment_status] || STATUS.unpaid);

export const isOpen = (obj) => obj.payment_status !== "paid" && Number(obj.balance_due) > 0;

export const initials = (name) => (String(name || "").match(/[\p{L}\p{N}]+/gu) || ["?"])
    .slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase();

export const Pill = ({ obj }) => {
    const s = statusOf(obj);
    return <span className="inv_pill" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
};

// "12 days old" under the pill for anything still owing, so people can see
// what is getting stale without opening it
export const Hint = ({ obj }) => (isOpen(obj) && obj.age_days != null
    ? <div className="inv_hint">{obj.age_days === 0 ? "today" : `${obj.age_days} day${obj.age_days === 1 ? "" : "s"} old`}</div>
    : null);
