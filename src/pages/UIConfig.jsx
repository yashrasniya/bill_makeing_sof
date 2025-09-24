import React, { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import {useSelector} from "react-redux";
const temp_ui_config = {
    formula:"",
    input_title:'',
    is_calculable:false,
    is_show:false,
    size:3.0,
}
const UIConfig = () => {
    const [selected, setSelected] = useState(null);
    const [formData, setFormData] = useState({});
    const [products, setProducts] = useState([]);
    const { userInfo } = useSelector((state) => state.user);


    const handleSelect = (product) => {
        setSelected(product.id);
        setFormData(product);
    };

    useEffect(() => {
        clientToken.get("new/product/in/frontend/").then((response) => {
            setProducts(response.data);
        });
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };
    const validation = () => {
        if (!formData.input_title){
            alert("Please enter title")
            return ''
        }
        if (!formData.size){
            alert("Please enter size")
            return ''
        }
        return true
    }
    const handleSave = () => {
        if (!validation()){
            return ''
        }
        clientToken
            .post(`new/product/in/frontend/${formData.id}/update/`, formData)
            .then((response) => {
                alert("Saved: " + response.data.input_title);
                setProducts(
                    products.map((p) => (p.id === formData.id ? response.data : p))
                );
            });
    };

    const handleCreate = () => {
        if (!validation()){
            return ''
        }
        clientToken
            .post(`new/product/in/frontend/`, formData)
            .then((response) => {
                alert("Created: " + response.data.input_title);
                setProducts([...products, response.data]);
            });
    };

    const handleDelete = () => {

        clientToken
            .delete(`new/product/in/frontend/${formData.id}/update/`, formData)
            .then((response) => {
                if (response.status === 204) {
                    setProducts(products.filter((p) => p.id !== formData.id));
                    setSelected(null);
                    setFormData({});
                }
            });
    };

    return (
        <div className={'pt-7 md:px-30'}>
            <div>
                <h2 className="font-semibold mb-4 text-center text-3xl text-[#071952]">Ui Config</h2>
                <div className={'flex justify-end px-4 md:justify-end mb-4'}>
                    <button
                        onClick={() => {
                            setFormData(temp_ui_config)
                            setSelected('' + Math.random().toString(36).substr(2, 9))
                        }
                        }
                        className="bg-[#071952] text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        + Ui Config
                    </button>
                </div>
            </div>
<div className="flex flex-col md:flex-row gap-6 px-4 md-px-6 h-auto md:h-screen">
    {/* Left side table */}

    <div className="w-full md:w-1/3 border rounded-lg shadow-md overflow-x-auto">

        <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
            <tr className="hover:bg-gray-50">
                <th className="p-2 border text-center font-bold text-lg">Title </th>
            </tr>
            </thead>
            <tbody>
            {products.map((p) => (
                <tr
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`cursor-pointer hover:bg-gray-50 text-center ${
                        selected === p.id ? "bg-blue-50" : ""
                    }`}
                >
                    <td className="p-2 border">{p.input_title}</td>
                </tr>
            ))}
            </tbody>
        </table>
    </div>

    {/* Right side edit form */}
    <div className="w-full md:w-1/3 border bg-gray-50 rounded-lg shadow-md p-4">
        {selected ? (
            <>
                <h2 className="text-lg font-semibold mb-4">{formData.id ?'Edit':'New'} Ui Config</h2>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm">Title</label>
                        <input
                            type="text"
                            name="input_title"
                            value={formData.input_title || ""}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm">Size</label>
                        <input
                            type="number"
                            step="0.01"
                            name="size"
                            value={formData.size || ""}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="is_show"
                                checked={formData.is_show || false}
                                onChange={handleChange}
                            />
                            Show in frontend
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="is_calculable"
                                checked={formData.is_calculable || false}
                                onChange={handleChange}
                            />
                            Is calculable
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm">Formula</label>
                        <input
                            type="text"
                            name="formula"
                            value={formData.formula || ""}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-around gap-2">
                        <button
                            onClick={formData.id?handleSave:handleCreate}
                            className="bg-[#071952] text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Save
                        </button>
                        {userInfo.is_staff && <button
                            onClick={handleDelete}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            Delete
                        </button> }

                    </div>
                </div>
            </>
        ) : (
            <p className="text-gray-500">Select a row from the table to edit</p>
        )}
    </div>
</div>

        </div>
    );
};

export default UIConfig;
