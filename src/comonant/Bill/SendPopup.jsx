import { useState } from "react";

const SendPopup = ({ options = [], onClose, onSend }) => {
    const [selected, setSelected] = useState("");

    const handleSend = () => {
        if (!selected) {
            alert("Please select an option");
            return;
        }
        onSend(selected);
        setSelected(""); // optional: reset after send
        onClose();
    };
console.log(options)
    return (
        <div className="fixed inset-0  flex justify-center items-center z-50">
            <div className="bg-white rounded-lg w-80 p-4 relative shadow-lg">
                {/* Close button */}
                <button
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 font-bold"
                    onClick={onClose}
                >
                    ✕
                </button>

                {/* Title */}
                <h2 className="text-lg font-semibold mb-4 text-center">Send Item</h2>

                {/* Dropdown */}
                <select
                    className="w-full border border-gray-300 rounded p-2 mb-4"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                >
                    <option value="">Select an option</option>
                    {options.map((opt, idx) => (
                        <option key={idx} value={opt.id || opt}>
                            {opt.template_name || opt}
                        </option>
                    ))}
                </select>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default SendPopup;
