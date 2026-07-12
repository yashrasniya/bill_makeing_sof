import Navbar from "../comonant/navbar.jsx";
import { Navigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { NewBillBody } from "@/comonant/new_bill_body";


function NewBill() {
    const { invoice_id } = useParams();
    const { permissions, status: accessStatus } = useSelector((s) => s.access);

    // Editing an existing invoice requires invoice.update; creating a new
    // one requires invoice.create. Without it, fall back to the view page.
    if (accessStatus === "succeeded") {
        if (invoice_id && !permissions.includes("invoice.update")) {
            return <Navigate to={`/invoice/${invoice_id}/view`} replace />;
        }
        if (!invoice_id && !permissions.includes("invoice.create")) {
            return <Navigate to="/bill_list" replace />;
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <Navbar />
            <NewBillBody id={invoice_id} />
        </div>
    );
}

export { NewBill };
