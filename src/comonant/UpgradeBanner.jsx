import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, X } from "lucide-react";
import "../style/upgrade-banner.css";

// Routes where the banner would be noise: the plan page itself and onboarding.
const HIDDEN_ON = ["/billing", "/CompanyForm", "/choose-template", "/thanks-page", "/login", "/SignUp", "/privacy"];
const DISMISS_KEY = "upgradeBannerDismissed";

const readDismissed = () => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
};

/**
 * Top-of-app banner for companies on the Free plan (`subscription.plan_code === 'free'` from `authz/me/`).
 * Trials are on Pro and are not shown. Billing admins (`subscription.manage`) get an "Upgrade to Pro" button
 * to /billing; other members only see who to ask. Dismissing hides it for this browser tab session.
 *
 * The banner is fixed to the top; while it shows, `html.has-upgrade-banner` and `--upgrade-banner-h`
 * push the page body and the fixed sidebar down by its measured height (it wraps on phones).
 */
export default function UpgradeBanner() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { subscription, permissions, status } = useSelector((s) => s.access);
    const isLogin = useSelector((s) => s.user.isLogin);
    const [dismissed, setDismissed] = useState(readDismissed);
    const ref = useRef(null);

    const isFree = status === "succeeded" && subscription?.plan_code === "free";
    const show = isLogin && isFree && !dismissed && !HIDDEN_ON.includes(pathname) && !pathname.startsWith("/invite/");
    const canManage = permissions.includes("subscription.manage");

    useLayoutEffect(() => {
        const root = document.documentElement;
        if (!show || !ref.current) {
            root.classList.remove("has-upgrade-banner");
            root.style.removeProperty("--upgrade-banner-h");
            return;
        }
        const el = ref.current;
        const apply = () => root.style.setProperty("--upgrade-banner-h", `${el.offsetHeight}px`);
        apply();
        root.classList.add("has-upgrade-banner");
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
        ro?.observe(el);
        return () => {
            ro?.disconnect();
            root.classList.remove("has-upgrade-banner");
            root.style.removeProperty("--upgrade-banner-h");
        };
    }, [show]);

    useEffect(() => { if (!isLogin) setDismissed(false); }, [isLogin]);

    if (!show) return null;

    const dismiss = () => {
        try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode: hide for this render only */ }
        setDismissed(true);
    };

    return (
        <div ref={ref} className="upgrade-banner" role="region" aria-label="Upgrade to Pro">
            <div className="upgrade-banner__inner">
                <Sparkles size={18} className="upgrade-banner__icon" aria-hidden="true" />
                <p className="upgrade-banner__text">
                    <strong>You're on the Free plan.</strong>{" "}
                    {canManage
                        ? "Upgrade to Pro for inventory, advanced reports, custom templates and WhatsApp sharing."
                        : "Ask your company admin to upgrade to Pro for inventory, advanced reports and more."}
                </p>
                {canManage && (
                    <button type="button" className="upgrade-banner__cta" onClick={() => navigate("/billing")}>
                        Upgrade to Pro <ArrowRight size={15} aria-hidden="true" />
                    </button>
                )}
            </div>
            <button type="button" className="upgrade-banner__close" onClick={dismiss} aria-label="Dismiss upgrade banner">
                <X size={16} />
            </button>
        </div>
    );
}
