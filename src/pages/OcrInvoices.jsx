import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronDown, ExternalLink, FileText, RefreshCw, ScanLine, Upload } from "lucide-react";
import { clientToken } from "@/axios";
import { day, money } from "@/utility/money";
import Navbar from "../comonant/navbar.jsx";
import PageIcon from "../comonant/PageIcon";
import "../style/invoices.css";

// WhatsApp intake: invoices sent from a registered mobile number land in this list
const WHATSAPP_NUMBER_DISPLAY = "+91 81928 43910";
const WHATSAPP_NUMBER_E164 = "918192843910";

const STEP = 50;          // jobs fetched per "show more"
const MAX_JOBS = 200;     // the API's ceiling

const TABS = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "processing", label: "Processing" },
    { key: "failed", label: "Failed" },
];

// same palette as the invoice status pills (DESIGN_SYSTEM.md)
const STATE = {
    completed: { label: "Completed", bg: "#dcfce7", fg: "#166534" },
    processing: { label: "Processing", bg: "#fef3c7", fg: "#b45309" },
    failed: { label: "Failed", bg: "#fee2e2", fg: "#b91c1c" },
};

const StatePill = ({ job }) => {
    const s = STATE[job.state] || STATE.processing;
    return <span className="inv_pill" title={job.status || s.label} style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
};

const amount = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? "—" : money(v));

// the pipeline's own date text when it isn't a plain ISO date
const shownDate = (v) => (v ? (day(v) !== "—" ? day(v) : String(v)) : "—");

