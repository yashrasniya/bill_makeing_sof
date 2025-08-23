import '../style/history.css';
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { clientToken } from "../axios";
import PdfOpener from "@/utility/pdf_opener";

// Simple loader component (can be styled as needed)
const Loader = () => (
    <div className="flex justify-center items-center py-10">
        <div className="w-8 h-8 border-4 border-[#0B666A] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-[#0B666A] font-medium">Loading...</p>
    </div>
);

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
                .catch((error) => {
                    console.error(error);
                })
                .finally(() => {
                    setLoading(false);
                    setIsApiCall(false);
                });
        }
    }, [page, filters,refresh]);

    const Row = ({ obj,index }) => {
        const [open, setOpen] = useState(false);

        return (
            <tr className="table-row" key={index}>
                <td
                    className="td-with-icon cursor-pointer"
                    onClick={() =>
                        navigate(`/bill/${obj.id}`)
                    }
                >
                    {obj?.invoice_number ?? "No-number"}
                </td>
                <td onClick={() =>
                    navigate(`/bill/${obj.id}`)
                }>{obj.date}</td>
                <td onClick={() =>
                    navigate(`/bill/${obj.id}`)
                }>{obj.receiver_name || "-"}</td>
                <td onClick={() =>
                    navigate(`/bill/${obj.id}`)
                }>{obj.total_final_amount ?? 0}</td>

                {/* Options dropdown */}
                <td className="relative">
                    <button
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => setOpen((prev) => !prev)}
                    >
                        ⋮
                    </button>

                    {open && (
                        <div
                            className="absolute right-0 mt-2 w-32 bg-[#60dbd8]  rounded shadow-lg z-50 "
                        >
                            <button
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:bg-black"
                                onClick={() => {
                                    clientToken.get(`pdf/?id=${obj.id}`,{ responseType: 'blob' }).
                                    then((r)=>PdfOpener(r,obj,[]))
                                }}
                            >
                                Export
                            </button>
                            <button
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                onClick={() => {

                                    clientToken.delete(`invoice/?id=${obj.id}`,).
                                    then((r)=>r.status===204?setRefresh(!refresh):console.log(r.data.response))
                                        .catch((error) => {console.log(error)})
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

    return (
        <div className="history_container">
            {show_header && (
                <div className="header">
                    <div className="header-text">
                        <p className="l1">Billing History</p>
                    </div>
                    <div className="header-button">
                        <div className="button" onClick={() => navigate("/newBill")}> Create Bill </div>
                        {/*<div className={'flex gap-0'}>*/}
                        {/*    <div*/}
                        {/*        className="bg-[#071952] text-white text-[1.3rem] pl-[0.8rem] py-[0.8rem] rounded-l-2xl rounded-r-none cursor-pointer "*/}
                        {/*        onClick={() => navigate("/newBill")}*/}
                        {/*    >*/}
                        {/*        Create Bill*/}
                        {/*    </div>*/}

                        {/*     Dropdown toggle button*/}
                        {/*        <div*/}
                        {/*            className=" bg-[#071952] text-white text-[1.3rem]  py-[0.8rem] pr-[0.8rem] rounded-r-2xl rounded-l-none cursor-pointer flex items-center justify-center px-2"*/}
                        {/*            onClick={() => setOpen(!open)}*/}
                        {/*        >*/}
                        {/*            ▼*/}
                        {/*        </div>*/}
                        {/*</div>*/}

                        {/* Dropdown menu */}
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
                <div className="table-raper">
                    <table className="table">
                        <thead>
                        <tr>
                            <td style={{ width: "25%" }}>Invoice No.</td>
                            <td>Date</td>
                            <td>Customer</td>
                            <td>Amount</td>
                        </tr>
                        </thead>
                        <tbody>
                        {invoice_data.map((obj, index) => (
                            <Row index={index} obj={obj} />
                        ))}

                        </tbody>

                    </table>
                    {invoice_data.length === 0 ? <p className={'text-center w-full'}>No Data</p>:
                        <div className="flex justify-between">
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
                    }


                </div>
            )}
        </div>
    );
}

export default History;
