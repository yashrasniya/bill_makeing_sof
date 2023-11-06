import Navbar from "../comonant/navbar.js";
import Companys_head from "../comonant/Companys_head.js";
import Companys_table from "../comonant/companys_table.js";


function Companys(){
    return(
        <>
            <Navbar/>
            <Companys_head></Companys_head>
            <Companys_table></Companys_table>

        </>
    )
}

export {Companys};