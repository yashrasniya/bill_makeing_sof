import { useCallback } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
    LayoutDashboard, CreditCard, Puzzle, Building2, Wallet, MessageCircle,
    ScrollText, ShieldCheck,
} from "lucide-react";

import "./platform-admin/platform-admin.css";
import OverviewTab from "./platform-admin/OverviewTab";
import PlansTab from "./platform-admin/PlansTab";
import FeaturesTab from "./platform-admin/FeaturesTab";
import CompaniesTab from "./platform-admin/CompaniesTab";
import BillingTab from "./platform-admin/BillingTab";
import WhatsAppTab from "./platform-admin/WhatsAppTab";
import AuditTab from "./platform-admin/AuditTab";

const TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, Comp: OverviewTab },
    { id: "companies", label: "Companies", icon: Building2, Comp: CompaniesTab },
    { id: "plans", label: "Plans", icon: CreditCard, Comp: PlansTab },
    { id: "features", label: "Features", icon: Puzzle, Comp: FeaturesTab },
    { id: "billing", label: "Billing", icon: Wallet, Comp: BillingTab },
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, Comp: WhatsAppTab },
    { id: "audit", label: "Audit log", icon: ScrollText, Comp: AuditTab },
];

export default function PlatformAdmin() {
    const { isProductOwner, status } = useSelector((s) => s.access);
    const [search, setSearch] = useSearchParams();
    const tabId = TABS.some((t) => t.id === search.get("tab")) ? search.get("tab") : "overview";

    /** Switch tab, optionally with filter presets (kept in the URL). */
    const goTo = useCallback((tab, preset = {}) => {
        setSearch({ tab, ...preset });
        window.scrollTo({ top: 0 });
    }, [setSearch]);

    if (status === "succeeded" && !isProductOwner) {
        return (
            <div className="pa-page">
                <div className="pa-wrap">
                    <div className="pa-card pa-empty">You need product owner access to view this page.</div>
                </div>
            </div>
        );
    }

    const { Comp } = TABS.find((t) => t.id === tabId);
    // preset filters for the active tab (everything in the URL except `tab`)
    const preset = Object.fromEntries([...search.entries()].filter(([k]) => k !== "tab"));

    return (
        <div className="pa-page">
            <div className="pa-wrap">
                <header className="pa-head">
                    <div className="pa-head-icon"><ShieldCheck size={20} /></div>
                    <div>
                        <h2>Platform Admin</h2>
                        <p>Plans, tenants, billing and audit for the whole platform.</p>
                    </div>
                </header>
                <nav className="pa-tabs" role="tablist">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id} role="tab" aria-selected={tabId === id}
                            className={`pa-tab ${tabId === id ? "on" : ""}`}
                            onClick={() => goTo(id)}>
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </nav>
                <Comp key={`${tabId}:${search.toString()}`} goTo={goTo} preset={preset} />
            </div>
        </div>
    );
}
