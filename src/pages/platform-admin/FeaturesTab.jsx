import { useCallback, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { Plus, Trash2, Pencil, Check, X, Search } from "lucide-react";
import { Card, ErrorNote, Table, errText, list, useConfirm } from "./shared";

const EMPTY = { name: "", code: "", description: "" };

export default function FeaturesTab() {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY);
    const [edit, setEdit] = useState(null); // {id, name, description}
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [dialog, confirm] = useConfirm();

    const load = useCallback(() => {
        setLoading(true);
        return clientToken.get("admin/features/").then((r) => setFeatures(list(r)))
            .catch((e) => setError(errText(e))).finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    const add = async () => {
        setError("");
        if (!/^[a-z][a-z0-9_]*$/.test(form.code)) { setError("Code must be snake_case, e.g. bulk_export."); return; }
        if (!form.name.trim()) { setError("Name is required."); return; }
        try { await clientToken.post("admin/features/", form); setForm(EMPTY); load(); }
        catch (e) { setError(errText(e)); }
    };

    const saveEdit = async () => {
        setError("");
        try {
            await clientToken.patch(`admin/features/${edit.id}/`, { name: edit.name, description: edit.description });
            setEdit(null); load();
        } catch (e) { setError(errText(e)); }
    };

    const remove = async (f) => {
        const inUse = f.plans?.length > 0;
        if (!await confirm({
            title: `Delete feature "${f.code}"?`, danger: true, confirmLabel: "Delete feature",
            body: inUse
                ? `It is attached to ${f.plans.join(", ")}. Those plans lose it (and its limits) immediately, and any code gate on "${f.code}" will deny access.`
                : "No plan uses it. This can't be undone.",
        })) return;
        setError("");
        try { await clientToken.delete(`admin/features/${f.id}/${inUse ? "?force=1" : ""}`); load(); }
        catch (e) { setError(errText(e)); }
    };

    const term = search.trim().toLowerCase();
    const shown = term
        ? features.filter((f) => [f.code, f.name, f.description].some((x) => (x || "").toLowerCase().includes(term)))
        : features;

    return (
        <Card title="Feature catalog" sub="Features are attached to plans. The code is what the API checks, so it can't change after creation.">
            {dialog}
            <div className="pa-grid" style={{ marginBottom: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <input className="pa-input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="New feature name" />
                <input className="pa-input" placeholder="code_snake_case" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} aria-label="New feature code" />
                <input className="pa-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="New feature description" />
                <button className="pa-btn primary" onClick={add}><Plus size={14} /> Add feature</button>
            </div>
            <div className="pa-filters">
                <div className="pa-search">
                    <Search size={16} />
                    <input className="pa-input" placeholder="Search features" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search features" />
                </div>
            </div>
            <ErrorNote>{error}</ErrorNote>
            <Table loading={loading} rowCount={shown.length} empty={term ? "No features match." : "No features yet."}
                columns={[{ label: "Code" }, { label: "Name" }, { label: "Description" }, { label: "Used by" }, { label: "", className: "actions" }]}>
                {shown.map((f) => edit?.id === f.id ? (
                    <tr key={f.id} className="sel">
                        <td className="pa-code">{f.code}</td>
                        <td><input className="pa-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Name" /></td>
                        <td><input className="pa-input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} aria-label="Description" /></td>
                        <td className="pa-muted">{f.plans?.join(", ") || "—"}</td>
                        <td className="actions">
                            <button className="pa-btn primary sm icon" onClick={saveEdit} aria-label="Save"><Check size={13} /></button>
                            <button className="pa-btn ghost sm icon" onClick={() => setEdit(null)} aria-label="Cancel"><X size={13} /></button>
                        </td>
                    </tr>
                ) : (
                    <tr key={f.id}>
                        <td className="pa-code">{f.code}</td>
                        <td className="pa-strong">{f.name}</td>
                        <td className="wrap-cell">{f.description || "—"}</td>
                        <td className="wrap-cell">{f.plans?.length ? f.plans.join(", ") : <span className="pa-badge warn">unused</span>}</td>
                        <td className="actions">
                            <button className="pa-btn ghost sm icon" onClick={() => setEdit({ id: f.id, name: f.name, description: f.description || "" })} aria-label={`Edit ${f.code}`}><Pencil size={13} /></button>
                            <button className="pa-btn danger sm icon" onClick={() => remove(f)} aria-label={`Delete ${f.code}`}><Trash2 size={13} /></button>
                        </td>
                    </tr>
                ))}
            </Table>
        </Card>
    );
}
