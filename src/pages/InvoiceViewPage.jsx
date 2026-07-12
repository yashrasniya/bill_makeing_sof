import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { clientToken } from "@/axios";
import { ArrowLeft, Pencil, FileText, Trash2 } from "lucide-react";

const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 };
const btn = {
    display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8,
    padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const btnPrimary = { ...btn, background: "#4f46e5", color: "#fff", border: "none" };
const btnGhost = { ...btn, background: "transparent", color: "#64748b", border: "1px solid #e2e8f0" };
const th = { textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td = { padding: "10px 12px", fontSize: 13, color: "#0f172a", borderBottom: "1px solid #f1f5f9" };

export default function InvoiceViewPage() {
    const { invoice_id } = useParams();
    const navigate = useNavigate();
    const { permissions, status: accessStatus } = useSelector((s) => s.access);
    const canEdit = accessStatus !== "succeeded" || permissions.includes("invoice.update");
    const canDelete = accessStatus === "succeeded" && permissions.includes("invoice.delete");

    const [invoice, setInvoice] = useState(null);   // null=loading, false=not found
    const [error, setError] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 640);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        clientToken.get(`invoice/?id=${invoice_id}`)
            .then((r) => {
                const list = Array.isArray(r.data) ? r.data : (r.data.results || []);
                setInvoice(list.length ? list[0] : false);
            })
            .catch((e) => {
                setInvoice(false);
                setError(e.response?.data?.detail || "Failed to load invoice.");
            });
    }, [invoice_id]);

    // dynamic product columns from product_properties (visible fields only)
    const columns = useMemo(() => {
        if (!invoice?.products?.length) return [];
        const seen = new Map();
        invoice.products.forEach((p) =>
            (p.product_properties || []).forEach((pp) => {
                const f = pp.new_product_in_frontend;
                if (f?.is_show && !seen.has(f.input_title)) seen.set(f.input_title, f);
            }));
        return [...seen.keys()];
    }, [invoice]);

    const cellValue = (product, title) =>
        (product.product_properties || []).find(
            (pp) => pp.new_product_in_frontend?.input_title === title)?.value ?? "—";

    const removeInvoice = async () => {
        if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
        try {
            await clientToken.delete(`invoice/?id=${invoice_id}`);
            navigate("/bill_list");
        } catch (e) {
            setError(e.response?.data?.detail || "Delete failed.");
        }
    };

    const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const customFields = useMemo(() => {
        const raw = invoice?.custom_header_field;
        if (!raw) return [];
        try {
            const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
            return Array.isArray(obj) ? [] : Object.entries(obj);
        } catch { return []; }
    }, [invoice]);

    return (
        <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: isMobile ? 90 : 0 }}>
            <div style={{ padding: isMobile ? 12 : 24, maxWidth: 900, margin: "0 auto" }}>
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 16, flexWrap: "wrap", gap: 8,
                }}>
                    <button style={btnGhost} onClick={() => navigate("/bill_list")}>
                        <ArrowLeft size={14} /> {isMobile ? "Back" : "Back to invoices"}
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                        {canDelete && invoice && (
                            <button style={{ ...btnGhost, color: "#ef4444" }} onClick={removeInvoice}>
                                <Trash2 size={14} /> Delete
                            </button>
                        )}
                        {canEdit && invoice && (
                            <button style={btnPrimary} onClick={() => navigate(`/bill/${invoice_id}`)}>
                                <Pencil size={14} /> {isMobile ? "Edit" : "Edit invoice"}
                            </button>
                        )}
                    </div>
                </div>

                {invoice === null && <p style={{ color: "#64748b" }}>Loading invoice…</p>}
                {invoice === false && (
                    <div style={card}>
                        <p style={{ margin: 0 }}>Invoice not found or you don't have access to it.</p>
                        {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
                    </div>
                )}

                {invoice && (
                    <div style={{ ...card, padding: isMobile ? 16 : 24 }}>
                        {/* header */}
                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                            marginBottom: 20, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0,
                        }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <FileText size={20} color="#4f46e5" />
                                    <h2 style={{ margin: 0, fontSize: 20 }}>Invoice #{invoice.invoice_number || invoice.id}</h2>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                                        background: invoice.invoice_type === "purchase" ? "#fef3c7" : "#dcfce7",
                                        color: invoice.invoice_type === "purchase" ? "#b45309" : "#166534",
                                    }}>
                                        {invoice.invoice_type}
                                    </span>
                                </div>
                                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                                    {invoice.invoice_type === "purchase"
                                        ? <>Vendor: <b>{invoice.vendor_name || "—"}</b></>
                                        : <>Customer: <b>{invoice.receiver_name || "—"}</b></>}
                                    {" · "}Date: <b>{invoice.date || "—"}</b>
                                    {" · "}Created by: <b>{invoice.user}</b>
                                </p>
                            </div>
                            <div style={{
                                textAlign: isMobile ? "left" : "right",
                                ...(isMobile ? {
                                    width: "100%", background: "#f8fafc", borderRadius: 10,
                                    padding: "10px 14px", display: "flex",
                                    justifyContent: "space-between", alignItems: "baseline",
                                } : {}),
                            }}>
                                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Grand total</p>
                                <div>
                                    <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{money(invoice.total_final_amount)}</p>
                                    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>incl. GST {money(invoice.gst_final_amount)}</p>
                                </div>
                            </div>
                        </div>

                        {/* custom header fields */}
                        {customFields.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
                                {customFields.map(([k, v]) => (
                                    <div key={k} style={{ fontSize: 13 }}>
                                        <span style={{ color: "#64748b" }}>{k}: </span><b>{String(v)}</b>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* products — cards on mobile, table on desktop */}
                        {isMobile ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {(invoice.products || []).map((p, i) => (
                                    <div key={p.id} style={{
                                        border: "1px solid #e2e8f0", borderRadius: 10, padding: 12,
                                    }}>
                                        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
                                            ITEM {i + 1}
                                        </p>
                                        {columns.map((c) => (
                                            <div key={c} style={{
                                                display: "flex", justifyContent: "space-between",
                                                fontSize: 13, padding: "3px 0",
                                            }}>
                                                <span style={{ color: "#64748b" }}>{c}</span>
                                                <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>
                                                    {cellValue(p, c)}
                                                </span>
                                            </div>
                                        ))}
                                        <div style={{
                                            display: "flex", justifyContent: "space-between", marginTop: 8,
                                            paddingTop: 8, borderTop: "1px dashed #e2e8f0", fontSize: 13,
                                        }}>
                                            <span style={{ color: "#64748b" }}>GST {money(p.gst_amount)}</span>
                                            <span style={{ fontWeight: 700 }}>{money(p.total_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                                {(!invoice.products || invoice.products.length === 0) && (
                                    <p style={{ color: "#64748b", fontSize: 13 }}>No products on this invoice.</p>
                                )}
                                <div style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                                    background: "#f8fafc", borderRadius: 10, padding: "10px 14px",
                                }}>
                                    <span style={{ fontSize: 12, color: "#64748b" }}>GST {money(invoice.gst_final_amount)}</span>
                                    <span style={{ fontWeight: 700, fontSize: 16 }}>{money(invoice.total_final_amount)}</span>
                                </div>
                            </div>
                        ) : (
                        <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={th}>#</th>
                                    {columns.map((c) => <th key={c} style={th}>{c}</th>)}
                                    <th style={{ ...th, textAlign: "right" }}>GST</th>
                                    <th style={{ ...th, textAlign: "right" }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.products || []).map((p, i) => (
                                    <tr key={p.id}>
                                        <td style={td}>{i + 1}</td>
                                        {columns.map((c) => <td key={c} style={td}>{cellValue(p, c)}</td>)}
                                        <td style={{ ...td, textAlign: "right" }}>{money(p.gst_amount)}</td>
                                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(p.total_amount)}</td>
                                    </tr>
                                ))}
                                {(!invoice.products || invoice.products.length === 0) && (
                                    <tr><td style={td} colSpan={columns.length + 3}>No products on this invoice.</td></tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td style={{ ...td, borderBottom: "none" }} colSpan={columns.length + 1}></td>
                                    <td style={{ ...td, borderBottom: "none", textAlign: "right", color: "#64748b" }}>
                                        GST {money(invoice.gst_final_amount)}
                                    </td>
                                    <td style={{ ...td, borderBottom: "none", textAlign: "right", fontWeight: 700, fontSize: 15 }}>
                                        {money(invoice.total_final_amount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                        </div>
                        )}

                        {!canEdit && (
                            <p style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
                                View only — you don't have permission to edit invoices.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
