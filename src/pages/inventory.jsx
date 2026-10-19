import React, { useState } from 'react';
import { Package } from 'lucide-react';
import PageIcon from '../comonant/PageIcon';
import { useNavigate } from 'react-router-dom';
import Navbar from "../comonant/navbar";
import ProductsTable from "../comonant/inventory/ProductsTable";
import CategoriesTable from "../comonant/inventory/CategoriesTable";
import StockMovementsTable from "../comonant/inventory/StockMovementsTable";

function InventoryPage() {
    const [activeTab, setActiveTab] = useState('products');
    const navigate = useNavigate();

    // Vendors are shared with the Purchases page — the tab jumps there
    const tabs = [
        { id: 'products', label: 'Products Master' },
        { id: 'movements', label: 'Stock Movements' },
        { id: 'categories', label: 'Categories' },
        { id: 'vendors', label: 'Vendors ↗' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 bg-opacity-50 font-sans">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <PageIcon icon={Package} />
                        <div>
                    <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Inventory Management</h1>
                    <p className="mt-1 text-[13px] text-slate-500">Manage your product catalog, monitor stock levels, and track vendor shipments.</p>
                    </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 p-1 inline-flex space-x-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => tab.id === 'vendors' ? navigate('/vendors') : setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 animate-in fade-in duration-300">
                    {activeTab === 'products' && <ProductsTable />}
                    {activeTab === 'movements' && <StockMovementsTable />}
                    {activeTab === 'categories' && <CategoriesTable />}
                </div>
            </div>
        </div>
    );
}

export default InventoryPage;
