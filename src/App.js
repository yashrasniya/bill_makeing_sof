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
import ThanksPage from "./pages/thanks_page";


function App() {
    const location = useLocation();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Logout handler
    const LogOut = () => {
        clientToken.get('log_out/')
            .then(() => {
                setIsLogin(false);
                navigate('/');
            })
            .catch(() => {
                setIsLogin(false);
                navigate('/');
            });
    };

    // Check profile and redirect if logged in
    useEffect(() => {
        clientToken.get('profile/')
            .then((response) => {
                if (response.status === 200) {
                    setIsLogin(true);

                    // Redirect to /home if at base path
                    const currentPath = window.location.pathname;
                    if (currentPath === '/') {
                        navigate('/home');
                    }
                }
            })
            .catch((error) => {
                if (error?.request?.status === 401) {
                    console.log('Unauthorized');
                } else {
                    console.error(error);
                    alert(`Error ${error?.request?.status}`);
                }
            })
            .finally(() => {
                setLoading(false); // Stop loading regardless of outcome
            });
    }, [location]);
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
                    <Route path='/thanks-page' element={<ThanksPage/>}></Route>
                </Routes>

        </>
    );
}

export default App;
