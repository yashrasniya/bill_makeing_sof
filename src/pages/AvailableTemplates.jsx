import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientToken } from "@/axios";
import Navbar from "../comonant/navbar";

export default function AvailableTemplates() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch all available templates
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
    }, []);

    const hasHtmlTemplate = templates.some(t => t.is_html);

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
                navigate('/weasyprint-preview');
            }
        } catch (error) {
            console.error("Failed to create HTML template:", error);
            alert("Failed to create HTML template. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header Section */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                        Invoice Templates
                    </h1>
                    <p className="mt-4 max-w-2xl text-lg text-gray-500 mx-auto">
                        Choose from our premium collection of professionally designed invoice templates to start billing your clients in style.
                    </p>
                    {!isLoading && !hasHtmlTemplate && (
                        <div className="mt-6 flex justify-center">
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
                </div>

                {/* Content Section */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-xl font-medium text-gray-900">No templates found</h3>
                        <p className="mt-2 text-gray-500">Check back later or contact your administrator to upload new designs.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
                                onClick={() => {
                                    if (template.is_html) {
                                        navigate(`/weasyprint-preview`);
                                    } else {
                                        navigate(`/invoice_editor?id=${template.id}`);
                                    }
                                }}
                            >

                                {/* Visual Thumbnail Area (Mocking a document preview) */}
                                <div className="aspect-[4/5] bg-gradient-to-br from-indigo-50 to-blue-50 relative p-6 border-b border-gray-100 overflow-hidden flex flex-col pt-8">
                                    {/* Decorative Elements to look like an invoice */}
                                    <div className="w-16 h-4 bg-indigo-200 rounded mb-6 opacity-70 group-hover:bg-indigo-300 transition-colors"></div>
                                    <div className="w-full h-2 bg-gray-200 rounded mb-2 opacity-50"></div>
                                    <div className="w-3/4 h-2 bg-gray-200 rounded mb-8 opacity-50"></div>

                                    <div className="flex-1 w-full bg-white/60 backdrop-blur-sm rounded-lg border border-white/40 p-4 shadow-inner flex flex-col gap-3">
                                        <div className="w-full h-3 bg-gray-200 rounded opacity-40"></div>
                                        <div className="w-full h-3 bg-gray-200 rounded opacity-40"></div>
                                        <div className="w-5/6 h-3 bg-gray-200 rounded opacity-40"></div>
                                        <div className="mt-auto self-end w-1/3 h-4 bg-indigo-100 rounded"></div>
                                    </div>

                                    {/* Hover Overlay action */}
                                    <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors duration-300 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-indigo-600 font-semibold px-4 py-2 rounded-full shadow-md text-sm">
                                            Use Template
                                        </div>
                                    </div>
                                </div>

                                {/* Details Area */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                            {template.template_name || `Template #${template.id}`}
                                        </h3>
                                    </div>

                                    <div className="mt-1 flex flex-col gap-1.5 text-sm">
                                        {template.company && (
                                            <div className="flex items-center text-gray-500">
                                                <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="truncate">{template.company}</span>
                                            </div>
                                        )}

                                        {template.user && (
                                            <div className="flex items-center text-gray-500">
                                                <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span className="truncate">By {template.user}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            ID: {template.id}
                                        </span>
                                        <span className="text-indigo-600 text-sm font-medium group-hover:text-indigo-700">Select &rarr;</span>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
