import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { clientToken } from "@/axios";
import Navbar from "../comonant/navbar";

export default function AdminGlobalTemplatesList() {
    const { userInfo } = useSelector((s) => s.user);
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userInfo && !userInfo.is_superuser) {
            navigate("/");
            return;
        }
        if (userInfo) {
            loadTemplates();
        }
    }, [userInfo, navigate]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await clientToken.get('/yaml/admin-list/');
            setTemplates(response.data);
        } catch (error) {
            console.error("Failed to load templates:", error);
        } finally {
            setIsLoading(false);
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

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Manage Global Templates</h1>
                        <p className="mt-2 text-sm text-gray-500">
                            View and edit metadata for all global templates (including drafts).
                        </p>
                    </div>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thumbnail</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Edit</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {templates.map((template) => (
                                <tr key={template.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="h-16 w-12 bg-gray-100 rounded border overflow-hidden">
                                            {template.pdf_template ? (
                                                <img src={template.pdf_template} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{template.template_name}</div>
                                        <div className="text-sm text-gray-500">{template.global_category || 'Uncategorized'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${template.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {template.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {template.version}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/admin/global-templates/${template.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            Edit Settings
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {templates.length === 0 && (
                        <div className="text-center py-12 text-gray-500">No global templates found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
