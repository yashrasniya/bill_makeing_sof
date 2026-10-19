import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus, Search, Store, Trash2 } from "lucide-react";
import { clientToken } from "@/axios";
import { INDIAN_STATES } from "@/constants/states";
import { day, money, moneyShort } from "@/utility/money";
import Navbar from "../comonant/navbar.jsx";
import PageIcon from "../comonant/PageIcon";
import { initials } from "../comonant/invoiceBits";
import "../style/invoices.css";
import "../style/Companys.css";

const EMPTY = { name: "", phone_number: "", email: "", address: "", gst_number: "", state: "", state_code: "" };

// what we owe a vendor: amber while we owe them (red is kept for overdue),
// green if we've paid ahead
const payColor = (v) => (Number(v) > 0 ? "#b45309" : Number(v) < 0 ? "#16a34a" : "#0f172a");

export default function Vendors() {
    const navigate = useNavigate();
    const { permissions, features, status: accessStatus } = useSelector((state) => state.access);
    // billing stats and the report links belong to the advanced_reports plan feature
    const canStats = accessStatus === "succeeded" && features.includes("advanced_reports") && permissions.includes("report.view");
    const canViewBills = canStats && permissions.includes("invoice.view");

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");
    const [gst, setGst] = useState("");                 // "", "1" registered, "0" unregistered
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [activeId, setActiveId] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false); // phones: the detail is a full-screen sheet
    const [form, setForm] = useState(null);              // null = closed; otherwise the vendor being added / edited
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [pageError, setPageError] = useState("");

    const PAGE_SIZE = 25;

    // one request per pause in typing
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchText), 300);
        return () => clearTimeout(t);
    }, [searchText]);

    useEffect(() => { setPage(1); }, [search, gst]);

    useEffect(() => {
        let stale = false; // a slower earlier response must not overwrite a newer one
        setLoading(true);
        const params = { page, page_size: PAGE_SIZE, ordering: "name", with_stats: 1 };
        if (search) params.s = search;
        if (gst) params.has_gst = gst;
        clientToken.get("vendors/", { params })
            .then((res) => {
                if (stale) return;
                setRows(res.data.results || []);
                setTotal(res.data.count ?? (res.data.results || []).length);
                setHasNext(!!res.data.next);
                setHasPrev(!!res.data.previous);
            })
            .catch((e) => { if (!stale) setPageError(`Could not load vendors. ${e.message || ""}`); })
            .finally(() => { if (!stale) { setLoading(false); setLoaded(true); } });
        return () => { stale = true; };
    }, [page, search, gst, refresh]);

    // the detail panel follows the selected row; until one is picked (or if the
    // page changes under it) it shows the first vendor on the page
    const current = rows.find((v) => v.id === activeId) || rows[0];
    const hasStats = !!current && "outstanding_balance" in current;

    const openForm = (vendor) => { setForm(vendor ? { ...EMPTY, ...vendor } : { ...EMPTY }); setFormError(""); };
    const closeForm = () => { setForm(null); setFormError(""); };
    const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const save = () => {
        if (!form.name.trim()) { setFormError("Enter a vendor name."); return; }
        if (form.gst_number && form.gst_number.length !== 15) { setFormError("A GST number has 15 characters."); return; }
        setSaving(true);
        setFormError("");
        const body = new FormData();
        ["name", "phone_number", "email", "address", "gst_number", "state", "state_code"]
            .forEach((k) => body.append(k, form[k] ?? "")); // empty values are sent too, so a field can be cleared
        clientToken.post(form.id ? `vendors/${form.id}/` : "vendors/", body)
            .then((res) => {
                if (!form.id && res.data?.id) setActiveId(res.data.id);
                closeForm();
                setRefresh((n) => n + 1);
            })
            .catch((e) => {
                const data = e.response?.data;
                setFormError(data && typeof data === "object"
                    ? Object.entries(data).map(([k, v]) => `${k.replace("_", " ")}: ${Array.isArray(v) ? v[0] : v}`).join(" | ")
                    : "Could not save this vendor. Please check the details.");
            })
            .finally(() => setSaving(false));
    };

    const remove = (vendor) => {
        if (!window.confirm(`Delete ${vendor.name}? Their purchase invoices stay, but the vendor is removed.`)) return;
        clientToken.delete(`vendors/${vendor.id}/`)
            .then(() => { setDetailOpen(false); setRefresh((n) => n + 1); })
            .catch(() => setPageError("Could not delete this vendor."));
    };

    const hasFilters = !!(search || gst);
    const clearFilters = () => { setSearchText(""); setSearch(""); setGst(""); };
    const from = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;

    return (
        <div className="inv_page">
            <Navbar />
            <div className="inv_wrap">
                {/* ── header ── */}
                <div className="inv_head">
                    <div className="inv_title">
                        <PageIcon icon={Store} />
                        <div>
                            <h1>Vendors</h1>
                            <p>{canStats ? "See what you've bought from each vendor and what you still owe them." : "Keep your vendors' contact and GST details in one place."}</p>
                        </div>
                    </div>
                    <div className="inv_head_actions">
                        <button type="button" className="inv_btn primary" onClick={() => openForm(null)}>
                            <Plus size={16} /> Add vendor
                        </button>
                    </div>
                </div>

                {pageError && (
                    <div className="inv_notice err">
                        {pageError}
                        <button type="button" aria-label="Dismiss" onClick={() => setPageError("")}>✕</button>
                    </div>
                )}

                {/* ── search and filters ── */}
                <div className="inv_card" style={{ marginBottom: 16 }}>
                    <div className="inv_toolbar">
                        <div className="inv_search">
                            <Search size={18} />
                            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search by name, GST number or phone" aria-label="Search vendors" />
                        </div>
                        <div className="cust_chips">
                            {[["", "All"], ["1", "GST registered"], ["0", "Unregistered"]].map(([v, label]) => (
                                <button key={label} type="button" className={`cust_chip ${gst === v ? "on" : ""}`} onClick={() => setGst(v)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── list + detail ── */}
                {!loaded ? (
                    <div className="inv_loading">Loading vendors…</div>
                ) : rows.length === 0 ? (
                    <div className="inv_card">
                        <div className="inv_state">
                            <div className="ico"><Store size={30} /></div>
                            {hasFilters ? (
                                <>
                                    <h3>{search ? `No vendors match “${search}”` : "No vendors match these filters"}</h3>
                                    <p>Try a different search, or clear the filters.</p>
                                    <button type="button" className="inv_btn" onClick={clearFilters}>Clear search and filters</button>
                                </>
                            ) : (
                                <>
                                    <h3>Add your first vendor</h3>
                                    <p>Vendors you buy from show up here, with what you've bought and what you still owe.</p>
                                    <button type="button" className="inv_btn primary" onClick={() => openForm(null)}>
                                        <Plus size={16} /> Add vendor
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={`cust_split ${detailOpen ? "detail_open" : ""}`} style={loading ? { opacity: 0.7 } : undefined}>
                        {/* list */}
                        <div className="cust_list">
                            <div className="cust_list_head">{`${total} vendor${total === 1 ? "" : "s"}`}</div>
                            {rows.map((v) => (
                                <div key={v.id} className={`cust_row ${current && current.id === v.id ? "active" : ""}`}
                                    onClick={() => { setActiveId(v.id); setDetailOpen(true); }}>
                                    <span className="cust_av">{initials(v.name)}</span>
                                    <div className="cust_row_main">
                                        <div className="cust_row_name">{v.name || "—"}</div>
                                        <div className="cust_row_sub">
                                            {"outstanding_balance" in v
                                                ? `${Number(v.invoice_count) || 0} bills · last ${day(v.last_invoice_date)}`
                                                : (v.state || v.phone_number || "—")}
                                        </div>
                                    </div>
                                    {"outstanding_balance" in v && (
                                        <span className="cust_row_amt" style={{ color: payColor(v.outstanding_balance) }}>
                                            {moneyShort(v.outstanding_balance)}
                                        </span>
                                    )}
                                </div>
                            ))}
                            <div className="paging">
                                <span className="paging_summary">{`${from}–${from + rows.length - 1} of ${total}`}</span>
                                {hasPrev && <div onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</div>}
                                {hasNext && <div onClick={() => setPage((p) => p + 1)}>Next →</div>}
                            </div>
                        </div>

                        {/* detail (a full-screen sheet on phones) */}
                        {current && (
                            <div className="cust_detail">
                                <button type="button" className="cust_back" onClick={() => setDetailOpen(false)}>← All vendors</button>
                                <div className="cust_detail_head">
                                    <span className="cust_av cust_av_lg">{initials(current.name)}</span>
                                    <div className="cust_detail_title">
                                        <h2>{current.name || "—"}</h2>
                                        <p>{[current.state, current.gst_number].filter(Boolean).join(" · ") || "No state or GST number"}</p>
                                    </div>
                                    <div className="cust_head_actions">
                                        <button type="button" className="cust_btn" onClick={() => openForm(current)}>Edit</button>
                                        <button type="button" className="cust_btn danger" title="Delete vendor" aria-label="Delete vendor"
                                            onClick={() => remove(current)}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {hasStats && (
                                    <div className="cust_kpis">
                                        <div className="cust_kpi">
                                            <span>You owe</span>
                                            <strong style={{ color: payColor(current.outstanding_balance) }}>{money(current.outstanding_balance)}</strong>
                                        </div>
                                        <div className="cust_kpi">
                                            <span>Total purchased</span>
                                            <strong>{money(current.total_purchased)}</strong>
                                        </div>
                                    </div>
                                )}

                                <dl className="cust_facts">
                                    <div><dt>Phone</dt><dd>{current.phone_number || "—"}</dd></div>
                                    <div><dt>Email</dt><dd>{current.email || "—"}</dd></div>
                                    <div><dt>Address</dt><dd>{current.address || "—"}</dd></div>
                                    <div><dt>State</dt><dd>{current.state ? `${current.state}${current.state_code ? ` (${current.state_code})` : ""}` : "—"}</dd></div>
                                    <div><dt>GST number</dt><dd>{current.gst_number || "—"}</dd></div>
                                    {hasStats && <div><dt>Bills</dt><dd>{Number(current.invoice_count) || 0}</dd></div>}
                                    {hasStats && <div><dt>Last bill</dt><dd>{day(current.last_invoice_date)}</dd></div>}
                                </dl>

                                <div className="cust_actions">
                                    <button type="button" className="cust_btn primary"
                                        onClick={() => navigate(`/newBill?type=purchase&vendor=${current.id}`)}>
                                        <Plus size={16} /> New purchase
                                    </button>
                                    {(canViewBills || canStats) && (
                                        <div className="cust_actions_row">
                                            {canViewBills && (
                                                <button type="button" className="cust_btn"
                                                    onClick={() => navigate(`/bill_list?type=purchase&vendor=${current.id}`)}>
                                                    View bills
                                                </button>
                                            )}
                                            {canStats && (
                                                <button type="button" className="cust_btn"
                                                    onClick={() => navigate(`/supplier-ledger?vendor=${current.id}`)}>
                                                    Ledger
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── add / edit vendor ── */}
            {form && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 9999, padding: 16,
                        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
                >
                    <div style={{
                        background: "white", borderRadius: 22, padding: "32px 28px", width: "min(580px, 100%)",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", position: "relative", maxHeight: "90vh", overflowY: "auto",
                    }}>
                        <button type="button" onClick={closeForm} aria-label="Close" style={{
                            position: "absolute", top: 14, right: 14, background: "#f1f5f9", border: "none", borderRadius: 8,
                            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b",
                        }}>✕</button>

                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                            <PageIcon icon={Store} style={{ width: 38, height: 38 }} />
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                                    {form.id ? "Edit vendor" : "Add vendor"}
                                </h2>
                                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                                    {form.id ? "Update the vendor's details below" : "Fill in the vendor's details below"}
                                </p>
                            </div>
                        </div>

                        {formError && (
                            <div style={{ marginBottom: 20, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 500 }}>
                                {formError}
                            </div>
                        )}

                        <div className="pop-up-box_inputs">
                            <div className="form_box" style={{ flexBasis: "100%" }}>
                                Vendor name
                                <input value={form.name} onChange={(e) => setField("name", e.target.value)} autoFocus />
                            </div>
                            <div className="form_box" style={{ flexBasis: "48%" }}>
                                Phone number
                                <input value={form.phone_number || ""} onChange={(e) => setField("phone_number", e.target.value)} inputMode="tel" />
                            </div>
                            <div className="form_box" style={{ flexBasis: "48%" }}>
                                Email
                                <input value={form.email || ""} onChange={(e) => setField("email", e.target.value)} inputMode="email" />
                            </div>
                            <div className="form_box" style={{ flexBasis: "48%" }}>
                                GST number
                                <input value={form.gst_number || ""} maxLength={15}
                                    onChange={(e) => setField("gst_number", e.target.value.toUpperCase())} />
                            </div>
                            <div className="form_box" style={{ flexBasis: "48%" }}>
                                State
                                <select
                                    value={form.state || ""}
                                    onChange={(e) => {
                                        const hit = INDIAN_STATES.find((s) => s.name === e.target.value);
                                        setForm((f) => ({ ...f, state: e.target.value, state_code: hit ? hit.code : f.state_code }));
                                    }}
                                    style={{
                                        width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0",
                                        outline: "none", fontSize: 14, color: "#0f172a", background: "#f8fafc", marginTop: 4,
                                    }}
                                >
                                    <option value="">Select state…</option>
                                    {INDIAN_STATES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form_box" style={{ flexBasis: "100%" }}>
                                Address
                                <input value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
                            </div>
                        </div>

                        <div className="pop-up-box_buttons">
                            <button type="button" onClick={closeForm} style={{
                                padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white",
                                color: "#374151", fontSize: 14, fontWeight: 700, cursor: "pointer",
                            }}>Cancel</button>
                            <div className="button" onClick={saving ? undefined : save} style={saving ? { opacity: 0.7 } : undefined}>
                                {saving ? "Saving…" : form.id ? "Update" : "Save vendor"}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
