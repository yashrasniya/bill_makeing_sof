import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Package, Plus, Search, Trash2 } from "lucide-react";
import { clientToken } from "../../axios.js";
import { day, money, moneyShort } from "@/utility/money";
import { initials } from "../invoiceBits";
import Modal from "../Modal";
import StockMovementModal from "./StockMovementModal";

const EMPTY = {
    sku: "", name: "", description: "", price: "", gst_percentage: 18, current_stock: 0,
    reorder_level: 10, category: "", vendor: "",
};
const PAGE_SIZE = 25;

// out: nothing left (or oversold); low: at or under the reorder level
const stockState = (p) => (p.current_stock <= 0 ? "out" : p.current_stock <= p.reorder_level ? "low" : "ok");
const STOCK_LABEL = { ok: "In stock", low: "Low", out: "Out of stock" };

const selectStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0",
    outline: "none", fontSize: 14, color: "#0f172a", background: "#f8fafc", marginTop: 4,
};

// `addSignal` changes when the page's "Add product" button is pressed
function ProductsTable({ addSignal = 0 }) {
    const [all, setAll] = useState([]);
    const [categories, setCategories] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState("");

    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");
    const [stock, setStock] = useState("");          // "", "low", "out"
    const [category, setCategory] = useState("");
    const [page, setPage] = useState(1);
    const [activeId, setActiveId] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false); // phones: the detail is a full-screen sheet

    const [form, setForm] = useState(null);          // null = closed
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [adjusting, setAdjusting] = useState(false);
    const [recent, setRecent] = useState([]);

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchText.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchText]);
    useEffect(() => { setPage(1); }, [search, stock, category]);

    // the lists aren't paginated by the API, so the whole catalogue loads at once
    // and search, filters and the summary numbers are all computed here
    useEffect(() => {
        let stale = false;
        Promise.all([
            clientToken.get("/inventory/products/"),
            clientToken.get("/inventory/categories/"),
            clientToken.get("/vendors/?page_size=1000"),
        ]).then(([p, c, v]) => {
            if (stale) return;
            setAll(p.data.results || p.data);
            setCategories(c.data.results || c.data);
            setVendors(v.data.results || v.data);
        }).catch((e) => { if (!stale) setError(`Could not load products. ${e.message || ""}`); })
            .finally(() => { if (!stale) setLoaded(true); });
        return () => { stale = true; };
    }, [refresh]);

    // open the add form when the page header's button is pressed (not on first mount)
    const firstSignal = useRef(addSignal);
    useEffect(() => { if (addSignal !== firstSignal.current) openForm(null); }, [addSignal]);

    const kpis = useMemo(() => ({
        count: all.length,
        value: all.reduce((n, p) => n + Math.max(p.current_stock, 0) * (Number(p.price) || 0), 0),
        low: all.filter((p) => stockState(p) === "low").length,
        out: all.filter((p) => stockState(p) === "out").length,
    }), [all]);

    const filtered = useMemo(() => all
        .filter((p) => !stock || stockState(p) === stock)
        .filter((p) => !category || String(p.category) === category)
        .filter((p) => !search || [p.name, p.sku, p.description, p.category_name, p.vendor_name]
            .some((f) => String(f || "").toLowerCase().includes(search)))
        .sort((a, b) => a.name.localeCompare(b.name)), [all, stock, category, search]);

    const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const current = filtered.find((p) => p.id === activeId) || rows[0];

    // the selected product's latest movements
    useEffect(() => {
        if (!current) { setRecent([]); return undefined; }
        let stale = false;
        clientToken.get("/inventory/stock-movements/", { params: { product: current.id } })
            .then((r) => {
                if (stale) return;
                const list = r.data.results || r.data;
                setRecent([...list].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));
            }).catch(() => { if (!stale) setRecent([]); });
        return () => { stale = true; };
    }, [current?.id, current?.current_stock, refresh]);

    const openForm = (p) => {
        setForm(p ? { ...EMPTY, ...p, description: p.description || "", category: p.category || "", vendor: p.vendor || "" } : { ...EMPTY });
        setFormError("");
    };
    const closeForm = () => { setForm(null); setFormError(""); };
    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const save = () => {
        if (!form.sku.trim() || !form.name.trim()) { setFormError("Enter a SKU and a name."); return; }
        if (form.price === "" || Number(form.price) < 0) { setFormError("Enter a price."); return; }
        const gst = Number(form.gst_percentage);
        if (!(gst >= 0 && gst <= 100)) { setFormError("GST must be between 0 and 100."); return; }
        const payload = {
            sku: form.sku.trim(), name: form.name.trim(), description: form.description, price: form.price,
            gst_percentage: form.gst_percentage, reorder_level: form.reorder_level,
            category: form.category || null, vendor: form.vendor || null,
        };
        // stock is only set when creating; afterwards it changes through movements
        if (!form.id) payload.current_stock = form.current_stock;
        setSaving(true);
        setFormError("");
        (form.id ? clientToken.put(`/inventory/products/${form.id}/`, payload) : clientToken.post("/inventory/products/", payload))
            .then((res) => { if (!form.id && res.data?.id) setActiveId(res.data.id); closeForm(); setRefresh((n) => n + 1); })
            .catch((e) => {
                const d = e.response?.data;
                setFormError(d && typeof d === "object"
                    ? Object.entries(d).map(([k, v]) => `${k.replace("_", " ")}: ${Array.isArray(v) ? v[0] : v}`).join(" | ")
                    : "Could not save this product.");
            })
            .finally(() => setSaving(false));
    };

    const remove = (p) => {
        if (!window.confirm(`Delete ${p.name}? It is removed from your catalogue; its past stock movements stay in the log.`)) return;
        clientToken.delete(`/inventory/products/${p.id}/`)
            .then(() => { setDetailOpen(false); setRefresh((n) => n + 1); })
            .catch(() => setError("Could not delete this product."));
    };

    const clearFilters = () => { setSearchText(""); setSearch(""); setStock(""); setCategory(""); };
    const hasFilters = !!(search || stock || category);
    const from = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
    const hasNext = page * PAGE_SIZE < filtered.length;

    const kpi = (label, value, sub, onClick, color) => {
        const Tag = onClick ? "button" : "div";
        return (
            <Tag className="inv_kpi" type={onClick ? "button" : undefined} onClick={onClick}>
                <span>{label}</span>
                <strong style={color ? { color } : undefined}>{value}</strong>
                {sub && <small>{sub}</small>}
            </Tag>
        );
    };

    if (!loaded) return <div className="inv_loading">Loading products…</div>;

    return (
        <div>
            {error && (
                <div className="inv_notice err">{error}<button type="button" aria-label="Dismiss" onClick={() => setError("")}>✕</button></div>
            )}

            {all.length === 0 ? (
                <div className="inv_card">
                    <div className="inv_state">
                        <div className="ico"><Package size={30} /></div>
                        <h3>Add your first product</h3>
                        <p>Products you stock show up here with their price, GST and how many you have left.</p>
                        <button type="button" className="inv_btn primary" onClick={() => openForm(null)}><Plus size={16} /> Add product</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="inv_kpis">
                        {kpi("Products", kpis.count, `${categories.length} categor${categories.length === 1 ? "y" : "ies"}`)}
                        {kpi("Stock value", moneyShort(kpis.value), "at selling price")}
                        {kpi("Low stock", kpis.low, "at or under reorder level", () => setStock("low"), kpis.low > 0 ? "#b45309" : undefined)}
                        {kpi("Out of stock", kpis.out, "nothing left to sell", () => setStock("out"), kpis.out > 0 ? "#dc2626" : undefined)}
                    </div>

                    <div className="inv_card" style={{ marginBottom: 16 }}>
                        <div className="inv_toolbar">
                            <div className="inv_search">
                                <Search size={18} />
                                <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Search by name, SKU or category" aria-label="Search products" />
                            </div>
                            <div className="cust_chips">
                                {[["", "All"], ["low", "Low stock"], ["out", "Out of stock"]].map(([v, label]) => (
                                    <button key={label} type="button" className={`cust_chip ${stock === v ? "on" : ""}`} onClick={() => setStock(v)}>{label}</button>
                                ))}
                            </div>
                            {categories.length > 0 && (
                                <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"
                                    style={{ ...selectStyle, width: "auto", marginTop: 0, height: 40, padding: "0 12px" }}>
                                    <option value="">All categories</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="inv_card">
                            <div className="inv_state">
                                <div className="ico"><Package size={30} /></div>
                                <h3>{search ? `No products match “${searchText}”` : "No products match these filters"}</h3>
                                <p>Try a different search, or clear the filters.</p>
                                {hasFilters && <button type="button" className="inv_btn" onClick={clearFilters}>Clear search and filters</button>}
                            </div>
                        </div>
                    ) : (
                        <div className={`cust_split ${detailOpen ? "detail_open" : ""}`}>
                            {/* list */}
                            <div className="cust_list">
                                <div className="cust_list_head">{`${filtered.length} product${filtered.length === 1 ? "" : "s"}`}</div>
                                {rows.map((p) => {
                                    const st = stockState(p);
                                    return (
                                        <div key={p.id} className={`cust_row ${current && current.id === p.id ? "active" : ""}`}
                                            onClick={() => { setActiveId(p.id); setDetailOpen(true); }}>
                                            <span className="cust_av">{initials(p.name)}</span>
                                            <div className="cust_row_main">
                                                <div className="cust_row_name">{p.name}</div>
                                                <div className="cust_row_sub">{[p.sku, p.category_name].filter(Boolean).join(" · ")}</div>
                                            </div>
                                            <span className={`inv_stock ${st}`}>{st === "out" ? "Out" : p.current_stock}</span>
                                        </div>
                                    );
                                })}
                                <div className="paging">
                                    <span className="paging_summary">{`${from}–${from + rows.length - 1} of ${filtered.length}`}</span>
                                    {page > 1 && <div onClick={() => setPage((n) => n - 1)}>← Prev</div>}
                                    {hasNext && <div onClick={() => setPage((n) => n + 1)}>Next →</div>}
                                </div>
                            </div>

                            {/* detail (a full-screen sheet on phones) */}
                            {current && (
                                <div className="cust_detail">
                                    <button type="button" className="cust_back" onClick={() => setDetailOpen(false)}>← All products</button>
                                    <div className="cust_detail_head">
                                        <span className="cust_av cust_av_lg">{initials(current.name)}</span>
                                        <div className="cust_detail_title">
                                            <h2>{current.name}</h2>
                                            <p><span className="inv_sku">{current.sku}</span>{current.category_name ? ` · ${current.category_name}` : ""}</p>
                                        </div>
                                        <div className="cust_head_actions">
                                            <button type="button" className="cust_btn" onClick={() => openForm(current)}>Edit</button>
                                            <button type="button" className="cust_btn danger" title="Delete product" aria-label="Delete product" onClick={() => remove(current)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="cust_kpis">
                                        <div className="cust_kpi">
                                            <span>In stock</span>
                                            <strong style={{ color: { ok: "#166534", low: "#b45309", out: "#dc2626" }[stockState(current)] }}>{current.current_stock}</strong>
                                        </div>
                                        <div className="cust_kpi">
                                            <span>Price</span>
                                            <strong>{money(current.price)}</strong>
                                        </div>
                                    </div>

                                    <dl className="cust_facts">
                                        <div><dt>Status</dt><dd><span className={`inv_stock ${stockState(current)}`}>{STOCK_LABEL[stockState(current)]}</span></dd></div>
                                        <div><dt>Reorder at</dt><dd>{current.reorder_level}</dd></div>
                                        <div><dt>GST</dt><dd>{Number(current.gst_percentage)}%</dd></div>
                                        <div><dt>Stock value</dt><dd>{money(Math.max(current.current_stock, 0) * (Number(current.price) || 0))}</dd></div>
                                        <div><dt>Category</dt><dd>{current.category_name || "—"}</dd></div>
                                        <div><dt>Vendor</dt><dd>{current.vendor_name || current.supplier_name || "—"}</dd></div>
                                        {current.description && <div><dt>Description</dt><dd>{current.description}</dd></div>}
                                    </dl>

                                    <p className="inv_subhead">Recent movements</p>
                                    {recent.length === 0 ? (
                                        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8" }}>No stock movements yet.</p>
                                    ) : (
                                        <ul className="inv_mini">
                                            {recent.map((m) => (
                                                <li key={m.id}>
                                                    <span>{day(m.date)}{m.notes ? ` · ${m.notes}` : ""}</span>
                                                    <span className={`inv_qty ${m.movement_type === "IN" ? "in" : "out"}`}>{m.movement_type === "IN" ? "+" : "−"}{m.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className="cust_actions">
                                        <button type="button" className="cust_btn primary" onClick={() => setAdjusting(true)}>
                                            <ArrowLeftRight size={16} /> Adjust stock
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {adjusting && current && (
                <StockMovementModal products={all} productId={current.id} onClose={() => setAdjusting(false)}
                    onSaved={() => { setAdjusting(false); setRefresh((n) => n + 1); }} />
            )}

            {form && (
                <Modal icon={Package} title={form.id ? "Edit product" : "Add product"}
                    subtitle={form.id ? "Update the product's details below" : "Fill in the product's details below"} onClose={closeForm}
                    footer={(
                        <>
                            <button type="button" onClick={closeForm} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", color: "#374151", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                            <div className="button" onClick={saving ? undefined : save} style={saving ? { opacity: 0.7 } : undefined}>{saving ? "Saving…" : form.id ? "Update" : "Save product"}</div>
                        </>
                    )}>
                    {formError && <div className="inv_notice err">{formError}</div>}
                    <div className="pop-up-box_inputs">
                        <div className="form_box" style={{ flexBasis: "48%" }}>SKU<input value={form.sku} onChange={(e) => setField("sku", e.target.value)} autoFocus /></div>
                        <div className="form_box" style={{ flexBasis: "48%" }}>Name<input value={form.name} onChange={(e) => setField("name", e.target.value)} /></div>
                        <div className="form_box" style={{ flexBasis: "48%" }}>
                            Category
                            <select value={form.category} onChange={(e) => setField("category", e.target.value)} style={selectStyle}>
                                <option value="">None</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form_box" style={{ flexBasis: "48%" }}>
                            Vendor
                            <select value={form.vendor} onChange={(e) => setField("vendor", e.target.value)} style={selectStyle}>
                                <option value="">None</option>
                                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className="form_box" style={{ flexBasis: "30%" }}>Price (₹)<input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField("price", e.target.value)} /></div>
                        <div className="form_box" style={{ flexBasis: "30%" }}>GST (%)<input type="number" step="0.01" min="0" max="100" value={form.gst_percentage} onChange={(e) => setField("gst_percentage", e.target.value)} /></div>
                        <div className="form_box" style={{ flexBasis: "30%" }}>Reorder at<input type="number" min="0" value={form.reorder_level} onChange={(e) => setField("reorder_level", e.target.value)} /></div>
                        <div className="form_box" style={{ flexBasis: "100%" }}>
                            {form.id ? "Current stock" : "Opening stock"}
                            <input type="number" value={form.current_stock} disabled={!!form.id}
                                onChange={(e) => setField("current_stock", e.target.value)}
                                title={form.id ? "Use Adjust stock to change this" : ""} />
                            {form.id && <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>Change stock with Adjust stock so the movement is recorded.</span>}
                        </div>
                        <div className="form_box" style={{ flexBasis: "100%" }}>
                            Description
                            <textarea rows="2" value={form.description} onChange={(e) => setField("description", e.target.value)}
                                style={{ ...selectStyle, fontWeight: 600, resize: "vertical" }} />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default ProductsTable;
