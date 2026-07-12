import History from "../comonant/history";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {clientToken} from "../axios";
import MultiSelectDropdown from "../comonant/MultiSelectDropdown";
import ExportDropdown from "../comonant/ExportDropdown";



// Multi-select dropdown with checkboxes


const Bill_list = ({ setLoading }) => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        s: "",
        customer: [],
        date_from: "",
        date_to: "",
        invoice_type: "sales",
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
                        onClick={() => setFilters(prev => ({ ...prev, invoice_type: 'sales' }))}
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
                        onClick={() => setFilters(prev => ({ ...prev, invoice_type: 'purchase' }))}
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
                    padding: '20px 24px', marginBottom: '28px',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    animation: 'fadeUp 0.5s ease 0.1s both',
                    display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end'
                }}>
                    {/* Search Input */}
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Search Invoices</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by invoice # or customer..."
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '12px',
                                border: '1.5px solid #e2e8f0', outline: 'none',
                                fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#4f46e5'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {/* Dynamic Filters (Customer Multi-select) */}
                    {filterConfig.map((f) => (
                        <div key={f.key} style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>{f.label}</label>
                            {f.type === "multi-checkbox-dropdown" ? (
                                <MultiSelectDropdown
                                    label={f.label}
                                    fetchOptions={fetchCustomerOptions}
                                    options={f.options}
                                    selected={filters[f.key]}
                                    onChange={(newValues) => handleChange(f.key, newValues)}
                                />
                            ) : (
                                <input
                                    type={f.type}
                                    value={filters[f.key]}
                                    onChange={(e) => handleChange(f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '12px',
                                        border: '1.5px solid #e2e8f0', outline: 'none',
                                        fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                            )}
                        </div>
                    ))}

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

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => { setSearchTerm(''); setFilters({ s: "", customer: [], date_from: "", date_to: "", invoice_type: filters.invoice_type }); }}
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
