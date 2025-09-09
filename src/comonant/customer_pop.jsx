import React, { useState } from "react";
import {clientToken} from "@/axios";

export default function CustomerDropdown({companyName,InvoiceData,setRefresh,setInvoiceData}) {
    // const [refresh, setRefresh] = useState(false);
    // const [companyName, setCompanyName] = useState([
    //     { id: 1, name: "ABC Ltd" },
    //     { id: 2, name: "XYZ Pvt Ltd" },
    // ]);
    const [showPopup, setShowPopup] = useState(false);
    const [newReceiver, setNewReceiver] = useState({
        name:'',
        phone_number:'',
        address:'',

    });

    const handleAddReceiver = () => {
        const form=new FormData()
        Object.keys(newReceiver).map((obj)=> {
            form.append(obj, newReceiver[obj])
            console.log(obj,newReceiver[obj])
        })
        clientToken.post('companies/',form).then((response)=>{
            if(response.status===200){
                document.getElementById('new_company_box').style.display='none'
                setNewReceiver({
                    name:'',
                    phone_number:'',
                    address:'',

                })
                setRefresh((e)=>!e)

            }

        }).catch((e)=>alert(e.request.status))
        setShowPopup(false);
    };

    return (
        <div className="flex md:items-center items-start justify-center   gap-2 md:flex-row flex-col">
            {/*<div className={''}>*/}
            <p>Receiver</p>
            <div className={'flex bg-white rounded-lg md:w-1/2 w-full '}>

                <select
                    id={"receiver"}
                    value={InvoiceData?.receiver || ""}
                    className={'w-full '}
                    style={{width:'86%'}}
                    onChange={(event) => {
                        if (event.target.value) {
                            setInvoiceData({
                                ...InvoiceData,
                                [event.target.id]: event.target.value,
                            });
                            console.log(InvoiceData);
                            setRefresh((p)=>!p);
                        }
                    }}
                >
                    <option value="">---</option>
                    {companyName.map((obj) => (
                        <option key={obj.id} value={obj.id}>
                            {obj.name}
                        </option>
                    ))}
                </select>


            <button
                onClick={() => setShowPopup(true)}
                className="bg-white text-black px-2 py-1 rounded"
            >
                +
            </button>
            </div>

            {/* Popup */}
            {showPopup && (
                <div className="fixed inset-0  flex items-center justify-center">
                    <div className="bg-white p-6 rounded shadow-md w-80">
                        <h2 className="text-lg font-bold mb-4">Add New Customer</h2>
                        <input
                            type="text"
                            name={"name"}
                            placeholder="Customer Name"
                            value={newReceiver.name}
                            onChange={(e) =>
                                setNewReceiver({ ...newReceiver, [e.target.name]: e.target.value})}
                            className="border p-2 w-full mb-4 bg-gray-100"
                        />
                        <h2 className="text-lg font-bold mb-4">Add New Customer</h2>
                        <input
                            type="text"
                            placeholder="Customer Mobile Number"
                            value={newReceiver.phone_number}
                            name={"phone_number"}
                            onChange={(e) =>
                                setNewReceiver({ ...newReceiver, [e.target.name]: e.target.value})}
                            className="border p-2 w-full mb-4 bg-gray-300"
                        />
                        <input
                            type="text"
                            placeholder="Customer Mobile Number"
                            value={newReceiver.address}
                            name={"address"}
                            onChange={(e) =>
                                setNewReceiver({ ...newReceiver, [e.target.name]: e.target.value})}
                            className="border p-2 w-full mb-4 bg-gray-300"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowPopup(false)}
                                className="px-3 py-1 border rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddReceiver}
                                className="px-3 py-1 bg-[#071952] text-white rounded"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
