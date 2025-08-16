// import Navbar from '../comonant/navbar.jsx'
import Navbar from "../comonant/navbar.jsx";
import Boxes from "../comonant/boxs.jsx";
import History from "../comonant/history";
import {useState} from "react";

function Home(){

    const [filters, setFilters] = useState({page:1})
    return(
        <>
        <Navbar/>
        <Boxes/>
        <History  filters={filters}></History>
        </>
    )
}

export {Home};