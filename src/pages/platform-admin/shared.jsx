import { Children, Fragment, cloneElement, isValidElement, useCallback, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function errText(e) {
    const d = e?.response?.data;
    if (!d) return e?.message || "Request failed";
    if (typeof d === "string") return d;
    if (d.detail) return d.detail;
    return Object.entries(d)
        .map(([k, v]) => `${k}: ${[].concat(v).join(" ")}`)
        .join(" · ");
}

/** Unwrap a DRF list response, paginated or not. */
export const list = (r) => (Array.isArray(r.data) ? r.data : r.data.results || []);

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};
export const daysUntil = (iso) =>
    iso ? Math.round((new Date(`${iso}T00:00:00`) - new Date(`${today()}T00:00:00`)) / 86400000) : null;

export const money = (v) => {
    const n = Number(v || 0);
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};
export const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

/**
 * Paginated list fetch for the admin APIs ({count, results}).
 * `params` is an object of query params; empty values are dropped.
 */
export function useAdminList(url, params = {}, { pageSize = 25 } = {}) {
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const key = JSON.stringify(params);
    // page is remembered per filter set, so changing a filter goes back to page 1
    const [pageState, setPageState] = useState({ key, page: 1 });
    const page = pageState.key === key ? pageState.page : 1;
    const setPage = useCallback((p) => setPageState({ key, page: p }), [key]);

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        const query = Object.fromEntries(
            Object.entries(JSON.parse(key)).filter(([, v]) => v !== "" && v != null));
        return clientToken
            .get(url, { params: { ...query, page, page_size: pageSize } })
            .then((r) => {
                setRows(list(r));
                setCount(Array.isArray(r.data) ? r.data.length : r.data.count ?? 0);
            })
            .catch((e) => setError(errText(e)))
            .finally(() => setLoading(false));
    }, [url, key, page, pageSize]);

    useEffect(() => { load(); }, [load]);

    return { rows, count, page, setPage, pageSize, loading, error, reload: load };
}

export function useDebounced(value, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

export function Card({ title, sub, actions, children, className = "" }) {
    return (
        <section className={`pa-card ${className}`}>
            {(title || actions) && (
                <div className="pa-card-head">
                    <div>
                        {title && <h3>{title}</h3>}
                        {sub && <p className="pa-sub">{sub}</p>}
                    </div>
                    {actions && <div className="pa-row">{actions}</div>}
                </div>
            )}
            {children}
        </section>
    );
}

export function ErrorNote({ children }) {
    return children ? <p className="pa-error" role="alert">{children}</p> : null;
}
export function Notice({ children }) {
    return children ? <p className="pa-notice" role="status">{children}</p> : null;
}

/**
 * Give every <td> a data-label from its column header, so on phones the CSS can
 * show each row as a stacked card ("Plan  Pro"). Walks into Fragments; cells that
 * span several columns (expanded detail rows) are left as they are.
 */
function labelRows(children, labels) {
    return Children.map(children, (row) => {
        if (!isValidElement(row)) return row;
        if (row.type === Fragment) return <Fragment key={row.key}>{labelRows(row.props.children, labels)}</Fragment>;
        if (row.type !== "tr") return row;
        let col = 0;
        const cells = Children.map(row.props.children, (cell) => {
            if (!isValidElement(cell) || cell.type !== "td") return cell;
            const span = Number(cell.props.colSpan) || 1;
            const label = span === 1 ? labels[col] : undefined;
            col += span;
            return label === undefined ? cell : cloneElement(cell, { "data-label": label });
        });
        return cloneElement(row, {}, cells);
    });
}

/** Table with loading / empty states. `columns` = [{label, className}] */
export function Table({ columns, loading, empty = "Nothing here yet.", children, rowCount }) {
    const labels = columns.map((c) => (typeof c.label === "string" ? c.label : ""));
    return (
        <div className="pa-table-wrap">
            <table className="pa-table">
                <thead>
                    <tr>{columns.map((c, i) => <th key={i} className={c.className}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                    {loading && rowCount === 0 ? (
                        <tr><td colSpan={columns.length} className="pa-loading">Loading…</td></tr>
                    ) : rowCount === 0 ? (
                        <tr><td colSpan={columns.length} className="pa-empty">{empty}</td></tr>
                    ) : labelRows(children, labels)}
                </tbody>
            </table>
        </div>
    );
}

export function Pager({ page, setPage, count, pageSize }) {
    const pages = Math.max(1, Math.ceil(count / pageSize));
    if (count <= pageSize) return count ? <div className="pa-pager">{count} total</div> : null;
    return (
        <div className="pa-pager">
            <span>{count} total · page {page} of {pages}</span>
            <span className="pa-row">
                <button className="pa-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft size={14} /> Prev
                </button>
                <button className="pa-btn ghost sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    Next <ChevronRight size={14} />
                </button>
            </span>
        </div>
    );
}

const STATUS_TONE = {
    active: "ok", captured: "ok", processed: "ok", applied: "ok", authenticated: "info",
    trialing: "info", created: "info", pending: "warn", received: "warn", authorized: "info",
    past_due: "warn", halted: "bad", failed: "bad", canceled: "bad", cancelled: "bad",
    expired: "bad", completed: "", ignored: "", refunded: "warn",
};
export function StatusBadge({ status, tone }) {
    if (!status) return <span className="pa-muted">—</span>;
    return <span className={`pa-badge ${tone ?? STATUS_TONE[status] ?? ""}`}>{String(status).replace(/_/g, " ")}</span>;
}

/** Promise-based confirm dialog: const [dialog, confirm] = useConfirm(); await confirm({...}) */
export function useConfirm() {
    const [state, setState] = useState(null);
    const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
    const close = (v) => { state?.resolve(v); setState(null); };
    const dialog = state ? (
        <div className="pa-modal-back" onClick={() => close(false)}>
            <div className="pa-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <h3>{state.title}</h3>
                {state.body && <p>{state.body}</p>}
                <div className="pa-modal-foot">
                    <button className="pa-btn ghost" onClick={() => close(false)}>Cancel</button>
                    <button className={`pa-btn ${state.danger ? "danger" : "primary"}`} autoFocus onClick={() => close(true)}>
                        {state.confirmLabel || "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    ) : null;
    return [dialog, confirm];
}
