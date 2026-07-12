import "../style/navbar.css"
import orvineLogo from "../assets/orvine_logo.svg"
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { clientToken } from "@/axios";
import {
    LayoutDashboard,
    Users,
    Package,
    LayoutTemplate,
    FileText,
    Building,
    Files,
    User,
    Settings,
    MessageCircle,
    Link as LinkIcon,
    MessageSquare,
    LogOut,
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    Menu,
    Home,
    Plus,
    ShoppingCart,
    Shield,
    CreditCard
} from "lucide-react";

function Navbar() {
    const { userInfo } = useSelector((state) => state.user);
    const { isTenantAdmin, isProductOwner, features, permissions, status: accessStatus } = useSelector((state) => state.access);

    // Plan-based feature gating and permission gating. While access info is
    // still loading we show everything to avoid a menu flash; once loaded,
    // items whose feature is not in the plan, or whose permission the user
    // lacks, are hidden.
    const hasFeature = (code) => accessStatus !== 'succeeded' || features.includes(code);
    const hasPermission = (code) => accessStatus !== 'succeeded' || permissions.includes(code);
    const itemVisible = (item) =>
        (!item.feature || hasFeature(item.feature)) &&
        (!item.permission || hasPermission(item.permission));
    const navigate = useNavigate();
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(window.innerWidth > 768);
    const [openMenus, setOpenMenus] = useState({ "Reports": false, "Purchases": false, "Templates": false });

    const toggleMenu = (title) => {
        if (!isExpanded) setIsExpanded(true); // Auto expand sidebar if opening a submenu while collapsed
        setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const handleNavigate = (path) => {
        navigate(path);
        if (window.innerWidth <= 768) {
            setIsExpanded(false);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile && isExpanded) {
                setIsExpanded(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isExpanded]);

    useEffect(() => {
        if (isMobile) {
            document.body.style.marginLeft = '0';
        } else {
            document.body.style.marginLeft = isExpanded ? '250px' : '70px';
        }
        document.body.style.transition = 'margin-left 0.3s ease';
        return () => {
            document.body.style.marginLeft = '0';
        };
    }, [isExpanded, isMobile]);

    let navItems = [
        { title: "Dashboard", link: "/home", icon: <LayoutDashboard size={20} /> },
        { title: "Invoices", link: "/bill_list", icon: <FileText size={20} />, permission: "invoice.view" },
        { title: "Customers", link: "/Customers", icon: <Users size={20} />, permission: "customer.manage" },
        { title: "Inventory", link: "/inventory", icon: <Package size={20} />, feature: "inventory", permission: "inventory.manage" },
        {
            title: "Templates",
            icon: <LayoutTemplate size={20} />,
            permission: "template.manage",
            subItems: [
                { title: "My Invoice Templates", link: "/available-templates", feature: "template_designer" },
                { title: "UI Config", link: "/UIConfig" }
            ]
        },
        {
            title: "Reports",
            icon: <FileText size={20} />,
            feature: "advanced_reports",
            permission: "report.view",
            subItems: [
                { title: "Cashflow", link: "/cashflow" }
            ]
        },
        {
            title: "Purchases",
            icon: <Package size={20} />,
            subItems: [
                { title: "Purchase Dashboard", link: "/purchase_invoices", permission: "invoice.view" },
                { title: "Vendors", link: "/vendors", permission: "vendor.manage" }
            ]
        },
    ];
    navItems = navItems
        .filter(itemVisible)
        .map(item => item.subItems
            ? { ...item, subItems: item.subItems.filter(itemVisible) }
            : item)
        .filter(item => !item.subItems || item.subItems.length > 0);

    if (userInfo?.is_company_admin) {
        navItems.push({ title: "My Company", link: "/CompanyForm", icon: <Building size={20} /> });
    }
    if (userInfo?.is_staff) {
        navItems.push({ title: "All Templates", link: "/templates", icon: <Files size={20} /> });
    }
    if (isTenantAdmin || userInfo?.is_company_admin) {
        navItems.push({ title: "Access Control", link: "/access-control", icon: <Shield size={20} /> });
    }
    if (isProductOwner) {
        navItems.push({ title: "Platform Admin", link: "/platform-admin", icon: <CreditCard size={20} /> });
    }

    let settingsItems = [
        { title: "Profile", link: "/profile", icon: <User size={20} /> },
        { title: "WA Settings", link: "/whatsapp-settings", icon: <MessageCircle size={20} />, feature: "whatsapp_integration" },
        { title: "WA Connect", link: "/whatsapp-connect", icon: <LinkIcon size={20} />, feature: "whatsapp_integration" },
        { title: "WA Templates", link: "/whatsapp-templates", icon: <MessageSquare size={20} />, feature: "whatsapp_integration" },
        { title: "Logout", link: "/logout", icon: <LogOut size={20} color="#ef4444" />, danger: true },
    ];
    settingsItems = settingsItems.filter(itemVisible);

    return (
        <>
            {isMobile && !isExpanded && (
                <div className="mobile-bottom-bar">
                    <button className="bottom-nav-item" onClick={() => handleNavigate("/home")}>
                        <Home size={22} />
                        <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>Home</span>
                    </button>
                    <button className="bottom-nav-item" onClick={() => handleNavigate("/purchase_invoices")}>
                        <ShoppingCart size={22} />
                        <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>Purchases</span>
                    </button>
                    <div className="fab-wrapper">
                        <button className="fab-button" onClick={() => handleNavigate("/newBill")}>
                            <Plus size={28} />
                        </button>
                    </div>
                    <button className="bottom-nav-item" onClick={() => handleNavigate("/inventory")}>
                        <Package size={22} />
                        <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>Inventory</span>
                    </button>
                    <button className="bottom-nav-item" onClick={() => setIsExpanded(true)}>
                        <Menu size={22} />
                        <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>Menu</span>
                    </button>
                </div>
            )}

            {isMobile && isExpanded && (
                <div className="sidebar-overlay" onClick={() => setIsExpanded(false)}></div>
            )}

            <div className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'} ${isMobile ? 'mobile' : ''}`}>
            {/* Header */}
            <div className="sidebar-header">
                <div className="brand" onClick={() => handleNavigate("/home")}>
                    <div className="logo-icon">
                        <img src={orvineLogo} alt="Orvine Logo" />
                    </div>
                    {isExpanded && <span className="brand-text">Invoice Orvine</span>}
                </div>
                <button className="toggle-btn" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Navigation Items */}
            <div className="sidebar-content">
                <div className="nav-section">
                    {isExpanded && <p className="section-title">Main Menu</p>}
                    {navItems.map((item, i) => (
                        <div key={i}>
                            <div
                                className={`nav-item ${!item.subItems && location.pathname === item.link ? 'active' : ''}`}
                                onClick={() => item.subItems ? toggleMenu(item.title) : handleNavigate(item.link)}
                                title={!isExpanded ? item.title : ""}
                            >
                                <div className="nav-icon">{item.icon}</div>
                                {isExpanded && <span className="nav-text">{item.title}</span>}
                                {isExpanded && item.subItems && (
                                    <div style={{ marginLeft: 'auto', color: '#64748b' }}>
                                        {openMenus[item.title] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                )}
                            </div>
                            
                            {/* Render sub items if expanded and menu is open */}
                            {isExpanded && item.subItems && openMenus[item.title] && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '38px', marginTop: '4px', marginBottom: '8px' }}>
                                    {item.subItems.map((sub, j) => (
                                        <div 
                                            key={j}
                                            onClick={() => handleNavigate(sub.link)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                                fontSize: '13px', color: location.pathname === sub.link ? '#4f46e5' : '#64748b',
                                                background: location.pathname === sub.link ? '#eef2ff' : 'transparent',
                                                fontWeight: location.pathname === sub.link ? '600' : '500',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { if (location.pathname !== sub.link) { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f8fafc'; } }}
                                            onMouseLeave={e => { if (location.pathname !== sub.link) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; } }}
                                        >
                                            {sub.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="nav-section mt-auto">
                    {isExpanded && <p className="section-title">Settings</p>}
                    {settingsItems.map((item, i) => (
                        <div
                            key={i}
                            className={`nav-item ${item.danger ? 'danger' : ''} ${location.pathname === item.link ? 'active' : ''}`}
                            onClick={() => handleNavigate(item.link)}
                            title={!isExpanded ? item.title : ""}
                        >
                            <div className="nav-icon">{item.icon}</div>
                            {isExpanded && <span className="nav-text" style={{ color: item.danger ? '#ef4444' : 'inherit' }}>{item.title}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </>
    );
}

export default Navbar;
