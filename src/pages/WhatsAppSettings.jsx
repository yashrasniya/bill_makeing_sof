import React, { useState, useEffect } from 'react';
import { clientToken } from '../axios.js';
import Navbar from '../comonant/navbar';

const WhatsAppSettings = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [config, setConfig] = useState(null);
    const [modeInfo, setModeInfo] = useState(null);   // {mode, options}
    const [savingMode, setSavingMode] = useState(false);
    const [formData, setFormData] = useState({
        access_token: '',
        phone_number_id: '',
        business_account_id: '',
        pin: ''
    });

    useEffect(() => {
        fetchConfig();
        fetchMode();
    }, []);

    const fetchMode = () => {
        clientToken.get('/whatsapp/mode/')
            .then(res => setModeInfo(res.data))
            .catch(() => setModeInfo(null));
    };

    const setMode = async (mode) => {
        if (savingMode || modeInfo?.mode === mode) return;
        setSavingMode(true);
        try {
            await clientToken.post('/whatsapp/mode/', { mode });
            fetchMode();
        } catch (e) {
            // 403 toast comes from the axios interceptor
        } finally {
            setSavingMode(false);
        }
    };

    const fetchConfig = () => {
        setLoading(true);
        clientToken.get('/whatsapp/config/')
            .then(res => {
                setConfig(res.data);
                // Optionally pre-fill if data is returned and we are editing
            })
            .catch(err => {
                if (err.response && err.response.status === 404) {
                    setConfig(null); // Not configured
                } else {
                    alert("Failed to load WhatsApp configuration");
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await clientToken.post('/whatsapp/config/', formData);
            if (res.status === 200 || res.status === 201) {
                alert('WhatsApp integration registered successfully');
                fetchConfig();
            }
        } catch (error) {
            alert(error.response?.data?.error || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Modern styled UI matching premium designs
    const renderContent = () => {
        if (loading) {
            return <div className="p-8 text-center text-gray-500">Loading Configuration...</div>;
        }

        return (
            <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">WhatsApp Integration</h1>
                    <p className="text-gray-500 mt-2">Choose how your company sends invoices on WhatsApp.</p>
                </div>

                {/* ── Sending mode ── */}
                {modeInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {[
                            {
                                key: 'platform',
                                title: "Use the product's WhatsApp number",
                                desc: "Send through our shared account — zero setup.",
                                opt: modeInfo.options.platform,
                            },
                            {
                                key: 'own',
                                title: 'Use your own WhatsApp number',
                                desc: 'Connect your Meta WhatsApp Business account below.',
                                opt: modeInfo.options.own,
                            },
                        ].map(({ key, title, desc, opt }) => {
                            const selected = modeInfo.mode === key;
                            const disabled = !opt.in_plan;
                            return (
                                <div key={key}
                                    onClick={() => !disabled && setMode(key)}
                                    className={`rounded-xl border p-5 transition-all ${
                                        selected ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                        : disabled ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                        : 'border-gray-200 hover:border-indigo-300 cursor-pointer'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
                                        {selected && (
                                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">ACTIVE</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">{desc}</p>
                                    <p className="text-xs text-gray-600">
                                        {disabled
                                            ? 'Not included in your plan — upgrade to enable.'
                                            : <>Daily limit: <b>{opt.sends_per_day ?? 'unlimited'}</b> shares
                                              {key === 'own' && !opt.configured && ' · not configured yet'}</>}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {modeInfo?.mode === 'platform' && (
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-5 mb-6 text-sm text-blue-900">
                        You're sending via the product's shared WhatsApp number.
                        No configuration needed. Switch to "your own number" above if
                        you want invoices to come from your business number.
                    </div>
                )}

                {modeInfo?.mode !== 'platform' && (config && config.status !== 'failed' ? (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-6 mb-6">
                        <div className="flex items-center mb-4">
                            <span className="w-4 h-4 rounded-full bg-green-500 mr-3"></span>
                            <h2 className="text-xl font-semibold text-green-900">Integration Active</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-green-800">
                            <li><span className="font-medium mr-2">Business Account ID:</span> {config.business_account_id}</li>
                            <li><span className="font-medium mr-2">Phone Number ID:</span> {config.phone_number_id}</li>
                            <li><span className="font-medium mr-2">Status:</span> 
                                <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-200 text-green-800 uppercase tracking-wide">
                                    {config.status}
                                </span>
                            </li>
                            <li>
                                <span className="font-medium mr-2">Registered On:</span> 
                                {new Date(config.created_at).toLocaleDateString()}
                            </li>
                        </ul>
                        <div className="mt-6">
                            <button 
                                onClick={() => setConfig(null)}
                                className="px-4 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-green-50 transition-colors"
                            >
                                Edit / Re-configure
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {config?.status === 'failed' && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                                Registration previously failed. Please try again with valid credentials.
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                                <input
                                    type="text"
                                    name="access_token"
                                    value={formData.access_token}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 border-gray-300"
                                    placeholder="EAAG..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number ID</label>
                                <input
                                    type="text"
                                    name="phone_number_id"
                                    value={formData.phone_number_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 border-gray-300"
                                    placeholder="100523423..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Business Account ID</label>
                                <input
                                    type="text"
                                    name="business_account_id"
                                    value={formData.business_account_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 border-gray-300"
                                    placeholder="1103..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Registration PIN</label>
                                <input
                                    type="text"
                                    name="pin"
                                    value={formData.pin}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 border-gray-300"
                                    placeholder="6-digit PIN"
                                />
                                <p className="text-xs text-gray-500 mt-1">Needed to register with Graph API.</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transform transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? 'Registering...' : 'Save & Register Integration'}
                            </button>
                        </div>
                    </form>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />
            {renderContent()}
        </div>
    );
};

export default WhatsAppSettings;
