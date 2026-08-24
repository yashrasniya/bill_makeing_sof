import '../style/Companys.css';
import { clientToken } from "/src/axios";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

// Shared input focus handlers
const onFocusIn = e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; e.target.style.background = 'white'; };
const onFocusOut = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

const EMPTY = { name: '', address: '', gst_number: '', state: '', state_code: '', phone_number: '' };

// same formatting as the Customer Ledger page, which sits one click away —
// a rounded total here would read as a mismatch against the statement there
const money = (v) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(Number(v) || 0);

const day = (iso) => (iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—');

const ACTION_BTN = {
    padding: '6px 12px', borderRadius: '9px', border: '1px solid #c7d2fe',
    background: '#eef2ff', color: '#4338ca', fontSize: '12px', fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s',
};

// Billing stats ride along on the customers list only when the plan allows,
// so every export builds its columns from these two sets rather than
// hard-coding a shape the response might not have.
const STAT_KEYS = ['invoice_count', 'total_billed', 'last_invoice_date'];
const STAT_HEADERS = ['Bills', 'Total Billed', 'Last Bill'];

// Printed cell value. `row[k] || '—'` would turn a genuine zero into an em
// dash, which reads as "we don't know" instead of "never billed".
const cell = (row, key) => {
    const v = row[key];
    if (key === 'total_billed') return money(v);
    if (key === 'last_invoice_date') return day(v);
    if (key === 'invoice_count') return String(Number(v) || 0);
    return (v === 0 || v) ? v : '—';
};

const INDIAN_STATES = [
    { name: "Andaman and Nicobar Islands", code: "35" },
    { name: "Andhra Pradesh", code: "37" },
    { name: "Andhra Pradesh (New)", code: "37" },
    { name: "Arunachal Pradesh", code: "12" },
    { name: "Assam", code: "18" },
    { name: "Bihar", code: "10" },
    { name: "Chandigarh", code: "04" },
    { name: "Chattisgarh", code: "22" },
    { name: "Dadra and Nagar Haveli", code: "26" },
    { name: "Daman and Diu", code: "25" },
    { name: "Delhi", code: "07" },
    { name: "Goa", code: "30" },
    { name: "Gujarat", code: "24" },
    { name: "Haryana", code: "06" },
    { name: "Himachal Pradesh", code: "02" },
    { name: "Jammu and Kashmir", code: "01" },
    { name: "Jharkhand", code: "20" },
    { name: "Karnataka", code: "29" },
    { name: "Kerala", code: "32" },
    { name: "Lakshadweep Islands", code: "31" },
    { name: "Madhya Pradesh", code: "23" },
    { name: "Maharashtra", code: "27" },
    { name: "Manipur", code: "14" },
    { name: "Meghalaya", code: "17" },
    { name: "Mizoram", code: "15" },
    { name: "Nagaland", code: "13" },
    { name: "Odisha", code: "21" },
    { name: "Pondicherry", code: "34" },
    { name: "Punjab", code: "03" },
    { name: "Rajasthan", code: "08" },
    { name: "Sikkim", code: "11" },
    { name: "Tamil Nadu", code: "33" },
    { name: "Telangana", code: "36" },
    { name: "Tripura", code: "16" },
    { name: "Uttar Pradesh", code: "09" },
    { name: "Uttarakhand", code: "05" },
    { name: "West Bengal", code: "19" }
];

// Strip absolute DRF pagination URLs to relative paths so axios always
// uses the configured baseURL (avoids http vs https mismatch in prod).
const toRelativeUrl = (absoluteUrl) => {
    if (!absoluteUrl) return null;
    try {
        const u = new URL(absoluteUrl);
        let path = u.pathname;
        // Get the baseURL path prefix (works for both "/api" and "https://domain/api/")
        const baseUrl = import.meta.env.VITE_APP_URL || '';
        let basePath = '';
        try { basePath = new URL(baseUrl).pathname; } catch {
            basePath = baseUrl; // already a relative path like "/api"
        }
        // Normalise: ensure basePath ends without trailing slash for comparison
        basePath = basePath.replace(/\/+$/, '');
        if (basePath && path.startsWith(basePath)) {
            path = path.slice(basePath.length);
        }
        // Remove leading slash so axios appends to baseURL correctly
        path = path.replace(/^\/+/, '');
        return path + u.search;
    } catch {
        return absoluteUrl; // already relative, return as-is
    }
};

function CompanysTable() {
    const navigate = useNavigate();
    const { userInfo } = useSelector(state => state.user);
    const { permissions, features, status: accessStatus } = useSelector(state => state.access);

    // Billing stats and the two report shortcuts are part of advanced_reports.
    // The ledger page is guarded by BOTH the feature and report.view, so gate
    // on both here — otherwise the button just bounces the user back.
    const canStats = accessStatus === 'succeeded'
        && features.includes('advanced_reports')
        && permissions.includes('report.view');
    const canViewBills = canStats && permissions.includes('invoice.view');
    // one URL so the table and every export agree on what they asked for
    const exportUrl = `companies/?page_size=9999${canStats ? '&with_stats=1' : ''}`;
    const [table_content, set_table_content] = useState([]);
    const [filters, setFilters] = useState({ s: "", ordering: "-id", page_size: 10 });
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [urls, set_urls] = useState({});
    const [checkbox, setCheckBox] = useState({});
    const [company_data, set_company_data] = useState(EMPTY);
    const [refresh, set_refresh] = useState(false);
    const [update, set_update] = useState(false);
    const [popupOpen, setPopupOpen] = useState(false);
    const [pageError, setPageError] = useState('');
    const [errorInfo, setErrorInfo] = useState('');
    const [exportOpen, setExportOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const exportRef = useRef(null);

    useEffect(() => { setPage(1); }, [filters]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.s) params.set('search', filters.s);
        if (filters.ordering) params.set('ordering', filters.ordering);
        if (filters.page_size) params.set('page_size', filters.page_size);
        if (page > 1) params.set('page', page);
        if (canStats) params.set('with_stats', '1');

        clientToken.get(`companies/?${params.toString()}`).then(response => {
            if (response.status === 200) {
                set_table_content(response.data.results);
                set_urls({ next: !!response.data.next, previous: !!response.data.previous });
                let a = {};
                response.data.results.forEach(r => { a[r.id] = false; });
                setCheckBox(a);
            }
        }).catch(error => {
            console.log(error);
            setPageError(`Failed to load customers. ${error.message || ''}`);
        });
    }, [filters, page, refresh, canStats]);

    // Close export dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closePopup = () => {
        setPopupOpen(false);
        set_company_data(EMPTY);
        setErrorInfo('');
    };

    const handelsave = (u = 'companies/') => {
        const form = new FormData();
        Object.keys(company_data).forEach(k => form.append(k, company_data[k]));
        clientToken.post(u, form).then(response => {
            if (response.status === 200 || response.status === 201) {
                closePopup();
                set_refresh(r => !r);
            }
        }).catch(e => {
            const errData = e.response?.data;
            if (errData && typeof errData === 'object') {
                const msgs = Object.entries(errData).map(([k, v]) => `${k.replace('_', ' ')}: ${Array.isArray(v) ? v[0] : v}`).join(' | ');
                setErrorInfo(msgs);
            } else {
                setErrorInfo("Failed to save customer. Please check your inputs.");
            }
        });
    };

    const handelUpdate = () => handelsave(`companies/${company_data.id}/`);

    const handelDelete = (id) => {
        clientToken.delete(`companies/${id}/`).then(response => {
            if (response.status === 204) {
                closePopup();
                set_refresh(r => !r);
            }
        }).catch(e => {
            const msg = "Failed to delete customer. They might be linked to existing invoices.";
            if (popupOpen) setErrorInfo(msg);
            else setPageError(msg);
        });
    };

    const handelMultiDelete = () => {
        const selectedIds = Object.keys(checkbox).filter(id => checkbox[id]);
        if (selectedIds.length === 0) {
            setPageError('Please select at least one customer to delete.');
            return;
        }
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected customer(s)?`)) {
            selectedIds.forEach(id => handelDelete(id));
        }
    };

    const handelItemsOpen = (index) => {
        set_company_data(table_content[index]);
        set_update(true);
        setPopupOpen(true);
    };

    const handelUrl = (e) => {
        if (e.currentTarget.id === 'next' && urls.next) setPage(p => p + 1);
        if (e.currentTarget.id === 'previous' && urls.previous) setPage(p => p - 1);
        setCheckBox({});
    };

    const handelSearch = (e) => {
        setFilters(prev => ({ ...prev, s: e.target.value }));
    };
    
    const handleChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // ── Export Functions ──
    const handleExportCSV = useCallback(() => {
        setExporting(true);
        setExportOpen(false);
        clientToken.get(exportUrl, { responseType: 'json' })
            .then(response => {
                const data = response.data.results || response.data;
                if (!data || data.length === 0) {
                    setPageError('No customer data to export.');
                    return;
                }
                const headers = ['Name', 'Address', 'GST Number', 'State', 'State Code', 'Phone Number', ...(canStats ? STAT_HEADERS : [])];
                const keys = ['name', 'address', 'gst_number', 'state', 'state_code', 'phone_number', ...(canStats ? STAT_KEYS : [])];
                const csvRows = [headers.join(',')];
                data.forEach(row => {
                    const values = keys.map(k => {
                        const val = (row[k] || '').toString().replace(/"/g, '""');
                        return `"${val}"`;
                    });
                    csvRows.push(values.join(','));
                });
                const csvString = csvRows.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0,10)}.csv`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(err => {
                console.error('CSV export error:', err);
                setPageError('Failed to export CSV. Please try again.');
            })
            .finally(() => setExporting(false));
    }, [exportUrl, canStats]);

    const handleExportJSON = useCallback(() => {
        setExporting(true);
        setExportOpen(false);
        clientToken.get(exportUrl, { responseType: 'json' })
            .then(response => {
                const data = response.data.results || response.data;
                if (!data || data.length === 0) {
                    setPageError('No customer data to export.');
                    return;
                }
                const keys = ['name', 'address', 'gst_number', 'state', 'state_code', 'phone_number', ...(canStats ? STAT_KEYS : [])];
                const cleanData = data.map(row => {
                    const obj = {};
                    keys.forEach(k => { obj[k] = row[k] || ''; });
                    return obj;
                });
                const jsonString = JSON.stringify(cleanData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0,10)}.json`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(err => {
                console.error('JSON export error:', err);
                setPageError('Failed to export JSON. Please try again.');
            })
            .finally(() => setExporting(false));
    }, [exportUrl, canStats]);

    const handleExportPDF = useCallback(() => {
        setExporting(true);
        setExportOpen(false);
        clientToken.get(exportUrl, { responseType: 'json' })
            .then(response => {
                const data = response.data.results || response.data;
                if (!data || data.length === 0) {
                    setPageError('No customer data to export.');
                    return;
                }
                const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const keys = ['name', 'address', 'gst_number', 'state', 'state_code', 'phone_number', ...(canStats ? STAT_KEYS : [])];
                const headers = ['#', 'Name', 'Address', 'GST Number', 'State', 'State Code', 'Phone', ...(canStats ? STAT_HEADERS : [])];
                const rows = data.map((row, i) =>
                    `<tr>
                        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#94a3b8;text-align:center;">${i + 1}</td>
                        ${keys.map(k => `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">${cell(row, k)}</td>`).join('')}
                    </tr>`
                ).join('');
                const html = `
                    <html>
                    <head>
                        <title>Customers Data Export</title>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
                        <style>
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                            body { font-family: 'Inter', sans-serif; margin: 0; color: #0f172a; background: #fff; }
                            .header { background: linear-gradient(135deg, #312e81, #4f46e5); padding: 28px 36px; color: white; }
                            .header h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.3px; }
                            .header p { font-size: 12px; opacity: 0.8; margin-top: 4px; }
                            .stats { display: flex; gap: 24px; padding: 16px 36px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                            .stat { font-size: 12px; color: #64748b; font-weight: 600; }
                            .stat strong { color: #0f172a; font-size: 16px; display: block; margin-top: 2px; }
                            .table-wrap { padding: 0 36px 40px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            thead { background: #f1f5f9; }
                            thead th { padding: 10px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; text-align: left; border-bottom: 2px solid #e2e8f0; }
                            thead th:first-child { text-align: center; width: 40px; }
                            tbody tr:nth-child(even) { background: #fafbfc; }
                            tbody td:nth-child(2) { color: #4f46e5; font-weight: 700; }
                            .footer { text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
                            @media print {
                                body { margin: 0; }
                                .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Customers Data Report</h1>
                            <p>Generated on ${dateStr}</p>
                        </div>
                        <div class="stats">
                            <div class="stat">Total Customers<strong>${data.length}</strong></div>
                            <div class="stat">With GST<strong>${data.filter(r => r.gst_number).length}</strong></div>
                            <div class="stat">With Phone<strong>${data.filter(r => r.phone_number).length}</strong></div>
                            ${canStats ? `
                            <div class="stat">Total Bills<strong>${data.reduce((n, r) => n + (Number(r.invoice_count) || 0), 0)}</strong></div>
                            <div class="stat">Total Billed<strong>${money(data.reduce((n, r) => n + (Number(r.total_billed) || 0), 0))}</strong></div>` : ''}
                        </div>
                        <div class="table-wrap">
                            <table>
                                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                        <div class="footer">End of report — ${data.length} customer(s)</div>
                    </body>
                    </html>
                `;
                const win = window.open('', '_blank');
                win.document.write(html);
                win.document.close();
                win.focus();
                setTimeout(() => { win.print(); }, 500);
            })
            .catch(err => {
                console.error('PDF export error:', err);
                setPageError('Failed to export PDF. Please try again.');
            })
            .finally(() => setExporting(false));
    }, [exportUrl, canStats]);

    const handlePrint = useCallback(() => {
        setExportOpen(false);
        const printContent = table_content;
        if (!printContent || printContent.length === 0) {
            setPageError('No customer data to print.');
            return;
        }
        const keys = ['name', 'address', 'gst_number', 'state', 'state_code', 'phone_number', ...(canStats ? STAT_KEYS : [])];
        const headers = ['Name', 'Address', 'GST Number', 'State', 'State Code', 'Phone', ...(canStats ? STAT_HEADERS : [])];
        const rows = printContent.map(row =>
            `<tr>${keys.map(k => `<td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#374151;">${cell(row, k)}</td>`).join('')}</tr>`
        ).join('');
        const html = `
            <html>
            <head>
                <title>Customers List</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; margin: 32px; color: #0f172a; }
                    h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
                    p.sub { font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 24px; }
                    table { width: 100%; border-collapse: collapse; }
                    thead { background: #312e81; }
                    thead th { padding: 12px 14px; color: white; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; }
                    tbody tr:nth-child(even) { background: #f8fafc; }
                    @media print { body { margin: 16px; } }
                </style>
            </head>
            <body>
                <h1>Customers List</h1>
                <p class="sub">Exported on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <table>
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 400);
    }, [table_content, canStats]);

    const selectedCount = Object.values(checkbox).filter(Boolean).length;

    const filed = (label, id, basis, numeric = false) => (
        <div className="form_box" style={{ flexBasis: basis }}>
            {label}
            <input
                id={id}
                value={company_data[id] || ''}
                onFocus={onFocusIn} onBlur={onFocusOut}
                onChange={e => {
                    if (numeric && isNaN(e.target.value)) return;
                    set_company_data({ ...company_data, [e.target.id]: e.target.value });
                }}
            />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

            {/* ── Top Page Title & Actions ── */}
            <div className="companys_page_head">
                <h1>Customers</h1>
                <div className="head_actions">
                    {selectedCount > 0 && (
                        <div className="button delete" onClick={handelMultiDelete}>
                            Delete ({selectedCount})
                        </div>
                    )}
                    <div className="button" onClick={() => { set_update(false); set_company_data(EMPTY); setPopupOpen(true); }}>
                        + Add New
                    </div>
                </div>
            </div>

            {/* ── Filters Section ── */}
            <div className="companys_filters_card" style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}>
                {/* Top Row: Search & Toggle (stacks below 700px) */}
                <div className="companys_filters_row">
                    <div style={{ flex: '1 1 auto' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Search Customers</label>
                        <div style={{ position: 'relative' }}>
                            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                value={filters.s}
                                onChange={handelSearch}
                                placeholder="Search by name..."
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
                        className="filters_toggle"
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            padding: '12px 20px', borderRadius: '12px', background: showFilters ? '#eef2ff' : '#f1f5f9',
                            color: showFilters ? '#4f46e5' : '#475569', border: showFilters ? '1px solid #c7d2fe' : '1px solid transparent', 
                            fontWeight: 600, cursor: 'pointer', fontSize: '14px', height: '46px', 
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        Filters & Sort
                    </button>
                </div>

                {/* Bottom Row: Filters Grid (Collapsible) */}
                {showFilters && (
                    <div className="companys_filters_grid">
                        {/* Sort By Filter */}
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Sort By</label>
                            <select
                                value={filters.ordering}
                                onChange={(e) => handleChange("ordering", e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', outline: 'none',
                                    fontSize: '14px', color: '#0f172a', transition: 'border-color 0.2s',
                                    backgroundColor: 'white'
                                }}
                            >
                                <option value="-id">Date Added (Newest)</option>
                                <option value="id">Date Added (Oldest)</option>
                                <option value="name">Name (A-Z)</option>
                                <option value="-name">Name (Z-A)</option>
                            </select>
                        </div>

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
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="companys_filter_actions">
                            <button
                                onClick={() => setFilters({ s: "", ordering: "-id", page_size: 10 })}
                                style={{
                                    padding: '10px 20px', borderRadius: '12px', background: '#f1f5f9',
                                    color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer',
                                    fontSize: '14px', height: '41px', transition: 'background 0.2s'
                                }}
                            >
                                Clear
                            </button>
                            <div className="export-wrapper" ref={exportRef}>
                                <div
                                    className="button export-btn"
                                    onClick={() => {
                                        if (!(accessStatus === 'succeeded' && features.includes("bulk_export"))) {
                                            setPageError("Your current subscription does not contain this feature");
                                            return;
                                        }
                                        setExportOpen(prev => !prev);
                                    }}
                                    style={{ height: '41px', background: exporting ? 'linear-gradient(135deg,#a5b4fc,#c4b5fd)' : undefined }}
                                >
                                    {exporting ? 'Exporting…' : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            Export
                                        </>
                                    )}
                                </div>
                                {exportOpen && (
                                    <div className="export-dropdown" style={{ top: '48px', zIndex: 100 }}>
                                        <button className="export-dropdown-item" onClick={handleExportCSV}>
                                            Export as CSV
                                        </button>
                                        <button className="export-dropdown-item" onClick={handleExportJSON}>
                                            Export as JSON
                                        </button>
                                        <button className="export-dropdown-item" onClick={handleExportPDF}>
                                            Export All as PDF
                                        </button>
                                        <div className="export-dropdown-divider" />
                                        <button className="export-dropdown-item" onClick={handlePrint}>
                                            Print / Save as PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div> 

            {pageError && (
                <div className="companys_error_banner">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9V7a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                    </svg>
                    {pageError}
                    <button onClick={() => setPageError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px', padding: '2px 6px' }}>✕</button>
                </div>
            )}

            {/* ── Customer Table ── */}
            <div className="companys_table_raper">
                {table_content.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', marginBottom: '16px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>No Customers Found</h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>It looks like you don't have any customers yet. Get started by adding your first customer!</p>
                        <button
                            onClick={() => { set_update(false); set_company_data(EMPTY); setPopupOpen(true); }}
                            style={{ background: '#4f46e5', color: 'white', fontWeight: 700, fontSize: '14px', padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Customer
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Desktop / tablet: the full table, scrolling sideways if
                            the stat columns make it wider than the viewport */}
                        <div className="hidden md:block" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)', background: 'white' }}>
                            <table className="table" style={{ boxShadow: 'none', borderRadius: 0, minWidth: canStats ? '1120px' : '700px' }}>
                                <thead>
                                    <tr>
                                        <td style={{ width: '40px' }}>
                                            <input type="checkbox" className="check-box"
                                                onChange={e => {
                                                    const list = {};
                                                    Object.keys(checkbox).forEach(id => { list[id] = e.target.checked; });
                                                    setCheckBox(list);
                                                }}
                                            />
                                        </td>
                                        <td>Name</td>
                                        <td>GST Number</td>
                                        <td>State</td>
                                        <td>State Code</td>
                                        <td>Phone</td>
                                        {canStats && (
                                            <>
                                                <td style={{ textAlign: 'center' }}>Bills</td>
                                                <td style={{ textAlign: 'right' }}>Total Billed</td>
                                                <td>Last Bill</td>
                                                <td>Reports</td>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {table_content.map((obj, key) => (
                                        <tr key={obj.id}>
                                            <td>
                                                <input type="checkbox" className="check-box"
                                                    checked={!!checkbox[obj.id]}
                                                    onChange={e => setCheckBox({ ...checkbox, [obj.id]: e.target.checked })}
                                                    id={String(obj.id)}
                                                />
                                            </td>
                                            <td onClick={() => handelItemsOpen(key)} style={{ cursor: 'pointer' }}>
                                                {obj.name || '—'}
                                            </td>
                                            <td>{obj.gst_number || '—'}</td>
                                            <td>{obj.state || '—'}</td>
                                            <td>{obj.state_code || '—'}</td>
                                            <td>{obj.phone_number || '—'}</td>
                                            {canStats && (
                                                <>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                                                        {Number(obj.invoice_count) || 0}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                        {money(obj.total_billed)}
                                                    </td>
                                                    <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                                                        {day(obj.last_invoice_date)}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            {canViewBills && (
                                                                <button
                                                                    onClick={() => navigate(`/bill_list?customer=${obj.id}&type=sales`)}
                                                                    title={`See every bill raised for ${obj.name || 'this customer'}`}
                                                                    style={ACTION_BTN}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; }}
                                                                >
                                                                    View Bills
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => navigate(`/customer-ledger?customer=${obj.id}`)}
                                                                title={`Open the ledger report for ${obj.name || 'this customer'}`}
                                                                style={ACTION_BTN}
                                                                onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; }}
                                                            >
                                                                Ledger
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile: one card per customer. A 6-to-10 column table
                            on a phone is a sideways scroll nobody makes. */}
                        <div className="md:hidden">
                            {/* the table header carries select-all on desktop; the
                                cards need their own */}
                            <label className="customer_cards_selectall">
                                <input type="checkbox" className="check-box"
                                    checked={selectedCount > 0 && selectedCount === table_content.length}
                                    onChange={e => {
                                        const list = {};
                                        Object.keys(checkbox).forEach(id => { list[id] = e.target.checked; });
                                        setCheckBox(list);
                                    }}
                                />
                                {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
                            </label>
                            {table_content.map((obj, key) => (
                                <div className="customer_card" key={obj.id}>
                                    <div className="customer_card_head">
                                        <input type="checkbox" className="check-box"
                                            style={{ marginTop: '4px' }}
                                            checked={!!checkbox[obj.id]}
                                            onChange={e => setCheckBox({ ...checkbox, [obj.id]: e.target.checked })}
                                            aria-label={`Select ${obj.name || 'customer'}`}
                                        />
                                        <div className="customer_card_name" onClick={() => handelItemsOpen(key)}>
                                            {obj.name || '—'}
                                        </div>
                                        <button
                                            onClick={() => handelItemsOpen(key)}
                                            aria-label="Edit customer"
                                            style={{ ...ACTION_BTN, padding: '6px 10px' }}
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="customer_card_facts">
                                        <div className="customer_card_fact">
                                            <span>GST Number</span>
                                            <strong>{obj.gst_number || '—'}</strong>
                                        </div>
                                        <div className="customer_card_fact">
                                            <span>Phone</span>
                                            <strong>{obj.phone_number || '—'}</strong>
                                        </div>
                                        <div className="customer_card_fact">
                                            <span>State</span>
                                            <strong>{obj.state || '—'}</strong>
                                        </div>
                                        <div className="customer_card_fact">
                                            <span>State Code</span>
                                            <strong>{obj.state_code || '—'}</strong>
                                        </div>
                                    </div>

                                    {canStats && (
                                        <>
                                            <div className="customer_card_stats">
                                                <div className="customer_card_fact">
                                                    <span>Bills</span>
                                                    <strong style={{ color: '#0f172a' }}>{Number(obj.invoice_count) || 0}</strong>
                                                </div>
                                                <div className="customer_card_fact">
                                                    <span>Total Billed</span>
                                                    <strong style={{ color: '#0f172a' }}>{money(obj.total_billed)}</strong>
                                                </div>
                                                <div className="customer_card_fact">
                                                    <span>Last Bill</span>
                                                    <strong>{day(obj.last_invoice_date)}</strong>
                                                </div>
                                            </div>
                                            <div className="customer_card_actions">
                                                {canViewBills && (
                                                    <button
                                                        onClick={() => navigate(`/bill_list?customer=${obj.id}&type=sales`)}
                                                        style={ACTION_BTN}
                                                    >
                                                        View Bills
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/customer-ledger?customer=${obj.id}`)}
                                                    style={ACTION_BTN}
                                                >
                                                    Ledger
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="paging">
                            {urls.previous && <div id="previous" onClick={handelUrl}>← Previous</div>}
                            {urls.next && <div id="next" onClick={handelUrl}>Next →</div>}
                        </div>
                    </>
                )}
            </div>

            {/* ── Add / Edit Customer Popup ── */}
            {popupOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(15,23,42,0.55)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={e => { if (e.target === e.currentTarget) closePopup(); }}
                >
                    <div style={{
                        background: 'white', borderRadius: '22px',
                        padding: '32px 28px', width: 'min(580px, 92vw)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                        position: 'relative', maxHeight: '90vh', overflowY: 'auto',
                        animation: 'popIn 0.2s ease',
                    }}>
                        {/* Close */}
                        <button onClick={closePopup} style={{
                            position: 'absolute', top: '14px', right: '14px',
                            background: '#f1f5f9', border: 'none', borderRadius: '8px',
                            width: '32px', height: '32px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', color: '#64748b',
                        }}>✕</button>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '11px',
                                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                            }}>👥</div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    {update ? 'Edit Customer' : 'Add New Customer'}
                                </h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                                    {update ? 'Update customer information below' : 'Fill in customer details below'}
                                </p>
                            </div>
                        </div>

                        {/* Form Error */}
                        {errorInfo && (
                            <div style={{ marginBottom: '20px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>
                                ⚠ {errorInfo}
                            </div>
                        )}

                        {/* Form fields */}
                        <div className="pop-up-box_inputs">
                            {filed('Customer Name', 'name', '48%')}
                            {filed('Address', 'address', '48%')}
                            {filed('GST Number', 'gst_number', '48%')}
                            <div className="form_box" style={{ flexBasis: '22%' }}>
                                State
                                <select
                                    id="state"
                                    value={company_data.state || ''}
                                    onFocus={onFocusIn} onBlur={onFocusOut}
                                    onChange={e => {
                                        const selectedName = e.target.value;
                                        const stateObj = INDIAN_STATES.find(s => s.name === selectedName);
                                        set_company_data({ 
                                            ...company_data, 
                                            state: selectedName, 
                                            ...(stateObj ? { state_code: stateObj.code } : {})
                                        });
                                    }}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '12px',
                                        border: '1.5px solid #e2e8f0', outline: 'none',
                                        fontSize: '14px', color: '#0f172a', transition: 'all 0.2s',
                                        backgroundColor: '#f8fafc', appearance: 'auto', marginTop: '4px'
                                    }}
                                >
                                    <option value="">Select State...</option>
                                    {INDIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            {filed('State Code', 'state_code', '22%', true)}
                            {filed('Phone Number', 'phone_number', '30%')}
                        </div>

                        {/* Buttons */}
                        <div className="pop-up-box_buttons">
                            <button onClick={closePopup} style={{
                                padding: '10px 20px', borderRadius: '10px',
                                border: '1.5px solid #e2e8f0', background: 'white',
                                color: '#374151', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                            }}>Cancel</button>
                            {update && (
                                <div className="button delete" onClick={() => handelDelete(company_data.id)}>Delete</div>
                            )}
                            <div className="button" onClick={update ? handelUpdate : () => handelsave()}>
                                {update ? 'Update' : '+ Save'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes popIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
            `}</style>
        </div>
    );
}

export default CompanysTable;
