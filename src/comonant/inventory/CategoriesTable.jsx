import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Search, Tag, Trash2 } from "lucide-react";
import { clientToken } from "../../axios.js";
import Modal from "../Modal";

const EMPTY = { name: "", description: "" };

// `addSignal` changes when the page's "Add category" button is pressed
function CategoriesTable({ addSignal = 0 }) {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);     // only to count products per category
    const [loaded, setLoaded] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState("");
    const [searchText, setSearchText] = useState("");
    const [form, setForm] = useState(null);           // null = closed
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        let stale = false;
        Promise.all([clientToken.get("/inventory/categories/"), clientToken.get("/inventory/products/")])
            .then(([c, p]) => {
                if (stale) return;
                setCategories(c.data.results || c.data);
                setProducts(p.data.results || p.data);
            })
            .catch((e) => { if (!stale) setError(`Could not load categories. ${e.message || ""}`); })
            .finally(() => { if (!stale) setLoaded(true); });
        return () => { stale = true; };
    }, [refresh]);

    const first = useRef(addSignal);
    useEffect(() => { if (addSignal !== first.current) openForm(null); }, [addSignal]);

    const counts = useMemo(() => {
        const n = {};
        products.forEach((p) => { if (p.category) n[p.category] = (n[p.category] || 0) + 1; });
        return n;
    }, [products]);

    const term = searchText.trim().toLowerCase();
    const shown = categories
        .filter((c) => !term || `${c.name} ${c.description || ""}`.toLowerCase().includes(term))
        .sort((a, b) => a.name.localeCompare(b.name));

    const openForm = (c) => { setForm(c ? { id: c.id, name: c.name, description: c.description || "" } : { ...EMPTY }); setFormError(""); };
    const closeForm = () => { setForm(null); setFormError(""); };

    const save = () => {
        if (!form.name.trim()) { setFormError("Enter a category name."); return; }
        setSaving(true);
        setFormError("");
        const body = { name: form.name.trim(), description: form.description };
        (form.id ? clientToken.put(`/inventory/categories/${form.id}/`, body) : clientToken.post("/inventory/categories/", body))
            .then(() => { closeForm(); setRefresh((n) => n + 1); })
            .catch((e) => {
                const d = e.response?.data;
                setFormError(d && typeof d === "object"
                    ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(" | ")
                    : "Could not save this category.");
            })
            .finally(() => setSaving(false));
    };

    const remove = (c) => {
        const n = counts[c.id] || 0;
        const note = n ? ` Its ${n} product${n === 1 ? "" : "s"} will be left without a category.` : "";
        if (!window.confirm(`Delete the ${c.name} category?${note}`)) return;
        clientToken.delete(`/inventory/categories/${c.id}/`)
            .then(() => setRefresh((x) => x + 1))
            .catch(() => setError("Could not delete this category."));
    };

    if (!loaded) return <div className="inv_loading">Loading categories…</div>;

    return (
        <div className="inv_card">
            {error && <div className="inv_notice err" style={{ margin: "16px 20px 0" }}>{error}<button type="button" aria-label="Dismiss" onClick={() => setError("")}>✕</button></div>}

            {categories.length === 0 ? (
                <div className="inv_state">
                    <div className="ico"><Tag size={30} /></div>
                    <h3>Add your first category</h3>
                    <p>Group products into categories to find and filter them faster.</p>
                    <button type="button" className="inv_btn primary" onClick={() => openForm(null)}>Add category</button>
                </div>
            ) : (
                <>
                    <div className="inv_toolbar">
                        <div className="inv_search">
                            <Search size={18} />
                            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search categories" aria-label="Search categories" />
                        </div>
                    </div>
                    {shown.length === 0 ? (
                        <div className="inv_state">
                            <div className="ico"><Tag size={30} /></div>
                            <h3>No categories match “{searchText}”</h3>
                            <p>Try a different search.</p>
                            <button type="button" className="inv_btn" onClick={() => setSearchText("")}>Clear search</button>
                        </div>
                    ) : (
                        <div className="inv_table_wrap" style={{ display: "block" }}>
                            <table className="inv_table" style={{ minWidth: 0 }}>
                                <thead><tr><th>Name</th><th>Description</th><th className="num">Products</th><th style={{ width: 90 }} /></tr></thead>
                                <tbody>
                                    {shown.map((c) => (
                                        <tr key={c.id} onClick={() => openForm(c)}>
                                            <td className="strong">{c.name}</td>
                                            <td style={{ color: "#64748b" }}>{c.description || "—"}</td>
                                            <td className="num">{counts[c.id] || 0}</td>
                                            <td className="num" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" className="inv_inline_btn" aria-label={`Edit ${c.name}`} title="Edit" onClick={() => openForm(c)}><Pencil size={16} /></button>
                                                <button type="button" className="inv_inline_btn danger" aria-label={`Delete ${c.name}`} title="Delete" onClick={() => remove(c)}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {form && (
                <Modal icon={Tag} title={form.id ? "Edit category" : "Add category"} subtitle="Categories group your products" width={460} onClose={closeForm}
                    footer={(
                        <>
                            <button type="button" onClick={closeForm} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", color: "#374151", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                            <div className="button" onClick={saving ? undefined : save} style={saving ? { opacity: 0.7 } : undefined}>{saving ? "Saving…" : form.id ? "Update" : "Save category"}</div>
                        </>
                    )}>
                    {formError && <div className="inv_notice err">{formError}</div>}
                    <div className="pop-up-box_inputs">
                        <div className="form_box" style={{ flexBasis: "100%" }}>Name<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus /></div>
                        <div className="form_box" style={{ flexBasis: "100%" }}>
                            Description
                            <textarea rows="3" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 14, fontWeight: 600, color: "#0f172a", outline: "none", resize: "vertical" }} />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default CategoriesTable;
