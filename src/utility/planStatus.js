/**
 * Trial and plan-ending state from `access.subscription` (authz/me/).
 * Same rules as the mobile app's lib/trial.ts — keep the two in step.
 * Days are counted from the browser's clock, not a server count, so a page
 * left open overnight still shows the right number.
 */

export const PLAN_ENDING_WARN_DAYS = 7;
/** Matches CompanySubscription.GRACE_PERIOD_DAYS on the server. */
export const PAST_DUE_GRACE_DAYS = 7;

/** `YYYY-MM-DD` as a local calendar date (new Date('2026-10-19') is UTC midnight and slips a day in IST). */
function localDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const daysBetween = (from, to) => Math.round((to.getTime() - from.getTime()) / 86400000);
const plural = (n) => (n === 1 ? "1 day" : `${n} days`);

/**
 * Returns { kind: 'trial' | 'ending' | 'past_due', daysLeft, endDate, tone: 'calm' | 'soon' | 'last', title }
 * or null when there is nothing to warn about (Free plan, a plan that renews on its own, or far from its end).
 * A missing `auto_renew` (older server) counts as renewing.
 */
export function planStatus(subscription, now = new Date()) {
    if (!subscription || typeof subscription.end_date !== "string") return null;
    const end = localDate(subscription.end_date);
    if (!end) return null;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (subscription.status === "trialing") {
        const daysLeft = daysBetween(today, end);
        if (daysLeft < 0) return null;
        return {
            kind: "trial", daysLeft, endDate: subscription.end_date,
            tone: daysLeft === 0 ? "last" : daysLeft <= 3 ? "soon" : "calm",
            title: daysLeft === 0 ? "Your free trial ends today" : `${plural(daysLeft)} left in your free trial`,
        };
    }
    if (subscription.plan_code === "free") return null;

    if (subscription.status === "past_due") {
        const graceEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + PAST_DUE_GRACE_DAYS);
        const daysLeft = daysBetween(today, graceEnd);
        if (daysLeft < 0) return null;
        return {
            kind: "past_due", daysLeft, endDate: subscription.end_date, tone: daysLeft <= 1 ? "last" : "soon",
            title: daysLeft === 0 ? "Payment failed: your plan stops today" : `Payment failed: your plan stops in ${plural(daysLeft)}`,
        };
    }

    if (subscription.status !== "active" || subscription.auto_renew !== false) return null;
    const daysLeft = daysBetween(today, end);
    if (daysLeft < 0 || daysLeft > PLAN_ENDING_WARN_DAYS) return null;
    return {
        kind: "ending", daysLeft, endDate: subscription.end_date,
        tone: daysLeft === 0 ? "last" : daysLeft <= 3 ? "soon" : "calm",
        title: daysLeft === 0 ? "Your plan ends today" : `Your plan ends in ${plural(daysLeft)}`,
    };
}
