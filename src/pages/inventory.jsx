import React, { useState } from 'react';
import Navbar from "../comonant/navbar";
import ProductsTable from "../comonant/inventory/ProductsTable";
import CategoriesTable from "../comonant/inventory/CategoriesTable";
import SuppliersTable from "../comonant/inventory/SuppliersTable";
import StockMovementsTable from "../comonant/inventory/StockMovementsTable";

function InventoryPage() {
    const [activeTab, setActiveTab] = useState('products');

    const tabs = [
        { id: 'products', label: 'Products Master' },
        { id: 'movements', label: 'Stock Movements' },
        { id: 'categories', label: 'Categories' },
        { id: 'suppliers', label: 'Suppliers' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 bg-opacity-50 font-sans">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Inventory Management</h1>
                    <p className="mt-2 text-sm text-gray-500">Manage your product catalog, monitor stock levels, and track vendor shipments.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1 inline-flex space-x-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                    {activeTab === 'suppliers' && <SuppliersTable />}
                </div>
            </div>
        </div>
    );
}

export default InventoryPage;
