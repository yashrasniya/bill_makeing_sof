import React, { Suspense, lazy, useEffect, useState } from "react";
import { clientToken } from "@/axios";
import orvineLogo from "../assets/orvine_logo.svg";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "@/store/userSlice";
import Navbar from "../comonant/navbar.jsx";
import PageIcon from "../comonant/PageIcon";
import { GST_STATES, stateFromGstin, stateByName } from "../constants/gst";
import { Building2, Landmark, QrCode, ImageIcon, CheckCircle2, Save, Upload, RefreshCw, Undo2, Check } from "lucide-react";
import "./CompanyForm.css";

/* ─── field definitions ─── */
const COMPANY_FIELDS = [
    { label: "Company Name", name: "company_name", type: "text", placeholder: "Acme Pvt. Ltd.", col: 2 },
    { label: "Company Address", name: "company_address", type: "text", placeholder: "123, MG Road, Bangalore", col: 2 },
    { label: "GST Number", name: "company_gst_number", type: "text", placeholder: "22AAAAA0000A1Z5", optional: true, hint: "Leave blank if you are not GST-registered. Your state is filled in from it." },
    { label: "State", name: "state", type: "state" },
    { label: "State Code", name: "state_code", type: "statecode", optional: true },
    { label: "Company Email", name: "company_email_id", type: "email", placeholder: "info@acme.com" },
    { label: "Company Phone", name: "company_phone", type: "tel", placeholder: "+91 98765 43210", optional: true },
    { label: "Company Logo", name: "company_logo", type: "file", col: 2 },
];

const BANK_FIELDS = [
    { label: "Bank Name", name: "bank_name", type: "text", placeholder: "State Bank of India" },
    { label: "Account Number", name: "account_number", type: "text", placeholder: "00000011234567891" },
    { label: "IFSC Code", name: "ifsc_code", type: "text", placeholder: "SBIN0001234" },
    { label: "Branch", name: "branch", type: "text", placeholder: "MG Road, Bangalore" },
];

/* UPI is opt-in: unlike the fields above, a company can bill perfectly well
   without it, so these are flagged `optional` and skipped by the
   all-fields-required check in handleSubmit. */
const UPI_FIELDS = [
    {
        label: "UPI ID", name: "upi_id", type: "text", optional: true, col: 2,
        placeholder: "acme@okaxis",
        hint: "Your UPI id / VPA \u2014 customers pay into this account.",
    },
    {
        label: "Show UPI QR on invoices", name: "show_upi_qr", type: "checkbox",
        optional: true, col: 2,
        hint: "Prints a QR on every exported invoice, pre-filled with that invoice's total.",
    },
];

/* Line item images moved to UI Config -> Invoice Fields. The server no longer
   accepts it on this form, so it must not be sent from here. */
const ALL_FIELDS = [...COMPANY_FIELDS, ...BANK_FIELDS, ...UPI_FIELDS];

/* ─── validation ───
   Each rule returns an error string or '' and only runs on a non-empty value,
   so optional fields stay optional. Required-ness is handled separately. */
const UPI_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,254}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
const RULES = {
    company_email_id: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email, e.g. info@acme.com.'),
    company_gst_number: (v) => (/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.toUpperCase()) ? '' : 'GST number must be 15 characters, e.g. 22AAAAA0000A1Z5.'),
    company_phone: (v) => { const n = v.replace(/\D/g, '').length; return n >= 10 && n <= 13 ? '' : 'Enter a valid phone number with 10 to 13 digits.'; },
    ifsc_code: (v) => (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()) ? '' : 'IFSC is 11 characters, e.g. SBIN0001234.'),
    account_number: (v) => (/^\d{9,18}$/.test(v) ? '' : 'Account number is 9 to 18 digits.'),
    upi_id: (v) => (UPI_RE.test(v) ? '' : 'Enter a valid UPI ID in the form name@bank, e.g. acme@okaxis.'),
};
/* A comparable picture of the form, used to tell whether anything changed since the last load or save. */
const snapshot = (data) => JSON.stringify(ALL_FIELDS.map((f) => {
    const v = data[f.name];
    if (f.type === 'file') return v instanceof File ? `file:${v.name}:${v.size}` : '';
    if (f.type === 'checkbox') return !!v;
    return v == null ? '' : String(v).trim();
}));

