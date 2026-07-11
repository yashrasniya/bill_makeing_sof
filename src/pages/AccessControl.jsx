import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { clientToken } from "@/axios";
import {
    Shield, Users as UsersIcon, Layers, ScrollText, Plus, Trash2,
    Pencil, X, Check, Ban, RefreshCw
} from "lucide-react";

/* ---------------------------------------------------------------- helpers */

const card = {
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px",
    padding: "20px", marginBottom: "16px",
};
const btnPrimary = {
    background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px",
    padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: "6px",
};
const btnGhost = {
    background: "transparent", color: "#64748b", border: "1px solid #e2e8f0",
    borderRadius: "8px", padding: "6px 12px", fontSize: "13px", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: "6px",
};
const inputStyle = {
    border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px",
    fontSize: "13px", width: "100%", boxSizing: "border-box",
};
const chip = (active) => ({
    padding: "4px 10px", borderRadius: "999px", fontSize: "12px", cursor: "pointer",
    border: active ? "1px solid #4f46e5" : "1px solid #e2e8f0",
    background: active ? "#eef2ff" : "#fff",
    color: active ? "#4f46e5" : "#64748b", fontWeight: active ? 600 : 500,
});
const th = { textAlign: "left", padding: "8px 12px", fontSize: "12px", color: "#64748b", borderBottom: "1px solid #e2e8f0" };
const td = { padding: "8px 12px", fontSize: "13px", color: "#0f172a", borderBottom: "1px solid #f1f5f9" };

function errText(e) {
    const d = e?.response?.data;
    if (!d) return "Request failed";
    if (typeof d === "string") return d;
    if (d.detail) return d.detail;
    return Object.values(d).flat().join(" ");
}

/* ------------------------------------------------------------- Roles tab */

function RoleEditor({ role, permissions, users, onSaved, onCancel }) {
    const [name, setName] = useState(role?.name || "");
    const [description, setDescription] = useState(role?.description || "");
    const [permIds, setPermIds] = useState(role?.permissions || []);
    const [userIds, setUserIds] = useState(role?.users || []);
    const [error, setError] = useState("");
    const isSystem = role?.is_system_role;

    const toggle = (list, setList, id) =>
        setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

    const save = async () => {
        setError("");
        try {
            const payload = isSystem
                ? { users: userIds } // system roles: only membership is editable
                : { name, description, permissions: permIds, users: userIds };
            if (role?.id) await clientToken.patch(`authz/roles/${role.id}/`, payload);
            else await clientToken.post("authz/roles/", payload);
            onSaved();
        } catch (e) { setError(errText(e)); }
    };

    return (
        <div style={{ ...card, border: "1px solid #c7d2fe" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>
                {role?.id ? `Edit role: ${role.name}` : "New role"}
                {isSystem && <span style={{ marginLeft: 8, fontSize: 11, color: "#f59e0b" }}>system role — only members editable</span>}
            </h3>
            {!isSystem && (
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <input style={inputStyle} placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} />
                    <input style={inputStyle} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
            )}
            {!isSystem && (
                <>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0" }}>Permissions (you can only grant what you hold)</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {permissions.map((p) => (
                            <span key={p.id} style={chip(permIds.includes(p.id))} onClick={() => toggle(permIds, setPermIds, p.id)}>
                                {p.code}
                            </span>
                        ))}
                    </div>
                </>
            )}
            <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0" }}>Members</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {users.map((u) => (
                    <span key={u.id} style={chip(userIds.includes(u.id))} onClick={() => toggle(userIds, setUserIds, u.id)}>
                        {u.username}
                    </span>
                ))}
            </div>
            {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
                <button style={btnPrimary} onClick={save}><Check size={14} /> Save</button>
                <button style={btnGhost} onClick={onCancel}><X size={14} /> Cancel</button>
            </div>
        </div>
    );
}

