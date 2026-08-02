import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { clientToken } from "@/axios";
import Navbar from "../comonant/navbar";

export default function AvailableTemplates() {
    const { userInfo } = useSelector((s) => s.user);
    const isSuperuser = userInfo?.is_superuser;

    const [templates, setTemplates] = useState([]);
    const [galleryTemplates, setGalleryTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [galleryLoading, setGalleryLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [settingDefault, setSettingDefault] = useState(null);
    const [cloningId, setCloningId] = useState(null);
    const [activeTab, setActiveTab] = useState('my'); // 'my' | 'gallery'
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [adminFilter, setAdminFilter] = useState('all');
    const navigate = useNavigate();

    const loadTemplates = () => {
        clientToken.get('yaml/list/')
            .then((response) => {
                if (response.status === 200) {
                    setTemplates(response.data);
                }
            })
            .catch((error) => {
                console.error("Failed to fetch templates:", error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const loadGallery = () => {
        setGalleryLoading(true);
        clientToken.get('yaml/gallery/')
            .then((response) => {
                if (response.status === 200) {
                    setGalleryTemplates(response.data?.results || response.data || []);
                }
            })
            .catch((error) => {
                console.error("Failed to fetch gallery templates:", error);
            })
            .finally(() => {
                setGalleryLoading(false);
            });
    };

    useEffect(() => {
        loadTemplates();
        loadGallery();
    }, []);

    const setAsDefault = async (e, template) => {
        e.stopPropagation(); // don't open the editor
        setSettingDefault(template.id);
        try {
            await clientToken.post(`yaml/${template.id}/set-default/`);
            loadTemplates();
        } catch (err) {
            // 403 toast comes from the axios interceptor
        } finally {
            setSettingDefault(null);
        }
    };

    const togglePublish = async (e, template) => {
        e.stopPropagation();
        try {
            await clientToken.post(`yaml/${template.id}/toggle-publish/`);
            loadTemplates();
            loadGallery();
        } catch (err) {
            console.error("Failed to toggle publish status:", err);
            alert("Failed to toggle publish status. Only super admins can do this.");
        }
    };

    const handleCloneTemplate = async (e, template) => {
        e.stopPropagation();
        setCloningId(template.id);
        try {
            const response = await clientToken.post(`yaml/gallery/${template.id}/clone/`);
            if (response.status === 201) {
                loadTemplates();
                setActiveTab('my');
            }
        } catch (error) {
            console.error("Failed to clone template:", error);
        } finally {
            setCloningId(null);
        }
    };

    const hasHtmlTemplate = templates.some(t => t.is_html);

    const displayTemplates = templates.filter(t => {
        if (!isSuperuser) return true;
        if (adminFilter === 'all') return true;
        if (adminFilter === 'global') return t.is_global;
        if (adminFilter === 'user') return !t.is_global;
        if (adminFilter === 'mine') return t.user === userInfo?.username;
        return true;
    });

    const handleDeleteTemplate = async (e, templateId) => {
        e.stopPropagation();
        const confirmDelete = window.confirm("Are you sure you want to delete this template? This action cannot be undone.");
        if (!confirmDelete) return;

        try {
            const response = await clientToken.delete(`/yaml/?id=${templateId}`);
            if (response.status === 204) {
                setTemplates(prev => prev.filter(t => t.id !== templateId));
            }
        } catch (error) {
            console.error("Failed to delete template:", error);
            alert("Failed to delete template. Please try again.");
        }
    };

    const handleCreateHtmlTemplate = async () => {
        setIsCreating(true);
        try {
            const defaultHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Generated PDF</title>
    <style>
        @page { size: 595px 842px; margin: 0; }
        body { margin: 0; padding: 0; width: 595px; height: 842px; position: relative; background: white; }
        * { box-sizing: border-box; }
    </style>
</head>
<body>
<div style="position: absolute; left: 40px; top: 40px; font-size: 32px; color: #4F46E5; font-weight: bold; white-space: pre-wrap; font-family: Arial, sans-serif;">INVOICE</div>
<div style="position: absolute; left: 40px; top: 80px; font-size: 14px; color: #333333; font-weight: normal; white-space: pre-wrap; font-family: Arial, sans-serif;">Date: Oct 25, 2026</div>
<div style="position: absolute; left: 40px; top: 140px; font-size: 13px; color: #000000; font-weight: normal; white-space: pre-wrap; font-family: Arial, sans-serif;">Billed To:<br>Acme Corp</div>
<div style="position: absolute; left: 40px; top: 110px; width: 515px; height: 2px; background-color: #eeeeee;"></div>
<div style="position: absolute; left: 400px; top: 200px; font-size: 18px; color: #000000; font-weight: bold; white-space: pre-wrap; font-family: Arial, sans-serif;">Total: $500.00</div>
</body>
</html>`;

            const initialElements = [
                { id: '1', type: 'text', content: 'INVOICE', x: 40, y: 40, fontSize: 32, color: '#4F46E5', fontWeight: 'bold' },
                { id: '2', type: 'text', content: 'Date: Oct 25, 2026', x: 40, y: 80, fontSize: 14, color: '#333333', fontWeight: 'normal' },
                { id: '3', type: 'text', content: 'Billed To:\nAcme Corp', x: 40, y: 140, fontSize: 13, color: '#000000', fontWeight: 'normal' },
                { id: '4', type: 'line', x: 40, y: 110, width: 515, height: 2, backgroundColor: '#eeeeee' },
                { id: '5', type: 'text', content: 'Total: $500.00', x: 400, y: 200, fontSize: 18, color: '#000000', fontWeight: 'bold' },
            ];

            const response = await clientToken.post('/yaml/', {
                template_name: "Web Editor Layout",
                is_html: true,
                elements: initialElements,
                html_content: defaultHtml
            });

            if (response.status === 201) {
                navigate(`/weasyprint-preview?id=${response.data.id}`);
            }
        } catch (error) {
            console.error("Failed to create HTML template:", error);
            alert("Failed to create HTML template. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateGlobalHtmlTemplate = async () => {
        const cat = prompt("Enter a category for the Global Template (e.g., General, Retail, Services):", "General");
        if (cat === null) return; // User cancelled
        
        setIsCreating(true);
        try {
            const defaultHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Generated PDF</title>
    <style>
        @page { size: 595px 842px; margin: 0; }
        body { margin: 0; padding: 0; width: 595px; height: 842px; position: relative; background: white; }
        * { box-sizing: border-box; }
    </style>
</head>
<body>
<div style="position: absolute; left: 40px; top: 40px; font-size: 32px; color: #4F46E5; font-weight: bold; white-space: pre-wrap; font-family: Arial, sans-serif;">INVOICE</div>
<div style="position: absolute; left: 40px; top: 80px; font-size: 14px; color: #333333; font-weight: normal; white-space: pre-wrap; font-family: Arial, sans-serif;">Date: Oct 25, 2026</div>
<div style="position: absolute; left: 40px; top: 140px; font-size: 13px; color: #000000; font-weight: normal; white-space: pre-wrap; font-family: Arial, sans-serif;">Billed To:<br>Acme Corp</div>
<div style="position: absolute; left: 40px; top: 110px; width: 515px; height: 2px; background-color: #eeeeee;"></div>
<div style="position: absolute; left: 400px; top: 200px; font-size: 18px; color: #000000; font-weight: bold; white-space: pre-wrap; font-family: Arial, sans-serif;">Total: $500.00</div>
</body>
</html>`;

            const initialElements = [
                { id: '1', type: 'text', content: 'INVOICE', x: 40, y: 40, fontSize: 32, color: '#4F46E5', fontWeight: 'bold' },
                { id: '2', type: 'text', content: 'Date: Oct 25, 2026', x: 40, y: 80, fontSize: 14, color: '#333333', fontWeight: 'normal' },
                { id: '3', type: 'text', content: 'Billed To:\nAcme Corp', x: 40, y: 140, fontSize: 13, color: '#000000', fontWeight: 'normal' },
                { id: '4', type: 'line', x: 40, y: 110, width: 515, height: 2, backgroundColor: '#eeeeee' },
                { id: '5', type: 'text', content: 'Total: $500.00', x: 400, y: 200, fontSize: 18, color: '#000000', fontWeight: 'bold' },
            ];

            const response = await clientToken.post('/yaml/', {
                template_name: "New Global Template",
                is_html: true,
                elements: initialElements,
                html_content: defaultHtml,
                is_global: true,
                global_category: cat || "General"
            });

            if (response.status === 201) {
                navigate(`/weasyprint-preview?id=${response.data.id}`);
            }
        } catch (error) {
            console.error("Failed to create Global HTML template:", error);
            alert("Failed to create Global HTML template. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    // Extract unique categories from gallery templates
    const categories = ['All', ...new Set(galleryTemplates.filter(t => t.global_category).map(t => t.global_category))];
    const filteredGallery = selectedCategory === 'All'
        ? galleryTemplates
        : galleryTemplates.filter(t => t.global_category === selectedCategory);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header Section */}
                <div className="mb-10 text-center px-4">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-600 to-indigo-600 tracking-tight sm:text-5xl lg:text-6xl pb-2">
                        Invoice Templates
                    </h1>

                </div>

                {/* Tab Switcher */}
                <div className="flex justify-center mb-8 px-4">
                    <div className="inline-flex bg-white shadow-sm border border-gray-100 rounded-2xl p-1.5 gap-1 overflow-x-auto hide-scrollbar max-w-full">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                                activeTab === 'my' 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            📄 My Templates <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeTab === 'my' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>{templates.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('gallery')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                                activeTab === 'gallery' 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            🎨 Template Gallery <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeTab === 'gallery' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>{galleryTemplates.length}</span>
                        </button>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════
                    MY TEMPLATES TAB
                   ════════════════════════════════════════════════ */}
                {activeTab === 'my' && (
                    <>
                        {!isLoading && !hasHtmlTemplate && (
                            <div className="mb-8 flex justify-center">
                                <button
                                    onClick={handleCreateHtmlTemplate}
                                    disabled={isCreating}
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    {isCreating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Creating HTML Template...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="-ml-1 mr-2.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Create Custom HTML Template
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {isSuperuser && (
                            <div className="mb-6 flex sm:justify-center gap-3 border-b border-gray-100 pb-4 overflow-x-auto hide-scrollbar px-2">
                                <button
                                    onClick={() => setAdminFilter('all')}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${adminFilter === 'all' ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                    All Templates
                                </button>
                                <button
                                    onClick={() => setAdminFilter('global')}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${adminFilter === 'global' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700'}`}
                                >
                                    Global Templates
                                </button>
                                <button
                                    onClick={() => setAdminFilter('user')}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${adminFilter === 'user' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}
                                >
                                    User Templates
                                </button>
                                <button
                                    onClick={() => setAdminFilter('mine')}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${adminFilter === 'mine' ? 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-700'}`}
                                >
                                    My Templates
                                </button>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : displayTemplates.length === 0 ? (
                            <div className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm border border-gray-100/50 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/30 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                        <svg className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No templates yet</h3>
                                    <p className="mt-1 text-gray-500 max-w-sm mx-auto">Browse the <button onClick={() => setActiveTab('gallery')} className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-all">Template Gallery</button> to find your perfect layout.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-2 sm:px-0">
                                {displayTemplates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="group bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100/80 hover:shadow-[0_8px_30px_rgba(79,70,229,0.12)] hover:border-indigo-100 transition-all duration-500 transform hover:-translate-y-1.5 cursor-pointer flex flex-col relative"
                                        onClick={() => {
                                            if (template.is_html) {
                                                navigate(`/weasyprint-preview?id=${template.id}`);
                                            } else {
                                                navigate(`/invoice_editor?id=${template.id}`);
                                            }
                                        }}
                                    >
                                        {/* Visual Thumbnail Area */}
                                        <div className="aspect-[4/5] relative border-b border-gray-50 overflow-hidden bg-gray-50/50">
                                            {template.pdf_template ? (
                                                <img
                                                    src={template.pdf_template}
                                                    alt={template.template_name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-50/80 to-blue-50/50 p-6 flex flex-col pt-8 transition-transform duration-700 group-hover:scale-105">
                                                    <div className="w-16 h-4 bg-indigo-200/80 rounded mb-6 opacity-70"></div>
                                                    <div className="w-full h-2 bg-gray-200/80 rounded mb-2 opacity-50"></div>
                                                    <div className="w-3/4 h-2 bg-gray-200/80 rounded mb-8 opacity-50"></div>
                                                    <div className="flex-1 w-full bg-white/70 backdrop-blur-md rounded-xl border border-white p-4 shadow-sm flex flex-col gap-3">
                                                        <div className="w-full h-2.5 bg-gray-200/80 rounded"></div>
                                                        <div className="w-full h-2.5 bg-gray-200/80 rounded"></div>
                                                        <div className="w-5/6 h-2.5 bg-gray-200/80 rounded"></div>
                                                        <div className="mt-auto self-end w-1/3 h-3 bg-indigo-100 rounded"></div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Hover overlay with modern blur */}
                                            <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 backdrop-blur-[0px] group-hover:backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-400 bg-white/90 backdrop-blur-sm text-indigo-700 font-bold px-5 py-2.5 rounded-full shadow-lg text-sm border border-white/50 flex items-center gap-2">
                                                    Use Template
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details Area */}
                                        <div className="p-5 flex flex-col flex-1 bg-white">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                    {template.template_name || `Template #${template.id}`}
                                                </h3>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {template.is_default && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                                        ★ Default
                                                    </span>
                                                )}
                                                {template.is_html && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100">
                                                        HTML
                                                    </span>
                                                )}
                                                {template.is_global && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        Global
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-1 flex flex-col gap-1.5 text-sm mb-4">
                                                {template.company && (
                                                    <div className="flex items-center text-gray-500">
                                                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                        <span className="truncate">{template.company}</span>
                                                    </div>
                                                )}
                                                {template.user && (
                                                    <div className="flex items-center text-gray-500">
                                                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span className="truncate">By {template.user}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons Footer */}
                                            <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-50">
                                                <div className="flex gap-2 items-center flex-1">
                                                    {!template.is_default && (
                                                        <button
                                                            onClick={(e) => setAsDefault(e, template)}
                                                            disabled={settingDefault === template.id}
                                                            className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                                                        >
                                                            {settingDefault === template.id ? 'Setting…' : 'Set Default'}
                                                        </button>
                                                    )}
                                                    {isSuperuser && template.is_global && (
                                                        <button
                                                            onClick={(e) => togglePublish(e, template)}
                                                            className={`text-[11px] font-bold uppercase tracking-wider rounded-lg px-3 py-1.5 transition-colors ${
                                                                template.is_published
                                                                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                                                    : 'text-gray-500 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600'
                                                            }`}
                                                        >
                                                            {template.is_published ? 'Published' : 'Publish'}
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteTemplate(e, template.id)}
                                                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto"
                                                    title="Delete Template"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ════════════════════════════════════════════════
                    TEMPLATE GALLERY TAB
                   ════════════════════════════════════════════════ */}
                {activeTab === 'gallery' && (
                    <>
                        {isSuperuser && (
                            <div className="mb-6 flex justify-center">
                                <button
                                    onClick={handleCreateGlobalHtmlTemplate}
                                    disabled={isCreating}
                                    className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                                >
                                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add New Global Template (Admin)
                                </button>
                            </div>
                        )}
                        {/* Category Filter Pills */}
                        {categories.length > 1 && (
                            <div className="flex gap-2 pb-4 mb-6 overflow-x-auto hide-scrollbar sm:justify-center px-4 sm:px-0">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                                            selectedCategory === cat
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 border-transparent'
                                                : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {galleryLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : filteredGallery.length === 0 ? (
                            <div className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm border border-gray-100/50 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/30 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                        <div style={{ fontSize: '40px' }}>🎨</div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No templates in the gallery yet</h3>
                                    <p className="mt-1 text-gray-500 max-w-sm mx-auto">
                                        Check back later — new designs are added regularly.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-2 sm:px-0">
                                {filteredGallery.map((template) => (
                                    <div
                                        key={template.id}
                                        className="group bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100/80 hover:shadow-[0_8px_30px_rgba(79,70,229,0.12)] hover:border-indigo-100 transition-all duration-500 transform hover:-translate-y-1.5 flex flex-col relative"
                                    >
                                        {/* Preview thumbnail or placeholder */}
                                        <div className="aspect-[4/5] relative border-b border-gray-50 overflow-hidden bg-gray-50/50">
                                            {template.pdf_template ? (
                                                <img
                                                    src={template.pdf_template}
                                                    alt={template.template_name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-purple-50/80 via-indigo-50/80 to-blue-50/50 p-6 flex flex-col pt-8 transition-transform duration-700 group-hover:scale-105">
                                                    <div className="w-14 h-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded mb-6 opacity-80"></div>
                                                    <div className="w-full h-2 bg-gray-200/80 rounded mb-2 opacity-50"></div>
                                                    <div className="w-3/4 h-2 bg-gray-200/80 rounded mb-2 opacity-50"></div>
                                                    <div className="w-1/2 h-2 bg-gray-200/80 rounded mb-8 opacity-50"></div>
                                                    <div className="flex-1 w-full bg-white/70 backdrop-blur-md rounded-xl border border-white p-4 shadow-sm flex flex-col gap-3">
                                                        <div className="w-full h-2.5 bg-gray-200/80 rounded"></div>
                                                        <div className="w-full h-2.5 bg-gray-200/80 rounded"></div>
                                                        <div className="w-5/6 h-2.5 bg-gray-200/80 rounded"></div>
                                                        <div className="w-full h-2.5 bg-gray-200/80 rounded"></div>
                                                        <div className="mt-auto self-end w-1/3 h-3 bg-purple-100 rounded"></div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 backdrop-blur-[0px] group-hover:backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center">
                                                <button
                                                    onClick={(e) => handleCloneTemplate(e, template)}
                                                    disabled={cloningId === template.id}
                                                    className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-400 bg-white/90 backdrop-blur-sm text-indigo-700 font-bold px-5 py-2.5 rounded-full shadow-lg text-sm border border-white/50 flex items-center gap-2 hover:bg-white disabled:opacity-50"
                                                    style={{ cursor: cloningId === template.id ? 'not-allowed' : 'pointer' }}
                                                >
                                                    {cloningId === template.id ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                            Cloning…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-lg leading-none">✨</span> Use Template
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="p-5 flex flex-col flex-1 bg-white">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                    {template.template_name || `Template #${template.id}`}
                                                </h3>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {template.is_html && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100">
                                                        HTML
                                                    </span>
                                                )}
                                                {template.global_category && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        {template.global_category}
                                                    </span>
                                                )}
                                            </div>

                                            {template.description && (
                                                <p className="text-gray-500 text-xs line-clamp-2 mb-3 mt-1">
                                                    {template.description}
                                                </p>
                                            )}

                                            {template.user && (
                                                <div className="flex items-center text-gray-400 text-xs mt-auto">
                                                    <svg className="flex-shrink-0 mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    By {template.user}
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 border-t border-gray-50">
                                                <button
                                                    onClick={(e) => handleCloneTemplate(e, template)}
                                                    disabled={cloningId === template.id}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group/btn"
                                                    style={{
                                                        background: cloningId === template.id ? '#eef2ff' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                        color: cloningId === template.id ? '#4f46e5' : 'white',
                                                        boxShadow: cloningId === template.id ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.25)',
                                                    }}
                                                >
                                                    {cloningId === template.id ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                            Cloning…
                                                        </>
                                                    ) : (
                                                        <>
                                                            Use This Template
                                                            <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                            </svg>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
