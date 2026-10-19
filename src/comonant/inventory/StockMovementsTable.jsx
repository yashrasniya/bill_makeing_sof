import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { clientToken } from "../../axios.js";
import { initials } from "../invoiceBits";
import StockMovementModal from "./StockMovementModal";

const PAGE_SIZE = 25;

// a movement's own timestamp, in the viewer's time zone ("22 Aug 2026, 4:05 pm")
const when = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
};

// `addSignal` changes when the page's "Record movement" button is pressed
function StockMovementsTable({ addSignal = 0 }) {
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState("");
    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");            // "", "IN", "OUT"
    const [page, setPage] = useState(1);
    const [recording, setRecording] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchText.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchText]);
    useEffect(() => { setPage(1); }, [search, type]);

    // the lists aren't paginated by the API, so everything loads at once
    useEffect(() => {
        let stale = false;
        Promise.all([clientToken.get("/inventory/stock-movements/"), clientToken.get("/inventory/products/")])
            .then(([m, p]) => {
                if (stale) return;
                setMovements(m.data.results || m.data);
                setProducts(p.data.results || p.data);
            })
            .catch((e) => { if (!stale) setError(`Could not load stock movements. ${e.message || ""}`); })
            .finally(() => { if (!stale) setLoaded(true); });
        return () => { stale = true; };
    }, [refresh]);

    const first = useRef(addSignal);
    useEffect(() => { if (addSignal !== first.current) setRecording(true); }, [addSignal]);

    const skuOf = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.sku])), [products]);

    const filtered = useMemo(() => [...movements]
        .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
        .filter((m) => !type || m.movement_type === type)
        .filter((m) => !search || [m.product_name, skuOf[m.product], m.notes]
            .some((f) => String(f || "").toLowerCase().includes(search))), [movements, type, search, skuOf]);

    const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const from = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;

    const remove = (m) => {
        if (!window.confirm(`Delete this ${m.movement_type === "IN" ? "stock in" : "stock out"} of ${m.quantity} × ${m.product_name}? Its effect on stock is reversed.`)) return;
        clientToken.delete(`/inventory/stock-movements/${m.id}/`)
            .then(() => setRefresh((n) => n + 1))
            .catch(() => setError("Could not delete this movement."));
    };

    const pill = (m) => (
        <span className={`inv_stock ${m.movement_type === "IN" ? "ok" : "out"}`}>{m.movement_type === "IN" ? "Stock in" : "Stock out"}</span>
    );
    const qty = (m) => <span className={`inv_qty ${m.movement_type === "IN" ? "in" : "out"}`}>{m.movement_type === "IN" ? "+" : "−"}{m.quantity}</span>;

    if (!loaded) return <div className="inv_loading">Loading stock movements…</div>;

    return (
        <div className="inv_card">
            {error && <div className="inv_notice err" style={{ margin: "16px 20px 0" }}>{error}<button type="button" aria-label="Dismiss" onClick={() => setError("")}>✕</button></div>}

            <div className="inv_toolbar">
                <div className="inv_search">
                    <Search size={18} />
                    <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search by product, SKU or note" aria-label="Search stock movements" />
                </div>
                <div className="cust_chips">
                    {[["", "All"], ["IN", "Stock in"], ["OUT", "Stock out"]].map(([v, label]) => (
                        <button key={label} type="button" className={`cust_chip ${type === v ? "on" : ""}`} onClick={() => setType(v)}>{label}</button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="inv_state">
                    <div className="ico"><ArrowLeftRight size={30} /></div>
                    {movements.length === 0 ? (
                        <>
                            <h3>Record your first stock movement</h3>
                            <p>Every item that comes in or goes out is logged here, and stock updates automatically.</p>
                            <button type="button" className="inv_btn primary" onClick={() => setRecording(true)}>Record movement</button>
                        </>
                    ) : (
                        <>
                            <h3>No movements match</h3>
                            <p>Try a different search, or clear the filters.</p>
                            <button type="button" className="inv_btn" onClick={() => { setSearchText(""); setSearch(""); setType(""); }}>Clear search and filters</button>
                        </>
                    )}
                </div>
            ) : (
                <>
                    <div className="inv_table_wrap">
                        <table className="inv_table" style={{ minWidth: 720 }}>
                            <thead>
                                <tr><th>Date</th><th>Product</th><th>Type</th><th className="num">Quantity</th><th>Note</th><th style={{ width: 48 }} /></tr>
                            </thead>
                            <tbody>
                                {rows.map((m) => (
                                    <tr key={m.id} style={{ cursor: "default" }}>
                                        <td style={{ whiteSpace: "nowrap", color: "#64748b", fontSize: 13 }}>{when(m.date)}</td>
                                        <td>
                                            <div className="inv_party">
                                                <span className="inv_av">{initials(m.product_name)}</span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="name" style={{ fontWeight: 600 }}>{m.product_name}</div>
                                                    {skuOf[m.product] && <div className="inv_sku">{skuOf[m.product]}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{pill(m)}</td>
                                        <td className="num">{qty(m)}</td>
                                        <td style={{ color: "#64748b", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.notes || ""}>{m.notes || "—"}</td>
                                        <td className="num">
                                            <button type="button" className="inv_inline_btn danger" aria-label="Delete movement" title="Delete movement" onClick={() => remove(m)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="inv_cards">
                        {rows.map((m) => (
                            <div className="inv_inv_card" key={m.id} style={{ cursor: "default" }}>
                                <div className="top">
                                    <span className="inv_av">{initials(m.product_name)}</span>
                                    <div className="party">{m.product_name}</div>
                                    <button type="button" className="inv_inline_btn danger" aria-label="Delete movement" onClick={() => remove(m)}><Trash2 size={16} /></button>
                                </div>
                                <div className="meta">
                                    <div><div style={{ marginBottom: 4 }}>{when(m.date)}</div>{pill(m)}</div>
                                    <div className="amt">{qty(m)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="inv_foot">
                        <span className="summary">{`${from}–${from + rows.length - 1} of ${filtered.length}`}</span>
                        <button type="button" className="inv_page_btn" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((n) => n - 1)}><ChevronLeft size={18} /></button>
                        <button type="button" className="inv_page_btn" aria-label="Next page" disabled={page * PAGE_SIZE >= filtered.length} onClick={() => setPage((n) => n + 1)}><ChevronRight size={18} /></button>
                    </div>
                </>
            )}

            {recording && (
                <StockMovementModal products={products} onClose={() => setRecording(false)}
                    onSaved={() => { setRecording(false); setRefresh((n) => n + 1); }} />
            )}
        </div>
    );
}

export default StockMovementsTable;