function RolesTab({ permissions, users }) {
    const [roles, setRoles] = useState([]);
    const [editing, setEditing] = useState(null); // null | {} | role
    const [error, setError] = useState("");

    const load = useCallback(() => {
        clientToken.get("authz/roles/").then((r) => setRoles(r.data.results || r.data));
    }, []);
    useEffect(load, [load]);

    const remove = async (role) => {
        if (!window.confirm(`Delete role "${role.name}"?`)) return;
        try { await clientToken.delete(`authz/roles/${role.id}/`); load(); }
        catch (e) { setError(errText(e)); }
    };

    return (
        <div>
            {editing !== null && (
                <RoleEditor role={editing.id ? editing : null} permissions={permissions} users={users}
                    onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
            )}
            <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>Roles</h3>
                    <button style={btnPrimary} onClick={() => setEditing({})}><Plus size={14} /> New role</button>
                </div>
                {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Name</th><th style={th}>Permissions</th><th style={th}>Members</th><th style={th}></th></tr></thead>
                    <tbody>
                        {roles.map((r) => (
                            <tr key={r.id}>
                                <td style={td}>
                                    {r.name}
                                    {r.is_system_role && <span style={{ marginLeft: 6, fontSize: 10, background: "#fef3c7", color: "#b45309", padding: "2px 6px", borderRadius: 6 }}>system</span>}
                                </td>
                                <td style={{ ...td, maxWidth: 380 }}>
                                    <span style={{ fontSize: 12, color: "#64748b" }}>{(r.permission_codes || []).join(", ") || "—"}</span>
                                </td>
                                <td style={td}>{(r.user_names || []).map((u) => u.username).join(", ") || "—"}</td>
                                <td style={{ ...td, whiteSpace: "nowrap" }}>
                                    <button style={btnGhost} onClick={() => setEditing(r)}><Pencil size={13} /></button>{" "}
                                    {!r.is_system_role && <button style={{ ...btnGhost, color: "#ef4444" }} onClick={() => remove(r)}><Trash2 size={13} /></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------ Groups tab */

function GroupsTab({ permissions, users }) {
    const [groups, setGroups] = useState([]);
    const [roles, setRoles] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", users: [], roles: [], permissions: [] });
    const [error, setError] = useState("");

    const load = useCallback(() => {
        clientToken.get("authz/groups/").then((r) => setGroups(r.data.results || r.data));
        clientToken.get("authz/roles/").then((r) => setRoles(r.data.results || r.data));
    }, []);
    useEffect(load, [load]);

    const startEdit = (g) => {
        setEditing(g || {});
        setForm(g ? { name: g.name, description: g.description, users: g.users, roles: g.roles, permissions: g.permissions }
            : { name: "", description: "", users: [], roles: [], permissions: [] });
    };
    const toggle = (key, id) => setForm((f) => ({
        ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }));

    const save = async () => {
        setError("");
        try {
            if (editing?.id) await clientToken.patch(`authz/groups/${editing.id}/`, form);
            else await clientToken.post("authz/groups/", form);
            setEditing(null); load();
        } catch (e) { setError(errText(e)); }
    };

    const remove = async (g) => {
        if (!window.confirm(`Delete group "${g.name}"?`)) return;
        await clientToken.delete(`authz/groups/${g.id}/`); load();
    };

    return (
        <div>
            {editing !== null && (
                <div style={{ ...card, border: "1px solid #c7d2fe" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editing.id ? `Edit group: ${editing.name}` : "New group"}</h3>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                        <input style={inputStyle} placeholder="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <input style={inputStyle} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b" }}>Members</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {users.map((u) => <span key={u.id} style={chip(form.users.includes(u.id))} onClick={() => toggle("users", u.id)}>{u.username}</span>)}
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b" }}>Roles</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {roles.map((r) => <span key={r.id} style={chip(form.roles.includes(r.id))} onClick={() => toggle("roles", r.id)}>{r.name}</span>)}
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b" }}>Extra permissions</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {permissions.map((p) => <span key={p.id} style={chip(form.permissions.includes(p.id))} onClick={() => toggle("permissions", p.id)}>{p.code}</span>)}
                    </div>
                    {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                        <button style={btnPrimary} onClick={save}><Check size={14} /> Save</button>
                        <button style={btnGhost} onClick={() => setEditing(null)}><X size={14} /> Cancel</button>
                    </div>
                </div>
            )}
            <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>Groups</h3>
                    <button style={btnPrimary} onClick={() => startEdit(null)}><Plus size={14} /> New group</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Name</th><th style={th}>Members</th><th style={th}>Roles</th><th style={th}></th></tr></thead>
                    <tbody>
                        {groups.map((g) => (
                            <tr key={g.id}>
                                <td style={td}>{g.name}</td>
                                <td style={td}>{g.users.length}</td>
                                <td style={td}>{g.roles.length}</td>
                                <td style={{ ...td, whiteSpace: "nowrap" }}>
                                    <button style={btnGhost} onClick={() => startEdit(g)}><Pencil size={13} /></button>{" "}
                                    <button style={{ ...btnGhost, color: "#ef4444" }} onClick={() => remove(g)}><Trash2 size={13} /></button>
                                </td>
                            </tr>
                        ))}
                        {groups.length === 0 && <tr><td style={td} colSpan={4}>No groups yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------- Users tab */

function UsersTab({ permissions, users }) {
    const [selected, setSelected] = useState(null);
    const [effective, setEffective] = useState(null);
    const [direct, setDirect] = useState([]);
    const [error, setError] = useState("");

    const loadUser = useCallback(async (u) => {
        setSelected(u); setError("");
        const [eff, dir] = await Promise.all([
            clientToken.get(`authz/users/${u.id}/effective-permissions/`),
            clientToken.get(`authz/users/${u.id}/permissions/`),
        ]);
        setEffective(eff.data); setDirect(dir.data);
    }, []);

    const setDirectPerm = async (perm, isGranted) => {
        setError("");
        try {
            await clientToken.post(`authz/users/${selected.id}/permissions/`, { permission: perm.id, is_granted: isGranted });
            loadUser(selected);
        } catch (e) { setError(errText(e)); }
    };
    const clearDirect = async (permId) => {
        await clientToken.delete(`authz/users/${selected.id}/permissions/${permId}/`);
        loadUser(selected);
    };

    const directByPermId = useMemo(() => Object.fromEntries(direct.map((d) => [d.permission, d])), [direct]);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
            <div style={{ ...card, marginBottom: 0 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>Company users</h3>
                {users.map((u) => (
                    <div key={u.id} onClick={() => loadUser(u)}
                        style={{
                            padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                            background: selected?.id === u.id ? "#eef2ff" : "transparent",
                            color: selected?.id === u.id ? "#4f46e5" : "#0f172a",
                            fontWeight: selected?.id === u.id ? 600 : 400,
                        }}>
                        {u.username}{u.is_company_admin && <span style={{ fontSize: 10, color: "#b45309" }}> · admin</span>}
                    </div>
                ))}
            </div>
            <div style={{ ...card, marginBottom: 0 }}>
                {!selected && <p style={{ color: "#64748b", fontSize: 13 }}>Select a user to view and edit their permissions.</p>}
                {selected && effective && (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>{selected.username}</h3>
                            <button style={btnGhost} onClick={() => loadUser(selected)}><RefreshCw size={13} /> Refresh</button>
                        </div>
                        <p style={{ fontSize: 12, color: "#64748b" }}>
                            Roles: {effective.roles.join(", ") || "—"} · Groups: {effective.groups.join(", ") || "—"}
                        </p>
                        {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead><tr><th style={th}>Permission</th><th style={th}>Effective</th><th style={th}>Override</th></tr></thead>
                            <tbody>
                                {permissions.map((p) => {
                                    const has = effective.permissions.includes(p.code);
                                    const override = directByPermId[p.id];
                                    return (
                                        <tr key={p.id}>
                                            <td style={td}>{p.code}<div style={{ fontSize: 11, color: "#94a3b8" }}>{p.name}</div></td>
                                            <td style={td}>
                                                {has
                                                    ? <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 600 }}>granted</span>
                                                    : <span style={{ color: "#94a3b8", fontSize: 12 }}>no</span>}
                                            </td>
                                            <td style={{ ...td, whiteSpace: "nowrap" }}>
                                                {override ? (
                                                    <>
                                                        <span style={{
                                                            fontSize: 11, padding: "2px 8px", borderRadius: 6, marginRight: 6,
                                                            background: override.is_granted ? "#dcfce7" : "#fee2e2",
                                                            color: override.is_granted ? "#166534" : "#991b1b",
                                                        }}>
                                                            direct {override.is_granted ? "grant" : "deny"}
                                                        </span>
                                                        <button style={btnGhost} title="Remove override" onClick={() => clearDirect(p.id)}><X size={12} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button style={{ ...btnGhost, color: "#16a34a" }} title="Direct grant" onClick={() => setDirectPerm(p, true)}><Check size={12} /></button>{" "}
                                                        <button style={{ ...btnGhost, color: "#ef4444" }} title="Direct deny (overrides roles)" onClick={() => setDirectPerm(p, false)}><Ban size={12} /></button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}

/* --------------------------------------------------------- Audit log tab */

function AuditTab() {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        clientToken.get("authz/audit-log/").then((r) => setLogs(r.data.results || r.data));
    }, []);
    return (
        <div style={card}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Audit log</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>When</th><th style={th}>Who</th><th style={th}>Action</th><th style={th}>Resource</th><th style={th}>Details</th></tr></thead>
                <tbody>
                    {logs.map((l) => (
                        <tr key={l.id}>
                            <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(l.timestamp).toLocaleString()}</td>
                            <td style={td}>{l.user_name || "system"}</td>
                            <td style={td}>{l.action}</td>
                            <td style={td}>{l.resource_type} #{l.resource_id}</td>
                            <td style={{ ...td, maxWidth: 360, fontSize: 11, color: "#64748b" }}>
                                {l.new_data ? JSON.stringify(l.new_data) : "—"}
                            </td>
                        </tr>
                    ))}
                    {logs.length === 0 && <tr><td style={td} colSpan={5}>No entries yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

/* ----------------------------------------------------------------- Page */

export default function AccessControl() {
    const { isTenantAdmin, status, subscription, features, companyName } = useSelector((s) => s.access);
    const [tab, setTab] = useState("roles");
    const [permissions, setPermissions] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        clientToken.get("authz/permissions/").then((r) => setPermissions(r.data));
        clientToken.get("authz/users/").then((r) => setUsers(r.data));
    }, []);

    if (status === "succeeded" && !isTenantAdmin) {
        return (
            <div style={{ background: "#fff", minHeight: "100vh", padding: 40 }}>
                <p>You need tenant admin access to view this page.</p>
            </div>
        );
    }

    const tabs = [
        { id: "roles", label: "Roles", icon: <Shield size={15} /> },
        { id: "groups", label: "Groups", icon: <Layers size={15} /> },
        { id: "users", label: "User permissions", icon: <UsersIcon size={15} /> },
        { id: "audit", label: "Audit log", icon: <ScrollText size={15} /> },
    ];

    return (
        <div style={{ background: "#fff", minHeight: "100vh" }}>
        <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Access Control{companyName ? ` — ${companyName}` : ""}</h2>
                {subscription?.plan_code && (
                    <span style={{ fontSize: 12, color: "#4f46e5", background: "#eef2ff", padding: "4px 10px", borderRadius: 999 }}>
                        {subscription.plan_code} plan · {features.length} features
                    </span>
                )}
            </div>
            <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 20px" }}>
                Manage roles, groups and per-user permissions for your company.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            ...btnGhost,
                            background: tab === t.id ? "#4f46e5" : "transparent",
                            color: tab === t.id ? "#fff" : "#64748b",
                            border: tab === t.id ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                        }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>
            {tab === "roles" && <RolesTab permissions={permissions} users={users} />}
            {tab === "groups" && <GroupsTab permissions={permissions} users={users} />}
            {tab === "users" && <UsersTab permissions={permissions} users={users} />}
            {tab === "audit" && <AuditTab />}
        </div>
        </div>
    );
}
