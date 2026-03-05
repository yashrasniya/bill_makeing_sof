import "../style/navbar.css"
import logo from "../assets/bill_ninja_logo.png"
import profle from "../assets/user.jpg"
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { clientToken } from "@/axios";

function NavDropdown({ navItems, navItemsDropdown, dropdownOpen, setDropdownOpen }) {
    const [openSub, setOpenSub] = useState(null); // id/index of open submenu
    const navigate = useNavigate();

    const handleParentClick = (idx, link, hasChildren) => {
        console.log(hasChildren)
        if (hasChildren) {
            // toggle submenu
            setOpenSub(openSub === idx ? null : idx);
        } else {
            navigate(link);
            setDropdownOpen(false);
            setOpenSub(null);
        }
    };

    return (
        dropdownOpen && (
            <div className="items-raper">
                <div className="items-responsive">
                    {/* MAIN NAV */}
                    {navItems.map((obj, i) => {
                        const hasChildren =
                            Array.isArray(obj.children) && obj.children.length > 0;

                        return (
                            <div key={`main-${i}`} className="text-raper md:!hidden">
                                {/* Parent row */}
                                <div
                                    className="flex justify-between items-center cursor-pointer"
                                    onClick={() => handleParentClick(`main-${i}`, obj.link, hasChildren)}
                                >
                                    <p>{obj.title}</p>
                                    {hasChildren && (
                                        <span>{openSub === `main-${i}` ? "▲" : "▼"}</span>
                                    )}
                                </div>

                                {/* Submenu */}
                                {hasChildren && openSub === `main-${i}` && (
                                    <div className="ml-4 mt-1 border-l pl-2 space-y-1">
                                        {obj.children.map((child, cIdx) => (
                                            <div
                                                key={cIdx}
                                                className="cursor-pointer hover:text-blue-500"
                                                onClick={() => {
                                                    navigate(child.link);
                                                    setDropdownOpen(false);
                                                    setOpenSub(null);
                                                }}
                                            >
                                                {child.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* DROPDOWN NAV (apply same sub-dropdown logic) */}
                    {navItemsDropdown.map((obj, i) => {
                        const hasChildren =
                            Array.isArray(obj.children) && obj.children.length > 0;

                        return (
                            <div key={`dd-${i}`} className="text-raper-dropdown cursor-pointer flex flex-col hover:text-blue-500  md:hidden">
                                {/* Parent row */}
                                <div
                                    className="flex justify-between items-center"
                                    onClick={() => handleParentClick(`dd-${i}`, obj.link, hasChildren)}
                                >
                                    <p>{obj.title}</p>
                                    {hasChildren && (
                                        <span>{openSub === `dd-${i}` ? "▲" : "▼"}</span>
                                    )}
                                </div>

                                {/* Submenu */}
                                {hasChildren && openSub === `dd-${i}` && (
                                    <div className="border-l pl-2 space-y-1">
                                        {obj.children.map((child, cIdx) => (
                                            <div
                                                key={cIdx}
                                                className="cursor-pointer hover:text-blue-500"
                                                onClick={() => {
                                                    navigate(child.link);
                                                    setDropdownOpen(false);
                                                    setOpenSub(null);
                                                }}
                                            >
                                                {child.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    );

}

function Navbar() {
    const { userInfo } = useSelector((state) => state.user);
    const [templates, setTemplates] = useState([])
    let navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    useEffect(() => {
        clientToken.get('yaml/list/').then((response) => {
            if (response.status === 200) {
                setTemplates(response.data.map((obj) => ({ title: obj.template_name, link: `/invoice_editor?id=${obj.id}` })))
                // console.log(response.data.map((obj)=>({title:obj.template_name,link:`/invoice_editor?id=${obj.id}`})))
            }
        })
    }, []);
    let navItems = [
        { title: "Dashboard", link: "/home" },
        { title: "Customers", link: "/Customers" },
        { title: "Inventory", link: "/inventory" },
        { title: "Template Gallery", link: "/available-templates" },
    ];

    let navItemsDropdown = [
        { title: "Profile", link: "/profile" },
        { title: "Invoice Preview", link: "", children: templates },
        { title: "UI Config", link: "/UIConfig", },
        { title: "logout", link: "/logout" },
    ];

    if (userInfo?.is_company_admin) {
        navItems.push({ title: "My Company", link: "/CompanyForm" });
    }
    if (userInfo?.is_staff) {
        navItems.push({ title: "All Templates", link: "/templates" });
    }

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            {/* Fixed spacer so page content doesn't hide under the nav */}
            <div style={{ height: '64px' }} />

            <div className="nav" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

                {/* ── Brand logo ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate("/home")}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        flexShrink: 0,
                    }}>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                            <path d="M4 5h12M4 10h8M4 15h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>
                        Invoice App
                    </span>
                </div>

                {/* ── Desktop links + profile ── */}
                <div className="links">
                    <div className="items">
                        {navItems.map((obj, i) => (
                            <div key={i} className="text-raper" onClick={() => navigate(obj.link)}>
                                <p>{obj.title}</p>
                            </div>
                        ))}
                    </div>

                    {/* Profile avatar ── opens dropdown */}
                    <div className="profile-raper">
                        <div
                            className="profile-icon"
                            style={{
                                backgroundImage: `url(${userInfo?.profile || profle})`,
                                backgroundSize: "cover",
                            }}
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        />
                    </div>

                    <NavDropdown
                        navItems={navItems}
                        navItemsDropdown={navItemsDropdown}
                        dropdownOpen={dropdownOpen}
                        setDropdownOpen={setDropdownOpen}
                    />
                </div>
            </div>
        </>
    );
}

export default Navbar;
