import React, { useState, useEffect } from 'react';
import { clientToken } from '../../axios.js';

function SuppliersTable() {
    const [suppliers, setSuppliers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', contact_person: '', email: '', phone: '', address: '' });
    const [editingId, setEditingId] = useState(null);

    const fetchSuppliers = () => {
        const url = `/inventory/suppliers/${searchQuery ? `?s=${encodeURIComponent(searchQuery)}` : ''}`;
        clientToken.get(url).then(res => setSuppliers(res.data.results || res.data)).catch(console.error);
    };

    useEffect(() => {
        fetchSuppliers();
    }, [searchQuery]);

    const handleSave = (e) => {
        e.preventDefault();
        const request = editingId
            ? clientToken.put(`/inventory/suppliers/${editingId}/`, formData)
            : clientToken.post(`/inventory/suppliers/`, formData);

        request.then(() => {
            setIsModalOpen(false);
            setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
            setEditingId(null);
            fetchSuppliers();
        }).catch(err => alert("Error saving supplier."));
    };

    const handleEdit = (sup) => {
        setFormData({ name: sup.name, contact_person: sup.contact_person || '', email: sup.email || '', phone: sup.phone || '', address: sup.address || '' });
        setEditingId(sup.id);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm("Are you sure you want to delete this supplier?")) {
            clientToken.delete(`/inventory/suppliers/${id}/`).then(fetchSuppliers).catch(console.error);
        }
    };

    const openCreate = () => {
        setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
        setEditingId(null);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Vendors & Suppliers</h3>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={openCreate} className="px-4 py-2 bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] text-white rounded-xl font-bold transition-colors">
                        + Add Supplier
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Contact Person</th>
                            <th className="px-6 py-4 font-medium">Email / Phone</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {suppliers.map(sup => (
                            <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-800">{sup.name}</td>
                                <td className="px-6 py-4 text-slate-600">{sup.contact_person || '-'}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="text-sm">{sup.email || '-'}</div>
                                    <div className="text-xs text-slate-400">{sup.phone || '-'}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleEdit(sup)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium">Edit</button>
                                    <button onClick={() => handleDelete(sup.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800">{editingId ? 'Edit Supplier' : 'New Supplier'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                                <input type="text" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <textarea rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] text-white rounded-xl font-bold transition-colors">Save Supplier</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SuppliersTable;
