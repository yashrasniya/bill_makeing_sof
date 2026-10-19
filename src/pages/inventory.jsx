import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import Navbar from "../comonant/navbar";
import PageIcon from "../comonant/PageIcon";
import ProductsTable from "../comonant/inventory/ProductsTable";
import CategoriesTable from "../comonant/inventory/CategoriesTable";
import StockMovementsTable from "../comonant/inventory/StockMovementsTable";
import "../style/invoices.css";
import "../style/Companys.css";

const TABS = [
    { id: "products", label: "Products", action: "Add product" },
    { id: "movements", label: "Stock movements", action: "Record movement" },
    { id: "categories", label: "Categories", action: "Add category" },
];

function InventoryPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("products");
    // pressing the header button bumps this; the open tab reacts by opening its form
    const [addSignal, setAddSignal] = useState(0);
    const current = TABS.find((t) => t.id === activeTab);

    return (
        <div className="inv_page">
            <Navbar />
            <div className="inv_wrap">
                <div className="inv_head">
                    <div className="inv_title">
                        <PageIcon icon={Package} />
                        <div>
                            <h1>Inventory</h1>
                            <p>Your product catalogue, what's in stock, and every movement in and out.</p>
                        </div>
                    </div>
                    <div className="inv_head_actions">
                        <button type="button" className="inv_btn primary" onClick={() => setAddSignal((n) => n + 1)}>
                            <Plus size={16} /> {current.action}
                        </button>
                    </div>
                </div>

                <div className="inv_card" style={{ marginBottom: 16 }}>
                    <div className="inv_tabs" role="tablist" aria-label="Inventory sections" style={{ borderBottom: 0 }}>
                        {TABS.map((t) => (
                            <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id}
                                className={`inv_tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                        {/* vendors are shared with the Purchases page, so this tab is a link */}
                        <button type="button" className="inv_tab" onClick={() => navigate("/vendors")}>Vendors ↗</button>
                    </div>
                </div>

                {activeTab === "products" && <ProductsTable addSignal={addSignal} />}
                {activeTab === "movements" && <StockMovementsTable addSignal={addSignal} />}
                {activeTab === "categories" && <CategoriesTable addSignal={addSignal} />}
            </div>
        </div>
    );
}

export default InventoryPage;
