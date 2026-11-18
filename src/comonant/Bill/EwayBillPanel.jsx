import { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { AlertTriangle, CheckCircle2, Download, Info, Truck, XCircle } from "lucide-react";
import { GST_STATES } from "@/constants/gst";

/**
 * E-way bill for one sales invoice (Phase A, no portal API).
 *
 * Shows whether the goods need an e-way bill, the transport details, the
 * problems the server found, downloads the portal's bulk-upload JSON, and
 * takes the 12-digit number back once the user has generated it on
 * ewaybillgst.gov.in. Rules and checks live on the server (invoice/eway.py).
 */

const MODES = [[1, "Road"], [2, "Rail"], [3, "Air"], [4, "Ship"]];
const SUB_TYPES = [[1, "Supply"], [3, "Export"], [9, "SKD/CKD/Lots"]];

export const downloadEwayJson = async (ids, name) => {
    const res = await clientToken.get("eway/json/", { params: { ids: ids.join(","), download: 1 }, responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `EWB_${String(name).replace(/[^A-Za-z0-9_-]+/g, "_") || "bulk"}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

export const blobError = async (err, fallback) => {
    const data = err.response?.data;
    if (data instanceof Blob) {
        try { return JSON.parse(await data.text()).error || fallback; } catch { return fallback; }
    }
    if (data && typeof data === "object") {
        if (data.error || data.detail) return data.error || data.detail;
        const first = Object.entries(data)[0];
        if (first) return `${first[0].replace(/_/g, " ")}: ${[].concat(first[1])[0]}`;
    }
    return fallback;
};

const fmtTime = (iso) => iso
    ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

const toForm = (e) => ({ ...e, distance_km: e.distance_km ? String(e.distance_km) : "", transport_doc_date: e.transport_doc_date || "" });

function Input({ label, hint, className = "", ...props }) {
    return (
        <label className={`block ${className}`}>
            <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
            <input
                {...props}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {hint && <span className="block text-[11px] text-slate-500 mt-1">{hint}</span>}
        </label>
    );
}

function Chips({ options, value, onChange, disabled }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map(([v, label]) => (
                <button key={v} type="button" disabled={disabled} onClick={() => onChange(v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${value === v
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"} disabled:cursor-default`}>
                    {label}
                </button>
            ))}
        </div>
    );
}

