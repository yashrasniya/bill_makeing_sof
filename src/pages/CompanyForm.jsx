import React, { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "@/store/userSlice";
import Navbar from "../comonant/navbar.jsx";

/* ─── field definitions ─── */
const COMPANY_FIELDS = [
    { label: "Company Name", name: "company_name", type: "text", placeholder: "Acme Pvt. Ltd.", col: 2 },
    { label: "Company Address", name: "company_address", type: "text", placeholder: "123, MG Road, Bangalore", col: 2 },
    { label: "GST Number", name: "company_gst_number", type: "text", placeholder: "22AAAAA0000A1Z5" },
    { label: "State", name: "state", type: "text", placeholder: "Karnataka" },
    { label: "State Code", name: "state_code", type: "number", placeholder: "29" },
    { label: "Company Email", name: "company_email_id", type: "email", placeholder: "info@acme.com" },
    { label: "Company Logo", name: "company_logo", type: "file", col: 2 },
];

const BANK_FIELDS = [
    { label: "Bank Name", name: "bank_name", type: "text", placeholder: "State Bank of India" },
    { label: "Account Number", name: "account_number", type: "text", placeholder: "00000011234567891" },
    { label: "IFSC Code", name: "ifsc_code", type: "text", placeholder: "SBIN0001234" },
    { label: "Branch", name: "branch", type: "text", placeholder: "MG Road, Bangalore" },
];

const ALL_FIELDS = [...COMPANY_FIELDS, ...BANK_FIELDS];

/* ─── styles (module-level so they're stable) ─── */
const baseInput = {
    width: '100%', padding: '10px 13px', fontSize: '14px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    outline: 'none', color: '#0f172a', background: '#f8fafc',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box', fontFamily: 'inherit',
};
const onFocusIn = (e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)'; e.target.style.background = 'white'; };
const onFocusOut = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

/* ─────────────────────────────────────────────────
   IMPORTANT: Field & SectionHeader are defined at
   MODULE level (outside CompanyForm). Defining them
   inside would cause React to treat them as a new
   component type on every render, unmounting the
   focused input after every keystroke.
───────────────────────────────────────────────── */
function SectionHeader({ title }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 16px', gridColumn: 'span 2' }}>
            <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {title}
            </span>
        </div>
    );
}

