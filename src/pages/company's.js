import Navbar from "../comonant/navbar.js";
import CompanysHead from "../comonant/CompanysHead.js";
import CompanysTable from "../comonant/companys_table.js";


function Companys(){
    return(
        <>
            <Navbar/>
            <CompanysTable></CompanysTable>

        </>
    )
}

export {Companys};