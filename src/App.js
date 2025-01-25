import './App.css';
import './style/root.css';
import {Login, SignUp} from './pages/login.js';
import {Home} from './pages/home.js';
import {BrowserRouter, Routes, Route, useNavigate, useLocation} from "react-router-dom";
import {Companys} from "./pages/company's";
import {NewBill} from "./pages/new_bill";
import {useEffect, useState, Suspense} from "react";
import YAMLEditor from "./pages/ymal_edit";
import {clientToken} from "./axios";
import Loader from './Loader';


function App() {
    const location_path = useLocation()
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(false);
    const [loading, setLoading] = useState(true); // State to track loading


    const LogOut = () => {
        const navigate = useNavigate();

        useEffect(() => {
            clientToken.get('log_out/').then((r) => {
                navigate('/')
                setIsLogin(false)
            }).catch((e) => {
                navigate('/')
                setIsLogin(false)
            })


        }, []);


    }


    useEffect(() => {

        clientToken.get('profile/',).then((response) => {
            if (response.status === 200) {
                setIsLogin(true);
                if (window.location.href.split('//')[1].split('/')[1] === '') {
                    setLoading(true)
                    navigate('/home')
                }

            }
        }).catch((error) => {
            console.log(error.request.status)
            if (error.request.status === 401) {
                // window.location.href=window.location.href.split('//')[0]+window.location.href.split('//')[1].split('/')[0]
            } else {
                console.log(error)
                alert(`error ${error.request.status}`)
            }


        })


    }, [location_path]);
    useEffect(() => {
        // Simulate async operation (e.g., checking login status or fetching data)
        setTimeout(() => {
            setLoading(false); // Once data is loaded, set loading to false
        }, 2000); // Simulating a delay of 2 seconds for loading
    }, [isLogin]);
    return (<>
            <Loader loading={loading} />
                <Routes>

                    <Route path='/' element={isLogin ? <Home/> : <Login setLoading={setLoading}/>}></Route>
                    <Route path='/SignUp' element={<SignUp/>}></Route>
                    <Route path='/home' element={<Home/>}></Route>
                    <Route path='/companys' element={<Companys/>}></Route>
                    <Route path='/newbill' element={<NewBill/>}></Route>
                    <Route path='/bill/:invoice_id' element={<NewBill/>}></Route>
                    <Route path='/logout' element={<LogOut/>}></Route>
                    <Route path='/yaml' element={<YAMLEditor/>}></Route>
                </Routes>

        </>
    );
}

export default App;
