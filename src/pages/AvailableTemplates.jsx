import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientToken } from "@/axios";
import Navbar from "../comonant/navbar";

export default function AvailableTemplates() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
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
                                onClick={() => navigate(`/invoice_editor?id=${template.id}`)}
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
