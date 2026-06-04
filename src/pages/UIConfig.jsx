import React, { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import { useSelector } from "react-redux";

const temp_ui_config = {
    formula: "",
    input_title: '',
    is_calculable: false,
    is_show: false,
    on_with_out_gst_amount: false,
    size: 3.0,
    presets: "",
    default_value: "",
};

const temp_cf_config = {
    name: "",
    field_type: "text",
    hidden: false,
    default_value: "",
    presetsStr: "",
};

/* ── stable style helpers ── */
const inp = {
    width: '100%', padding: '10px 13px', fontSize: '14px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    outline: 'none', color: '#0f172a', background: '#f8fafc',
    fontFamily: "'Inter','Segoe UI',sans-serif", fontWeight: 600,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
};
const focIn = e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; e.target.style.background = 'white'; };
const focOut = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

const UIConfig = () => {
    const [activeTab, setActiveTab] = useState("productFields"); // "productFields" | "customFields"

    // Product UI Config States
    const [selected, setSelected] = useState(null);
    const [formData, setFormData] = useState({});
    const [products, setProducts] = useState([]);

    // Custom Fields States
    const [customFields, setCustomFields] = useState([]);
    const [selectedCF, setSelectedCF] = useState(null);
    const [cfFormData, setCFFormData] = useState({});

    const { userInfo } = useSelector((state) => state.user);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', msg }

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSelect = (product) => {
        setSelected(product.id);
        setFormData(product);
    };

    const handleCFSelect = (cf) => {
        setSelectedCF(cf.id);
        let optionsStr = "";
        if (cf.multioption_value) {
            if (Array.isArray(cf.multioption_value)) {
                optionsStr = cf.multioption_value.join(", ");
            } else if (typeof cf.multioption_value === "string") {
                optionsStr = cf.multioption_value;
            }
        }
        setCFFormData({
            ...cf,
            presetsStr: optionsStr
        });
    };

    const fetchAllData = () => {
        clientToken.get("new/product/in/frontend/").then((response) => {
            setProducts(response.data);
        }).catch(() => {
            showToast('error', 'Failed to load config list.');
        });

        clientToken.get("custom-fields/").then((response) => {
            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setCustomFields(data);
        }).catch(() => {
            showToast('error', 'Failed to load custom fields.');
        });
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleCFChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCFFormData({
            ...cfFormData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const validation = () => {
        if (!formData.input_title) {
            showToast('error', "Please enter title");
            return false;
        }
        if (!formData.size) {
            showToast('error', "Please enter size");
            return false;
        }
        return true;
    };

    const validateCF = () => {
        if (!cfFormData.name) {
            showToast('error', "Please enter field name");
            return false;
        }
        return true;
    };

    const prepareCFPayload = () => {
        const payload = { ...cfFormData };
        if (payload.presetsStr && (payload.field_type === 'select' || payload.field_type === 'multiselect')) {
            payload.multioption_value = payload.presetsStr.split(",").map(s => s.trim()).filter(Boolean);
        } else {
            payload.multioption_value = null;
        }
        delete payload.presetsStr;
        return payload;
    };

    const handleSave = () => {
        if (!validation()) return;
        setSaving(true);
        clientToken
            .post(`new/product/in/frontend/${formData.id}/update/`, formData)
            .then((response) => {
                showToast('success', "Saved: " + response.data.input_title);
                setProducts(products.map((p) => (p.id === formData.id ? response.data : p)));
            })
            .catch(() => showToast('error', 'Failed to save.'))
            .finally(() => setSaving(false));
    };

    const handleCreate = () => {
        if (!validation()) return;
        setSaving(true);
        clientToken
            .post(`new/product/in/frontend/`, formData)
            .then((response) => {
                showToast('success', "Created: " + response.data.input_title);
                setProducts([...products, response.data]);
                setSelected(response.data.id);
                setFormData(response.data);
            })
            .catch(() => showToast('error', 'Failed to create.'))
            .finally(() => setSaving(false));
    };

    const handleDelete = () => {
        if (!window.confirm("Are you sure you want to delete this config?")) return;
        setSaving(true);
        clientToken
            .delete(`new/product/in/frontend/${formData.id}/update/`, { data: formData })
            .then((response) => {
                if (response.status === 204 || response.status === 200) {
                    showToast('success', "Deleted successfully.");
                    setProducts(products.filter((p) => p.id !== formData.id));
                    setSelected(null);
                    setFormData({});
                }
            })
            .catch(() => showToast('error', 'Failed to delete.'))
            .finally(() => setSaving(false));
    };

    const handleCFSave = () => {
        if (!validateCF()) return;
        setSaving(true);
        const payload = prepareCFPayload();
        clientToken
            .put(`custom-fields/${payload.id}/`, payload)
            .then((response) => {
                showToast('success', "Updated custom field: " + response.data.name);
                setCustomFields(customFields.map((cf) => (cf.id === payload.id ? response.data : cf)));
                handleCFSelect(response.data);
            })
            .catch(() => showToast('error', 'Failed to update custom field.'))
            .finally(() => setSaving(false));
    };

    const handleCFCreate = () => {
        if (!validateCF()) return;
        setSaving(true);
        const payload = prepareCFPayload();
        delete payload.id;
        clientToken
            .post(`custom-fields/`, payload)
            .then((response) => {
                showToast('success', "Created custom field: " + response.data.name);
                setCustomFields([...customFields, response.data]);
                handleCFSelect(response.data);
            })
            .catch(() => showToast('error', 'Failed to create custom field.'))
            .finally(() => setSaving(false));
    };

    const handleCFDelete = () => {
        if (!window.confirm("Are you sure you want to delete this custom field?")) return;
        setSaving(true);
        clientToken
            .delete(`custom-fields/${cfFormData.id}/`)
            .then(() => {
                showToast('success', "Deleted custom field successfully.");
                setCustomFields(customFields.filter((cf) => cf.id !== cfFormData.id));
                setSelectedCF(null);
                setCFFormData({});
            })
            .catch(() => showToast('error', 'Failed to delete custom field.'))
            .finally(() => setSaving(false));
    };

    return (
        <div style={{ minHeight: 'calc(100vh)', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif", padding: '32px 24px', paddingTop: '100px' }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
                    background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    color: toast.type === 'success' ? '#166534' : '#dc2626',
                    padding: '12px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px',
                    animation: 'fadeUp 0.3s ease',
                }}>
                    <span>{toast.type === 'success' ? '✅' : '❌'}</span> {toast.msg}
                </div>
            )}

            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{
                            fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.5px',
                            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text', margin: 0,
                        }}>UI Configuration</h1>
                        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                            Manage interface settings, product parameters, and custom fields
                        </p>
                    </div>

                    {activeTab === "productFields" ? (
                        <button
                            onClick={() => {
                                setFormData(temp_ui_config);
                                setSelected('new_' + Math.random().toString(36).substr(2, 9));
                            }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white',
                                padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                                border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(79,70,229,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.3)'; }}
                        >
                            + New UI Config
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setCFFormData(temp_cf_config);
                                setSelectedCF('new_' + Math.random().toString(36).substr(2, 9));
                            }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white',
                                padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                                border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(79,70,229,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.3)'; }}
                        >
                            + New Custom Field
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    <button
                        onClick={() => { setActiveTab("productFields"); setSelected(null); setFormData({}); }}
                        style={{
                            padding: '8px 16px', fontSize: '15px', fontWeight: activeTab === "productFields" ? 700 : 500,
                            color: activeTab === "productFields" ? '#4f46e5' : '#64748b',
                            border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: activeTab === "productFields" ? '3px solid #4f46e5' : '3px solid transparent',
                            marginBottom: '-11px', transition: 'all 0.15s'
                        }}
                    >
                        📦 Product Fields
                    </button>
                    <button
                        onClick={() => { setActiveTab("customFields"); setSelectedCF(null); setCFFormData({}); }}
                        style={{
                            padding: '8px 16px', fontSize: '15px', fontWeight: activeTab === "customFields" ? 700 : 500,
                            color: activeTab === "customFields" ? '#4f46e5' : '#64748b',
                            border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: activeTab === "customFields" ? '3px solid #4f46e5' : '3px solid transparent',
                            marginBottom: '-11px', transition: 'all 0.15s'
                        }}
                    >
                        🛠️ Company Custom Fields
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

                    {/* ── Left side: Config List ── */}
                    <div style={{ flex: '1 1 300px', background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', alignSelf: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {activeTab === "productFields" ? "Configuration Items" : "Custom Fields"}
                            </span>
                        </div>

                        {activeTab === "productFields" ? (
                            products.length === 0 ? (
                                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 500, background: '#f8fafc', borderRadius: '12px' }}>
                                    No configuration items found
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {products.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleSelect(p)}
                                            style={{
                                                padding: '12px 16px', borderRadius: '10px',
                                                background: selected === p.id ? '#eef2ff' : '#f8fafc',
                                                border: `1.5px solid ${selected === p.id ? '#c7d2fe' : '#e2e8f0'}`,
                                                color: selected === p.id ? '#4f46e5' : '#374151',
                                                fontWeight: selected === p.id ? 700 : 600,
                                                fontSize: '14px', cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { if (selected !== p.id) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
                                            onMouseLeave={e => { if (selected !== p.id) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
                                        >
                                            📄 {p.input_title || 'Untitled'}
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            customFields.length === 0 ? (
                                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 500, background: '#f8fafc', borderRadius: '12px' }}>
                                    No custom fields found
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {customFields.map((cf) => (
                                        <div
                                            key={cf.id}
                                            onClick={() => handleCFSelect(cf)}
                                            style={{
                                                padding: '12px 16px', borderRadius: '10px',
                                                background: selectedCF === cf.id ? '#eef2ff' : '#f8fafc',
                                                border: `1.5px solid ${selectedCF === cf.id ? '#c7d2fe' : '#e2e8f0'}`,
                                                color: selectedCF === cf.id ? '#4f46e5' : '#374151',
                                                fontWeight: selectedCF === cf.id ? 700 : 600,
                                                fontSize: '14px', cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { if (selectedCF !== cf.id) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
                                            onMouseLeave={e => { if (selectedCF !== cf.id) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
                                        >
                                            🛠️ {cf.name || 'Untitled Field'}
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>

                    {/* ── Right side: Edit Form ── */}
                    <div style={{ flex: '2 1 500px', background: 'white', borderRadius: '20px', padding: '32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', alignSelf: 'flex-start' }}>
                        {activeTab === "productFields" ? (
                            selected ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                                        <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {formData.id && !String(formData.id).startsWith('new_') ? 'Edit Configuration' : 'Create New Configuration'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
                                                <input type="text" name="input_title" value={formData.input_title || ""} onChange={handleChange} onFocus={focIn} onBlur={focOut} style={inp} placeholder="e.g. Tax Rate" />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Column Size</label>
                                                <input type="number" step="0.01" name="size" value={formData.size || ""} onChange={handleChange} onFocus={focIn} onBlur={focOut} style={inp} placeholder="1.0" />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Formula</label>
                                            <select 
                                                name="formula" 
                                                value={formData.formula || ""} 
                                                onChange={handleChange} 
                                                onFocus={focIn} 
                                                onBlur={focOut} 
                                                style={inp}
                                            >
                                                <option value="">Multiplication (Default)</option>
                                                <option value="+">Addition (+)</option>
                                                <option value="-">Subtraction (-)</option>
                                                <option value="/">Division (/)</option>
                                                <option value="%+">Percentage Add (%+)</option>
                                                <option value="%-">Percentage Subtract (%-)</option>
                                            </select>

                                            {/* Formula Helper Guide */}
                                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '4px' }}>
                                                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    💡 Formula Guide
                                                </p>
                                                <p style={{ margin: '0 0 8px', fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                                                    Use standard mathematical operators to calculate values. You can write your custom logic here.
                                                </p>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                                                    <div style={{ fontSize: '12px', color: '#475569' }}><strong style={{ color: '#4f46e5', display: 'inline-block', width: '16px' }}>+</strong> Addition</div>
                                                    <div style={{ fontSize: '12px', color: '#475569' }}><strong style={{ color: '#ef4444', display: 'inline-block', width: '16px' }}>-</strong> Subtraction</div>
                                                    <div style={{ fontSize: '12px', color: '#475569' }}><strong style={{ color: '#0ea5e9', display: 'inline-block', width: '25px' }}>%+</strong> Percentage Add</div>
                                                    <div style={{ fontSize: '12px', color: '#475569' }}><strong style={{ color: '#ec4899', display: 'inline-block', width: '25px' }}>%-</strong> Percentage Sub</div>
                                                    <div style={{ fontSize: '12px', color: '#475569' }}><strong style={{ color: '#eab308', display: 'inline-block', width: '25px' }}>*</strong> Multiplication</div>
                                                    <div style={{ fontSize: '12px', color: '#475569' }}><strong style={{ color: '#10b981', display: 'inline-block', width: '16px' }}>/</strong> Division</div>
                                                </div>
                                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', background: 'white', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '6px', fontFamily: 'monospace' }}>
                                                    Examples: <span style={{ color: '#0f172a' }}>qty * rate</span> <span style={{ color: '#94a3b8', margin: '0 4px' }}>|</span> <span style={{ color: '#0f172a' }}>total - discount</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Checkboxes */}
                                        <div style={{ display: 'flex', gap: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                                <input type="checkbox" name="is_show" checked={formData.is_show || false} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                                Show in frontend UI
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                                <input type="checkbox" name="is_calculable" checked={formData.is_calculable || false} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                                Value is calculable
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                                <input type="checkbox" name="on_with_out_gst_amount" checked={formData.on_with_out_gst_amount || false} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                                On Without GST Amount
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                                <input type="checkbox" name="show_calculated_value" checked={formData.show_calculated_value || false} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                                Show Calculated Value
                                            </label>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default Value</label>
                                                <input type="text" name="default_value" value={formData.default_value || ""} onChange={handleChange} onFocus={focIn} onBlur={focOut} style={inp} placeholder="e.g. 0" />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preset Options</label>
                                                <input type="text" name="presets" value={formData.presets || ""} onChange={handleChange} onFocus={focIn} onBlur={focOut} style={inp} placeholder="Option 1, Option 2, Option 3" />
                                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                                                    Separate options with commas (e.g. 5%, 12%, 18%)
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                                        {userInfo?.is_staff && formData.id && !String(formData.id).startsWith('new_') && (
                                            <button
                                                onClick={handleDelete}
                                                disabled={saving}
                                                style={{
                                                    padding: '10px 24px', fontSize: '14px', fontWeight: 700, color: '#dc2626',
                                                    background: 'white', border: '1.5px solid #fca5a5', borderRadius: '10px',
                                                    cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#fef2f2'; } }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                                            >
                                                Delete Config
                                            </button>
                                        )}

                                        <button
                                            onClick={formData.id && !String(formData.id).startsWith('new_') ? handleSave : handleCreate}
                                            disabled={saving}
                                            style={{
                                                padding: '10px 32px', fontSize: '14px', fontWeight: 700, color: 'white', border: 'none', borderRadius: '10px',
                                                cursor: saving ? 'not-allowed' : 'pointer',
                                                background: saving ? 'linear-gradient(135deg,#a5b4fc,#c4b5fd)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                                boxShadow: '0 4px 14px rgba(79,70,229,0.3)', transition: 'all 0.15s',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                            }}
                                            onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.4)'; } }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.3)'; }}
                                        >
                                            {saving ? 'Saving...' : (formData.id && !String(formData.id).startsWith('new_') ? 'Update Config' : 'Create Config')}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#94a3b8' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>
                                        ⚙️
                                    </div>
                                    <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>No configuration selected</p>
                                    <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Select an item from the list or create a new one.</p>
                                </div>
                            )
                        ) : (
                            selectedCF ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                                        <div style={{ width: '4px', height: '18px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {cfFormData.id && !String(cfFormData.id).startsWith('new_') ? 'Edit Custom Field' : 'Create New Custom Field'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field Name</label>
                                                <input type="text" name="name" value={cfFormData.name || ""} onChange={handleCFChange} onFocus={focIn} onBlur={focOut} style={inp} placeholder="e.g. Serial Number" />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field Type</label>
                                                <select name="field_type" value={cfFormData.field_type || "text"} onChange={handleCFChange} onFocus={focIn} onBlur={focOut} style={inp}>
                                                    <option value="text">Text</option>
                                                    <option value="number">Number</option>
                                                    <option value="select">Select (Single Choice)</option>
                                                    <option value="multiselect">Multi-Select (Multiple Choices)</option>
                                                    <option value="date">Date</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default Value</label>
                                                <input type="text" name="default_value" value={cfFormData.default_value || ""} onChange={handleCFChange} onFocus={focIn} onBlur={focOut} style={inp} placeholder="e.g. Default text" />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '100%', paddingTop: '20px' }}>
                                                    <input type="checkbox" name="hidden" checked={cfFormData.hidden || false} onChange={handleCFChange} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Hide Field in UI</span>
                                                </label>
                                            </div>
                                        </div>

                                        {(cfFormData.field_type === 'select' || cfFormData.field_type === 'multiselect') && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dropdown Options</label>
                                                <input type="text" name="presetsStr" value={cfFormData.presetsStr || ""} onChange={handleCFChange} onFocus={focIn} onBlur={focOut} style={inp} placeholder="e.g. Option 1, Option 2, Option 3" />
                                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                                                    Separate options with commas (e.g. Red, Green, Blue)
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                                        {cfFormData.id && !String(cfFormData.id).startsWith('new_') && (
                                            <button
                                                onClick={handleCFDelete}
                                                disabled={saving}
                                                style={{
                                                    padding: '10px 24px', fontSize: '14px', fontWeight: 700, color: '#dc2626',
                                                    background: 'white', border: '1.5px solid #fca5a5', borderRadius: '10px',
                                                    cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#fef2f2'; } }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                                            >
                                                Delete Field
                                            </button>
                                        )}

                                        <button
                                            onClick={cfFormData.id && !String(cfFormData.id).startsWith('new_') ? handleCFSave : handleCFCreate}
                                            disabled={saving}
                                            style={{
                                                padding: '10px 32px', fontSize: '14px', fontWeight: 700, color: 'white', border: 'none', borderRadius: '10px',
                                                cursor: saving ? 'not-allowed' : 'pointer',
                                                background: saving ? 'linear-gradient(135deg,#a5b4fc,#c4b5fd)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                                boxShadow: '0 4px 14px rgba(79,70,229,0.3)', transition: 'all 0.15s',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                            }}
                                            onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.4)'; } }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.3)'; }}
                                        >
                                            {saving ? 'Saving...' : (cfFormData.id && !String(cfFormData.id).startsWith('new_') ? 'Update Field' : 'Create Field')}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#94a3b8' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>
                                        🛠️
                                    </div>
                                    <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>No custom field selected</p>
                                    <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Select an item from the list or create a new one.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default UIConfig;
