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
    Menu
} from "lucide-react";

function Navbar() {
    const { userInfo } = useSelector((state) => state.user);
    const navigate = useNavigate();
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(true);
    const [openMenus, setOpenMenus] = useState({ "Reports": false, "Purchases": false });

    const toggleMenu = (title) => {
        if (!isExpanded) setIsExpanded(true); // Auto expand sidebar if opening a submenu while collapsed
        setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
    };

    useEffect(() => {
        document.body.style.marginLeft = isExpanded ? '250px' : '70px';
        document.body.style.transition = 'margin-left 0.3s ease';
        return () => {
            document.body.style.marginLeft = '0';
        };
    }, [isExpanded]);

    let navItems = [
        { title: "Dashboard", link: "/home", icon: <LayoutDashboard size={20} /> },
        { title: "Invoices", link: "/bill_list", icon: <FileText size={20} /> },
        { title: "Customers", link: "/Customers", icon: <Users size={20} /> },
        { title: "Inventory", link: "/inventory", icon: <Package size={20} /> },
        { title: "Template Gallery", link: "/available-templates", icon: <LayoutTemplate size={20} /> },
        { 
            title: "Reports", 
            icon: <FileText size={20} />,
            subItems: [
                { title: "Cashflow", link: "/cashflow" }
            ]
        },
        { 
            title: "Purchases", 
            icon: <Package size={20} />,
            subItems: [
                { title: "Purchase Dashboard", link: "/purchase_invoices" },
                { title: "Vendors", link: "/vendors" }
            ]
        },
    ];

    if (userInfo?.is_company_admin) {
        navItems.push({ title: "My Company", link: "/CompanyForm", icon: <Building size={20} /> });
    }
    if (userInfo?.is_staff) {
        navItems.push({ title: "All Templates", link: "/templates", icon: <Files size={20} /> });
    }

    let settingsItems = [
        { title: "Profile", link: "/profile", icon: <User size={20} /> },
        { title: "UI Config", link: "/UIConfig", icon: <Settings size={20} /> },
        { title: "WA Settings", link: "/whatsapp-settings", icon: <MessageCircle size={20} /> },
        { title: "WA Connect", link: "/whatsapp-connect", icon: <LinkIcon size={20} /> },
        { title: "WA Templates", link: "/whatsapp-templates", icon: <MessageSquare size={20} /> },
        { title: "Logout", link: "/logout", icon: <LogOut size={20} color="#ef4444" />, danger: true },
    ];

    return (
        <div className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Header */}
            <div className="sidebar-header">
                <div className="brand" onClick={() => navigate("/home")}>
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
                                onClick={() => item.subItems ? toggleMenu(item.title) : navigate(item.link)}
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
                                            onClick={() => navigate(sub.link)}
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
                            onClick={() => navigate(item.link)}
                            title={!isExpanded ? item.title : ""}
                        >
                            <div className="nav-icon">{item.icon}</div>
                            {isExpanded && <span className="nav-text" style={{ color: item.danger ? '#ef4444' : 'inherit' }}>{item.title}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Navbar;
