import "../style/history.css";
import "../style/invoices.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ChevronLeft, ChevronRight, Download, FileText, MoreVertical, Plus, Trash2 } from "lucide-react";
import { clientToken } from "../axios";
import PdfOpener from "@/utility/pdf_opener";
import { day, money } from "@/utility/money";
import { GST_STATES } from "@/constants/gst";
import { DueDate, Hint, Pill, dueNote, initials, isOpen } from "./invoiceBits";

const partyOf = (obj) => (obj.invoice_type === "purchase" ? obj.vendor_name : obj.receiver_name) || "—";
const stateOf = (code) => GST_STATES.find((s) => s.code === code)?.name || (code ? String(code) : "—");

function RowMenu({ obj, canDelete, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div className="inv_row_menu" ref={ref} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="inv_kebab" aria-label="Invoice actions" onClick={() => setOpen((v) => !v)}>
                <MoreVertical size={18} />
            </button>
            {open && (
                <div className="inv_menu">
                    <button type="button" onClick={() => {
                        setOpen(false);
                        clientToken.get(`pdf/?id=${obj.id}`, { responseType: "blob" }).then((r) => PdfOpener(r, obj, []));
                    }}>
                        <Download size={15} /> Download PDF
                    </button>
                    {canDelete && (
                        <button type="button" className="danger" onClick={() => { setOpen(false); onDelete(obj); }}>
                            <Trash2 size={15} /> Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function History({ filters = {}, hasFilters = false, onClearFilters, onChanged }) {
    const navigate = useNavigate();
    const { permissions, status: accessStatus } = useSelector((state) => state.access);
    const canDelete = accessStatus !== "succeeded" || permissions.includes("invoice.delete");

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);
    const [page, setPage] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState("");
    // Which optional fields the company shows (UI Config -> Invoice Fields). A company that hides due date
    // or place of supply gets no column for it. If the settings can't be read, show them.
    const [headerCfg, setHeaderCfg] = useState(null);
    useEffect(() => {
        clientToken.get("invoice-header-config/", { suppressErrorToast: true })
            .then((r) => setHeaderCfg(r.data?.fields || null))
            .catch(() => setHeaderCfg(null));
    }, []);
    const isPurchase = filters.invoice_type === "purchase";
    const showDue = headerCfg?.payment_terms?.visible !== false;
    const showPlace = !isPurchase && headerCfg?.place_of_supply?.visible !== false;

    // a different filter set starts again from page one
    useEffect(() => { setPage(1); }, [filters]);

    useEffect(() => {
        let stale = false; // a slower earlier response must not overwrite a newer one
        setLoading(true);
        const params = { ...filters, page };
        if (Array.isArray(filters.customer)) params.customer = filters.customer.join();
        if (Array.isArray(filters.vendor)) params.vendor = filters.vendor.join();
        clientToken.get("invoice/", { params })
            .then((response) => {
                if (stale || response.status !== 200) return;
                setRows(response.data.results || []);
                setTotal(response.data.count ?? (response.data.results || []).length);
                setHasNext(!!response.data.next);
                setHasPrev(!!response.data.previous);
                setError("");
            })
            .catch((e) => { if (!stale) setError(`Could not load invoices. ${e.message || ""}`); })
            .finally(() => { if (!stale) { setLoading(false); setLoaded(true); } });
        return () => { stale = true; };
    }, [page, filters, refresh]);

    const handleDelete = (obj) => {
        if (!window.confirm(`Delete invoice ${obj.invoice_number || `#${obj.id}`}? This cannot be undone.`)) return;
        clientToken.delete(`invoice/?id=${obj.id}`)
            .then(() => { setRefresh((n) => n + 1); if (onChanged) onChanged(); })
            .catch(() => setError("Could not delete that invoice."));
    };

    const open = (obj) => navigate(`/invoice/${obj.id}/view`);
    const size = Number(filters.page_size) || 15;
    const from = rows.length ? (page - 1) * size + 1 : 0;

    if (!loaded) return <div className="inv_loading">Loading invoices…</div>;

    return (
        <div>
            {error && (
                <div className="inv_error">
                    {error}
                    <button type="button" aria-label="Dismiss" onClick={() => setError("")}>✕</button>
                </div>
            )}

            {rows.length === 0 ? (
                <div className="inv_state">
                    <div className="ico"><FileText size={30} /></div>
                    {hasFilters ? (
                        <>
                            <h3>No invoices match</h3>
                            <p>Try a different search, or clear the filters to see everything.</p>
                            {onClearFilters && <button type="button" className="inv_btn" onClick={onClearFilters}>Clear search and filters</button>}
                        </>
                    ) : (
                        <>
                            <h3>Create your first invoice</h3>
                            <p>Invoices you create show up here with their payment status.</p>
                            <button type="button" className="inv_btn primary"
                                onClick={() => navigate(filters.invoice_type === "purchase" ? "/newBill?type=purchase" : "/newBill")}>
                                <Plus size={16} /> Create invoice
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <>
                    {/* desktop / tablet */}
                    <div className={`inv_table_wrap ${loading ? "dim" : ""}`}>
                        <table className="inv_table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>{filters.invoice_type === "purchase" ? "Vendor" : "Customer"}</th>
                                    <th>Date</th>
                                    {showDue && <th>Due date</th>}
                                    {showPlace && <th>Place of supply</th>}
                                    <th className="num">Amount</th>
                                    <th className="num">Balance due</th>
                                    <th>Status</th>
                                    <th style={{ width: 48 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((obj) => (
                                    <tr key={obj.id} onClick={() => open(obj)}>
                                        <td className="no">{obj.invoice_number || "No number"}</td>
                                        <td>
                                            <div className="inv_party">
                                                <span className="inv_av">{initials(partyOf(obj))}</span>
                                                <span className="name" title={partyOf(obj)}>{partyOf(obj)}</span>
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: "nowrap" }}>{day(obj.date)}</td>
                                        {showDue && <td><DueDate obj={obj} /></td>}
                                        {showPlace && <td>{obj.place_of_supply ? stateOf(obj.place_of_supply) : <span className="muted">Customer's state</span>}</td>}
                                        <td className="num strong">{money(obj.total_final_amount)}</td>
                                        <td className={`num ${isOpen(obj) ? "owed" : "muted"}`}>
                                            {isOpen(obj) ? money(obj.balance_due) : "—"}
                                        </td>
                                        <td><Pill obj={obj} /><Hint obj={obj} /></td>
                                        <td className="num"><RowMenu obj={obj} canDelete={canDelete} onDelete={handleDelete} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* phones */}
                    <div className="inv_cards" style={loading ? { opacity: 0.55 } : undefined}>
                        {rows.map((obj) => (
                            <div className="inv_inv_card" key={obj.id} onClick={() => open(obj)}>
                                <div className="top">
                                    <span className="inv_av">{initials(partyOf(obj))}</span>
                                    <div className="party">{partyOf(obj)}</div>
                                    <RowMenu obj={obj} canDelete={canDelete} onDelete={handleDelete} />
                                </div>
                                <div className="meta">
                                    <div>
                                        <div style={{ fontWeight: 600, color: "#4338ca", marginBottom: 4 }}>{obj.invoice_number || "No number"} · {day(obj.date)}</div>
                                        {showDue && obj.due_date && (
                                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                                                Due {day(obj.due_date)}
                                                {dueNote(obj) && <span className={`inv_hint${dueNote(obj).late ? " late" : ""}`} style={{ display: "inline", marginLeft: 6 }}>· {dueNote(obj).text}</span>}
                                            </div>
                                        )}
                                        <Pill obj={obj} />
                                    </div>
                                    <div className="amt">
                                        {money(obj.total_final_amount)}
                                        {isOpen(obj) && <small>{money(obj.balance_due)} due</small>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="inv_foot">
                        <span className="summary">{`${from}–${from + rows.length - 1} of ${total}`}</span>
                        <button type="button" className="inv_page_btn" aria-label="Previous page"
                            disabled={!hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft size={18} />
                        </button>
                        <button type="button" className="inv_page_btn" aria-label="Next page"
                            disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default History;
