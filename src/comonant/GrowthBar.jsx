import { useEffect, useState } from "react";

export default function GrowthBar({ percentageChange,invoices_this_month_count }) {
    const [width, setWidth] = useState("0%");

    useEffect(() => {
        const absPct = Math.min(Math.abs(percentageChange), 100); // clamp to 100
        setWidth(absPct + "%");
    }, [percentageChange]);

    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;

    return (
        <div className="w-full max-w-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-700">{invoices_this_month_count}</div>
                <div
                    className={`text-sm font-semibold ${
                        isPositive ? "text-button_blue" : isNegative ? "text-rose-600" : "to-[#071952]"
                    }`}
                >
                    {percentageChange > 0 ? "+" : ""}
                    {percentageChange.toFixed(1)}%
                </div>
            </div>

            {/* Bar container */}
            <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ease-out ${
                        isPositive
                            ? "bg-[#071952]"
                            : isNegative
                                ? "bg-rose-400"
                                : "bg-transparent"
                    }`}
                    style={{ width }}
                ></div>

                {/* Percentage badge */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-800 bg-white/60 px-2 py-0.5 rounded">
                    {percentageChange > 0 ? "+" : ""}
                    {percentageChange.toFixed(1)}%
                </div>
            </div>
        </div>
    );
}
