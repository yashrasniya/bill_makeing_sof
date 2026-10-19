import { day } from "@/utility/money";

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

// Calendar days from `today` to the invoice's due date (negative once past it),
// or null when there is no due date. Whole days on UTC dates, so the viewer's
// time zone and daylight saving can't move it by one.
const MS_PER_DAY = 86400000;
const utcDay = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const localToday = () => {
    const d = new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};
export const daysUntilDue = (obj, today = localToday()) => {
    const due = utcDay(obj.due_date);
    return due === null ? null : Math.round((due - today) / MS_PER_DAY);
};

// What to say under a due date: only for invoices still owing, since a paid
// invoice's due date no longer matters.
export const dueNote = (obj, today) => {
    if (!isOpen(obj)) return null;
    const days = daysUntilDue(obj, today);
    if (days === null) return null;
    if (days < 0) return { text: `${-days} day${days === -1 ? "" : "s"} overdue`, late: true };
    if (days === 0) return { text: "Due today", late: false };
    return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, late: false };
};

export const DueDate = ({ obj }) => {
    if (!obj.due_date) return <span className="muted">—</span>;
    const note = dueNote(obj);
    return (
        <>
            <div style={{ whiteSpace: "nowrap" }}>{day(obj.due_date)}</div>
            {note && <div className={`inv_hint${note.late ? " late" : ""}`}>{note.text}</div>}
        </>
    );
};

// "12 days old" under the pill for anything still owing, so people can see
// what is getting stale without opening it
export const Hint = ({ obj }) => (isOpen(obj) && obj.age_days != null
    ? <div className="inv_hint">{obj.age_days === 0 ? "today" : `${obj.age_days} day${obj.age_days === 1 ? "" : "s"} old`}</div>
    : null);
