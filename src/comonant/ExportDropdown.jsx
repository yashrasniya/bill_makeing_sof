import { useState } from "react";

export default function ExportDropdown({ onExport }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (format) => {
        setOpen(false);
        onExport(format); // Call parent handler with selected format
    };

    return (
        <div className="relative inline-block text-left">
            {/* Main button */}
            <button
                className="border border-gray-400 px-4 py-2 rounded hover:bg-gray-100 transition flex items-center gap-2"
                onClick={() => setOpen((prev) => !prev)}
            >
                Export
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown menu */}
            {open && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                    <button
                        onClick={() => handleSelect("csv")}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                        Export as CSV
                    </button>
                    <button
                        onClick={() => handleSelect("pdf")}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                        Export as PDF
                    </button>
                    {/*<button*/}
                    {/*    onClick={() => handleSelect("xlsx")}*/}
                    {/*    className="block w-full text-left px-4 py-2 hover:bg-gray-100"*/}
                    {/*>*/}
                    {/*    Export as Excel*/}
                    {/*</button>*/}
                </div>
            )}
        </div>
    );
}
