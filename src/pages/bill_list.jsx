import History from "../comonant/history";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {clientToken} from "../axios";
import { useSelector } from "react-redux";
import MultiSelectDropdown from "../comonant/MultiSelectDropdown";
import ExportDropdown from "../comonant/ExportDropdown";



// Multi-select dropdown with checkboxes


const Bill_list = ({ setLoading }) => {
    const navigate = useNavigate();
    const { features, status: accessStatus } = useSelector((state) => state.access);
    const [searchParams] = useSearchParams();
    // dashboard cards deep-link here:
    //   ?payment_status=overdue   → one exact status
    //   ?status_group=open        → everything still owing
    //   ?type=purchase            → opens purchase invoices list
    const initialStatus = searchParams.get("payment_status") || "";
    const initialGroup = searchParams.get("status_group") || "";
    const initialType = searchParams.get("type") || "sales";
    const [filters, setFilters] = useState({
        s: "",
        customer: [],
        date_from: "",
        date_to: "",
        invoice_type: initialType,
        page_size: 15,
        ordering: "-date",
        ...(initialStatus ? { payment_status: initialStatus } : { payment_status: "" }),
        ...(initialGroup ? { status_group: initialGroup } : {}),
    });
    const [showFilters, setShowFilters] = useState(false);
    const activeStatusLabel =
        { open: "Awaiting payment", overdue: "Overdue" }[filters.status_group]
        || { overdue: "Overdue", unpaid: "Unpaid", paid: "Paid", partially_paid: "Partially paid" }[filters.payment_status]
        || "";
    const clearStatusFilter = () =>
        setFilters(prev => {
            const next = { ...prev };
            delete next.payment_status;
            delete next.status_group;
            return next;
        });
    const [searchTerm, setSearchTerm] = useState(filters.s || ""); // local input state

    const [Customer, setCustomer] = useState([])
    const  filterConfig= [
        {
            key: "customer",
            label: "Customer",
            type: "multi-checkbox-dropdown",
            options: Customer,
            placeholder: "Enter customer name",
        }
    ];
    useEffect(()=>{
        clientToken.get('companies/').then((response)=>{
            if (response.status===200){
                setCustomer(response.data.results.map(element => ({value:element.id,label:element.name})))
            }
        })
    },[])
    const fetchCustomerOptions = async (search) => {
        try {
            const res = await clientToken.get(`companies/?s=${encodeURIComponent(search)}`);
            return res.data.results.map((c) => ({
                value: c.id,
                label: c.name
            }));
        } catch (error) {
            console.error("Error fetching customers:", error);
            return [];
        }
    };
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            handleChange("s", searchTerm); // only updates filter after delay
        }, 500); // 500ms after user stops typing

        return () => clearTimeout(delayDebounce); // cleanup old timeout
    }, [searchTerm]);
    const handleChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        console.log("Search filters:", filters);
    };
    const handelExportPDF = () => {
        clientToken.post('bulk_export/',filters,{ responseType: 'blob' }).then((response)=>{ const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
            const pdfURL = URL.createObjectURL(pdfBlob);
            // Create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(pdfBlob);
            let name = prompt("Enter File name to save", "report");
            downloadLink.download = `${name}.pdf`; // Name for the downloaded file
            const newWindow = window.open(pdfURL, '_blank');
            if (newWindow) {
                // Optionally set the file name in the new tab
                newWindow.document.title = `${InvoiceData["receiver"]?.name}_${new Date().getDate()}-${new Date().getMonth() + 1}-${new Date().getFullYear()}.pdf`;
            } else {
                console.error('Failed to open a new tab. Please allow popups for this site.');
            }})
            .catch((error) => {
                console.error("Error exporting PDF:", error); // toast shown by axios interceptor
            })
    }
    const handelExportExcel = () => {

    }
    const handelExportCSV = () => {
        filters.type = "CSV"
        clientToken.post('bulk_export/', filters, { responseType: 'blob' })
            .then((response) => {
                // Create a blob from the response data
                const blob = new Blob([response.data], { type: 'text/csv' });

                // Create a temporary link to trigger download
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'invoices_export.csv'); // File name
                document.body.appendChild(link);
                link.click();

                // Cleanup
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch((error) => {
                console.error("Error exporting CSV:", error);
            });
    };

    const handelExportPDFData = () => {
        filters.type = "PDF_DATA"
        clientToken.post('bulk_export/', filters, { responseType: 'blob' })
            .then((response) => {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'invoices_export_data.pdf');
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch((error) => {
                console.error("Error exporting PDF data:", error);
            });
    };

    const DateRangeFilter = ({ value, onChange, label = "Date" }) => (
        <div style={{ flex: '0 1 auto', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                    type="date"
                    value={value.from || ""}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    style={{
                        width: '100%', padding: '10px 14px', borderRadius: '12px',
                        border: '1.5px solid #e2e8f0', outline: 'none',
                        fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <span style={{ color: '#94a3b8' }}>–</span>
                <input
                    type="date"
                    value={value.to || ""}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    style={{
                        width: '100%', padding: '10px 14px', borderRadius: '12px',
                        border: '1.5px solid #e2e8f0', outline: 'none',
                        fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: '60px' }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* Main Container */}
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px 60px' }}>
                
                {/* ── Page Header ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                    animation: 'fadeUp 0.4s ease both',
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                            All Invoices
                        </h1>
                        <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            Manage, filter, and export your billing history.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/newBill')}
                        style={{
                            background: '#4f46e5', color: 'white',
                            fontWeight: 800, fontSize: '14px',
                            padding: '12px 24px', borderRadius: '14px',
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(79,70,229,0.25)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.35)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.25)'; }}
                    >
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                            <path d="M9 3v12M3 9h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        Create Invoice
                    </button>
                </div>

                {/* ── Tabs for Sales / Purchases ── */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', animation: 'fadeUp 0.45s ease both' }}>
                    <button 
                        onClick={() => {
                            setFilters(prev => ({ ...prev, invoice_type: 'sales' }));
                            setSearchParams(prev => { prev.set('type', 'sales'); return prev; });
                        }}
                        style={{
                            padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '14px', transition: 'all 0.2s',
                            background: filters.invoice_type === 'sales' ? '#4f46e5' : 'white',
                            color: filters.invoice_type === 'sales' ? 'white' : '#64748b',
                            boxShadow: filters.invoice_type === 'sales' ? '0 4px 12px rgba(79,70,229,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                    >
                        Sales Invoices
                    </button>
                    <button 
                        onClick={() => {
                            setFilters(prev => ({ ...prev, invoice_type: 'purchase' }));
                            setSearchParams(prev => { prev.set('type', 'purchase'); return prev; });
                        }}
                        style={{
                            padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '14px', transition: 'all 0.2s',
                            background: filters.invoice_type === 'purchase' ? '#4f46e5' : 'white',
                            color: filters.invoice_type === 'purchase' ? 'white' : '#64748b',
                            boxShadow: filters.invoice_type === 'purchase' ? '0 4px 12px rgba(79,70,229,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                    >
                        Purchase Invoices
                    </button>
                </div>

                {/* ── Filters Section ── */}
                <div style={{
                    position: 'relative', zIndex: 10,
                    background: 'white', borderRadius: '20px',
                    padding: '24px', marginBottom: '28px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                    animation: 'fadeUp 0.5s ease 0.1s both',
                    display: 'flex', flexDirection: 'column', gap: '20px'
                }}>
                    {/* Top Row: Search & Toggle */}
                    <div style={{ width: '100%', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 auto' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Search Invoices</label>
                            <div style={{ position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by invoice # or customer name..."
                                    style={{
                                        width: '100%', padding: '12px 14px 12px 40px', borderRadius: '12px',
                                        border: '1.5px solid #e2e8f0', outline: 'none',
                                        fontSize: '15px', color: '#0f172a', transition: 'all 0.2s',
                                        backgroundColor: '#f8fafc'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.backgroundColor = 'white'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                padding: '12px 20px', borderRadius: '12px', background: showFilters ? '#eef2ff' : '#f1f5f9',
                                color: showFilters ? '#4f46e5' : '#475569', border: showFilters ? '1px solid #c7d2fe' : '1px solid transparent', 
                                fontWeight: 600, cursor: 'pointer', fontSize: '14px', height: '46px', 
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = showFilters ? '#eef2ff' : '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.background = showFilters ? '#eef2ff' : '#f1f5f9'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            Filters & Sort
                        </button>
                    </div>

                    {/* Bottom Row: Filters Grid (Collapsible) */}
                    {showFilters && (
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        
                        {/* Customer Filter */}
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Customer</label>
                            <MultiSelectDropdown
                                label="Customer"
                                fetchOptions={fetchCustomerOptions}
                                options={Customer}
                                selected={filters.customer}
                                onChange={(newValues) => handleChange("customer", newValues)}
                            />
                        </div>

                        {/* Payment Status Filter */}
                        <div style={{ flex: '1 1 140px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Status</label>
                            <select
                                value={filters.payment_status || ""}
                                onChange={(e) => handleChange("payment_status", e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', outline: 'none',
                                    fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s',
                                    backgroundColor: 'white'
                                }}
                                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            >
                                <option value="">All Statuses</option>
                                <option value="paid">Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="partially_paid">Partially Paid</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>

                        {/* Sort By Filter */}
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Sort By</label>
                            <select
                                value={filters.ordering || "-date"}
                                onChange={(e) => handleChange("ordering", e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', outline: 'none',
                                    fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s',
                                    backgroundColor: 'white'
                                }}
                                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            >
                                <option value="-date">Date (Newest First)</option>
                                <option value="date">Date (Oldest First)</option>
                                <option value="-total_final_amount">Amount (High to Low)</option>
                                <option value="total_final_amount">Amount (Low to High)</option>
                            </select>
                        </div>

                        {/* Date Range */}
                        <DateRangeFilter
                            value={{ from: filters.date_from, to: filters.date_to }}
                            onChange={(v) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    date_from: v.from,
                                    date_to: v.to,
                                }))
                            }
                        />

                        {/* Page Size */}
                        <div style={{ flex: '1 1 100px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Page Size</label>
                            <select
                                value={filters.page_size}
                                onChange={(e) => handleChange("page_size", e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', outline: 'none',
                                    fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s',
                                    backgroundColor: 'white'
                                }}
                                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            >
                                <option value={15}>15</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setSearchTerm(''); setFilters({ s: "", customer: [], date_from: "", date_to: "", invoice_type: filters.invoice_type, page_size: 15, payment_status: "", ordering: "-date" }); }}
                                style={{
                                    padding: '10px 20px', borderRadius: '12px', background: '#f1f5f9',
                                    color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer',
                                    fontSize: '14px', height: '41px', transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.target.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.target.style.background = '#f1f5f9'}
                            >
                                Clear
                            </button>
                            <div>
                                <ExportDropdown
                                    onClick={() => {
                                        if (!(accessStatus === 'succeeded' && features.includes("bulk_export"))) {
                                            alert("Your current subscription does not contain this feature");
                                            return false;
                                        }
                                        return true;
                                    }}
                                    onExport={(format) => {
                                        if (format === "csv") handelExportCSV();
                                        if (format === "pdf") handelExportPDF();
                                        if (format === "pdf_data") handelExportPDFData();
                                        if (format === "xlsx") handelExportExcel();
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                {/* ── Active status filter (arrived via a dashboard card) ── */}
                {activeStatusLabel && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Showing:</span>
                        <button
                            onClick={clearStatusFilter}
                            title="Remove this filter"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe',
                                borderRadius: '99px', padding: '6px 14px', cursor: 'pointer',
                                fontSize: '13px', fontWeight: 700,
                            }}
                        >
                            {activeStatusLabel}
                            <span style={{ fontSize: '15px', lineHeight: 1 }}>×</span>
                        </button>
                    </div>
                )}

                {/* ── History List ── */}
                <div style={{
                    background: 'white', borderRadius: '20px',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    animation: 'fadeUp 0.5s ease 0.2s both',
                }}>
                    <History
                        setLoading={setLoading}
                        show_header={false}
                        filters={filters}
                    />
                </div>
            </div>

            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Bill_list;