function Field({ field, value, logoPreview, onChange }) {
    if (field.type === 'file') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', letterSpacing: '0.02em' }}>
                    {field.label}
                </label>
                <div
                    style={{
                        border: '2px dashed #c7d2fe', borderRadius: '12px',
                        padding: '16px', background: '#fafbff',
                        display: 'flex', alignItems: 'center', gap: '16px',
                        cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#c7d2fe'}
                    onClick={() => document.getElementById('logo-input').click()}
                >
                    <input
                        id="logo-input"
                        type="file"
                        name={field.name}
                        accept="image/*"
                        onChange={onChange}
                        style={{ display: 'none' }}
                    />
                    {logoPreview ? (
                        <img src={logoPreview} alt="logo preview"
                            style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    ) : (
                        <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 16l4-4 3 3 4-5 5 6H4z" stroke="#4f46e5" strokeWidth="1.5" strokeLinejoin="round" />
                                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4f46e5" strokeWidth="1.5" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#4f46e5', marginBottom: '2px' }}>
                            {logoPreview ? 'Change logo' : 'Upload company logo'}
                        </p>
                        <p style={{ fontSize: '11px', color: '#94a3b8' }}>PNG, JPG up to 5MB</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '5px',
            gridColumn: field.col === 2 ? 'span 2' : 'span 1',
        }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', letterSpacing: '0.02em' }}>
                {field.label} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
                type={field.type}
                name={field.name}
                value={value || ''}
                onChange={onChange}
                placeholder={field.placeholder}
                onFocus={onFocusIn}
                onBlur={onFocusOut}
                style={baseInput}
            />
        </div>
    );
}

/* ─── Main page component ─── */
export default function CompanyForm() {
    const [formData, setFormData] = useState({});
    const [logoPreview, setLogoPreview] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showNavbar, setShowNavbar] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { userInfo } = useSelector((state) => state.user);

    /* Fetch company data on mount:
       - If is_varified === true  → pre-fill form fields + show Navbar
       - If is_varified === false → hide Navbar (new user onboarding) */
    useEffect(() => {
        clientToken.get("user-companies/")
            .then((res) => {
                if (res.status === 200) {
                    setFormData(res.data);
                    if (res.data.company_logo) setLogoPreview(res.data.company_logo);
                    if (res.data.is_varified) setShowNavbar(true);
                }
            })
            .catch(() => {
                // 404 / 401 — new user, no company yet; keep navbar hidden
            });
    }, []);  // run once on mount

    const handleChange = (e) => {
        const { name, value, files, type } = e.target;
        if (type === "file" && files[0]) {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
            setLogoPreview(URL.createObjectURL(files[0]));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        for (const field of ALL_FIELDS) {
            if (field.type !== 'file' && !formData[field.name]) {
                setError(`"${field.label}" is required.`);
                setLoading(false);
                return;
            }
        }

        const data = new FormData();
        ALL_FIELDS.forEach((field) => {
            if (formData[field.name]) {
                if (field.type === "file") {
                    if (formData[field.name] instanceof File) data.append(field.name, formData[field.name]);
                } else {
                    data.append(field.name, formData[field.name]);
                }
            }
        });

        clientToken.post('user-companies/', data, { headers: { "Content-Type": "multipart/form-data" } })
            .then((res) => {
                if (res.status === 201 && !userInfo?.is_company_varified) {
                    dispatch(fetchUser());
                    navigate('/home', { replace: true });
                }
            })
            .catch((err) => {
                if (err.response?.status === 400) {
                    const message = Object.keys(err.response.data)
                        .map(k => `${k}: ${err.response.data[k][0]}`).join(' | ');
                    setError(message);
                } else {
                    setError("Something went wrong. Please try again.");
                }
            })
            .finally(() => setLoading(false));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            {showNavbar && <Navbar />}
            <style>{`
                .cf-split   { display: flex; flex: 1; overflow: hidden; }
                .cf-left    { flex: 0 0 36%; position: relative; overflow: hidden;
                              background: linear-gradient(145deg,#312e81 0%,#4f46e5 45%,#7c3aed 100%);
                              display: flex; flex-direction: column; align-items: center; justify-content: center;
                              padding: 48px 36px; min-height: 100vh; }
                .cf-right   { flex: 1; display: flex; flex-direction: column; align-items: center;
                              justify-content: flex-start; background: #f8fafc;
                              padding: 32px 24px; overflow-y: auto; position: relative; }
                .cf-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                .cf-grid-bank { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
                @media (max-width: 768px) {
                    .cf-left  { display: none; }
                    .cf-right { padding: 20px 16px; }
                    .cf-grid, .cf-grid-bank { grid-template-columns: 1fr; }
                }
            `}</style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            <div className="cf-split">

                {/* ─────────────── LEFT PANEL ─────────────── */}
                <div className="cf-left">
                    <div style={{ position: 'absolute', top: '-90px', left: '-90px', width: '340px', height: '340px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-110px', right: '-70px', width: '380px', height: '380px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: '60%', right: '-50px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

                    <div style={{
                        width: '60px', height: '60px', borderRadius: '16px',
                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}>
                        <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                            <path d="M6 8h20M6 16h14M6 24h9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>

                    <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'white', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '10px' }}>
                        Invoice App
                    </h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.7, maxWidth: '260px', marginBottom: '36px' }}>
                        Set up your company profile to start creating professional invoices.
                    </p>

                    {[
                        { icon: '🏢', title: 'Company Details', desc: 'Name, address, GST & email' },
                        { icon: '🖼️', title: 'Brand Logo', desc: 'Appears on every invoice you send' },
                        { icon: '🏦', title: 'Bank Details', desc: 'For payment info on invoices' },
                        { icon: '✅', title: 'Verified & Ready', desc: 'Start billing your customers!' },
                    ].map((item, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                            background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '14px', padding: '13px 16px',
                            marginBottom: '9px', width: '100%', maxWidth: '290px',
                        }}>
                            <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{item.title}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ─────────────── RIGHT PANEL ─────────────── */}
                <div className="cf-right">
                    <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    {/* Error toast */}
                    {error && (
                        <div style={{
                            position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
                            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px',
                            padding: '12px 16px', fontSize: '13px', color: '#dc2626', fontWeight: 500,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '380px',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="#dc2626">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9V7a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                            </svg>
                            <span style={{ flex: 1 }}>{error}</span>
                            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px' }}>✕</button>
                        </div>
                    )}

                    {/* Card */}
                    <div style={{
                        background: 'white', borderRadius: '24px',
                        padding: '36px 38px', width: '100%', maxWidth: '620px',
                        boxShadow: '0 16px 56px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
                        position: 'relative', zIndex: 1, marginTop: '8px',
                    }}>
                        {/* Header */}
                        <div style={{ marginBottom: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '9px',
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 10px rgba(79,70,229,0.3)',
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                        <path d="M4 5h12M4 10h8M4 15h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: 800, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Invoice App
                                </span>
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.6px', marginBottom: '4px' }}>
                                Your Company Details
                            </h2>
                            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                                This info will appear on all your invoices — make it accurate!
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Company Info section */}
                            <div className="cf-grid">
                                <SectionHeader title="🏢  Company Information" />
                                {COMPANY_FIELDS.map(f => (
                                    <Field
                                        key={f.name}
                                        field={f}
                                        value={formData[f.name]}
                                        logoPreview={logoPreview}
                                        onChange={handleChange}
                                    />
                                ))}
                            </div>

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0 24px' }} />

                            {/* Bank Details section */}
                            <div className="cf-grid-bank">
                                <SectionHeader title="🏦  Bank Details" />
                                {BANK_FIELDS.map(f => (
                                    <Field
                                        key={f.name}
                                        field={f}
                                        value={formData[f.name]}
                                        logoPreview={logoPreview}
                                        onChange={handleChange}
                                    />
                                ))}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700,
                                    color: 'white',
                                    background: loading
                                        ? 'linear-gradient(135deg, #818cf8, #a78bfa)'
                                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    border: 'none', borderRadius: '12px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                }}
                                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(79,70,229,0.45)'; } }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.35)'; }}
                            >
                                {loading ? (
                                    <>
                                        <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                            <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        Saving Details...
                                    </>
                                ) : (
                                    <>
                                        Save & Continue
                                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                            <path d="M3 9h12M9 3l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div style={{ height: '40px' }} />

                    <style>{`
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
                </div>
            </div>
        </div>
    );
}
