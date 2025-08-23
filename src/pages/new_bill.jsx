import Navbar from "../comonant/navbar.jsx";
import {useParams} from "react-router-dom";
import {NewBillBody} from "@/comonant/new_bill_body";


function NewBill(){
    const { invoice_id } = useParams();

    return(
        <>
            <Navbar/>
            <NewBillBody id={invoice_id}></NewBillBody>
        </>
    )
}

export {NewBill};