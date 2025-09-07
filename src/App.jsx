import './App.css';
import './style/root.css';
import { Login} from './pages/login.jsx';
import { Home } from './pages/home.jsx';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { CompanyS } from "./pages/company's.jsx";
import { NewBill } from "./pages/new_bill";
import { useEffect } from "react";
import { clientToken } from "./axios.js";
import Loader from './Loader';
import ThanksPage from "./pages/thanks_page";
import Bill_list from "./pages/bill_list";
import TemplateDesign from "./pages/template_design";
import Navbar from "./comonant/navbar";
import SignUp from "@/pages/signup";
import CompanyForm from "@/pages/CompanyForm";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser, logoutUser } from "./store/userSlice";
import Profile from "./pages/profile";
import InvoiceTemplateEditor from "@/pages/InvoiceTemplateEditor";
import TablePage from "@/pages/templates_list";
import TemplatesList from "@/pages/templates_list";

// Private route wrapper


function App() {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { isLogin, status, userInfo } = useSelector((state) => state.user);
    const loading = status === 'loading' || status === 'idle';

    // Logout handler
    const LogOut = () => {
        clientToken.get('log_out/')
            .finally(() => {
                dispatch(logoutUser());
                navigate('/');
            });
    };

    // Fetch user on initial load if not already fetched
    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchUser());
        }
    }, [status, dispatch]);

    // Handle navigation after user data is fetched
    useEffect(() => {
        if (status === 'succeeded') {
            if (userInfo.is_company_varified) {
                if (location.pathname === '/') {
                    navigate('/home', { replace: true });
                }
            } else {
                if (location.pathname !== '/CompanyForm') {
                    navigate('/CompanyForm', { replace: true });
                }
            }
        } else if (status === 'failed') {
            if (location.pathname !== '/' && location.pathname !== '/SignUp') {
                navigate('/', { replace: true });
            }
        }
    }, [status, isLogin, userInfo, location.pathname, navigate]);

    if (loading) {
        return <Loader />;
    }
    function PrivateRoute({ children, isLogin }) {
        return isLogin ? children : <Login />;
    }
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={isLogin ? <Navigate to="/home" replace /> : <Login  />} />
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
                path="/Customers"
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
                path="/invoice_editor"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <InvoiceTemplateEditor />
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
            /><Route
                path="/CompanyForm"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <CompanyForm />
                    </PrivateRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <Profile />
                    </PrivateRoute>
                }
            />
            <Route
                path="/templates"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <TemplatesList />
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
