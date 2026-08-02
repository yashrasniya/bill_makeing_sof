import React, { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import orvineLogo from "../assets/orvine_logo.svg";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "@/store/userSlice";
import Navbar from "../comonant/navbar.jsx";
import "./CompanyForm.css";

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

const ONBOARDING_STEPS = [
    { icon: '🏢', title: 'Company Details', desc: 'Name, address, GST & email' },
    { icon: '🖼️', title: 'Brand Logo', desc: 'Appears on every invoice you send' },
    { icon: '🏦', title: 'Bank Details', desc: 'For payment info on invoices' },
    { icon: '✅', title: 'Verified & Ready', desc: 'Start billing your customers!' },
];

/* ─────────────────────────────────────────────────
   IMPORTANT: Field & SectionHeader are defined at
   MODULE level (outside CompanyForm). Defining them
   inside would cause React to treat them as a new
   component type on every render, unmounting the
   focused input after every keystroke.

   All presentation lives in CompanyForm.css — hover
   and focus states are CSS pseudo-classes rather than
   JS handlers, so a focus ring can be scoped to
   keyboard users and can't get stuck mid-re-render.
───────────────────────────────────────────────── */
function SectionHeader({ title }) {
    return (
        <div className="cf-section-header">
            <div className="cf-section-header__bar" />
            <span className="cf-section-header__text">{title}</span>
        </div>
    );
}

function Field({ field, value, logoPreview, onChange }) {
    if (field.type === 'file') {
        return (
            <div className="cf-field field-span-2">
                {/* no htmlFor here on purpose: the hidden input lives inside the
                    dropzone's own click handler, so a label activation would
                    bubble back through it and open the picker twice */}
                <label className="cf-label">{field.label}</label>
                <div
                    className="cf-drop"
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
                        <img className="cf-drop__preview" src={logoPreview} alt="logo preview" />
                    ) : (
                        <div className="cf-drop__placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 16l4-4 3 3 4-5 5 6H4z" stroke="#4f46e5" strokeWidth="1.5" strokeLinejoin="round" />
                                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4f46e5" strokeWidth="1.5" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <p className="cf-drop__title">
                            {logoPreview ? 'Change logo' : 'Upload company logo'}
                        </p>
                        <p className="cf-drop__hint">PNG, JPG up to 5MB</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`cf-field ${field.col === 2 ? 'field-span-2' : 'field-span-1'}`}>
            <label className="cf-label" htmlFor={`cf-${field.name}`}>
                {field.label} <span className="cf-req">*</span>
            </label>
            <input
                id={`cf-${field.name}`}
                className="cf-input"
                type={field.type}
                name={field.name}
                value={value || ''}
                onChange={onChange}
                placeholder={field.placeholder}
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
        <div className="cf-root">
            {showNavbar && <Navbar />}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            <div className="cf-split">

                {/* ─────────────── LEFT PANEL (onboarding only) ─────────────── */}
                {!showNavbar && (
                    <div className="cf-left">
                        <div className="cf-orb cf-orb--a" />
                        <div className="cf-orb cf-orb--b" />
                        <div className="cf-orb cf-orb--c" />

                        <div className="cf-badge">
                            <img src={orvineLogo} alt="" />
                        </div>

                        <h2>
                            <span className="cf-wordmark">Invoice Orvine</span>
                        </h2>
                        <p className="cf-lede">
                            Set up your company profile to start creating professional invoices.
                        </p>

                        {ONBOARDING_STEPS.map((item) => (
                            <div className="cf-step" key={item.title}>
                                <span className="cf-step__icon">{item.icon}</span>
                                <div>
                                    <div className="cf-step__title">{item.title}</div>
                                    <div className="cf-step__desc">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─────────────── RIGHT PANEL ─────────────── */}
                <div className="cf-right">
                    <div className="cf-glow cf-glow--a" />
                    <div className="cf-glow cf-glow--b" />

                    {/* Error toast */}
                    {error && (
                        <div className="cf-toast" role="alert">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="#dc2626" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9V7a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                            </svg>
                            <span className="cf-toast__msg">{error}</span>
                            <button
                                className="cf-toast__close"
                                onClick={() => setError(null)}
                                aria-label="Dismiss"
                            >✕</button>
                        </div>
                    )}

                    {/* Card */}
                    <div className="cf-card">
                        {/* Header */}
                        <div className="cf-head">
                            {!showNavbar && (
                                <div className="cf-brandline">
                                    <div className="cf-mark">
                                        <img src={orvineLogo} alt="" />
                                    </div>
                                    <span className="cf-brandname">
                                        <span className="cf-wordmark">Invoice Orvine</span>
                                    </span>
                                </div>
                            )}
                            <h2 className="cf-title">
                                {showNavbar ? 'My Company' : 'Your Company Details'}
                            </h2>
                            <p className="cf-subtitle">
                                {showNavbar
                                    ? 'Update your company profile — changes appear on new invoices.'
                                    : 'This info will appear on all your invoices — make it accurate!'}
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

                            <div className="cf-divider" />

                            {/* Bank Details section */}
                            <div className="cf-grid">
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
                            <button type="submit" className="cf-submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <svg className="cf-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                            <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        Saving Details...
                                    </>
                                ) : (
                                    <>
                                        {showNavbar ? 'Save Changes' : 'Save & Continue'}
                                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                            <path d="M3 9h12M9 3l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="cf-tailspace" />
                </div>
            </div>
        </div>
    );
}
