import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { clientToken } from "../../axios.js";
import Modal from "../Modal";

// Record stock coming in or going out. Used from the Movements tab and, with a
// product already chosen, from a product's "Adjust stock" button.
export default function StockMovementModal({ products, productId = "", onClose, onSaved }) {
    const [form, setForm] = useState({ product: productId ? String(productId) : "", movement_type: "IN", quantity: 1, notes: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const product = products.find((p) => String(p.id) === String(form.product));
    const qty = Number(form.quantity) || 0;
    const below = form.movement_type === "OUT" && product && qty > product.current_stock;

    const save = () => {
        if (!form.product) { setError("Choose a product."); return; }
        if (qty < 1) { setError("Quantity must be at least 1."); return; }
        setSaving(true);
        setError("");
        clientToken.post("/inventory/stock-movements/", { ...form, quantity: qty })
            .then(() => onSaved())
            .catch((e) => {
                const d = e.response?.data;
                setError(d && typeof d === "object"
                    ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(" | ")
                    : "Could not record this movement.");
            })
            .finally(() => setSaving(false));
    };

    return (
        <Modal icon={ArrowLeftRight} title="Record stock movement" subtitle="Stock changes are applied straight away" width={460} onClose={onClose}
            footer={(
                <>
                    <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", color: "#374151", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                    <div className="button" onClick={saving ? undefined : save} style={saving ? { opacity: 0.7 } : undefined}>{saving ? "Saving…" : "Confirm"}</div>
                </>
            )}>
            {error && <div className="inv_notice err">{error}</div>}
            <div className="pop-up-box_inputs">
                <div className="form_box" style={{ flexBasis: "100%" }}>
                    Product
                    <select value={form.product} onChange={(e) => set("product", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 14, marginTop: 4 }}>
                        <option value="">Select a product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.current_stock} in stock)</option>)}
                    </select>
                </div>
                <div className="form_box" style={{ flexBasis: "100%" }}>
                    Type
                    <div className="inv_seg2" style={{ marginTop: 4 }}>
                        <button type="button" className={`in ${form.movement_type === "IN" ? "on" : ""}`} onClick={() => set("movement_type", "IN")}>Stock in</button>
                        <button type="button" className={`out ${form.movement_type === "OUT" ? "on" : ""}`} onClick={() => set("movement_type", "OUT")}>Stock out</button>
                    </div>
                </div>
                <div className="form_box" style={{ flexBasis: "100%" }}>
                    Quantity
                    <input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
                </div>
                <div className="form_box" style={{ flexBasis: "100%" }}>
                    Note or reason
                    <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Purchase order number, breakage…" />
                </div>
            </div>
            {below && <div className="inv_warn">This takes {product.name} below zero: you have {product.current_stock} in stock.</div>}
        </Modal>
    );
}
