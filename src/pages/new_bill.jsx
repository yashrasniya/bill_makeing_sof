import Navbar from "../comonant/navbar.jsx";
import { useParams } from "react-router-dom";
import { NewBillBody } from "@/comonant/new_bill_body";


function NewBill() {
    const { invoice_id } = useParams();

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <Navbar />
            <NewBillBody id={invoice_id} />
        </div>
    );
}

export { NewBill };