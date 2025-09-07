import {useEffect, useState} from "react";
import {clientToken} from "@/axios";

const ExportDropdown = ({ InvoiceData, handelExport }) => {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    clientToken.get('yaml/list/?only_my=true').then((response) => {
      if (response.status===200){
        setTemplates(response.data)
      }
    })
  }, []);
const handelWhatsapp = (id) => {
  clientToken.post('share_by_whatsapp/',{invoice:InvoiceData?.id}).then((r)=>{
    if (r.status===201){
      alert("message has beed send to whatsapp")
    }
  }).catch((e)=>{
    console.log(e)
    if(e.responce.status===400){
      alert(e.responce?.data?.error)
    }
  })
}
  const handleOptionClick = (option,id=null) => {
    if (!InvoiceData["receiver"]) {
      alert("Receiver is not set");
      return;
    }

    switch (option) {
      case "whatsapp":
        handelWhatsapp(id)
        // 👉 Add your WhatsApp share logic here
        break;

      case "email":
        alert("Sharing via Email...");
        // 👉 Add your Email share logic here
        break;

      case "pdf":
        handelExport(InvoiceData?.id,id);
        break;

      default:
        break;
    }

    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* Main Button */}
      <div
        className="button cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        Export ▼
      </div>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute mt-2 -left-20 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
          {/*<div*/}
          {/*  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"*/}
          {/*  onClick={() => handleOptionClick("whatsapp")}*/}
          {/*>*/}
          {/*  Share by WhatsApp*/}
          {/*</div>*/}
          {/*<div*/}
          {/*  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"*/}
          {/*  onClick={() => handleOptionClick("email")}*/}
          {/*>*/}
          {/*  Share by Email*/}
          {/*</div>*/}
          {templates.map((e)=> <div
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleOptionClick("pdf",e?.id)}
          >
            Download By {e?.template_name}
          </div>)}

        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
