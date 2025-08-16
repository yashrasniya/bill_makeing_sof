import History from "../comonant/history";
import { useState, useRef, useEffect } from "react";
import {clientToken} from "../axios";
import MultiSelectDropdown from "../comonant/MultiSelectDropdown";
import ExportDropdown from "../comonant/ExportDropdown";



// Multi-select dropdown with checkboxes


const Bill_list = ({ setLoading }) => {
    const [filters, setFilters] = useState({
        s: "",
        customer: [],
        date_from: "",
        date_to: "",
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

    const DateRangeFilter = ({ value, onChange, label = "Date" }) => (
        <div className="min-w-[260px]">
            <label className="block text-sm font-medium mb-1">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={value.from || ""}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                />
                <span className="text-gray-500">–</span>
                <input
                    type="date"
                    value={value.to || ""}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                />
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-4 pt-20">
            {/* Search + Filters */}
            <div className="border border-gray-300 rounded-lg p-4 flex flex-wrap gap-4 items-end shadow-sm">
                {/* Search Input */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium mb-1">Search</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
                    />
                </div>

                {/* Dynamic filters */}
                {filterConfig.map((f) => (
                    <div key={f.key} className="min-w-[200px]">
                        {f.type === "multi-checkbox-dropdown" ? (
                            <MultiSelectDropdown
                                label={f.label}
                                fetchOptions={fetchCustomerOptions}
                                options={f.options}
                                selected={filters[f.key]}
                                onChange={(newValues) => handleChange(f.key, newValues)}
                            />
                        ) : (
                            <>
                                <label className="block text-sm font-medium mb-1">{f.label}</label>
                                <input
                                    type={f.type}
                                    value={filters[f.key]}
                                    onChange={(e) => handleChange(f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
                                />
                            </>
                        )}
                    </div>
                ))}

                {/* Date range */}
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

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleSearch}
                        className="border border-gray-400 px-4 py-2 rounded hover:bg-gray-100 transition"
                    >
                        Apply
                    </button>
                    <button
                        onClick={() => setFilters({ s: "", customer: [], date_from: "", date_to: "" })}
                        className="border border-gray-400 px-4 py-2 rounded hover:bg-gray-100 transition"
                    >
                        Reset
                    </button>
                    {/* Future extra buttons */}
                    <ExportDropdown
                        onExport={(format) => {
                            if (format === "csv") handelExportCSV();
                            if (format === "pdf") handelExportPDF();
                            if (format === "xlsx") handelExportExcel();
                        }}
                    />
                </div>
            </div>

            {/* History list */}
            <History
                setLoading={setLoading}
                show_header={false}
                filters={filters}
            />
        </div>

    );
};

export default Bill_list;
