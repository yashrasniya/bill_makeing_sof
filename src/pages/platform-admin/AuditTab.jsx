import { Fragment, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { Download, X, ChevronDown, ChevronRight } from "lucide-react";
import { Card, ErrorNote, Pager, Table, when, useAdminList, useDebounced } from "./shared";

const show = (v) => (v === undefined ? "" : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v));

function Diff({ before, after }) {
    const b = before && typeof before === "object" ? before : {};
    const a = after && typeof after === "object" ? after : {};
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
    if (keys.length === 0) return <span className="pa-muted">No data recorded.</span>;
    return (
        <div className="pa-diff">
            <div className="h">Field</div><div className="h">Before</div><div className="h">After</div>
            {keys.map((k) => {
                const changed = before && show(b[k]) !== show(a[k]);
                return (
                    <Fragment key={k}>
                        <div className={changed ? "changed" : ""}>{k}</div>
                        <div className={`old ${changed ? "changed" : ""}`}>{before ? show(b[k]) || "—" : "—"}</div>
                        <div className={`new ${changed ? "changed" : ""}`}>{show(a[k]) || "—"}</div>
                    </Fragment>
                );
            })}
        </div>
    );
}

function toCsv(rows) {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["timestamp", "user", "company", "action", "resource_type", "resource_id", "previous_data", "new_data"];
    const lines = rows.map((l) => [l.timestamp, l.user_name || "system", l.company_name || l.company || "", l.action,
        l.resource_type, l.resource_id, show(l.previous_data ?? ""), show(l.new_data ?? "")].map(esc).join(","));
    return [head.join(","), ...lines].join("\n");
}

export default function AuditTab({ preset, goTo }) {
    const [resourceType, setResourceType] = useState(preset.resource_type || "");
    const [action, setAction] = useState(preset.action || "");
    const [user, setUser] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [open, setOpen] = useState(null);
    const [facets, setFacets] = useState({ resource_types: [], actions: [] });
    const company = preset.company || "";
    const debouncedUser = useDebounced(user.trim());

    const q = useAdminList("admin/audit-log/", {
        company, resource_type: resourceType, action, user: debouncedUser, date_from: dateFrom, date_to: dateTo,
    }, { pageSize: 50 });

    useEffect(() => {
        clientToken.get("admin/audit-log/facets/").then((r) => setFacets(r.data)).catch(() => {});
    }, []);

    const exportCsv = () => {
        const blob = new Blob([toCsv(q.rows)], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `audit-log-page-${q.page}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const filtered = resourceType || action || user || dateFrom || dateTo;

    return (
        <Card title="Platform audit log" sub="Every tenant and platform change. Click a row for the before/after."
            actions={<button className="pa-btn ghost" onClick={exportCsv} disabled={!q.rows.length}><Download size={14} /> Export page (CSV)</button>}>
            <div className="pa-filters">
                <select className="pa-select" value={resourceType} onChange={(e) => setResourceType(e.target.value)} aria-label="Resource">
                    <option value="">All resources</option>
                    {facets.resource_types.map((r) => <option key={r}>{r}</option>)}
                </select>
                <select className="pa-select" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
                    <option value="">All actions</option>
                    {facets.actions.map((a) => <option key={a}>{a}</option>)}
                </select>
                <input className="pa-input" placeholder="User" value={user} onChange={(e) => setUser(e.target.value)} aria-label="User" />
                <input className="pa-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" title="From" />
                <input className="pa-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" title="To" />
                {filtered && (
                    <button className="pa-btn ghost" onClick={() => { setResourceType(""); setAction(""); setUser(""); setDateFrom(""); setDateTo(""); }}>
                        <X size={14} /> Clear
                    </button>
                )}
            </div>
            {company && (
                <p className="pa-muted" style={{ marginTop: 0 }}>
                    Showing company #{company} only. <button className="pa-btn ghost sm" onClick={() => goTo("audit")}>Show all companies</button>
                </p>
            )}
            <ErrorNote>{q.error}</ErrorNote>
            <Table loading={q.loading} rowCount={q.rows.length} empty={filtered || company ? "No entries match." : "No entries yet."}
                columns={[{ label: "" }, { label: "When" }, { label: "Who" }, { label: "Company" }, { label: "Action" }, { label: "Resource" }]}>
                {q.rows.map((l) => (
                    <Fragment key={l.id}>
                        <tr className={`click ${open === l.id ? "sel" : ""}`} onClick={() => setOpen(open === l.id ? null : l.id)}>
                            <td className="pa-chev" style={{ width: 20 }}>{open === l.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                            <td className="pa-muted" style={{ whiteSpace: "nowrap" }}>{when(l.timestamp)}</td>
                            <td>{l.user_name || <span className="pa-muted">system</span>}</td>
                            <td>{l.company_name || (l.company ? `#${l.company}` : <span className="pa-muted">platform</span>)}</td>
                            <td><span className="pa-badge info">{l.action}</span></td>
                            <td>{l.resource_type} <span className="pa-code">#{l.resource_id}</span></td>
                        </tr>
                        {open === l.id && (
                            <tr><td colSpan={6} style={{ background: "var(--page-bg)" }}>
                                <Diff before={l.previous_data} after={l.new_data} />
                            </td></tr>
                        )}
                    </Fragment>
                ))}
            </Table>
            <Pager {...q} />
        </Card>
    );
}
