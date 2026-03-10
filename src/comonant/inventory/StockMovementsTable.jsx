import React, { useState, useEffect } from 'react';
import { clientToken } from '../../axios.js';

function StockMovementsTable() {
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({ product: '', quantity: 1, movement_type: 'IN', notes: '' });

    const fetchProducts = () => {
        clientToken.get(`/inventory/products/?limit=100`).then(res => setProducts(res.data.results || res.data));
    };

    const fetchMovements = () => {
        const url = `/inventory/stock-movements/${searchQuery ? `?search=${searchQuery}` : ''}`;
        clientToken.get(url).then(res => setMovements(res.data.results || res.data)).catch(console.error);
    };

    useEffect(() => {
        fetchMovements();
        fetchProducts();
    }, [searchQuery]);

    const handleSave = (e) => {
        e.preventDefault();

        // Always POST (no edit for safety on movements)
        clientToken.post(`/inventory/stock-movements/`, formData).then(() => {
            setIsModalOpen(false);
            setFormData({ product: '', quantity: 1, movement_type: 'IN', notes: '' });
            fetchMovements();
        }).catch(err => alert("Error recording stock movement. Ensure quantity is valid."));
    };

    const handleDelete = (id) => {
        if (confirm("Deleting a movement will NOT reverse stock naturally. Proceed?")) {
            clientToken.delete(`/inventory/stock-movements/${id}/`).then(fetchMovements).catch(console.error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Stock Movements Ledger</h3>
                    <p className="text-sm text-gray-500 mt-1">Record items coming in and going out.</p>
                </div>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                    />
                    <button onClick={() => setIsModalOpen(true)} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm flex items-center gap-2">
                        <span>Record Movement</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Product</th>
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Quantity</th>
                            <th className="px-6 py-4 font-medium">Notes</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {movements.map(mov => {
                            const date = new Date(mov.date).toLocaleDateString() + ' ' + new Date(mov.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                                <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-800">{mov.product_name}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${mov.movement_type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {mov.movement_type === 'IN' ? 'Stock In ↑' : 'Stock Out ↓'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-medium text-gray-800">{mov.quantity}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm truncate max-w-[200px]">{mov.notes || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(mov.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Delete</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-800">Record Movement</h2>
                        </div>

                        <form id="movementForm" onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                                <select required value={formData.product} onChange={e => setFormData({ ...formData, product: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white outline-none">
                                    <option value="">Select Product...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.current_stock} in stock)</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                    <select required value={formData.movement_type} onChange={e => setFormData({ ...formData, movement_type: e.target.value })} className={`w-full px-4 py-2 border rounded-lg font-bold outline-none ${formData.movement_type === 'IN' ? 'text-green-700 focus:ring-green-500' : 'text-red-700 focus:ring-red-500'}`}>
                                        <option value="IN">Stock IN</option>
                                        <option value="OUT">Stock OUT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                                    <input required type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 50" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reason</label>
                                <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Purchase order #, breakage..." />
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Cancel</button>
                            <button type="submit" form="movementForm" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm">Confirm Movement</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StockMovementsTable;
