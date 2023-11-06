import Navbar from "../comonant/navbar.js";
import {NewBillBody} from "../comonant/new_bill_body";


function NewBill(){
    return(
        <>
            <Navbar/>
            <NewBillBody></NewBillBody>
        </>
    )
}

export {NewBill};