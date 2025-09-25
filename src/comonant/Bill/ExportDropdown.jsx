import { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import SendPopup from "@/comonant/Bill/SendPopup";

const ExportDropdown = ({ InvoiceData, handelExport }) => {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false); // loading state
  const [showPopup, setShowPopup] = useState(false); // popup state

  useEffect(() => {
    setLoading(true);
    clientToken.get("yaml/list/?only_my=true")
        .then((response) => {
          if (response.status === 200) {
            setTemplates(response.data);
          }
        })
        .catch((e) => console.log(e))
        .finally(() => setLoading(false));
  }, []);

  const handelWhatsapp = async (option) => {
    try {
      setLoading(true); // start loading
      const r = await clientToken.post("share_by_whatsapp/", { invoice: InvoiceData?.id,template_id:option });
      if (r.status === 201) {
        alert("✅ Message has been sent to WhatsApp");
      }
    } catch (e) {
      console.log(e);
      if (e.response?.status === 400) {
        alert(e.response?.data?.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = async (option, id = null) => {
    if (!InvoiceData?.receiver) {
      alert("Receiver is not set");
      return;
    }

    switch (option) {
      case "whatsapp":
        setShowPopup(true); // show the WhatsApp popup
        break;

      case "email":
        alert("Sharing via Email...");
        break;

      case "pdf":
        setLoading(true);
        try {
          await handelExport(InvoiceData?.id, id);
        } finally {
          setLoading(false);
        }
        break;

      default:
        break;
    }

    setOpen(false);
  };

  const handleSendPopup = async (option) => {

      await handelWhatsapp(option);

    setShowPopup(false);
  };

  return (
      <div className="relative inline-block">
        {/* Main Button */}
        <div
            className="button cursor-pointer select-none flex items-center"
            onClick={() => setOpen(!open)}
        >
          {loading ? (
              <>
                <svg
                    className="animate-spin h-5 w-5 mr-2 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                  <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                  ></circle>
                  <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                Loading...
              </>
          ) : (
              "Export ▼"
          )}
        </div>

        {/* Dropdown Menu */}
        {open && !loading && (
            <div className="absolute mt-2 -left-20 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => templates.length>1?handleOptionClick("whatsapp"):handelWhatsapp(templates[0]?.id)}
              >
                Share by WhatsApp
              </div>
              <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleOptionClick("email")}
              >
                Share by Email
              </div>
              {templates.map((e, idx) => (
                  <div
                      key={idx}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleOptionClick("pdf", e?.id)}
                  >
                    Download By {e?.template_name}
                  </div>
              ))}
            </div>
        )}

        {/* WhatsApp Popup */}
        {showPopup && (
            <SendPopup
                options={templates}
                onClose={() => setShowPopup(false)}
                onSend={handleSendPopup}
            />
        )}
      </div>
  );
};

export default ExportDropdown;
