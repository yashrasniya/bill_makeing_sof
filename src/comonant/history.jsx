import "../style/history.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { clientToken } from "../axios";
import PdfOpener from "@/utility/pdf_opener";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Simple loader component
const Loader = () => (
    <div className="flex justify-center items-center py-10">
        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <p style={{ marginLeft: '12px', color: '#4f46e5', fontWeight: 600 }}>Loading...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
);

// Payment status badge (shared by table + card)
const STATUS_STYLES = {
    unpaid: { label: "Unpaid", bg: "#fee2e2", fg: "#991b1b" },
    partially_paid: { label: "Partial", bg: "#fef3c7", fg: "#b45309" },
    paid: { label: "Paid", bg: "#dcfce7", fg: "#166534" },
    overdue: { label: "Overdue", bg: "#fecdd3", fg: "#9f1239" },
};
const PaymentBadge = ({ status }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.unpaid;
    return (
        <span style={{
            background: s.bg, color: s.fg, borderRadius: '999px',
            padding: '3px 10px', fontSize: '11px', fontWeight: 700,
            whiteSpace: 'nowrap', display: 'inline-block',
        }}>
            {s.label}
        </span>
    );
};

// Row for desktop table
const TableRow = ({ obj, index, refresh, setRefresh }) => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <tr key={index} className="hidden md:table-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td
                className="td-with-icon cursor-pointer font-bold"
                onClick={() => navigate(`/invoice/${obj.id}/view`)}
            >
                {obj?.invoice_number ?? "No-number"}
            </td>
            <td onClick={() => navigate(`/invoice/${obj.id}/view`)} >{obj.date}</td>
            <td
                className="px-2 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/invoice/${obj.id}/view`)}
            >
                {obj.invoice_type === 'purchase' ? obj.vendor_name || "-" : obj.receiver_name || "-"}
            </td>
            <td onClick={() => navigate(`/invoice/${obj.id}/view`)} className={'font-bold '}>₹{Number(obj.total_final_amount || 0).toLocaleString('en-IN')}</td>
            <td onClick={() => navigate(`/invoice/${obj.id}/view`)} className="cursor-pointer">
                <PaymentBadge status={obj.payment_status} />
            </td>

            <td className="relative">
                <button
                    className="p-1 rounded hover:bg-gray-100"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    ⋮
                </button>

                {open && (
                    <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '140px', background: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(79,70,229,0.15)', border: '1px solid #e0e7ff', overflow: 'hidden', zIndex: 50 }}>
                        <button
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            onClick={() => {
                                clientToken
                                    .get(`pdf/?id=${obj.id}`, { responseType: "blob" })
                                    .then((r) => PdfOpener(r, obj, []));
                            }}
                        >
                            Export
                        </button>
                        <button
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            onClick={() => {
                                clientToken
                                    .delete(`invoice/?id=${obj.id}`)
                                    .then((r) =>
                                        r.status === 204
                                            ? setRefresh(!refresh)
                                            : console.log(r.data.response)
                                    )
                                    .catch((error) => console.log(error));
                                setOpen(false);
                            }}
                        >
                            Delete
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
};

// Card for mobile view
const CardRow = ({ obj, index, refresh, setRefresh }) => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div
            key={index}
            className="md:hidden  shadow-md rounded-lg p-4 mb-3  relative"
        >
            <div className="cursor-pointer" onClick={() => navigate(`/invoice/${obj.id}/view`)}>
                <p className="font-semibold flex items-center gap-2">
                    Invoice: {obj?.invoice_number ?? "No-number"}
                    <PaymentBadge status={obj.payment_status} />
                </p>
                <p className="text-sm text-gray-600">Date: {obj.date}</p>
                <p className="text-sm text-gray-600">
                    {obj.invoice_type === 'purchase' ? 'Vendor: ' + (obj.vendor_name || "-") : 'Receiver: ' + (obj.receiver_name || "-")}
                </p>
                <p className="text-sm text-gray-600">
                    Amount: ₹{Number(obj.total_final_amount || 0).toLocaleString('en-IN')}
                </p>
            </div>

            <div className="absolute top-2 right-2">
                <button
                    className="p-1 rounded hover:bg-gray-100"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    ⋮
                </button>

                {open && (
                    <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '140px', background: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(79,70,229,0.15)', border: '1px solid #e0e7ff', overflow: 'hidden', zIndex: 50 }}>
                        <button
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            onClick={() => {
                                clientToken
                                    .get(`pdf/?id=${obj.id}`, { responseType: "blob" })
                                    .then((r) => PdfOpener(r, obj, []));
                            }}
                        >
                            Export
                        </button>
                        <button
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            onClick={() => {
                                clientToken
                                    .delete(`invoice/?id=${obj.id}`)
                                    .then((r) =>
                                        r.status === 204
                                            ? setRefresh(!refresh)
                                            : console.log(r.data.response)
                                    )
                                    .catch((error) => console.log(error));
                                setOpen(false);
                            }}
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

function History({ show_header = true, filters = {} }) {
    const [loading, setLoading] = useState(false);
    const [invoice_data, setInvoiceData] = useState([]);
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(false);
    const [current_page, setCurrentPage] = useState(1);
    const navigate = useNavigate();
    const [isApiCall, setIsApiCall] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isApiCall) {
            setLoading(true);
            setIsApiCall(true);

            const url = "invoice/";
            const params = { ...filters, page };
            if (filters?.customer) {
                params.customer = filters.customer.join();
            }

            clientToken
                .get(url, { params })
                .then((response) => {
                    if (response.status === 200) {
                        setInvoiceData(response.data.results || []);
                        if (response.data.next) {
                            const urlObj = new URL(response.data.next);
                            setCurrentPage(parseInt(urlObj.searchParams.get("page"), 10));
                        } else {
                            setCurrentPage(page);
                        }
                    }
                })
                .catch((error) => console.error(error))
                .finally(() => {
                    setLoading(false);
                    setIsApiCall(false);
                });
        }
    }, [page, filters, refresh]);

    return (
        <div className="history_container">
            {show_header && (
                <div className="header relative">
                    <div className="header-text">
                        <p className="l1">Billing History</p>
                    </div>
                    <div className="header-button flex gap-2">
                        <div className="button" onClick={() => navigate("/newBill")}>
                            Create Bill
                        </div>

                        {/* Dropdown */}
                        {open && (
                            <div className="absolute right-0 mt-12 w-48 bg-white text-black border border-gray-300 rounded-lg shadow-lg z-10">
                                <div
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                        setOpen(false);
                                        navigate("/newBillWithTemplate");
                                    }}
                                >
                                    Create from Template
                                </div>
                                <div
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                        setOpen(false);
                                        navigate("/importBill");
                                    }}
                                >
                                    Import Bill
                                </div>
                            </div>
                        )}
                        <div className="button" onClick={() => navigate("/bill_list")}>
                            All Bills
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <Loader />
            ) : (
                <div className="w-full overflow-x-auto">
                    {invoice_data.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', marginBottom: '16px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>No Bills Found</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>It looks like you don't have any bills yet. Get started by creating your first bill!</p>
                            <button
                                onClick={() => navigate("/newBill")}
                                style={{ background: '#4f46e5', color: 'white', fontWeight: 700, fontSize: '14px', padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                    <path d="M9 3v12M3 9h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                                Create Your First Bill
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <table
                                className="
                                    hidden md:table
                                    w-full
                                    text-[#0B666A]
                                    font-inter
                                    not-italic
                                    leading-normal
                                    border-collapse
                                    text-center
                                "
                            >
                                <thead>
                                    <tr>
                                        <td className="w-1/4 px-2 py-2">INVOICE NO.</td>
                                        <td className="px-2 py-2">DATE</td>
                                        <td className="px-2 py-2">CUSTOMER / VENDOR</td>
                                        <td className="px-2 py-2">AMOUNT</td>
                                        <td className="px-2 py-2">STATUS</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice_data.map((obj, index) => (
                                        <TableRow
                                            key={index}
                                            index={index}
                                            obj={obj}
                                            refresh={refresh}
                                            setRefresh={setRefresh}
                                        />
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile Card List */}
                            <div className="md:hidden">
                                {invoice_data.map((obj, index) => (
                                    <CardRow
                                        key={index}
                                        index={index}
                                        obj={obj}
                                        refresh={refresh}
                                        setRefresh={setRefresh}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px', paddingBottom: '10px' }}>
                                <button
                                    onClick={() => page > 1 && setPage(page - 1)}
                                    disabled={page === 1}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '36px', height: '36px', borderRadius: '10px',
                                        border: '1.5px solid #e2e8f0', background: page > 1 ? 'white' : '#f8fafc',
                                        cursor: page > 1 ? 'pointer' : 'not-allowed', color: page > 1 ? '#4f46e5' : '#cbd5e1',
                                        transition: 'all 0.2s', boxShadow: page > 1 ? '0 2px 4px rgba(0,0,0,0.02)' : 'none'
                                    }}
                                    onMouseEnter={e => { if (page > 1) { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#eef2ff'; } }}
                                    onMouseLeave={e => { if (page > 1) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; } }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    PAGE {current_page}
                                </span>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '36px', height: '36px', borderRadius: '10px',
                                        border: '1.5px solid #e2e8f0', background: 'white',
                                        cursor: 'pointer', color: '#4f46e5',
                                        transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#eef2ff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default History;