const when = (iso) => {
    const d = new Date(iso);
    if (!iso || Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const OcrInvoices = () => {
    const navigate = useNavigate();
    const { features, status: accessStatus } = useSelector((state) => state.access);
    const hasOcrFeature = accessStatus === "succeeded" && features.includes("ocr_purchase_invoice");

    const [data, setData] = useState({ usage: null, counts: null, jobs: [] });
    const [filter, setFilter] = useState("all");
    const [limit, setLimit] = useState(STEP);
    const [loaded, setLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [notice, setNotice] = useState(null);       // { type: "ok" | "err", text }
    const [busyJob, setBusyJob] = useState(null);
    const [checkingAll, setCheckingAll] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileRef = useRef(null);
    const noticeTimer = useRef(null);

    const say = (type, text) => {
        setNotice({ type, text });
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(null), 6000);
    };
    useEffect(() => () => clearTimeout(noticeTimer.current), []);

    // the tab and the limit go to the server, so a tab's list really is that
    // tab's jobs (counts always cover the whole history)
    const fetchJobs = useCallback(() => {
        const params = { limit };
        if (filter !== "all") params.state = filter;
        return clientToken.get("purchase/ocr-jobs/", { params })
            .then((res) => setData({
                usage: res.data?.usage || null,
                counts: res.data?.counts || null,
                jobs: Array.isArray(res.data?.jobs) ? res.data.jobs : [],
            }))
            .catch((err) => say("err", err.response?.data?.error || "Could not load your OCR history."))
            .finally(() => { setLoaded(true); setRefreshing(false); });
    }, [filter, limit]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);
    useEffect(() => { setLimit(STEP); setExpanded(null); }, [filter]);

    const refresh = () => { if (!refreshing) { setRefreshing(true); fetchJobs(); } };

    const usage = data.usage;
    const counts = data.counts || { completed: 0, processing: 0, failed: 0 };
    const totalAll = usage?.total ?? 0;
    const monthlyLimit = usage?.monthly_limit;
    const monthlyLabel = monthlyLimit === null || monthlyLimit === undefined ? "Unlimited on your plan" : `of ${monthlyLimit} this month`;
    const monthlyExhausted = typeof monthlyLimit === "number" && monthlyLimit > 0 && (usage?.this_month || 0) >= monthlyLimit;
    const dailyExhausted = !!usage && usage.today >= usage.daily_limit;
    const blocked = uploading || !hasOcrFeature || monthlyExhausted || dailyExhausted;

    // why an upload can't start right now, or null
    const blockedReason = !hasOcrFeature ? "Your current subscription does not include OCR invoice scanning."
        : dailyExhausted ? "You've reached today's upload limit."
            : monthlyExhausted ? "You've used this month's scan quota."
                : null;

    const startUpload = () => {
        if (uploading) return;
        if (blockedReason) { say("err", blockedReason); return; }
        fileRef.current?.click();
    };

    const upload = (file) => {
        if (!file) return;
        if (blockedReason) { say("err", blockedReason); return; }
        const form = new FormData();
        form.append("file", file);
        form.append("invoice_type", "purchase");
        setUploading(true);
        clientToken.post("purchase/upload/", form, { headers: { "Content-Type": "multipart/form-data" } })
            .then(() => { say("ok", `"${file.name}" uploaded. Extraction has started.`); fetchJobs(); })
            .catch((err) => say("err", err.response?.data?.error || "Could not upload that invoice. Please try again."))
            .finally(() => { setUploading(false); if (fileRef.current) fileRef.current.value = ""; });
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (blocked) return;
        upload(e.dataTransfer?.files?.[0]);
    };

    // re-polls one job against the pipeline, then reloads so the extracted
    // fields and counts match the new status
    const checkJob = (job) => {
        if (!job.job_id || busyJob || checkingAll) return;
        setBusyJob(job.job_id);
        clientToken.get(`purchase/status/${job.job_id}/`)
            .then((res) => { say("ok", `Status: ${res.data?.status || "updated"}`); return fetchJobs(); })
            .catch((err) => say("err", err.response?.data?.error || "Could not check that job's status."))
            .finally(() => setBusyJob(null));
    };

    // one pass over everything still processing, one at a time so the pipeline isn't hit all at once
    const checkProcessing = async () => {
        const pending = data.jobs.filter((j) => j.state === "processing" && j.job_id);
        if (!pending.length || checkingAll || busyJob) return;
        setCheckingAll(true);
        let failedChecks = 0;
        for (const job of pending) {
            try { await clientToken.get(`purchase/status/${job.job_id}/`); } catch { failedChecks += 1; }
        }
        await fetchJobs();
        setCheckingAll(false);
        say(failedChecks ? "err" : "ok", failedChecks
            ? `Checked ${pending.length - failedChecks} of ${pending.length}. ${failedChecks} could not be reached.`
            : `Checked ${pending.length} bill${pending.length === 1 ? "" : "s"}.`);
    };

    const copyNumber = () => {
        const write = navigator.clipboard?.writeText(WHATSAPP_NUMBER_DISPLAY);
        if (!write) { say("err", `Copy failed. The number is ${WHATSAPP_NUMBER_DISPLAY}`); return; }
        write.then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
            .catch(() => say("err", `Copy failed. The number is ${WHATSAPP_NUMBER_DISPLAY}`));
    };

    const totalForTab = filter === "all" ? totalAll : counts[filter] || 0;
    const jobs = data.jobs;
    const canShowMore = jobs.length < totalForTab && limit < MAX_JOBS;
    const capped = jobs.length < totalForTab && limit >= MAX_JOBS;

    const kpi = (label, value, sub, color) => (
        <div className="inv_kpi">
            <span>{label}</span>
            <strong style={color ? { color } : undefined}>{value}</strong>
            {sub && <small>{sub}</small>}
        </div>
    );

    const details = (job) => {
        const ex = job.extracted || {};
        return (
            <>
                <dl className="inv_detail_grid">
                    {[
                        ["Invoice number", ex.invoice_number || "—"],
                        ["Invoice date", shownDate(ex.date)],
                        ["Vendor", ex.vendor_name || (ex.vendor_id ? `#${ex.vendor_id}` : "—")],
                        ["Total amount", amount(ex.total_amount)],
                        ["GST amount", amount(ex.gst_amount)],
                        ["Type", job.invoice_type || "purchase"],
                        ["Pipeline status", job.status || "—"],
                        ["Job ID", job.job_id || "—"],
                    ].map(([label, value]) => (
                        <div key={label}><dt>{label}</dt><dd title={String(value)}>{value}</dd></div>
                    ))}
                </dl>
                <div className="inv_detail_actions">
                    {job.file_url && (
                        <a className="inv_btn" href={job.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
                            <ExternalLink size={15} /> View original file
                        </a>
                    )}
                    {job.state !== "completed" && job.job_id && (
                        <button type="button" className="inv_btn" disabled={busyJob === job.job_id || checkingAll}
                            onClick={(e) => { e.stopPropagation(); checkJob(job); }}>
                            <RefreshCw size={15} className={busyJob === job.job_id ? "inv_spin" : undefined} />
                            {busyJob === job.job_id ? "Checking…" : "Check status"}
                        </button>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="inv_page">
            <Navbar />
            <div className="inv_wrap">
                {/* ── header ── */}
                <div className="inv_head">
                    <div className="inv_title">
                        <PageIcon icon={ScanLine} />
                        <div>
                            <h1>OCR invoices</h1>
                            <p>Upload a purchase bill and let OCR read the details for you.</p>
                        </div>
                    </div>
                    <div className="inv_head_actions">
                        <button type="button" className="inv_iconbtn" onClick={refresh} disabled={refreshing} title="Refresh" aria-label="Refresh OCR history">
                            <RefreshCw size={17} className={refreshing ? "inv_spin" : undefined} />
                        </button>
                        <button type="button" className="inv_btn" onClick={() => navigate("/purchase_invoices")}>Purchases</button>
                        <button type="button" className="inv_btn primary" disabled={uploading} onClick={startUpload}>
                            <Upload size={16} /> {uploading ? "Uploading…" : "Upload invoice"}
                        </button>
                    </div>
                </div>

                <input ref={fileRef} type="file" accept="application/pdf,image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />

                {notice && (
                    <div className={`inv_notice ${notice.type}`}>
                        {notice.text}
                        <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>✕</button>
                    </div>
                )}

                {!hasOcrFeature && accessStatus === "succeeded" && (
                    <div className="inv_warn" style={{ marginTop: 0, marginBottom: 16 }}>
                        OCR invoice scanning is not part of your current plan. You can review past extractions below, but new uploads are
                        disabled.{" "}
                        <button type="button" className="inv_link" onClick={() => navigate("/billing")}>View plans</button>
                    </div>
                )}

                {!loaded ? (
                    <div className="inv_loading">Loading OCR history…</div>
                ) : (
                    <>
                        {/* ── usage ── */}
                        <div className="inv_kpis">
                            {kpi("Scans this month", usage?.this_month ?? 0, monthlyLabel, monthlyExhausted ? "#dc2626" : undefined)}
                            {kpi("Uploads today", `${usage?.today ?? 0} / ${usage?.daily_limit ?? 10}`, "Resets at midnight", dailyExhausted ? "#dc2626" : undefined)}
                            {kpi("Completed", counts.completed || 0, `${counts.processing || 0} processing · ${counts.failed || 0} failed`, "#166534")}
                            {kpi("Total scanned", totalAll, "All time, company-wide")}
                        </div>

                        {/* ── upload ── */}
                        <div className="inv_card" style={{ marginBottom: 16 }}>
                                            <div
                                className={`inv_drop ${dragOver ? "over" : ""} ${blocked ? "blocked" : ""}`}
                                role="button" tabIndex={0} aria-label="Upload an invoice"
                                onClick={startUpload}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startUpload(); } }}
                                onDragOver={(e) => { e.preventDefault(); if (!blocked) setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={onDrop}
                            >
                                {uploading ? (
                                    <>
                                        <div className="ico"><RefreshCw size={22} className="inv_spin" /></div>
                                        <div className="ttl">Uploading and starting extraction…</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="ico"><Upload size={22} /></div>
                                        <div className="ttl">{dragOver ? "Drop the file to upload" : "Drop an invoice here, or click to browse"}</div>
                                        <div className="sub">
                                            PDF or image · one file at a time
                                            {dailyExhausted && " · daily upload limit reached"}
                                            {monthlyExhausted && !dailyExhausted && " · monthly scan quota reached"}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="inv_wa">
                                <div className="txt">
                                    <strong>Or send it on WhatsApp.</strong> Send a PDF or photo to <strong>{WHATSAPP_NUMBER_DISPLAY}</strong> from
                                    your registered mobile number and it will be scanned automatically and show up here.
                                </div>
                                <button type="button" className="inv_btn" onClick={copyNumber}>{copied ? "Copied" : "Copy number"}</button>
                                <a className="wa" href={`https://wa.me/${WHATSAPP_NUMBER_E164}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
                            </div>
                        </div>

                        {/* ── history ── */}
                        <div className="inv_card">
                            <div className="inv_tabs" role="tablist" aria-label="Extraction status">
                                {TABS.map((t) => (
                                    <button key={t.key} type="button" role="tab" aria-selected={filter === t.key}
                                        className={`inv_tab ${filter === t.key ? "on" : ""}`} onClick={() => setFilter(t.key)}>
                                        {t.label}<em>{t.key === "all" ? totalAll : counts[t.key] || 0}</em>
                                    </button>
                                ))}
                            </div>

                            {counts.processing > 0 && filter !== "completed" && filter !== "failed" && (
                                <div className="inv_toolbar" style={{ justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 13, color: "#64748b" }}>
                                        {counts.processing} bill{counts.processing === 1 ? " is" : "s are"} still being read.
                                    </span>
                                    <button type="button" className="inv_btn" disabled={checkingAll || !!busyJob} onClick={checkProcessing}>
                                        <RefreshCw size={15} className={checkingAll ? "inv_spin" : undefined} />
                                        {checkingAll ? "Checking…" : "Check processing"}
                                    </button>
                                </div>
                            )}

                            {jobs.length === 0 ? (
                                <div className="inv_state">
                                    <div className="ico"><ScanLine size={30} /></div>
                                    {filter === "all" ? (
                                        <>
                                            <h3>Scan your first invoice</h3>
                                            <p>Upload a PDF or image above, or send it on WhatsApp, to run your first extraction.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3>No {filter} extractions</h3>
                                            <p>Try a different tab.</p>
                                            <button type="button" className="inv_btn" onClick={() => setFilter("all")}>Show all</button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="inv_table_wrap">
                                        <table className="inv_table" style={{ minWidth: 860 }}>
                                            <thead>
                                                <tr>
                                                    <th>File</th><th>Invoice</th><th>Vendor</th><th>Date</th>
                                                    <th className="num">Amount</th><th>Status</th><th style={{ width: 40 }} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {jobs.map((job) => {
                                                    const ex = job.extracted || {};
                                                    const open = expanded === job.id;
                                                    return [
                                                        <tr key={job.id} onClick={() => setExpanded(open ? null : job.id)}>
                                                            <td>
                                                                <div className="inv_filecell">
                                                                    <span className="ico"><FileText size={16} /></span>
                                                                    <div style={{ minWidth: 0 }}>
                                                                        <div className="nm" title={job.file_name}>{job.file_name}</div>
                                                                        <div className="by">{when(job.created_at)}{job.uploaded_by ? ` · ${job.uploaded_by}` : ""}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="no">{ex.invoice_number || "—"}</td>
                                                            <td>{ex.vendor_name || (ex.vendor_id ? `#${ex.vendor_id}` : "—")}</td>
                                                            <td style={{ whiteSpace: "nowrap" }}>{shownDate(ex.date)}</td>
                                                            <td className="num strong">{amount(ex.total_amount)}</td>
                                                            <td><StatePill job={job} /></td>
                                                            <td className="num"><ChevronDown size={16} className={`inv_chev ${open ? "open" : ""}`} /></td>
                                                        </tr>,
                                                        open && <tr key={`${job.id}-d`} className="inv_detail"><td colSpan={7}>{details(job)}</td></tr>,
                                                    ];
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="inv_cards">
                                        {jobs.map((job) => {
                                            const ex = job.extracted || {};
                                            const open = expanded === job.id;
                                            return (
                                                <div className="inv_inv_card" key={job.id} onClick={() => setExpanded(open ? null : job.id)}>
                                                    <div className="top">
                                                        <span className="inv_av"><FileText size={15} /></span>
                                                        <div className="party" title={job.file_name}>{job.file_name}</div>
                                                        <StatePill job={job} />
                                                    </div>
                                                    <div className="meta">
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: "#4338ca", marginBottom: 2 }}>{ex.invoice_number || "No number"}</div>
                                                            <div>{when(job.created_at)}</div>
                                                        </div>
                                                        <div className="amt">{amount(ex.total_amount)}</div>
                                                    </div>
                                                    {open && <div style={{ marginTop: 14 }} onClick={(e) => e.stopPropagation()}>{details(job)}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="inv_foot">
                                        <span className="summary">
                                            {capped ? `Showing the latest ${jobs.length} of ${totalForTab}` : `Showing ${jobs.length} of ${totalForTab}`}
                                        </span>
                                        {canShowMore && (
                                            <button type="button" className="inv_btn" onClick={() => setLimit((n) => Math.min(n + STEP, MAX_JOBS))}>Show more</button>
                                        )}
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

export default OcrInvoices;
