import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus, RefreshCw, ShoppingCart, Upload } from "lucide-react";
import { clientToken } from "@/axios";
import Navbar from "../comonant/navbar.jsx";
import PageIcon from "../comonant/PageIcon";
import { Hint, Pill, initials, isOpen } from "../comonant/invoiceBits";
import { day, money, moneyShort } from "@/utility/money";
import "../style/invoices.css";

const PurchaseInvoices = () => {
    const navigate = useNavigate();
    const { features, status: accessStatus } = useSelector((state) => state.access);
    const hasOcrFeature = accessStatus === "succeeded" && features.includes("ocr_purchase_invoice");

    const [summary, setSummary] = useState(null);      // purchase-summary: totals + recent bills
    const [owed, setOwed] = useState(null);            // invoice/summary: what is still to pay
    const [pendingJobs, setPendingJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [notice, setNotice] = useState(null);        // { type: "ok" | "err", text }
    const fileInput = useRef(null);

    const load = () => Promise.allSettled([
        clientToken.get("purchase-summary/"),
        clientToken.get("purchase/pending-jobs/"),
        clientToken.get("invoice/summary/", { params: { invoice_type: "purchase" } }),
    ]).then(([totals, jobs, due]) => {
        if (totals.status === "fulfilled") setSummary(totals.value.data);
        else setNotice({ type: "err", text: `Could not load purchases. ${totals.reason?.message || ""}` });
        if (jobs.status === "fulfilled") setPendingJobs(jobs.value.data || []);
        if (due.status === "fulfilled") setOwed(due.value.data);   // the page still works without it
    }).finally(() => { setLoading(false); setRefreshing(false); });

    useEffect(() => { load(); }, []);

    // refetches everything without blanking the page
    const handleRefresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        load();
    };

    const handleRefreshStatus = (jobId) => {
        clientToken.get(`purchase/status/${jobId}/`)
            .then((res) => {
                const next = res.data.status;
                if (next === "success" || next === "done") {
                    setPendingJobs((prev) => prev.filter((j) => j.job_id !== jobId));
                    load(); // the new invoice now counts toward the totals
                } else {
                    setPendingJobs((prev) => prev.map((j) => (j.job_id === jobId ? { ...j, status: next } : j)));
                }
            })
            .catch(() => setNotice({ type: "err", text: "Could not check that bill's status. Try again." }));
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        e.target.value = ""; // allow picking the same file again
        if (!file) return;
        if (!hasOcrFeature) {
            setNotice({ type: "err", text: "Your current subscription does not contain this feature" });
            return;
        }
        const form = new FormData();
        form.append("file", file);
        setUploading(true);
        clientToken.post("purchase/upload/", form, { headers: { "Content-Type": "multipart/form-data" } })
            .then((res) => {
                if (res.status === 200 || res.status === 201) {
                    setNotice({ type: "ok", text: "Bill uploaded. It's being read in the background and will appear here shortly." });
                    load();
                }
            })
            .catch((err) => setNotice({
                type: "err",
                text: err.response?.data?.error || "Could not upload that bill. Please try again.",
            }))
            .finally(() => setUploading(false));
    };

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

    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    const recent = summary?.recent_purchases || [];

    return (
        <div className="inv_page">
            <Navbar />
            <div className="inv_wrap">
                {/* ── header ── */}
                <div className="inv_head">
                    <div className="inv_title">
                        <PageIcon icon={ShoppingCart} />
                        <div>
                            <h1>Purchases</h1>
                            <p>Track what you've bought, what you owe vendors, and bills waiting to be read.</p>
                        </div>
                    </div>
                    <div className="inv_head_actions">
                        <button type="button" className="inv_iconbtn" onClick={handleRefresh} disabled={refreshing}
                            title="Refresh" aria-label="Refresh purchases">
                            <RefreshCw size={17} className={refreshing ? "inv_spin" : undefined} />
                        </button>
                        <input ref={fileInput} type="file" accept="application/pdf,image/*" hidden onChange={handleUpload} />
                        <button type="button" className="inv_btn" disabled={uploading} onClick={() => fileInput.current.click()}>
                            <Upload size={16} /> {uploading ? "Uploading…" : "Upload bill"}
                        </button>
                        <button type="button" className="inv_btn primary" onClick={() => navigate("/newBill?type=purchase")}>
                            <Plus size={16} /> Add purchase
                        </button>
                    </div>
                </div>

                {notice && (
                    <div className={`inv_notice ${notice.type}`}>
                        {notice.text}
                        <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>✕</button>
                    </div>
                )}

                {loading ? (
                    <div className="inv_loading">Loading purchases…</div>
                ) : (
                    <>
                        {/* ── headline numbers ── */}
                        <div className="inv_kpis">
                            {kpi("Purchased this month", moneyShort(summary?.this_month_purchases_amount),
                                plural(summary?.this_month_count || 0, "invoice"))}
                            {owed && kpi("To pay", moneyShort(owed.awaiting_amount), plural(owed.awaiting_count, "invoice"),
                                () => navigate("/bill_list?type=purchase&status_group=open"), "#b45309")}
                            {owed && kpi("Overdue", moneyShort(owed.overdue_amount),
                                `${owed.overdue_count} older than ${owed.overdue_after_days} days`,
                                () => navigate("/bill_list?type=purchase&status_group=overdue"),
                                owed.overdue_amount > 0 ? "#dc2626" : undefined)}
                            {kpi("All purchases", moneyShort(summary?.total_purchases_amount),
                                `${plural(summary?.total_count || 0, "invoice")} · ${moneyShort(summary?.total_purchases_gst)} GST`)}
                        </div>

                        {/* ── bills being read (OCR) ── */}
                        {pendingJobs.length > 0 && (
                            <div className="inv_card inv_jobs">
                                <div className="inv_card_head">
                                    <h2>Reading your bills<small>{pendingJobs.length}</small></h2>
                                </div>
                                {pendingJobs.map((job) => (
                                    <div className="inv_job" key={job.job_id}>
                                        <span className="file" title={job.file_name}>{job.file_name}</span>
                                        <span className="state">{job.status}</span>
                                        <button type="button" className="inv_iconbtn" style={{ width: 34, height: 34 }}
                                            title="Check status" aria-label={`Check status of ${job.file_name}`}
                                            onClick={() => handleRefreshStatus(job.job_id)}>
                                            <RefreshCw size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── recent purchases ── */}
                        <div className="inv_card">
                            <div className="inv_card_head">
                                <h2>Recent purchases</h2>
                                <button type="button" className="inv_link" onClick={() => navigate("/bill_list?type=purchase")}>
                                    View all invoices →
                                </button>
                            </div>

                            {recent.length === 0 ? (
                                <div className="inv_state">
                                    <div className="ico"><ShoppingCart size={30} /></div>
                                    <h3>Record your first purchase</h3>
                                    <p>Bills from your vendors show up here with what is still left to pay.</p>
                                    <button type="button" className="inv_btn primary" onClick={() => navigate("/newBill?type=purchase")}>
                                        <Plus size={16} /> Add purchase
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="inv_table_wrap">
                                        <table className="inv_table" style={{ minWidth: 760 }}>
                                            <thead>
                                                <tr>
                                                    <th>Invoice</th>
                                                    <th>Vendor</th>
                                                    <th>Date</th>
                                                    <th className="num">Amount</th>
                                                    <th className="num">Balance due</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recent.map((inv) => (
                                                    <tr key={inv.id} onClick={() => navigate(`/invoice/${inv.id}/view`)}>
                                                        <td className="no">{inv.invoice_number || "No number"}</td>
                                                        <td>
                                                            <div className="inv_party">
                                                                <span className="inv_av">{initials(inv.vendor_name)}</span>
                                                                <span className="name" title={inv.vendor_name}>{inv.vendor_name || "—"}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ whiteSpace: "nowrap" }}>{day(inv.date)}</td>
                                                        <td className="num strong">{money(inv.amount)}</td>
                                                        <td className={`num ${isOpen(inv) ? "owed" : "muted"}`}>
                                                            {isOpen(inv) ? money(inv.balance_due) : "—"}
                                                        </td>
                                                        <td><Pill obj={inv} /><Hint obj={inv} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="inv_cards">
                                        {recent.map((inv) => (
                                            <div className="inv_inv_card" key={inv.id} onClick={() => navigate(`/invoice/${inv.id}/view`)}>
                                                <div className="top">
                                                    <span className="inv_av">{initials(inv.vendor_name)}</span>
                                                    <div className="party">{inv.vendor_name || "—"}</div>
                                                </div>
                                                <div className="meta">
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: "#4338ca", marginBottom: 4 }}>
                                                            {inv.invoice_number || "No number"} · {day(inv.date)}
                                                        </div>
                                                        <Pill obj={inv} />
                                                    </div>
                                                    <div className="amt">
                                                        {money(inv.amount)}
                                                        {isOpen(inv) && <small>{money(inv.balance_due)} due</small>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PurchaseInvoices;
