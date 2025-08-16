import {useEffect, useRef, useState} from "react";

const MultiSelectDropdown = ({ label, fetchOptions, selected, onChange }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [options, setOptions] = useState([]);
    const dropdownRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Toggle selected option
    const toggleOption = (value) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch data from API with debounce
    useEffect(() => {
        if (!open) return;
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetchOptions(search); // async function from parent
                setOptions(res);
            } catch (error) {
                console.error("Error fetching options:", error);
            }
        }, 300); // 300ms debounce
    }, [search, open, fetchOptions]);

    return (
        <div className="relative min-w-[200px]" ref={dropdownRef}>
            {/* Dropdown button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="inline-flex justify-between w-full rounded-md border px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring focus:border-blue-300"
            >
                {selected.length > 0
                    ? `${label}: ${selected.length} selected`
                    : label}
                <svg
                    className={`h-5 w-5 transform transition-transform ${open ? "rotate-180" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {/* Dropdown content */}
            {open && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    {/* Search input */}
                    <div className="p-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
                        />
                    </div>

                    {/* Selected items preview */}
                    {selected.length > 0 && (
                        <div className="px-2 pb-1 text-xs text-gray-500">
                            Selected: {selected.join(", ")}
                        </div>
                    )}

                    {/* Options list */}
                    <div className="p-2 max-h-48 overflow-y-auto">
                        {options.length > 0 ? (
                            options.map((opt) => (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 p-1 text-sm hover:bg-gray-100 rounded cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(opt.value)}
                                        onChange={() => toggleOption(opt.value)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    {opt.label}
                                </label>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 p-2">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default MultiSelectDropdown;