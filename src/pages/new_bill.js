import Navbar from "../comonant/navbar.js";
import {NewBillBody} from "../comonant/new_bill_body";
import {useParams} from "react-router-dom";


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