import React, {useEffect, useState} from "react";
import {clientToken} from "@/axios";
import {useNavigate} from "react-router-dom";
import {useDispatch, useSelector} from "react-redux";
import {fetchUser} from "@/store/userSlice";

const fields = [
    { label: "Company Name", name: "company_name", type: "text" },
    { label: "Company Address", name: "company_address", type: "text" },
    { label: "GST Number", name: "company_gst_number", type: "text" },
    { label: "State", name: "state", type: "text" },
    { label: "State Code", name: "state_code", type: "number" },
    { label: "Company Email", name: "company_email_id", type: "email" },
    { label: "Company Logo", name: "company_logo", type: "file" },
    { label: "Bank Name", name: "bank_name", type: "text" },
    { label: "Account Number", name: "account_number", type: "text" },
    { label: "Branch", name: "branch", type: "text" },
    { label: "IFSC Code", name: "ifsc_code", type: "text" },
];

export default function CompanyForm() {
    const [formData, setFormData] = useState({});
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLogin, status, userInfo } = useSelector((state) => state.user);

    useEffect(() => {
        if(userInfo?.is_company_varified && userInfo.is_company_admin){
            clientToken.get('user-companies/',).then((response)=>{
                if(response.status===200){
                    console.log(response.data);
                    setFormData(response.data)
                }
            })
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, files, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === "file" ? files[0] : value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const data = new FormData();
        Object.keys(formData).forEach((key) => {
            if (formData[key]){
                data.append(key, formData[key]);
            }
        });

        clientToken.post('user-companies/', data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        })
            .then((response) => {
                if (response.status === 201) {
                    console.log("Created:", response.data);
                    dispatch(fetchUser());
                    navigate('/home', { replace: true });
                }
            })
            .catch((error) => {
                console.error("Error:", error.response?.data || error.message);
            });
    };


    return (
        <div className={'pt-20 md:px-30'}>
        <div className="max-w-3xl md:max-w-full  mx-auto p-6 bg-[#35A29F] shadow-lg rounded-2xl ">
            <h2 className="text-2xl font-bold mb-6 text-[#071952] text-center">Company Details</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                    <div key={field.name} className="flex flex-col">
                        <label className="text-gray-700 font-medium mb-1 flex items-center gap-2">
                            <span>{field.label}</span>
                            {field.type === "file" && formData[field.name] && (
                                <a
                                    href={
                                        typeof formData[field.name] === "string"
                                            ? formData[field.name]
                                            : URL.createObjectURL(formData[field.name]) // for File objects
                                    }
                                    className="text-blue-700 underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {typeof formData[field.name] === "string"
                                        ? formData[field.name].split("/").pop()
                                        : formData[field.name].name}  {/* for File object, show original name */}
                                </a>
                            )}
                        </label>

                        <input
                            type={field.type}
                            name={field.name}
                            {...(field.type !== "file" ? { value: formData[field.name] || "" } : {})}
                            onChange={handleChange}
                            className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                        />
                    </div>
                ))}

            </form>
            <div className={'w-full flex justify-center md:justify-end'}>
                <button
                    type="submit"
                    onClick={handleSubmit}
                    className="mt-4 bg-[#071952] text-white py-2 px-4 rounded-xl hover:bg-blue-700 transition"
                >
                    Save Details
                </button>
            </div>

        </div>
        </div>
    );
}
