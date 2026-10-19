import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    BarChart3, Building, FileText, LayoutDashboard, LayoutTemplate, Package, Plus, User, UserPlus, Users,
} from "lucide-react";
import { clientToken } from "@/axios";
import { day, money, moneyShort } from "@/utility/money";
import Navbar from "../comonant/navbar.jsx";
import PageIcon from "../comonant/PageIcon";
import { VerifyEmailBanner, FirstRunChecklist, SkeletonKpis } from "../comonant/FirstRun.jsx";
import { Pill, initials } from "../comonant/invoiceBits";
import "../style/invoices.css";

const RANGES = [
    { key: "this_month", label: "This month" },
    { key: "last_month", label: "Last month" },
    { key: "last_30", label: "Last 30 days" },
    { key: "this_fy", label: "This FY" },
];

const EMPTY_INFO = {
    name: "",
    month_total_final_amount: 0,
    month_gst_final_amount: 0,
    percentage_change: null,
    percentage_gst_amount: null,
    invoices_this_month_count: 0,
    invoices_prv_month_count: 0,
    receivable_amount: 0,
    receivable_count: 0,
    overdue_amount: 0,
    overdue_count: 0,
    range_label: "",
    has_any_invoice: true,   // assume yes until told otherwise, so we don't flash the empty state
};

