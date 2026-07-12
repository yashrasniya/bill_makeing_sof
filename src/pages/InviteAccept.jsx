import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clientToken } from "@/axios";
import { fetchUser } from "@/store/userSlice";
import { Building, Check } from "lucide-react";

const inputStyle = {
    border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px",
    fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 12,
};

export default function InviteAccept() {
    const { token } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [info, setInfo] = useState(null);        // null=loading, false=invalid
    const [form, setForm] = useState({ username: "", password: "", first_name: "", last_name: "" });
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        clientToken.get(`invites/${token}/`)
            .then((r) => setInfo(r.data))
            .catch(() => setInfo(false));
    }, [token]);

    const accept = async () => {
        setError(""); setSubmitting(true);
        try {
            const payload = info.existing_account ? {} : form;
            await clientToken.post(`invites/${token}/accept/`, payload);
            await dispatch(fetchUser());
            navigate("/home", { replace: true });
        } catch (e) {
            const d = e.response?.data;
            setError(typeof d === "string" ? d
                : d?.detail || Object.values(d || {}).flat().join(" ") || "Failed to accept invite.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ background: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 400, border: "1px solid #e2e8f0", borderRadius: 16, padding: 32 }}>
                {info === null && <p style={{ color: "#64748b" }}>Checking invitation…</p>}

                {info === false && (
                    <>
                        <h2 style={{ marginTop: 0 }}>Invitation not valid</h2>
                        <p style={{ color: "#64748b", fontSize: 14 }}>
                            This invitation link is invalid, expired, or was revoked.
                            Ask your administrator to send a new one.
                        </p>
                    </>
                )}

                {info && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <Building size={22} color="#4f46e5" />
                            <h2 style={{ margin: 0, fontSize: 18 }}>Join {info.company_name}</h2>
                        </div>
                        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
                            You've been invited as <b>{info.email}</b>.
                            {info.existing_account
                                ? " Your existing account will be added to this company."
                                : " Create your account to join."}
                        </p>

                        {!info.existing_account && (
                            <>
                                <input style={inputStyle} placeholder="Username"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })} />
                                <input style={inputStyle} placeholder="Password (min 8 characters)" type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                <div style={{ display: "flex", gap: 8 }}>
                                    <input style={inputStyle} placeholder="First name"
                                        value={form.first_name}
                                        onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                                    <input style={inputStyle} placeholder="Last name"
                                        value={form.last_name}
                                        onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                                </div>
                            </>
                        )}

                        {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
                        <button
                            onClick={accept}
                            disabled={submitting || (!info.existing_account && (!form.username || form.password.length < 8))}
                            style={{
                                width: "100%", background: "#4f46e5", color: "#fff", border: "none",
                                borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 600,
                                cursor: "pointer", display: "flex", alignItems: "center",
                                justifyContent: "center", gap: 8, opacity: submitting ? 0.7 : 1,
                            }}>
                            <Check size={16} /> {submitting ? "Joining…" : "Accept invitation"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
