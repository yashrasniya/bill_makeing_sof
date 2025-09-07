import React, {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import {clientToken} from "@/axios";

const TemplateData = [
  { id: 1, name: "Alice", user: "alice01", company: "Acme Inc." },
  { id: 2, name: "Bob",   user: "bob02",   company: "Globex" },
  { id: 3, name: "Eve",   user: "eve03",   company: "Umbrella" },
];

export default function TemplatesList() {
  const [TemplateData, setTemplateData] = useState([])
  const navigate = useNavigate();
  useEffect(() => {
    clientToken.get('yaml/list/').then((response) => {
      if (response.status===200){
        setTemplateData(response.data)
      }
    })
  }, []);

  return (
    <div className="p-6 container ">

      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2 text-left">Name</th>
            <th className="border px-4 py-2 text-left">User</th>
            <th className="border px-4 py-2 text-left">Company</th>
          </tr>
        </thead>
        <tbody>
          {TemplateData.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-blue-100 cursor-pointer"
              onClick={() => navigate(`/invoice_editor?${row.id}`)}
            >
              <td className="border px-4 py-2">{row?.template_name}</td>
              <td className="border px-4 py-2">{row.user}</td>
              <td className="border px-4 py-2">{row.company}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