const EMPTY_EXTRAS = {
    trend: [], recent_invoices: [], top_customers: [],
    low_stock: [], payment_methods: [], gst_due: [],
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ─────────────────────────── building blocks ─────────────────────────── */

// A card with a title and an optional link on the right
function Panel({ title, action, children }) {
    return (
        <div className="inv_card" style={{ animation: "fadeUp 0.4s ease both" }}>
            <div className="inv_card_head">
                <h2>{title}</h2>
                {action}
            </div>
            <div className="dash_body">{children}</div>
        </div>
    );
}

const LinkBtn = ({ label, onClick }) => (
    <button type="button" className="inv_link" onClick={onClick}>{label} →</button>
);

/**
 * Summary card. `pct === null` means "no comparable previous period": no
 * growth chip is shown rather than inventing a number.
 */
function Kpi({ label, value, title, sub, pct, color, onClick }) {
    const hasPct = pct !== undefined && pct !== null;
    const Tag = onClick ? "button" : "div";
    return (
        <Tag className="inv_kpi" type={onClick ? "button" : undefined} onClick={onClick} title={title}>
            <span>{label}</span>
            <strong style={color ? { color } : undefined}>{value}</strong>
            {sub && <small>{sub}</small>}
            {hasPct && (
                <span className={`delta ${pct >= 0 ? "up" : "down"}`}>
                    {pct >= 0 ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}% vs previous
                </span>
            )}
        </Tag>
    );
}

function TrendChart({ data }) {
    const max = Math.max(...data.map((d) => d.total), 1);
    return (
        <div className="dash_trend">
            {data.map((d, i) => {
                const now = i === data.length - 1;
                return (
                    <div key={d.month} className="col" title={`${d.label}: ${money(d.total)} · ${plural(d.count, "invoice")}`}>
                        <div className="zone">
                            <div className="stack" style={{ "--r": d.total / max }}>
                                {d.total > 0 && <span className="amt">{moneyShort(d.total)}</span>}
                                <div className={`bar ${now ? "now" : ""}`} />
                            </div>
                        </div>
                        <span className={`lbl ${now ? "now" : ""}`}>{d.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ─────────────────────────────── page ─────────────────────────────── */

function Home() {
    const [info, setInfo] = useState(EMPTY_INFO);
    const [extras, setExtras] = useState(EMPTY_EXTRAS);
    const [range, setRange] = useState("this_month");
    const [loaded, setLoaded] = useState(false);
    const [onboarding, setOnboarding] = useState(null);

    const navigate = useNavigate();
    const { userInfo } = useSelector((s) => s.user);
    const { permissions, features, isTenantAdmin, status: accessStatus } = useSelector((s) => s.access);

    // show everything while access info loads; filter once it's known
    const can = (perm) => accessStatus !== "succeeded" || permissions.includes(perm);
    const hasFeat = (f) => accessStatus !== "succeeded" || features.includes(f);
    const isAdmin = accessStatus !== "succeeded" || isTenantAdmin || userInfo?.is_company_admin;
    const showKpis = can("invoice.view");
    // report pages are guarded by BOTH the feature and the permission, so mirror
    // that here and never link somewhere the user just bounces off
    const canReport = can("report.view") && hasFeat("advanced_reports");
    const canInventory = can("inventory.manage") && hasFeat("inventory");

    useEffect(() => {
        let alive = true;
        clientToken.get(`user_info/?range=${range}`).then((r) => {
            if (alive && r.status === 200) setInfo({ ...EMPTY_INFO, ...r.data });
        }).catch(() => { }).finally(() => { if (alive) setLoaded(true); });
        return () => { alive = false; };
    }, [range]);

    useEffect(() => {
        let alive = true;
        clientToken.get(`dashboard/?range=${range}`).then((r) => {
            if (alive && r.status === 200) setExtras({ ...EMPTY_EXTRAS, ...r.data });
        }).catch(() => { });
        return () => { alive = false; };
    }, [range]);

    useEffect(() => {
        let alive = true;
        clientToken.get("onboarding/").then((r) => { if (alive) setOnboarding(r.data); }).catch(() => { });
        return () => { alive = false; };
    }, []);

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // first-run: the account exists but nothing has ever been billed
    const isNewUser = loaded && showKpis && info.has_any_invoice === false;

    const nextGst = useMemo(() => (extras.gst_due || [])[0], [extras.gst_due]);
    const trendHasData = (extras.trend || []).some((d) => d.total > 0);
    const topCustomerMax = (extras.top_customers[0]?.total) || 1;
    const goToInvoices = (query) => navigate(query ? `/bill_list?${query}` : "/bill_list");
    const periodLabel = info.range_label || "this month";

    // quick links to the places you're most likely to go next
    const shortcuts = isNewUser
        ? [
            can("customer.manage") && { icon: UserPlus, label: "Add customer", to: "/Customers" },
            canInventory && { icon: Package, label: "Add product", to: "/inventory" },
            hasFeat("template_designer") && can("template.manage") && { icon: LayoutTemplate, label: "Templates", to: "/available-templates" },
            isAdmin && { icon: Building, label: "My company", to: "/CompanyForm" },
        ]
        : [
            can("customer.manage") && { icon: Users, label: "Customers", to: "/Customers" },
            can("invoice.view") && { icon: FileText, label: "All invoices", to: "/bill_list" },
            hasFeat("template_designer") && can("template.manage") && { icon: LayoutTemplate, label: "Templates", to: "/available-templates" },
            canReport && { icon: BarChart3, label: "GST summary", to: "/gst-summary" },
            isAdmin && { icon: Building, label: "My company", to: "/CompanyForm" },
            { icon: User, label: "Profile", to: "/profile" },
        ];
    const visibleShortcuts = shortcuts.filter(Boolean);

    return (
        <div className="inv_page">
            <Navbar />
            <div className="inv_wrap">
                {/* ── header ── */}
                <div className="inv_head">
                    <div className="inv_title">
                        <PageIcon icon={LayoutDashboard} />
                        <div>
                            <h1>Welcome back{info.name ? `, ${info.name}` : ""}</h1>
                            <p>
                                {today}
                                {isNewUser
                                    ? " · Let's get your first bill out the door."
                                    : ` · Your business snapshot${info.range_label ? ` for ${info.range_label}` : ""}.`}
                            </p>
                        </div>
                    </div>
                    <div className="inv_head_actions">
                        {showKpis && !isNewUser && (
                            <div className="inv_seg" role="tablist" aria-label="Period">
                                {RANGES.map((r) => (
                                    <button key={r.key} type="button" role="tab" aria-selected={range === r.key}
                                        className={range === r.key ? "on" : ""} onClick={() => setRange(r.key)}>
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {can("invoice.create") && (
                            <button type="button" className="inv_btn primary" onClick={() => navigate("/newBill")}>
                                <Plus size={16} /> Create invoice
                            </button>
                        )}
                    </div>
                </div>

                <VerifyEmailBanner />

                {/* ── first run: setup checklist and placeholder numbers ── */}
                {isNewUser && (
                    <>
                        <FirstRunChecklist data={onboarding} can={can} onDismissed={setOnboarding} />
                        <SkeletonKpis />
                    </>
                )}

                {/* ── headline numbers ── */}
                {showKpis && !isNewUser && (
                    <div className="inv_kpis">
                        <Kpi
                            label={`Sales · ${periodLabel}`}
                            value={moneyShort(info.month_total_final_amount)}
                            title={money(info.month_total_final_amount)}
                            pct={info.percentage_change}
                            sub={`${plural(info.invoices_this_month_count || 0, "invoice")} · previous ${info.invoices_prv_month_count || 0}`}
                            onClick={() => goToInvoices()}
                        />
                        <Kpi
                            label="Outstanding"
                            value={moneyShort(info.receivable_amount)}
                            title={`${money(info.receivable_amount)}: billed but not yet received, net of part-payments`}
                            sub={`${plural(info.receivable_count || 0, "bill")} awaiting payment`}
                            color="#b45309"
                            onClick={() => goToInvoices("status_group=open")}
                        />
                        <Kpi
                            label="Overdue"
                            value={moneyShort(info.overdue_amount)}
                            title={info.overdue_after_days ? `Unpaid for more than ${info.overdue_after_days} days, or marked overdue` : undefined}
                            sub={info.overdue_count
                                ? `${plural(info.overdue_count, "bill")} unpaid ${info.overdue_after_days}+ days. Worth chasing.`
                                : "Nothing past due"}
                            color={info.overdue_amount > 0 ? "#dc2626" : "#166534"}
                            onClick={() => goToInvoices("status_group=overdue")}
                        />
                        <Kpi
                            label="GST collected"
                            value={moneyShort(info.month_gst_final_amount)}
                            title={money(info.month_gst_final_amount)}
                            pct={info.percentage_gst_amount}
                            sub={nextGst ? `${nextGst.form} due in ${plural(nextGst.days_left, "day")}` : "Output tax on sales"}
                            onClick={canReport ? () => navigate("/gst-summary") : undefined}
                        />
                    </div>
                )}

                {/* ── shortcuts ── */}
                {visibleShortcuts.length > 0 && (
                    <div className="inv_card" style={{ marginBottom: 16 }}>
                        <div className="inv_card_head"><h2>Shortcuts</h2></div>
                        <div className="dash_shortcuts">
                            {visibleShortcuts.map(({ icon: Icon, label, to }) => (
                                <button key={label} type="button" className="inv_btn" onClick={() => navigate(to)}>
                                    <Icon size={16} /> {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!isNewUser && showKpis && (
                    <>
                        {/* ── trend and recent activity ── */}
                        <div className="dash_row">
                            <Panel title="Sales, last 6 months"
                                action={canReport ? <LinkBtn label="Reports" onClick={() => navigate("/sales-register")} /> : null}>
                                {trendHasData
                                    ? <TrendChart data={extras.trend} />
                                    : <p className="dash_empty">Not enough history yet. This fills in as you bill.</p>}
                            </Panel>

                            <Panel title="Recent invoices" action={<LinkBtn label="View all" onClick={() => goToInvoices()} />}>
                                {extras.recent_invoices.length === 0 && <p className="dash_empty">No invoices yet.</p>}
                                {extras.recent_invoices.slice(0, 5).map((inv) => (
                                    <div key={inv.id} className="dash_item link" onClick={() => navigate(`/invoice/${inv.id}/view`)}>
                                        <span className="inv_av">{initials(inv.customer)}</span>
                                        <div className="main">
                                            <div className="nm">{inv.customer || "—"}</div>
                                            <div className="sub">{[inv.invoice_number, inv.date ? day(inv.date) : null].filter(Boolean).join(" · ")}</div>
                                        </div>
                                        <div className="val">{money(inv.total)}</div>
                                        <Pill obj={{ payment_status: inv.payment_status }} />
                                    </div>
                                ))}
                            </Panel>
                        </div>

                        {/* ── customers, stock, payments, filing ── */}
                        <div className="dash_row3">
                            {can("customer.manage") && (
                                <Panel title={`Top customers · ${periodLabel}`}
                                    action={canReport ? <LinkBtn label="Ledger" onClick={() => navigate("/customer-ledger")} /> : null}>
                                    {extras.top_customers.length === 0 && <p className="dash_empty">No customer sales in this period.</p>}
                                    {extras.top_customers.map((c, i) => (
                                        <div key={c.id} className="dash_bar" title={money(c.total)}>
                                            <div className="row"><span>{i + 1}. {c.name}</span><span>{moneyShort(c.total)}</span></div>
                                            <div className="track">
                                                <div className="fill" style={{ width: `${Math.max((c.total / topCustomerMax) * 100, 3)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </Panel>
                            )}

                            {extras.low_stock.length > 0 && (
                                <Panel title="Low stock"
                                    action={canInventory ? <LinkBtn label="Inventory" onClick={() => navigate("/inventory")} /> : null}>
                                    {extras.low_stock.slice(0, 4).map((p) => (
                                        <div key={p.id} className="dash_item">
                                            <div className="main">
                                                <div className="nm">{p.name}</div>
                                                <div className="sub">{p.sku} · reorder at {p.reorder_level}</div>
                                            </div>
                                            <span className={`inv_stock ${p.current_stock <= 0 ? "out" : "low"}`}>
                                                {p.current_stock <= 0 ? "Out" : `${p.current_stock} left`}
                                            </span>
                                        </div>
                                    ))}
                                    {extras.low_stock.length > 4 && (
                                        <p className="dash_more">
                                            {extras.low_stock.length - 4} more low on stock.{" "}
                                            {canInventory && <button type="button" className="inv_link" onClick={() => navigate("/inventory")}>See all</button>}
                                        </p>
                                    )}
                                </Panel>
                            )}

                            {extras.payment_methods.length > 0 && (
                                <Panel title="How you got paid">
                                    {extras.payment_methods.map((m) => (
                                        <div key={m.method} className="dash_kv" title={money(m.total)}>
                                            <span>{m.method.replace("_", " ")}</span>
                                            <span>{moneyShort(m.total)}</span>
                                        </div>
                                    ))}
                                </Panel>
                            )}

                            {(extras.gst_due || []).length > 0 && (
                                <Panel title="GST filing"
                                    action={canReport ? <LinkBtn label="Summary" onClick={() => navigate("/gst-summary")} /> : null}>
                                    {extras.gst_due.map((g) => (
                                        <div key={g.form} className="dash_item">
                                            <div className="main">
                                                <div className="nm">{g.form}</div>
                                                <div className="sub">for {g.period}</div>
                                            </div>
                                            <span className="inv_pill" style={g.days_left <= 3
                                                ? { background: "#fee2e2", color: "#b91c1c" }
                                                : { background: "#f1f5f9", color: "#475569" }}>
                                                {g.days_left === 0 ? "Due today" : `${g.days_left}d left`}
                                            </span>
                                        </div>
                                    ))}
                                    <p style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0 0" }}>
                                        Standard deadlines. Confirm against the GST portal.
                                    </p>
                                </Panel>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export { Home };
