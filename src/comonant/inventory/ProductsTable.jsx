import React, { useState, useEffect } from 'react';
import { clientToken } from '../../axios.js';

function ProductsTable() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        sku: '', name: '', description: '', price: '', gst_percentage: 18.00,
        current_stock: 0, reorder_level: 10, category: '', supplier: ''
    });
    const [editingId, setEditingId] = useState(null);

    const fetchDropdowns = () => {
        clientToken.get(`/inventory/categories/`).then(res => setCategories(res.data.results || res.data));
        clientToken.get(`/inventory/suppliers/`).then(res => setSuppliers(res.data.results || res.data));
    }

    const fetchProducts = () => {
        const url = `/inventory/products/${searchQuery ? `?search=${searchQuery}` : ''}`;
        clientToken.get(url).then(res => setProducts(res.data.results || res.data)).catch(console.error);
    };

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [searchQuery]);

    const handleSave = (e) => {
        e.preventDefault();

        const payload = { ...formData };
        if (!payload.category) payload.category = null;
        if (!payload.supplier) payload.supplier = null;

        const request = editingId
            ? clientToken.put(`/inventory/products/${editingId}/`, payload)
            : clientToken.post(`/inventory/products/`, payload);

        request.then(() => {
            setIsModalOpen(false);
            setFormData({ sku: '', name: '', description: '', price: '', gst_percentage: 18.00, current_stock: 0, reorder_level: 10, category: '', supplier: '' });
            setEditingId(null);
            fetchProducts();
        }).catch(err => alert("Error saving product. Please check SKU uniqueness and fields."));
    };

    const handleEdit = (prod) => {
        setFormData({
            sku: prod.sku, name: prod.name, description: prod.description || '',
            price: prod.price, gst_percentage: prod.gst_percentage || 18.00, current_stock: prod.current_stock,
            reorder_level: prod.reorder_level,
            category: prod.category || '', supplier: prod.supplier || ''
        });
        setEditingId(prod.id);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm("Are you sure you want to delete this product?")) {
            clientToken.delete(`/inventory/products/${id}/`).then(fetchProducts).catch(console.error);
        }
    };

    const openCreate = () => {
        setFormData({ sku: '', name: '', description: '', price: '', gst_percentage: 18.00, current_stock: 0, reorder_level: 10, category: '', supplier: '' });
        setEditingId(null);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Inventory Products</h3>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search SKU or Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                        + Add Product
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">SKU</th>
                            <th className="px-6 py-4 font-medium">Product Name</th>
                            <th className="px-6 py-4 font-medium">Category</th>
                            <th className="px-6 py-4 font-medium">Price</th>
                            <th className="px-6 py-4 font-medium">GST (%)</th>
                            <th className="px-6 py-4 font-medium">Stock</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {products.map(prod => (
                            <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sm text-gray-600">{prod.sku}</td>
                                <td className="px-6 py-4 font-medium text-gray-800">
                                    <div>{prod.name}</div>
                                    <div className="text-xs text-gray-400 font-normal mt-0.5">{prod.supplier_name || 'No Supplier'}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
                                        {prod.category_name || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-800 font-medium">₹{prod.price}</td>
                                <td className="px-6 py-4 text-gray-800 font-medium">{prod.gst_percentage}%</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${prod.current_stock <= prod.reorder_level ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                        <span className="font-medium text-gray-800">{prod.current_stock}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleEdit(prod)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium">Edit</button>
                                    <button onClick={() => handleDelete(prod.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-800">{editingId ? 'Edit Product' : 'New Product'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="productForm" onSubmit={handleSave} className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                                    <input required type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>

                                <div className="col-span-2 grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white outline-none">
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                                        <select value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white outline-none">
                                            <option value="">Select Supplier</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-2 mt-2 pt-4 border-t border-gray-100">
                                    <h4 className="font-semibold text-gray-700 mb-3 block">Pricing & Stock</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4 col-span-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                                            <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GST (%) *</label>
                                        <div className="relative">
                                            <input required type="number" step="0.01" value={formData.gst_percentage} onChange={e => setFormData({ ...formData, gst_percentage: e.target.value })} className="w-full pr-8 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                                        <input type="number" disabled={editingId ? true : false} value={formData.current_stock} onChange={e => setFormData({ ...formData, current_stock: e.target.value })} className="w-full px-4 py-2 border rounded-lg bg-gray-50" title={editingId ? "Use Stock Movement to adjust inventory" : ""} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reorder At</label>
                                        <input type="number" value={formData.reorder_level} onChange={e => setFormData({ ...formData, reorder_level: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-xl">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Cancel</button>
                            <button type="submit" form="productForm" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm">Save Product</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductsTable;
