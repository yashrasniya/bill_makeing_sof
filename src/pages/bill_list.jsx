import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronDown, Download, FileText, Filter, Plus, Search } from "lucide-react";
import { clientToken } from "../axios";
import History from "../comonant/history";
import PageIcon from "../comonant/PageIcon";
import MultiSelectDropdown from "../comonant/MultiSelectDropdown";
import { moneyShort } from "@/utility/money";
import "../style/invoices.css";

// Status tabs. "overdue" is the dashboard's derived definition (a status group),
// the others are exact payment statuses.
const TABS = [
    { key: "", label: "All", count: "all" },
    { key: "unpaid", label: "Unpaid", count: "unpaid" },
    { key: "partially_paid", label: "Partial", count: "partially_paid" },
    { key: "overdue", label: "Overdue", count: "overdue" },
    { key: "paid", label: "Paid", count: "paid" },
];

const COPY = {
    sales: { billed: "Billed this month", open: "Awaiting payment", settled: "Collected this month", noun: "Customer" },
    purchase: { billed: "Purchased this month", open: "To pay", settled: "Paid this month", noun: "Vendor" },
};

const download = (blob, name) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", name);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
};

const Bill_list = () => {
    const navigate = useNavigate();
    const { features, status: accessStatus } = useSelector((state) => state.access);
    const [searchParams, setSearchParams] = useSearchParams();
    // dashboard cards and the Customers page deep-link here:
    //   ?payment_status=overdue   → one exact status
    //   ?status_group=open        → everything still owing
    //   ?type=purchase            → purchase invoices
    //   ?customer=<id>            → one customer's bills
    const initialStatus = searchParams.get("payment_status") || "";
    const initialGroup = searchParams.get("status_group") || "";
    const initialType = searchParams.get("type") === "purchase" ? "purchase" : "sales";
    const initialCustomer = searchParams.get("customer");

    const [filters, setFilters] = useState({
        s: "",
        customer: initialCustomer ? [Number(initialCustomer)] : [],
        date_from: "",
        date_to: "",
        invoice_type: initialType,
        page_size: 15,
        ordering: "-date",
        payment_status: initialStatus,
        ...(initialGroup ? { status_group: initialGroup } : {}),
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [summary, setSummary] = useState(null);
    const [summaryTick, setSummaryTick] = useState(0);
    const [customerLabel, setCustomerLabel] = useState("");
    const [pageError, setPageError] = useState("");
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);

    const handleChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

    // search box → filter, once typing pauses
    useEffect(() => {
        const t = setTimeout(() => setFilters((prev) => (prev.s === searchTerm ? prev : { ...prev, s: searchTerm })), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // Name for the customer chip. The customers list is paginated, so ask for
    // this one row by id rather than hoping it is on the first page.
    useEffect(() => {
        if (filters.customer.length !== 1) { setCustomerLabel(""); return undefined; }
        let alive = true;
        clientToken.get(`companies/?id=${filters.customer[0]}`)
            .then((r) => { if (alive) setCustomerLabel(((r.data.results || r.data || [])[0] || {}).name || ""); })
            .catch(() => { if (alive) setCustomerLabel(""); });
        return () => { alive = false; };
    }, [filters.customer]);

    // headline numbers + tab counts. The counts follow the search / customer / date
    // filters; the four cards are company-wide and ignore them (server-side).
    useEffect(() => {
        let stale = false;
        const params = { invoice_type: filters.invoice_type };
        if (filters.s) params.s = filters.s;
        if (filters.customer.length) params.customer = filters.customer.join();
        if (filters.date_from) params.date_from = filters.date_from;
        if (filters.date_to) params.date_to = filters.date_to;
        clientToken.get("invoice/summary/", { params })
            .then((r) => { if (!stale) setSummary(r.data); })
            .catch(() => { if (!stale) setSummary(null); }); // the list still works without it
        return () => { stale = true; };
    }, [filters.invoice_type, filters.s, filters.customer, filters.date_from, filters.date_to, summaryTick]);

    useEffect(() => {
        const close = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    // ── tabs ──
    const activeTab = filters.status_group === "overdue" ? "overdue" : (filters.status_group ? null : filters.payment_status || "");
    const selectTab = (key) => setFilters((prev) => {
        const next = { ...prev, payment_status: "" };
        delete next.status_group;
        if (key === "overdue") next.status_group = "overdue";
        else next.payment_status = key;
        return next;
    });
    const showOpen = () => setFilters((prev) => ({ ...prev, payment_status: "", status_group: "open" }));
    const clearStatus = () => selectTab("");

    const setType = (type) => {
        setFilters((prev) => ({ ...prev, invoice_type: type }));
        setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set("type", type); return next; }, { replace: true });
    };

    const hasFilters = !!(filters.s || filters.customer.length || filters.date_from || filters.date_to
        || filters.payment_status || filters.status_group);
    const clearAll = () => {
        setSearchTerm("");
        setFilters((prev) => ({
            s: "", customer: [], date_from: "", date_to: "", invoice_type: prev.invoice_type,
            page_size: 15, payment_status: "", ordering: "-date",
        }));
    };

    // ── export (a copy of the filters is sent; never mutate state) ──
    const exportAllowed = () => {
        if (!(accessStatus === "succeeded" && features.includes("bulk_export"))) {
            setPageError("Your current subscription does not contain this feature");
            return false;
        }
        return true;
    };
    const runExport = (type, mime, name, open) => {
        setExportOpen(false);
        const body = type ? { ...filters, type } : { ...filters };
        clientToken.post("bulk_export/", body, { responseType: "blob" })
            .then((response) => {
                const blob = new Blob([response.data], { type: mime });
                if (open) {
                    const win = window.open(window.URL.createObjectURL(blob), "_blank");
                    if (!win) setPageError("Allow pop-ups for this site to open the PDF.");
                } else {
                    download(blob, name);
                }
            })
            .catch(() => setPageError("Could not export invoices. Please try again."));
    };

    const copy = COPY[filters.invoice_type];
    const kpi = (label, value, sub, onClick) => {
        const Tag = onClick ? "button" : "div";
        return (
            <Tag className="inv_kpi" type={onClick ? "button" : undefined} onClick={onClick}>
                <span>{label}</span>
                <strong style={value.style}>{value.text}</strong>
                {sub && <small>{sub}</small>}
            </Tag>
        );
    };

    return (
        <div className="inv_page">
            <div className="inv_wrap">
                {/* ── header ── */}
                <div className="inv_head">
                    <div className="inv_title">
                        <PageIcon icon={FileText} />
                        <div>
                            <h1>Invoices</h1>
                            <p>Track what you've billed, what's been paid, and what's overdue.</p>
                        </div>
                    </div>
                    <div className="inv_head_actions">
                        <div className="inv_seg" role="tablist" aria-label="Invoice type">
                            <button type="button" role="tab" aria-selected={filters.invoice_type === "sales"}
                                className={filters.invoice_type === "sales" ? "on" : ""} onClick={() => setType("sales")}>Sales</button>
                            <button type="button" role="tab" aria-selected={filters.invoice_type === "purchase"}
                                className={filters.invoice_type === "purchase" ? "on" : ""} onClick={() => setType("purchase")}>Purchases</button>
                        </div>
                        <button type="button" className="inv_btn primary"
                            onClick={() => navigate(filters.invoice_type === "purchase" ? "/newBill?type=purchase" : "/newBill")}>
                            <Plus size={16} /> Create invoice
                        </button>
                    </div>
                </div>

                {/* ── headline numbers ── */}
                {summary && (
                    <div className="inv_kpis">
                        {kpi(copy.billed, { text: moneyShort(summary.billed_this_month) })}
                        {kpi(copy.open, { text: moneyShort(summary.awaiting_amount), style: { color: "#b45309" } },
                            `${summary.awaiting_count} invoice${summary.awaiting_count === 1 ? "" : "s"}`, showOpen)}
                        {kpi("Overdue", { text: moneyShort(summary.overdue_amount), style: { color: summary.overdue_amount > 0 ? "#dc2626" : undefined } },
                            `${summary.overdue_count} older than ${summary.overdue_after_days} days`, () => selectTab("overdue"))}
                        {kpi(copy.settled, { text: moneyShort(summary.settled_this_month), style: { color: "#166534" } })}
                    </div>
                )}

                {/* ── list ── */}
                <div className="inv_card">
                    <div className="inv_tabs" role="tablist" aria-label="Payment status">
                        {TABS.map((t) => (
                            <button key={t.key || "all"} type="button" role="tab" aria-selected={activeTab === t.key}
                                className={`inv_tab ${activeTab === t.key ? "on" : ""}`} onClick={() => selectTab(t.key)}>
                                {t.label}
                                {summary && <em>{summary.counts[t.count] ?? 0}</em>}
                            </button>
                        ))}
                    </div>

                    <div className="inv_toolbar">
                        <div className="inv_search">
                            <Search size={18} />
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={`Search invoice number or ${copy.noun.toLowerCase()} name`} aria-label="Search invoices" />
                        </div>
                        <button type="button" className={`inv_btn ${showFilters ? "on" : "ghost"}`} onClick={() => setShowFilters((v) => !v)}>
                            <Filter size={16} /> Filters
                        </button>
                        <div className="inv_menu_wrap" ref={exportRef}>
                            <button type="button" className="inv_btn ghost" onClick={() => { if (exportAllowed()) setExportOpen((v) => !v); }}>
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {exportOpen && (
                                <div className="inv_menu">
                                    <button type="button" onClick={() => runExport("CSV", "text/csv", "invoices_export.csv")}>Export as CSV</button>
                                    <button type="button" onClick={() => runExport("PDF_DATA", "application/pdf", "invoices_export_data.pdf")}>Export summary as PDF</button>
                                    <button type="button" onClick={() => runExport(null, "application/pdf", "invoices.pdf", true)}>Open all invoices as one PDF</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {showFilters && (
                        <div className="inv_filters">
                            <div className="inv_field" style={{ flex: "2 1 220px" }}>
                                <label>{copy.noun}</label>
                                <MultiSelectDropdown
                                    label={copy.noun}
                                    fetchOptions={async (search) => {
                                        try {
                                            const r = await clientToken.get(`companies/?s=${encodeURIComponent(search)}`);
                                            return r.data.results.map((c) => ({ value: c.id, label: c.name }));
                                        } catch (e) {
                                            console.error("Error fetching customers:", e);
                                            return [];
                                        }
                                    }}
                                    selected={filters.customer}
                                    onChange={(v) => handleChange("customer", v)}
                                />
                            </div>
                            <div className="inv_field" style={{ flex: "2 1 260px" }}>
                                <label>Date range</label>
                                <div className="inv_dates">
                                    <input type="date" value={filters.date_from} onChange={(e) => handleChange("date_from", e.target.value)} aria-label="From date" />
                                    <span>–</span>
                                    <input type="date" value={filters.date_to} onChange={(e) => handleChange("date_to", e.target.value)} aria-label="To date" />
                                </div>
                            </div>
                            <div className="inv_field">
                                <label>Sort by</label>
                                <select value={filters.ordering} onChange={(e) => handleChange("ordering", e.target.value)}>
                                    <option value="-date">Date (newest first)</option>
                                    <option value="date">Date (oldest first)</option>
                                    <option value="-total_final_amount">Amount (high to low)</option>
                                    <option value="total_final_amount">Amount (low to high)</option>
                                </select>
                            </div>
                            <div className="inv_field" style={{ flex: "0 1 110px" }}>
                                <label>Page size</label>
                                <select value={filters.page_size} onChange={(e) => handleChange("page_size", Number(e.target.value))}>
                                    {[15, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div className="inv_filter_actions">
                                <button type="button" className="inv_btn ghost" onClick={clearAll}>Clear</button>
                            </div>
                        </div>
                    )}

                    {/* filters that came in by link or aren't a tab */}
                    {(customerLabel || filters.status_group === "open") && (
                        <div className="inv_chips">
                            <span className="lead">Showing:</span>
                            {customerLabel && (
                                <button type="button" className="inv_chip" title="Remove this filter" onClick={() => handleChange("customer", [])}>
                                    {customerLabel} <span aria-hidden="true">×</span>
                                </button>
                            )}
                            {filters.status_group === "open" && (
                                <button type="button" className="inv_chip" title="Remove this filter" onClick={clearStatus}>
                                    Awaiting payment <span aria-hidden="true">×</span>
                                </button>
                            )}
                        </div>
                    )}

                    {pageError && (
                        <div className="inv_error">
                            {pageError}
                            <button type="button" aria-label="Dismiss" onClick={() => setPageError("")}>✕</button>
                        </div>
                    )}

                    <History
                        filters={filters}
                        hasFilters={hasFilters}
                        onClearFilters={clearAll}
                        onChanged={() => setSummaryTick((n) => n + 1)}
                    />
                </div>
            </div>
        </div>
    );
};

export default Bill_list;
