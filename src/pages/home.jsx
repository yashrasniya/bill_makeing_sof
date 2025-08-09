// import Navbar from '../comonant/navbar.jsx'
import Navbar from "../comonant/navbar.jsx";
import Boxes from "../comonant/boxs.jsx";
import History from "../comonant/history";

function Home({setLoading}){
    return(
        <>
        <Navbar/>
        <Boxes/>
        <History setLoading={setLoading}></History>
        </>
    )
}

export {Home};