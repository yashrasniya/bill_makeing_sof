import "../style/history.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { clientToken } from "../axios";
import PdfOpener from "@/utility/pdf_opener";

// Simple loader component
const Loader = () => (
    <div className="flex justify-center items-center py-10">
        <div className="w-8 h-8 border-4 border-[#0B666A] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-[#0B666A] font-medium">Loading...</p>
    </div>
);

// Row for desktop table
const TableRow = ({ obj, index, refresh, setRefresh }) => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <tr key={index} className="hidden md:table-row border-b border-[#35A29F]">
            <td
                className="td-with-icon cursor-pointer font-bold"
                onClick={() => navigate(`/bill/${obj.id}`)}
            >
                {obj?.invoice_number ?? "No-number"}
            </td>
            <td onClick={() => navigate(`/bill/${obj.id}`)} >{obj.date}</td>
            <td onClick={() => navigate(`/bill/${obj.id}`)}>{obj.receiver_name || "-"}</td>
            <td onClick={() => navigate(`/bill/${obj.id}`)} className={'font-bold '}>₹{obj.total_final_amount ?? 0}/-</td>

            <td className="relative">
                <button
                    className="p-1 rounded hover:bg-gray-100"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    ⋮
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-32 bg-[#60dbd8] rounded shadow-lg z-50">
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
            <div className="cursor-pointer" onClick={() => navigate(`/bill/${obj.id}`)}>
                <p className="font-semibold">
                    Invoice: {obj?.invoice_number ?? "No-number"}
                </p>
                <p className="text-sm text-gray-600">Date: {obj.date}</p>
                <p className="text-sm text-gray-600">
                    Receiver: {obj.receiver_name || "-"}
                </p>
                <p className="text-sm text-gray-600">
                    Amount: ₹{obj.total_final_amount ?? 0}
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
                    <div className="absolute right-0 mt-2 w-32 bg-[#60dbd8] rounded shadow-lg z-50">
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
                        <thead className="text-[1.2rem] border-collapse">
                        <tr className="border-b border-[#35A29F]">
                            <td className="w-1/4 px-2 py-2 font-bold">Invoice No.</td>
                            <td className="px-2 py-2 font-bold">Date</td>
                            <td className="px-2 py-2 font-bold">Customer</td>
                            <td className="px-2 py-2 font-bold ">Amount</td>
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

                    {invoice_data.length === 0 ? (
                        <p className="text-center w-full">No Data</p>
                    ) : (
                        <div className="flex justify-between mt-4">
                            <p
                                onClick={() => page > 1 && setPage(page - 1)}
                                className="cursor-pointer"
                            >
                                {"<<"}
                            </p>
                            <p className="cursor-pointer">Page {current_page}</p>
                            <p onClick={() => setPage(page + 1)} className="cursor-pointer">
                                {">>"}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default History;