const FIELD_NAMES = new Set(ALL_FIELDS.map((f) => f.name));
const LOGO_TYPES = ['image/png', 'image/jpeg'];
const LOGO_MAX = 5 * 1024 * 1024;

function validateField(field, data) {
    if (field.type === 'file' || field.type === 'checkbox' || field.type === 'statecode') return '';
    const raw = data[field.name];
    const value = raw == null ? '' : String(raw).trim();
    if (field.name === 'state' && !stateByName(value)) return 'Select your state.';
    if (!value) return field.optional ? '' : (field.name === 'state' ? 'Select your state.' : `${field.label} is required.`);
    return RULES[field.name] ? RULES[field.name](value) : '';
}

function validateAll(data) {
    const errs = {};
    ALL_FIELDS.forEach((f) => { const m = validateField(f, data); if (m) errs[f.name] = m; });
    if (data.show_upi_qr && !(data.upi_id || '').trim() && !errs.upi_id) {
        errs.upi_id = 'Add a UPI ID before turning on the invoice QR code.';
    }
    return errs;
}

function validateLogo(file) {
    if (!LOGO_TYPES.includes(file.type)) return 'Logo must be a PNG or JPG image.';
    if (file.size > LOGO_MAX) return `Logo is ${(file.size / 1048576).toFixed(1)} MB. The limit is 5 MB.`;
    return '';
}

const formatSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/* Same `upi://pay` shape the backend puts on invoices (invoice_api/upi_qr.py),
   with a fixed ₹2 amount so the owner can scan it and see the money arrive. */
// loaded on demand: the QR library is only needed once a valid UPI ID is typed
const QRCodeSVG = lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })));

