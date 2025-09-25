import React, { useState } from "react";

const CollapsibleRowCard = ({
                                rowData,
                                key,
                                rowIndex,
                                billBodyItems,
                                handelOpen,
                                handelCheckBox,
                                checkbox
                            }) => {
    const [isOpen, setIsOpen] = useState(false);

    let total = 1;
    let extraCal = 0;

    // Inner calculator
    function calculate(abc) {
        const item = abc.new_product_in_frontend;
        if (item.is_calculable) {
            if (item.formula) {
                if (item.formula === "+") {
                    extraCal += parseFloat(abc.value);
                } else if (item.formula === "-") {
                    extraCal -= parseFloat(abc.value);
                } else if (item.formula === "/") {
                    total /= parseFloat(abc.value);
                } else {
                    total = "error";
                }
            } else {
                if (abc.value && item.input_title !== "GST") {
                    total *= parseFloat(abc.value);
                }
            }
        }
    }
    rowData.product_properties.filter(calculate);

    // Compute GST
    let gstAmount = 0;
    if (
        rowData.product_properties.length > 0 &&
        billBodyItems.map((o) => o.input_title).indexOf("GST") !== -1
    ) {
        const gstIndex = billBodyItems.map((o) => o.input_title).indexOf("GST");
        const gst = rowData.product_properties[gstIndex]?.value;
        gstAmount = gst ? total * (gst / 100) : 0;
    }

    return (
        <div
            key={rowIndex}
            id={rowData.id}
            className="p-4  rounded-lg shadow-xl border border-[#5d9a9a] space-y-2 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
        >
            {/* Collapsed view */}
            <div className="flex justify-between text-sm border-b border-[#5d9a9a] pb-1">
        {/*<span className="font-medium">*/}
        {/*  {rowData.product_properties[0]?.new_product_in_frontend.input_title}*/}
        {/*</span>*/}

                <span className={'font-semibold flex gap-1 items-center'}><input
                    type="checkbox"
                    className="check-box mr-2"
                    id={key}
                    checked={checkbox[key]}
                    onChange={handelCheckBox}
                /> <span className={'font-bold'}>{rowData.product_properties[0]?.new_product_in_frontend.input_title}:</span> {rowData.product_properties[0]?.value}</span>
                <span className={'text-xs'}>{isOpen ? "▲" : "▼"}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-[#5d9a9a] pb-1">
                <span className={'font-bold'}>Total Amount: <span className={'font-semibold'}>{parseFloat(total + gstAmount + extraCal).toFixed(2)}</span></span>

            </div>



            {/* Expanded view */}
            {isOpen && (
                <div className="mt-2 space-y-2" id={rowData.id}>
                    {rowData.product_properties
                        .sort(
                            (a, b) =>
                                a.new_product_in_frontend.id - b.new_product_in_frontend.id
                        )
                        .map(
                            (headObj, i) =>
                                headObj.new_product_in_frontend.is_show && i!==0 &&(
                                    <div
                                        key={i}
                                        onClick={handelOpen}
                                        className="flex justify-between text-sm border-b border-[#5d9a9a] py-1"
                                    >
                    <span className="font-medium">
                      {headObj.new_product_in_frontend.input_title}
                    </span>
                                        <span>{headObj.value}</span>
                                    </div>
                                )
                        )}

                    <div
                        onClick={handelOpen}
                        className="flex justify-between text-sm border-b  border-[#5d9a9a] py-1"
                    >
                        <span className="font-medium">GST Amount</span>
                        <span>{parseFloat(gstAmount).toFixed(2)}</span>
                    </div>
                </div>
            )}

            {/* Expand/Collapse indicator */}
            {/*<div className="text-center text-xs text-gray-500">*/}
            {/*    {isOpen ? "▲ Collapse" : "▼ Expand"}*/}
            {/*</div>*/}
        </div>
    );
};

export default CollapsibleRowCard;
