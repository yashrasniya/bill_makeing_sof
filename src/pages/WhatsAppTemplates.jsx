import React, { useState, useEffect } from 'react';
import PageIcon from '../comonant/PageIcon';
import { MessageCircle } from 'lucide-react';
import { clientToken } from '../axios.js';
import Navbar from '../comonant/navbar';

const WhatsAppTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewData, setViewData] = useState({ mode: 'list', template: null }); // modes: list, create, edit
    const [formData, setFormData] = useState({
        template_name: '',
        category: 'UTILITY',
        language: 'en_US',
        body_text: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (viewData.mode === 'list') {
            fetchTemplates();
        }
    }, [viewData.mode]);

    const fetchTemplates = () => {
        setLoading(true);
        clientToken.get('/whatsapp/template/')
            .then(res => {
                setTemplates(res.data);
            })
            .catch(err => {
                alert("Failed to fetch templates: " + (err.response?.data?.error || "Unknown error"));
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleSyncClick = () => {
        setSyncing(true);
        clientToken.post('/whatsapp/template/sync/')
            .then(res => {
                const data = res.data;
                alert(`Sync Complete! Added: ${data.added}, Updated: ${data.updated}`);
                fetchTemplates();
            })
            .catch(err => {
                alert("Failed to sync templates: " + (err.response?.data?.error || "Unknown error"));
            })
            .finally(() => {
                setSyncing(false);
            });
    };

    const handleCreateClick = () => {
        setFormData({
            template_name: '',
            category: 'UTILITY',
            language: 'en_US',
            body_text: ''
        });
        setViewData({ mode: 'create', template: null });
    };

    const handleEditClick = (template) => {
        // Simple Body text parsing (Assuming simple format stored as stringified JSON)
        let parsedBodyText = "";
        try {
             // In backend we just saved str(components), which might be a python string. 
             // Ideally we should process the JSON, but since we are handling simplified text, we'll try to extract.
             // Warning: stringified python lists require strict json processing.
             const componentsStr = template.template_body.replace(/'/g, '"');
             const components = JSON.parse(componentsStr);
             const bodyComp = components.find(c => c.type === "BODY");
             if (bodyComp) {
                 parsedBodyText = bodyComp.text;
             }
        } catch(e) {
             parsedBodyText = template.template_body; // fallback
        }

        setFormData({
            template_name: template.template_name,
            category: template.category.toUpperCase(),
            language: 'en_US',
            body_text: parsedBodyText
        });
        setViewData({ mode: 'edit', template: template });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            template_name: formData.template_name,
            category: formData.category,
            language: formData.language,
            components: [
                {
                    type: "BODY",
                    text: formData.body_text
                }
            ]
        };

        try {
            if (viewData.mode === 'create') {
                await clientToken.post('/whatsapp/template/', payload);
                alert("Template created successfully");
            } else if (viewData.mode === 'edit') {
                await clientToken.put(`/whatsapp/template/${viewData.template.id}/`, payload);
                alert("Template updated successfully");
            }
            setViewData({ mode: 'list', template: null });
        } catch (error) {
            alert(error.response?.data?.error || "An error occurred during submission");
        } finally {
            setSubmitting(false);
        }
    };

    const renderList = () => {
        return (
            <div className="max-w-6xl mx-auto p-6 mt-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3.5"><PageIcon icon={MessageCircle} /><h1 className="text-[22px] font-bold tracking-tight text-slate-900">WhatsApp Templates</h1></div>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleSyncClick}
                            disabled={syncing}
                            className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold disabled:opacity-50"
                        >
                            {syncing ? 'Syncing...' : '↻ Sync Templates'}
                        </button>
                        <button
                            onClick={handleCreateClick}
                            className="px-4 py-2 bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] text-white rounded-xl font-bold"
                        >
                            + Create Template
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-slate-500 py-10">Loading templates...</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 uppercase text-sm leading-normal">
                                    <th className="py-3 px-6 border-b">Name</th>
                                    <th className="py-3 px-6 border-b">Category</th>
                                    <th className="py-3 px-6 border-b">Status</th>
                                    <th className="py-3 px-6 border-b">Created At</th>
                                    <th className="py-3 px-6 border-b text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-600 text-sm font-light">
                                {templates.length === 0 ? (
                                     <tr>
                                         <td colSpan="5" className="py-6 px-6 text-center text-slate-500">No templates found.</td>
                                     </tr>
                                ) : (
                                    templates.map((tpl) => (
                                        <tr key={tpl.id} className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="py-3 px-6 font-medium text-slate-900">{tpl.template_name}</td>
                                            <td className="py-3 px-6 tracking-wide text-xs">{tpl.category.toUpperCase()}</td>
                                            <td className="py-3 px-6">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    tpl.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    tpl.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {tpl.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-6">{new Date(tpl.created_at).toLocaleDateString()}</td>
                                            <td className="py-3 px-6 text-center">
                                                 <button 
                                                    onClick={() => handleEditClick(tpl)}
                                                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 mr-2"
                                                 >
                                                     Edit
                                                 </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderForm = () => {
        return (
            <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-10">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
                        {viewData.mode === 'create' ? 'Create New Template' : 'Edit Template'}
                    </h1>
                    <button 
                         onClick={() => setViewData({ mode: 'list', template: null })}
                         className="text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1 rounded"
                    >
                         ✕ Cancel
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Template Name</label>
                            <input
                                type="text"
                                name="template_name"
                                value={formData.template_name}
                                onChange={handleInputChange}
                                required
                                disabled={viewData.mode === 'edit'} // Usually Meta prohibits renaming
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-indigo-500 bg-slate-50 disabled:opacity-60"
                                placeholder="hello_world_01"
                            />
                            <p className="text-xs text-slate-500 mt-1">Lowercase, no spaces (use underscores).</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                            >
                                <option value="UTILITY">Utility</option>
                                <option value="MARKETING">Marketing</option>
                                <option value="AUTHENTICATION">Authentication</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Message Body</label>
                        <textarea
                            name="body_text"
                            value={formData.body_text}
                            onChange={handleInputChange}
                            required
                            rows={5}
                            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                            placeholder={"Hello {{1}},\n\nYour invoice {{2}} is ready.\n\nThank you!"}
                        />
                        <p className="text-xs text-slate-500 mt-1">Use double braces like `{"{{1}}"}` for variables.</p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] text-white rounded-xl transform transition-all active:scale-95 disabled:opacity-50 font-bold"
                        >
                            {submitting ? 'Saving...' : (viewData.mode === 'create' ? 'Create & Submit' : 'Update Template')}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <Navbar />
            {viewData.mode === 'list' ? renderList() : renderForm()}
        </div>
    );
};

export default WhatsAppTemplates;
