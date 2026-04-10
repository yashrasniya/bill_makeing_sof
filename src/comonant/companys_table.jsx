import '../style/Companys.css';
import { clientToken } from "/src/axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Shared input focus handlers
const onFocusIn = e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; e.target.style.background = 'white'; };
const onFocusOut = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

const EMPTY = { name: '', address: '', gst_number: '', state: '', state_code: '', phone_number: '' };

function CompanysTable() {
    const navigate = useNavigate();
    const [table_content, set_table_content] = useState([]);
    const [url, set_url] = useState('companies/');
    const [urls, set_urls] = useState({});
    const [checkbox, setCheckBox] = useState({});
    const [company_data, set_company_data] = useState(EMPTY);
    const [refresh, set_refresh] = useState(false);
    const [update, set_update] = useState(false);
    const [SearchValue, set_SearchValue] = useState('');
    const [popupOpen, setPopupOpen] = useState(false);
    const [pageError, setPageError] = useState('');
    const [errorInfo, setErrorInfo] = useState('');

    useEffect(() => {
        clientToken.get(url).then(response => {
            if (response.status === 200) {
                set_table_content(response.data.results);
                set_urls({ next: response.data.next, previous: response.data.previous });
                let a = {};
                response.data.results.forEach(r => { a[r.id] = false; });
                setCheckBox(a);
            }
        }).catch(error => {
            console.log(error);
            setPageError(`Failed to load customers. ${error.message || ''}`);
        });
    }, [url, refresh]);

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
        if (window.confirm('Are you sure you want to delete selected customers?')) {
            Object.keys(checkbox).forEach(id => {
                if (checkbox[id]) handelDelete(id);
            });
        }
    };

    const handelItemsOpen = (index) => {
        set_company_data(table_content[index]);
        set_update(true);
        setPopupOpen(true);
    };

    const handelUrl = (e) => {
        set_url(urls[e.currentTarget.id]);
        setCheckBox({});
    };

    const handelSearch = (e) => {
        set_SearchValue(e.target.value);
        set_url(`companies/?s=${e.target.value}`);
    };

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

            {/* ── Header ── */}
            <div className="companys_header_raper">
                <div className="title-div">
                    <p>Customers</p>
                    <input
                        placeholder="🔍  Search customers…"
                        onChange={handelSearch}
                        value={SearchValue}
                        className="search input"
                    />
                </div>
                <div className="button-div">
                    <div className="button" onClick={() => { set_update(false); set_company_data(EMPTY); setPopupOpen(true); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 36 35" fill="none">
                            <path d="M22.4655 16.0523L22.4759 7.19432C22.4759 6.80597 22.3196 6.43352 22.0413 6.15891C21.763 5.8843 21.3856 5.73002 20.9921 5.73002C20.5985 5.73002 20.2211 5.8843 19.9429 6.15891C19.6646 6.43352 19.5083 6.80596 19.5083 7.19432L19.5187 16.0523L10.5426 16.042C10.1491 16.042 9.77166 16.1963 9.49339 16.4709C9.21512 16.7455 9.05879 17.1179 9.05879 17.5063C9.05879 17.8947 9.21512 18.2671 9.49339 18.5417C9.77166 18.8163 10.1491 18.9706 10.5426 18.9706L19.5187 18.9603L19.5083 27.8183C19.5075 28.0108 19.5453 28.2016 19.6196 28.3796C19.6939 28.5576 19.8031 28.7193 19.9411 28.8554C20.079 28.9916 20.2429 29.0994 20.4233 29.1727C20.6037 29.246 20.797 29.2834 20.9921 29.2826C21.1872 29.2834 21.3805 29.246 21.5609 29.1727C21.7412 29.0994 21.9051 28.9916 22.0431 28.8554C22.181 28.7193 22.2903 28.5576 22.3646 28.3796C22.4389 28.2016 22.4767 28.0108 22.4759 27.8183L22.4655 18.9603L31.4415 18.9706C31.6366 18.9714 31.8299 18.934 32.0103 18.8607C32.1907 18.7874 32.3546 18.6796 32.4926 18.5435C32.6305 18.4073 32.7398 18.2456 32.814 18.0676C32.8883 17.8896 32.9262 17.6988 32.9254 17.5063C32.9262 17.3138 32.8883 17.123 32.814 16.945C32.7398 16.767 32.6305 16.6053 32.4926 16.4691C32.3546 16.333 32.1907 16.2252 32.0103 16.1519C31.8299 16.0785 31.6366 16.0412 31.4415 16.042L22.4655 16.0523Z" fill="white" />
                        </svg>
                        Add Customer
                    </div>
                    <div className="button delete" onClick={handelMultiDelete}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 27 27" fill="none">
                            <path d="M11.25 20.25C11.5484 20.25 11.8345 20.1315 12.0455 19.9205C12.2565 19.7095 12.375 19.4234 12.375 19.125V12.375C12.375 12.0766 12.2565 11.7905 12.0455 11.5795C11.8345 11.3685 11.5484 11.25 11.25 11.25C10.9516 11.25 10.6655 11.3685 10.4545 11.5795C10.2435 11.7905 10.125 12.0766 10.125 12.375V19.125C10.125 19.4234 10.2435 19.7095 10.4545 19.9205C10.6655 20.1315 10.9516 20.25 11.25 20.25ZM22.5 6.75H18V5.625C18 4.72989 17.6444 3.87145 17.0115 3.23851C16.3786 2.60558 15.5201 2.25 14.625 2.25H12.375C11.4799 2.25 10.6214 2.60558 9.98851 3.23851C9.35558 3.87145 9 4.72989 9 5.625V6.75H4.5C4.20163 6.75 3.91548 6.86853 3.7045 7.0795C3.49353 7.29048 3.375 7.57663 3.375 7.875C3.375 8.17337 3.49353 8.45952 3.7045 8.6705C3.91548 8.88147 4.20163 9 4.5 9H5.625V21.375C5.625 22.2701 5.98058 23.1286 6.61351 23.7615C7.24645 24.3944 8.10489 24.75 9 24.75H18C18.8951 24.75 19.7536 24.3944 20.3865 23.7615C21.0194 23.1286 21.375 22.2701 21.375 21.375V9H22.5C22.7984 9 23.0845 8.88147 23.2955 8.6705C23.5065 8.45952 23.625 8.17337 23.625 7.875C23.625 7.57663 23.5065 7.29048 23.2955 7.0795C23.0845 6.86853 22.7984 6.75 22.5 6.75ZM11.25 5.625C11.25 5.32663 11.3685 5.04048 11.5795 4.8295C11.7905 4.61853 12.0766 4.5 12.375 4.5H14.625C14.9234 4.5 15.2095 4.61853 15.4205 4.8295C15.6315 5.04048 15.75 5.32663 15.75 5.625V6.75H11.25V5.625ZM19.125 21.375C19.125 21.6734 19.0065 21.9595 18.7955 22.1705C18.5845 22.3815 18.2984 22.5 18 22.5H9C8.70163 22.5 8.41548 22.3815 8.2045 22.1705C7.99353 21.9595 7.875 21.6734 7.875 21.375V9H19.125V21.375ZM15.75 20.25C16.0484 20.25 16.3345 20.1315 16.5455 19.9205C16.7565 19.7095 16.875 19.4234 16.875 19.125V12.375C16.875 12.0766 16.7565 11.7905 16.5455 11.5795C16.3345 11.3685 16.0484 11.25 15.75 11.25C15.4516 11.25 15.1655 11.3685 14.9545 11.5795C14.7435 11.7905 14.625 12.0766 14.625 12.375V19.125C14.625 19.4234 14.7435 19.7095 14.9545 19.9205C15.1655 20.1315 15.4516 20.25 15.75 20.25Z" fill="white" />
                        </svg>
                        Delete
                    </div>
                </div>
            </div>

            {pageError && (
                <div style={{ margin: '16px 24px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9V7a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                    </svg>
                    {pageError}
                    <button onClick={() => setPageError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
                </div>
            )}

            {/* ── Customer Table ── */}
            <div className="companys_table_raper">
                <table className="table">
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
                        </tr>
                    </thead>
                    <tbody>
                        {table_content.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '15px', fontWeight: 600 }}>
                                    No customers found
                                </td>
                            </tr>
                        ) : table_content.map((obj, key) => (
                            <tr key={obj.id}>
                                <td>
                                    <input type="checkbox" className="check-box"
                                        checked={!!checkbox[obj.id]}
                                        onChange={e => setCheckBox({ ...checkbox, [e.target.id]: e.target.checked })}
                                        id={obj.id}
                                    />
                                </td>
                                <td onClick={() => handelItemsOpen(key)} style={{ cursor: 'pointer' }}>
                                    {obj.name || '—'}
                                </td>
                                <td>{obj.gst_number || '—'}</td>
                                <td>{obj.state || '—'}</td>
                                <td>{obj.state_code || '—'}</td>
                                <td>{obj.phone_number || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="paging">
                    {urls.previous && <div id="previous" onClick={handelUrl}>← Previous</div>}
                    {urls.next && <div id="next" onClick={handelUrl}>Next →</div>}
                </div>
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
                            {filed('State', 'state', '22%')}
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
