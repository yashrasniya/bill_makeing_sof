import './App.css';
import './style/root.css';
import { Login, SignUp } from './pages/login.jsx';
import { Home } from './pages/home.jsx';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { CompanyS } from "./pages/company's";
import { NewBill } from "./pages/new_bill";
import { useEffect, useState } from "react";
import { clientToken } from "./axios.js";
import Loader from './Loader';
import ThanksPage from "./pages/thanks_page";
import Bill_list from "./pages/bill_list";
import TemplateDesign from "./pages/template_design";
import Navbar from "./comonant/navbar";

// Private route wrapper


function App() {
    const location = useLocation();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
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

    // Check login status on page load / route change
    useEffect(() => {
        clientToken.get('profile/')
            .then((response) => {
                if (response.status === 200) {
                    setIsLogin(true);
                    if (location.pathname === '/') {
                        navigate('/home', { replace: true });
                    }
                }
            })
            .catch((error) => {
                setIsLogin(false);
                if (location.pathname !== '/' && location.pathname !== '/SignUp') {
                    navigate('/', { replace: true });
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [location]);

    if (loading) {
        return <Loader />;
    }
    function PrivateRoute({ children, isLogin }) {
        return isLogin ? children : <Login setLoading={setLoading} />;
    }
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={isLogin ? <Navigate to="/home" replace /> : <Login setLoading={setLoading} />} />
            <Route path="/SignUp" element={<SignUp />} />

            {/* Private routes */}
            <Route
                path="/home"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Home />
                    </PrivateRoute>
                }
            />
            <Route
                path="/bill_list"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <Bill_list  />
                    </PrivateRoute>
                }
            />
            <Route
                path="/companys"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <CompanyS />
                    </PrivateRoute>
                }
            />
            <Route
                path="/newbill"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <NewBill />
                    </PrivateRoute>
                }
            />
            <Route
                path="/bill/:invoice_id"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <NewBill />
                    </PrivateRoute>
                }
            />
            <Route
                path="/yaml"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <TemplateDesign />
                    </PrivateRoute>
                }
            />
            <Route
                path="/thanks-page"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <ThanksPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/logout"
                element={<LogOut />}
            />
        </Routes>
    );
}

export default App;
