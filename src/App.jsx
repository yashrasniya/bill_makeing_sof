import './App.css';
import './style/root.css';
import { Login } from './pages/login.jsx';
import { Home } from './pages/home.jsx';
import { LandingPage } from './pages/landing.jsx';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { CompanyS } from "./pages/company's.jsx";
import { NewBill } from "./pages/new_bill";
import { useEffect, useRef } from "react";
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
import { fetchAccess, clearAccess } from "./store/accessSlice";
import AccessControl from "@/pages/AccessControl";
import PlatformAdmin from "@/pages/PlatformAdmin";
import InviteAccept from "@/pages/InviteAccept";
import InvoiceViewPage from "@/pages/InvoiceViewPage";
import Profile from "./pages/profile";
import InvoiceTemplateEditor from "@/pages/InvoiceTemplateEditor";
import TablePage from "@/pages/templates_list";
import TemplatesList from "@/pages/templates_list";
import UIConfig from "@/pages/UIConfig";
import InventoryPage from "./pages/inventory";
import AvailableTemplates from "./pages/AvailableTemplates";
import PrivacyPolicy from "./pages/privacy";
import WeasyprintPreview from "./pages/WeasyprintPreview";
import PurchaseInvoices from "./pages/PurchaseInvoices";
import Vendors from "./pages/Vendors";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import WhatsAppTemplates from "./pages/WhatsAppTemplates";
import WhatsAppConnect from "./pages/WhatsAppConnect";
import Reports from "./pages/reports";
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
                dispatch(clearAccess());
                navigate('/');
            });
    };

    // Fetch user on initial load if not already fetched
    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchUser());
        }
    }, [status, dispatch]);

    // Fetch tenant access context (permissions / features / admin flags)
    useEffect(() => {
        if (status === 'succeeded') {
            dispatch(fetchAccess());
        }
    }, [status, dispatch]);

    // Keep access context fresh: permission grants made by an admin while
    // the app is open take effect on the next route change or window focus
    // (throttled to once per 30s) instead of requiring a full re-login.
    const lastAccessFetch = useRef(Date.now());
    useEffect(() => {
        const refresh = () => {
            if (status === 'succeeded' && Date.now() - lastAccessFetch.current > 30000) {
                lastAccessFetch.current = Date.now();
                dispatch(fetchAccess());
            }
        };
        refresh(); // on route change
        window.addEventListener('focus', refresh);
        return () => window.removeEventListener('focus', refresh);
    }, [location.pathname, status, dispatch]);

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
            if (location.pathname !== '/' && location.pathname !== '/SignUp' && location.pathname !== '/login' && location.pathname !== '/privacy' && !location.pathname.startsWith('/invite/')) {
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
    // Blocks routes whose plan feature is missing (backend enforces too).
    function RequireFeature({ feature, children }) {
        const { features, status: accessStatus } = useSelector((s) => s.access);
        if (accessStatus === 'succeeded' && !features.includes(feature)) {
            return <Navigate to="/home" replace />;
        }
        return children;
    }
    // Blocks routes the user has no permission for (backend enforces too).
    function RequirePermission({ permission, children }) {
        const { permissions, status: accessStatus } = useSelector((s) => s.access);
        if (accessStatus === 'succeeded' && !permissions.includes(permission)) {
            return <Navigate to="/home" replace />;
        }
        return children;
    }
    // Company profile: open during onboarding (no verified company yet),
    // admin-only once the company exists.
    function RequireCompanyAdminOrOnboarding({ children }) {
        const { isTenantAdmin, status: accessStatus } = useSelector((s) => s.access);
        const onboarding = !userInfo?.is_company_varified;
        if (!onboarding && accessStatus === 'succeeded' &&
            !isTenantAdmin && !userInfo?.is_company_admin) {
            return <Navigate to="/home" replace />;
        }
        return children;
    }
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={isLogin ? <Navigate to="/home" replace /> : <LandingPage />} />
            <Route path="/login" element={isLogin ? <Navigate to="/home" replace /> : <Login />} />
            <Route path="/SignUp" element={<SignUp />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/invite/:token" element={<InviteAccept />} />

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
                        <RequirePermission permission="invoice.view">
                            <Navbar />
                            <Bill_list />
                        </RequirePermission>
                    </PrivateRoute>
                }
            />
            <Route
                path="/Customers"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequirePermission permission="customer.manage">
                            <CompanyS />
                        </RequirePermission>
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
                path="/invoice/:invoice_id/view"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <InvoiceViewPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/invoice_editor"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="template_designer">
                            <RequirePermission permission="template.manage">
                                <Navbar />
                                <InvoiceTemplateEditor />
                            </RequirePermission>
                        </RequireFeature>
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
                        <RequireCompanyAdminOrOnboarding>
                            <CompanyForm />
                        </RequireCompanyAdminOrOnboarding>
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
                path="/access-control"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <AccessControl />
                    </PrivateRoute>
                }
            />
            <Route
                path="/platform-admin"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <Navbar />
                        <PlatformAdmin />
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
                path="/UIConfig"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="template_designer">
                            <Navbar />
                            <UIConfig />
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/inventory"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="inventory">
                            <RequirePermission permission="inventory.manage">
                                <InventoryPage />
                            </RequirePermission>
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/available-templates"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="template_designer">
                            <RequirePermission permission="template.manage">
                                <AvailableTemplates />
                            </RequirePermission>
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/weasyprint-preview"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="template_designer">
                            <RequirePermission permission="template.manage">
                                <Navbar />
                                <WeasyprintPreview />
                            </RequirePermission>
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/whatsapp-settings"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="whatsapp_integration">
                            <WhatsAppSettings />
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/whatsapp-connect"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="whatsapp_integration">
                            <WhatsAppConnect />
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/whatsapp-templates"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="whatsapp_integration">
                            <WhatsAppTemplates />
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/cashflow"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequireFeature feature="advanced_reports">
                            <RequirePermission permission="report.view">
                                <Reports />
                            </RequirePermission>
                        </RequireFeature>
                    </PrivateRoute>
                }
            />
            <Route
                path="/purchase_invoices"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequirePermission permission="invoice.view">
                            <PurchaseInvoices />
                        </RequirePermission>
                    </PrivateRoute>
                }
            />
            <Route
                path="/vendors"
                element={
                    <PrivateRoute isLogin={isLogin}>
                        <RequirePermission permission="vendor.manage">
                            <Vendors />
                        </RequirePermission>
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
