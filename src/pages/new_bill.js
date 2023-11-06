import Navbar from "../comonant/navbar.js";
import {New_bill_body} from "../comonant/new_bill_body";


function New_bill(){
    return(
        <>
            <Navbar/>
            <New_bill_body></New_bill_body>
        </>
    )
}

export {New_bill};