export default function EwayBillPanel({ invoiceId, canEdit }) {
    const [data, setData] = useState(null);
    const [form, setForm] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState("");
    const [denied, setDenied] = useState(false);

    useEffect(() => {
        clientToken.get(`eway/${invoiceId}/`)
            .then((r) => { setData(r.data); setForm(toForm(r.data.eway_bill)); })
            .catch((e) => {
                if (e.response?.status === 403) setDenied(true);
                else setError(e.response?.data?.error || "Could not load the e-way bill.");
            });
    }, [invoiceId]);

    if (denied) return null;
    if (!data || !form) {
        return error ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-red-600">{error}</div> : null;
    }
    if (data.verdict.code === "services" && !data.saved) return null;

    const ewb = data.eway_bill;
    const generated = ewb.status === "generated";
    const v = data.verdict;
    const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));
    const payload = () => {
        const { ewb_number, ewb_date, valid_until, status, source, updated_at, ...rest } = form;
        return { ...rest, distance_km: Number(form.distance_km) || 0, transport_doc_date: form.transport_doc_date || null };
    };

    const save = async (key, body) => {
        setBusy(key);
        setError("");
        try {
            const r = await clientToken.put(`eway/${invoiceId}/`, body);
            setData(r.data);
            setForm(toForm(r.data.eway_bill));
            return r.data;
        } catch (e) {
            setError(await blobError(e, "Could not save the e-way bill."));
            return null;
        } finally {
            setBusy("");
        }
    };

    const download = async () => {
        const saved = await save("json", payload());
        if (!saved) return;
        if (!saved.ready) { setError("Fix the items marked in red first."); return; }
        setBusy("json");
        try {
            await downloadEwayJson([invoiceId], saved.invoice.invoice_number || invoiceId);
        } catch (e) {
            setError(await blobError(e, "Could not prepare the e-way bill file."));
        } finally {
            setBusy("");
        }
    };

    const saveNumber = () => {
        const n = String(form.ewb_number || "").replace(/\s+/g, "");
        if (!/^\d{12}$/.test(n)) { setError("An e-way bill number is 12 digits."); return; }
        save("number", { ...payload(), ewb_number: n });
    };

    const cancel = () => {
        if (window.confirm("Only mark it cancelled after cancelling it on the e-way bill portal (allowed within 24 hours). Continue?")) {
            save("cancel", { status: "cancelled" });
        }
    };

    const errors = data.issues.filter((i) => i.level === "error");
    const warnings = data.issues.filter((i) => i.level !== "error");
    const road = form.transport_mode === 1;
    const off = !canEdit || generated;
    const tone = generated ? "border-emerald-300" : v.needed ? "border-amber-300" : "border-slate-200";
    const StatusIcon = generated ? CheckCircle2 : v.needed ? AlertTriangle : Info;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 mt-4 text-slate-900">
            <div className="flex items-center gap-2 mb-4">
                <Truck size={18} className="text-indigo-600" />
                <h2 className="text-base font-bold">E-way bill</h2>
            </div>

            <div className={`flex items-start gap-3 rounded-xl border-2 ${tone} p-3 mb-4`}>
                <StatusIcon size={20} className={generated ? "text-emerald-600" : v.needed ? "text-amber-600" : "text-slate-400"} />
                <div>
                    <p className="text-sm font-bold">
                        {generated ? `E-way bill ${ewb.ewb_number}`
                            : ewb.status === "cancelled" ? `E-way bill ${ewb.ewb_number} cancelled`
                                : v.needed ? "This invoice needs an e-way bill" : "E-way bill optional"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {generated && ewb.valid_until ? `Valid until ${fmtTime(ewb.valid_until)}` : v.reason}
                    </p>
                </div>
            </div>

            {!generated && data.issues.length > 0 && (
                <ul className="mb-4 space-y-1.5">
                    {[...errors, ...warnings].map((i, n) => (
                        <li key={n} className="flex items-start gap-2 text-sm">
                            {i.level === "error"
                                ? <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                                : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />}
                            <span>{i.message}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="grid gap-5 md:grid-cols-2">
                <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Transport (Part B)</h3>
                    <Chips options={MODES} value={form.transport_mode} disabled={off} onChange={(m) => set("transport_mode", m)} />
                    {road && (
                        <>
                            <Input label="Vehicle number" value={form.vehicle_number} disabled={off} placeholder="KA01AB1234"
                                hint="Leave blank if the transporter will add it on the portal."
                                onChange={(e) => set("vehicle_number", e.target.value.toUpperCase())} />
                            <Chips options={[["R", "Regular vehicle"], ["O", "Over-dimensional cargo"]]} value={form.vehicle_type}
                                disabled={off} onChange={(t) => set("vehicle_type", t)} />
                        </>
                    )}
                    <Input label="Transporter ID (GSTIN / TRANSIN)" value={form.transporter_id} disabled={off} maxLength={15}
                        onChange={(e) => set("transporter_id", e.target.value.toUpperCase())} />
                    <Input label="Transporter name" value={form.transporter_name} disabled={off} maxLength={100}
                        onChange={(e) => set("transporter_name", e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label={road ? "LR no. (optional)" : "RR / AWB / B/L no."} value={form.transport_doc_number}
                            disabled={off} maxLength={15} onChange={(e) => set("transport_doc_number", e.target.value)} />
                        <Input label="Document date" type="date" value={form.transport_doc_date} disabled={off}
                            onChange={(e) => set("transport_doc_date", e.target.value)} />
                    </div>
                    <Input label="Distance (km)" inputMode="numeric" value={form.distance_km} disabled={off} maxLength={4}
                        hint={data.validity_if_generated_now
                            ? `Generated now, valid until ${fmtTime(data.validity_if_generated_now)}.`
                            : "Leave blank to let the portal work out the PIN-to-PIN distance."}
                        onChange={(e) => set("distance_km", e.target.value.replace(/[^0-9]/g, ""))} />
                </section>

                <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Ship to (optional)</h3>
                    <p className="text-xs text-slate-500">Only if the goods go somewhere other than the customer's address. For an export, the port or airport.</p>
                    <Input label="Address" value={form.ship_to_address} disabled={off} maxLength={240}
                        onChange={(e) => set("ship_to_address", e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="City / place" value={form.ship_to_place} disabled={off} maxLength={50}
                            onChange={(e) => set("ship_to_place", e.target.value)} />
                        <Input label="PIN code" inputMode="numeric" value={form.ship_to_pincode} disabled={off} maxLength={6}
                            onChange={(e) => set("ship_to_pincode", e.target.value.replace(/[^0-9]/g, ""))} />
                    </div>
                    <label className="block">
                        <span className="block text-xs font-semibold text-slate-600 mb-1">State</span>
                        <select value={form.ship_to_state_code ?? ""} disabled={off}
                            onChange={(e) => set("ship_to_state_code", e.target.value ? Number(e.target.value) : null)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50">
                            <option value="">Not set</option>
                            {GST_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </select>
                    </label>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 pt-2">Document</h3>
                    <Chips options={SUB_TYPES} value={form.sub_supply_type} disabled={off} onChange={(s) => set("sub_supply_type", s)} />
                    <Chips options={[["INV", "Tax invoice"], ["BIL", "Bill of supply"]]} value={form.doc_type} disabled={off}
                        onChange={(t) => set("doc_type", t)} />
                </section>
            </div>

            {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

            {canEdit && !generated && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => save("save", payload())} disabled={!!busy}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {busy === "save" ? "Saving…" : "Save details"}
                    </button>
                    <button type="button" onClick={download} disabled={!!busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        <Download size={16} /> {busy === "json" ? "Preparing…" : "Download e-way bill JSON"}
                    </button>
                    <span className="text-xs text-slate-500">Upload it on ewaybillgst.gov.in (e-Waybill → Generate Bulk), then enter the number below.</span>
                </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-4 flex flex-wrap items-end gap-3">
                <Input label="E-way bill number (12 digits)" className="w-64" value={form.ewb_number || ""} disabled={!canEdit || generated}
                    placeholder="3310 0123 4567" maxLength={14}
                    onChange={(e) => set("ewb_number", e.target.value.replace(/[^0-9 ]/g, ""))} />
                {canEdit && !generated && (
                    <button type="button" onClick={saveNumber} disabled={!!busy}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {busy === "number" ? "Saving…" : "Save number"}
                    </button>
                )}
                {canEdit && generated && (
                    <button type="button" onClick={cancel} disabled={!!busy}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                        Mark cancelled
                    </button>
                )}
            </div>
        </div>
    );
}
