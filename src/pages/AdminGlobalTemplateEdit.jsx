import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { clientToken } from "@/axios";
import Navbar from "../comonant/navbar";

export default function AdminGlobalTemplateEdit() {
    const { id } = useParams();
    const { userInfo } = useSelector((s) => s.user);
    const navigate = useNavigate();
    const [template, setTemplate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        template_name: '',
        global_category: '',
        is_published: false,
        description: '',
        page_size: 'A4',
        version: '1.0'
    });
    const [thumbnailFile, setThumbnailFile] = useState(null);

    useEffect(() => {
        if (userInfo && !userInfo.is_superuser) {
            navigate("/");
            return;
        }
        if (userInfo) {
            loadTemplate();
        }
    }, [id, userInfo, navigate]);

    const loadTemplate = async () => {
        setIsLoading(true);
        try {
            // We can fetch details via a dedicated admin endpoint or just the normal one if it returns enough info.
            // But right now we can use a new endpoint /api/yaml/admin-list/<id>/ or modify backend.
            // Let's assume we use a new endpoint /api/yaml/admin-detail/<id>/ to get all fields.
            const response = await clientToken.get(`/yaml/admin-detail/${id}/`);
            setTemplate(response.data);
            setFormData({
                template_name: response.data.template_name || '',
                global_category: response.data.global_category || '',
                is_published: response.data.is_published || false,
                description: response.data.description || '',
                page_size: response.data.page_size || 'A4',
                version: response.data.version || '1.0'
            });
        } catch (error) {
            console.error("Failed to load template:", error);
            alert("Failed to load template details.");
            navigate("/admin/global-templates");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, type, checked, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setThumbnailFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const data = new FormData();
            data.append('template_name', formData.template_name);
            data.append('global_category', formData.global_category);
            data.append('is_published', formData.is_published);
            data.append('description', formData.description);
            data.append('page_size', formData.page_size);
            data.append('version', formData.version);
            if (thumbnailFile) {
                data.append('pdf_template', thumbnailFile);
            }

            await clientToken.put(`/yaml/${id}/metadata/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Template settings saved successfully!");
            navigate("/admin/global-templates");
        } catch (error) {
            console.error("Failed to save template metadata:", error);
            alert("Failed to save template metadata.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        );
    }

    if (!template) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <button onClick={() => navigate("/admin/global-templates")} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 mb-4 inline-block">
                        &larr; Back to Global Templates
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Edit Settings: {template.template_name}</h1>
                </div>

                <div className="bg-white shadow sm:rounded-lg">
                    <form onSubmit={handleSubmit} className="space-y-6 px-4 py-5 sm:p-6">
                        {/* Name and Category */}
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <label htmlFor="template_name" className="block text-sm font-medium text-gray-700">Template Name</label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="template_name"
                                        id="template_name"
                                        value={formData.template_name}
                                        onChange={handleInputChange}
                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="sm:col-span-3">
                                <label htmlFor="global_category" className="block text-sm font-medium text-gray-700">Gallery Category</label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="global_category"
                                        id="global_category"
                                        list="category_options"
                                        value={formData.global_category}
                                        onChange={handleInputChange}
                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                                        placeholder="Select or type a category..."
                                    />
                                    <datalist id="category_options">
                                        <option value="General" />
                                        <option value="Retail" />
                                        <option value="Services" />
                                        <option value="Freelance" />
                                        <option value="Corporate" />
                                        <option value="Modern" />
                                        <option value="Minimal" />
                                        <option value="Classic" />
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        {/* Current Thumbnail Preview */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Current Thumbnail</label>
                            <div className="mt-2 h-48 w-36 bg-gray-100 rounded border overflow-hidden">
                                {template.pdf_template ? (
                                    <img src={template.pdf_template} alt="Thumbnail" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400">No Image</div>
                                )}
                            </div>
                        </div>

                        {/* New Thumbnail Upload */}
                        <div>
                            <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700">Upload New Thumbnail</label>
                            <div className="mt-1">
                                <input
                                    type="file"
                                    id="thumbnail"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>
                            <p className="mt-2 text-sm text-gray-500">Upload an image or PDF (first page will be extracted).</p>
                        </div>

                        {/* Status Toggle */}
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="is_published"
                                    name="is_published"
                                    type="checkbox"
                                    checked={formData.is_published}
                                    onChange={handleInputChange}
                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="is_published" className="font-medium text-gray-700">Published to Gallery</label>
                                <p className="text-gray-500">If unchecked, this template will be a Draft and hidden from regular users.</p>
                            </div>
                        </div>

                        {/* Version */}
                        <div>
                            <label htmlFor="version" className="block text-sm font-medium text-gray-700">Version Label</label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="version"
                                    id="version"
                                    value={formData.version}
                                    onChange={handleInputChange}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                                />
                            </div>
                        </div>

                        {/* Page Size */}
                        <div>
                            <label htmlFor="page_size" className="block text-sm font-medium text-gray-700">Page Size</label>
                            <div className="mt-1">
                                <select
                                    id="page_size"
                                    name="page_size"
                                    value={formData.page_size}
                                    onChange={handleInputChange}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border bg-white"
                                >
                                    <option value="A4">A4</option>
                                    <option value="Letter">Letter</option>
                                    <option value="Legal">Legal</option>
                                    <option value="A5">A5</option>
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                            <div className="mt-1">
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                                    placeholder="Enter a description for this template..."
                                />
                            </div>
                        </div>

                        <div className="pt-5 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate("/admin/global-templates")}
                                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