const TEST_AMOUNT = '2.00';
function buildTestUpiLink(upiId, payeeName) {
    const params = [['pa', upiId.trim()]];
    if (payeeName && payeeName.trim()) params.push(['pn', payeeName.trim()]);
    params.push(['am', TEST_AMOUNT], ['cu', 'INR'], ['tn', 'Test payment']);
    return 'upi://pay?' + params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

function UpiTestQr({ upiId, payeeName }) {
    if (!UPI_RE.test((upiId || '').trim())) return null;
    return (
        <div className="cf-field field-span-2">
            <div className="cf-qr">
                <div className="cf-qr__code">
                    <Suspense fallback={<div className="cf-qr__loading" style={{ width: 152, height: 152 }} />}>
                        <QRCodeSVG value={buildTestUpiLink(upiId, payeeName)} size={152} level="H" marginSize={2} />
                    </Suspense>
                </div>
                <div className="cf-qr__text">
                    <p className="cf-qr__title">Try it now: pay ₹{TEST_AMOUNT} to yourself</p>
                    <p className="cf-hint">
                        Scan this with any UPI app (Google Pay, PhonePe, Paytm). It should open a payment of
                        ₹{TEST_AMOUNT} to <strong>{upiId.trim()}</strong>. If it does, the same QR will work on your invoices,
                        with each invoice's total as the amount.
                    </p>
                    <p className="cf-hint">The preview updates as you edit the UPI ID. Nothing is sent until you pay.</p>
                </div>
            </div>
        </div>
    );
}

const ONBOARDING_STEPS = [
    { icon: Building2, title: 'Company Details', desc: 'Name, address, GST & email' },
    { icon: ImageIcon, title: 'Brand Logo', desc: 'Appears on every invoice you send' },
    { icon: Landmark, title: 'Bank Details', desc: 'For payment info on invoices' },
    { icon: QrCode, title: 'UPI QR', desc: 'Let customers scan & pay the exact total' },
    { icon: CheckCircle2, title: 'Verified & Ready', desc: 'Start billing your customers!' },
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
function SectionHeader({ title, icon: Icon }) {
    return (
        <div className="cf-section-header">
            <span className="cf-section-header__icon" aria-hidden="true"><Icon size={16} /></span>
            <span className="cf-section-header__text">{title}</span>
        </div>
    );
}

function Field({ field, value, logoPreview, onChange, onBlur, error, logoFile, canUndoLogo, onUndoLogo, gstState, stateCode }) {
    if (field.type === 'file') {
        const openPicker = () => document.getElementById('logo-input').click();
        return (
            <div className="cf-field field-span-2">
                {/* no htmlFor here on purpose: the hidden input lives inside the
                    dropzone's own click handler, so a label activation would
                    bubble back through it and open the picker twice */}
                <label className="cf-label">{field.label}</label>
                <div
                    id="cf-company_logo"
                    className={`cf-drop${error ? ' cf-drop--invalid' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-describedby={error ? 'cf-company_logo-error' : undefined}
                    onClick={openPicker}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
                >
                    <input
                        id="logo-input"
                        type="file"
                        name={field.name}
                        accept="image/png,image/jpeg"
                        onChange={onChange}
                        style={{ display: 'none' }}
                    />
                    {logoPreview ? (
                        <img className="cf-drop__preview" src={logoPreview} alt="logo preview" />
                    ) : (
                        <div className="cf-drop__placeholder">
                            <ImageIcon size={22} color="#4f46e5" aria-hidden="true" />
                        </div>
                    )}
                    <div className="cf-drop__text">
                        <p className="cf-drop__title">
                            {logoPreview ? (logoFile ? logoFile.name : 'Current logo') : 'Upload company logo'}
                        </p>
                        <p className="cf-drop__hint">
                            {logoFile ? `${formatSize(logoFile.size)} · not saved yet` : 'PNG or JPG, up to 5 MB'}
                        </p>
                    </div>
                    <div className="cf-drop__actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="cf-drop__btn" onClick={openPicker}>
                            {logoPreview ? <RefreshCw size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
                            {logoPreview ? 'Replace' : 'Upload'}
                        </button>
                        {canUndoLogo && (
                            <button type="button" className="cf-drop__btn cf-drop__btn--quiet" onClick={onUndoLogo}>
                                <Undo2 size={14} aria-hidden="true" /> Undo
                            </button>
                        )}
                    </div>
                </div>
                {error && <p id="cf-company_logo-error" className="cf-error" role="alert">{error}</p>}
            </div>
        );
    }

    if (field.type === 'state') {
        const locked = !!gstState;
        const current = stateByName(value);
        return (
            <div className="cf-field field-span-1">
                <label className="cf-label" htmlFor={`cf-${field.name}`}>
                    {field.label} <span className="cf-req">*</span>
                </label>
                <select
                    id={`cf-${field.name}`}
                    className={`cf-input cf-select${error ? ' cf-input--invalid' : ''}`}
                    name={field.name}
                    value={current ? current.name : ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={locked}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? `cf-${field.name}-error` : undefined}
                >
                    <option value="" disabled>Select state</option>
                    {GST_STATES.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
                </select>
                {error
                    ? <p id={`cf-${field.name}-error`} className="cf-error" role="alert">{error}</p>
                    : <p className="cf-hint">{locked ? 'Taken from your GST number.' : 'Decides CGST/SGST vs IGST on your invoices.'}</p>}
            </div>
        );
    }

    if (field.type === 'statecode') {
        return (
            <div className="cf-field field-span-1">
                <label className="cf-label" htmlFor={`cf-${field.name}`}>{field.label}</label>
                <input
                    id={`cf-${field.name}`}
                    className="cf-input cf-input--readonly"
                    value={stateCode || ''}
                    placeholder="Set from state"
                    readOnly
                    tabIndex={-1}
                />
                <p className="cf-hint">Filled in automatically.</p>
            </div>
        );
    }

    if (field.type === 'checkbox') {
        return (
            <div className="cf-field field-span-2">
                <label className="cf-check" htmlFor={`cf-${field.name}`}>
                    <input
                        id={`cf-${field.name}`}
                        type="checkbox"
                        name={field.name}
                        checked={!!value}
                        onChange={onChange}
                    />
                    <span className="cf-check__label">{field.label}</span>
                </label>
                {field.hint && <p className="cf-hint">{field.hint}</p>}
            </div>
        );
    }

    return (
        <div className={`cf-field ${field.col === 2 ? 'field-span-2' : 'field-span-1'}`}>
            <label className="cf-label" htmlFor={`cf-${field.name}`}>
                {field.label} {!field.optional && <span className="cf-req">*</span>}
            </label>
            <input
                id={`cf-${field.name}`}
                className={`cf-input${error ? ' cf-input--invalid' : ''}`}
                type={field.type}
                name={field.name}
                value={value || ''}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={field.placeholder}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `cf-${field.name}-error` : undefined}
                inputMode={field.name === 'account_number' || field.name === 'state_code' ? 'numeric' : undefined}
                autoComplete={field.name === 'account_number' ? 'off' : undefined}
            />
            {error
                ? <p id={`cf-${field.name}-error`} className="cf-error" role="alert">{error}</p>
                : field.hint && <p className="cf-hint">{field.hint}</p>}
        </div>
    );
}

/* ─── Main page component ─── */
export default function CompanyForm() {
    const [formData, setFormData] = useState({});
    const [logoPreview, setLogoPreview] = useState(null);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [savedLogo, setSavedLogo] = useState(null);
    const [justSaved, setJustSaved] = useState(false);
    const [baseline, setBaseline] = useState(() => snapshot({}));
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
                    const s = stateByName(res.data.state);
                    const loaded = s ? { ...res.data, state: s.name, state_code: s.code } : res.data;
                    setFormData(loaded);
                    setBaseline(snapshot(loaded));
                    if (res.data.company_logo) { setLogoPreview(res.data.company_logo); setSavedLogo(res.data.company_logo); }
                    if (res.data.is_varified) setShowNavbar(true);
                }
            })
            .catch(() => {
                // 404 / 401 — new user, no company yet; keep navbar hidden
            });
    }, []);  // run once on mount

    const gstState = stateFromGstin(formData.company_gst_number || '');
    // Only the settings page asks before discarding edits; onboarding has nothing saved to lose.
    const dirty = showNavbar && snapshot(formData) !== baseline;

    // closing the tab, reloading, or typing a new address
    useEffect(() => {
        if (!dirty) return undefined;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    // in-app links (sidebar, navbar). The app uses <BrowserRouter>, which has no route blocker,
    // so catch the click before the router sees it.
    useEffect(() => {
        if (!dirty) return undefined;
        const onClick = (e) => {
            const a = e.target.closest && e.target.closest('a[href]');
            if (!a || a.target === '_blank' || e.defaultPrevented) return;
            if (a.origin !== window.location.origin || a.pathname === window.location.pathname) return;
            if (!window.confirm('You have unsaved changes. Leave this page and discard them?')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, [dirty]);

    useEffect(() => {
        if (!justSaved) return undefined;
        const id = setTimeout(() => setJustSaved(false), 4000);
        return () => clearTimeout(id);
    }, [justSaved]);

    // any edit after a save clears the "Saved" state
    useEffect(() => { if (dirty) setJustSaved(false); }, [dirty]);

    const fieldByName = (name) => ALL_FIELDS.find((f) => f.name === name);

    const setFieldError = (name, message) =>
        setFieldErrors((prev) => {
            if (!message && !prev[name]) return prev;
            const next = { ...prev };
            if (message) next[name] = message; else delete next[name];
            return next;
        });

    const handleChange = (e) => {
        const { name, value, files, type, checked } = e.target;
        if (type === "file") {
            const file = files[0];
            e.target.value = '';  // lets the same file be picked again after an error
            if (!file) return;
            const problem = validateLogo(file);
            if (problem) { setFieldError(name, problem); return; }
            setFieldError(name, '');
            if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
            setFormData(prev => ({ ...prev, [name]: file }));
            setLogoPreview(URL.createObjectURL(file));
        } else if (type === "checkbox") {
            setFormData(prev => ({ ...prev, [name]: checked }));
            if (name === 'show_upi_qr') {
                if (!checked) setFieldError('upi_id', validateField(fieldByName('upi_id'), formData));
                else if (!(formData.upi_id || '').trim()) setFieldError('upi_id', 'Add a UPI ID before turning on the invoice QR code.');
            }
        } else if (name === 'state') {
            const s = stateByName(value);
            setFormData(prev => ({ ...prev, state: s ? s.name : value, state_code: s ? s.code : '' }));
            setFieldError('state', '');
        } else if (name === 'company_gst_number') {
            const s = stateFromGstin(value);
            // a complete GSTIN fixes the state, so it overrides whatever was picked (the API does the same)
            setFormData(prev => (s ? { ...prev, [name]: value, state: s.name, state_code: s.code } : { ...prev, [name]: value }));
            if (s) setFieldError('state', '');
            if (fieldErrors[name]) setFieldError(name, validateField(fieldByName(name), { ...formData, [name]: value }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            // once a field has shown an error, re-check as the user types so it clears the moment it is fixed
            if (fieldErrors[name]) setFieldError(name, validateField(fieldByName(name), { ...formData, [name]: value }));
        }
    };

    const handleBlur = (e) => {
        const field = fieldByName(e.target.name);
        if (field) setFieldError(field.name, validateField(field, formData));
    };

    // Discards a newly picked logo and goes back to the saved one. The API has
    // no "clear logo" call, so a saved logo can be replaced but not removed here.
    const undoLogo = () => {
        if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
        setFormData(prev => ({ ...prev, company_logo: savedLogo }));
        setLogoPreview(savedLogo);
        setFieldError('company_logo', '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const errs = { ...validateAll(formData) };
        if (fieldErrors.company_logo) errs.company_logo = fieldErrors.company_logo;
        setFieldErrors(errs);
        const firstBad = [...COMPANY_FIELDS, ...BANK_FIELDS, ...UPI_FIELDS].find((f) => errs[f.name]);
        if (firstBad) {
            setLoading(false);
            const el = document.getElementById(`cf-${firstBad.name}`);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); }
            return;
        }

        const data = new FormData();
        ALL_FIELDS.forEach((field) => {
            if (field.type === "checkbox") {
                // Always sent: the POST is a full update, so omitting an
                // unticked box would leave the old value in place.
                data.append(field.name, formData[field.name] ? "true" : "false");
            } else if (formData[field.name]) {
                if (field.type === "file") {
                    if (formData[field.name] instanceof File) data.append(field.name, formData[field.name]);
                } else {
                    data.append(field.name, formData[field.name]);
                }
            }
        });

        const submitted = formData;
        clientToken.post('user-companies/', data, { headers: { "Content-Type": "multipart/form-data" } })
            .then((res) => {
                if (res.status === 201 && !userInfo?.is_company_varified) {
                    // Refresh first: the route guard bounces unverified users
                    // back here, so /choose-template must see a verified user.
                    return dispatch(fetchUser()).then(() => {
                        navigate('/choose-template', { replace: true });
                    });
                }
                if (res.status === 201) {
                    // the new logo is saved now: show it as the current one and reset the baseline
                    const saved = { ...submitted, company_logo: submitted.company_logo instanceof File ? logoPreview : submitted.company_logo };
                    if (submitted.company_logo instanceof File) setSavedLogo(logoPreview);
                    setFormData(saved);
                    setBaseline(snapshot(saved));
                    setFieldErrors({});
                    setJustSaved(true);
                }
            })
            .catch((err) => {
                if (err.response?.status === 400) {
                    const body = err.response.data || {};
                    const mapped = {};
                    const other = [];
                    Object.keys(body).forEach((k) => {
                        const msg = Array.isArray(body[k]) ? body[k][0] : String(body[k]);
                        if (FIELD_NAMES.has(k)) mapped[k] = msg; else other.push(`${k}: ${msg}`);
                    });
                    setFieldErrors((prev) => ({ ...prev, ...mapped }));
                    if (other.length) setError(other.join(' | '));
                    const first = Object.keys(mapped)[0];
                    const el = first && document.getElementById(`cf-${first}`);
                    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); }
                } else {
                    setError("Something went wrong. Please try again.");
                }
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className={`cf-root${showNavbar ? " cf-settings" : ""}`}>
            {showNavbar && <Navbar />}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

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
                                <span className="cf-step__icon"><item.icon size={18} /></span>
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

                    {/* Success toast */}
                    {justSaved && (
                        <div className="cf-toast cf-toast--success" role="status">
                            <Check size={16} aria-hidden="true" />
                            <span className="cf-toast__msg">Company details saved. New invoices will use them.</span>
                            <button className="cf-toast__close" onClick={() => setJustSaved(false)} aria-label="Dismiss">✕</button>
                        </div>
                    )}

                    {/* Settings mode: standard page header with the primary action */}
                    {showNavbar && (
                        <div className="cf-pagehead">
                            <div className="cf-pagehead__title">
                                <PageIcon icon={Building2} />
                                <div>
                                    <h1>My company</h1>
                                    <p>Update your company profile. Changes appear on new invoices.</p>
                                </div>
                            </div>
                            <div className="cf-pagehead__actions">
                                {dirty && <span className="cf-status cf-status--dirty" role="status">Unsaved changes</span>}
                                {!dirty && justSaved && <span className="cf-status cf-status--saved" role="status"><Check size={14} aria-hidden="true" /> Saved</span>}
                                <button type="submit" form="cf-form" className="cf-submit cf-submit--header" disabled={loading}>
                                    <Save size={16} aria-hidden="true" />
                                    {loading ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
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

                        <form id="cf-form" onSubmit={handleSubmit} noValidate>
                            {/* Company Info section */}
                            <div className="cf-grid cf-section">
                                <SectionHeader title="Company information" icon={Building2} />
                                {COMPANY_FIELDS.map(f => (
                                    <Field
                                        key={f.name}
                                        field={f}
                                        value={formData[f.name]}
                                        logoPreview={logoPreview}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={fieldErrors[f.name]}
                                        gstState={gstState}
                                        stateCode={formData.state_code}
                                        logoFile={formData.company_logo instanceof File ? formData.company_logo : null}
                                        canUndoLogo={formData.company_logo instanceof File}
                                        onUndoLogo={undoLogo}
                                    />
                                ))}
                            </div>

                            <div className="cf-divider" />

                            {/* Bank Details section */}
                            <div className="cf-grid cf-section">
                                <SectionHeader title="Bank details" icon={Landmark} />
                                {BANK_FIELDS.map(f => (
                                    <Field
                                        key={f.name}
                                        field={f}
                                        value={formData[f.name]}
                                        logoPreview={logoPreview}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={fieldErrors[f.name]}
                                        gstState={gstState}
                                        stateCode={formData.state_code}
                                        logoFile={formData.company_logo instanceof File ? formData.company_logo : null}
                                        canUndoLogo={formData.company_logo instanceof File}
                                        onUndoLogo={undoLogo}
                                    />
                                ))}
                            </div>

                            <div className="cf-divider" />

                            {/* UPI section */}
                            <div className="cf-grid cf-section">
                                <SectionHeader title="UPI payments" icon={QrCode} />
                                {UPI_FIELDS.map(f => (
                                    <Field
                                        key={f.name}
                                        field={f}
                                        value={formData[f.name]}
                                        logoPreview={logoPreview}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={fieldErrors[f.name]}
                                        gstState={gstState}
                                        stateCode={formData.state_code}
                                        logoFile={formData.company_logo instanceof File ? formData.company_logo : null}
                                        canUndoLogo={formData.company_logo instanceof File}
                                        onUndoLogo={undoLogo}
                                    />
                                ))}
                                <UpiTestQr upiId={formData.upi_id} payeeName={formData.company_name} />
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
