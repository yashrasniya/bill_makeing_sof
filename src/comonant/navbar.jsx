import "../style/navbar.css"
import logo from "../assets/bill_ninja_logo.png"
import profle from "../assets/user.jpg"
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";

function Navbar() {
    const { userInfo } = useSelector((state) => state.user);
    let navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    let navItems = [
        { title: "Dashboard", link: "/home" },
        { title: "Customers", link: "/Customers" },
    ];

    if (userInfo?.is_company_admin) {
        navItems.push({ title: "My Company", link: "/CompanyForm" });
    }

    return (
        <div className={'pt-15'}>
            <div className="nav">
                {/* Logo → go to Dashboard */}
                <div className="p-2 cursor-pointer" onClick={() => navigate("/home")}>
                    <img src={'/favicon_io/apple-touch-icon.png'} alt="logo" className="h-full w-15" />
                </div>

                {/* Desktop links */}
                <div className="links">
                    <div className="items">
                        {navItems.map((obj, i) => (
                            <div key={i} className="text-raper" onClick={() => navigate(obj.link)}>
                                <p>{obj.title}</p>
                            </div>
                        ))}
                    </div>

                    {/* Profile picture + dropdown */}
                    <div className="profile-raper">
                        <div
                            className="profile-icon"
                            style={{
                                backgroundImage: `url(${userInfo?.profile || profle})`,
                                backgroundSize: "cover",
                            }}
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        ></div>
                    </div>

                    {/* Dropdown (works for both desktop & mobile) */}
                    {dropdownOpen && (
                        <div className="items-raper">
                            <div className="items-responsive">
                                {navItems.map((obj, i) => (
                                    <div
                                        key={i}
                                        className="text-raper md:!hidden"
                                        onClick={() => {
                                            navigate(obj.link);
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        <p>{obj.title}</p>
                                    </div>
                                ))}
                                <div
                                    className="text-raper"
                                    onClick={() => {
                                        navigate("/profile");
                                        setDropdownOpen(false);
                                    }}
                                >
                                    <p>Profile</p>
                                </div>
                                <div
                                    className="text-raper"
                                    onClick={() => {
                                        navigate("/logout");
                                        setDropdownOpen(false);
                                    }}
                                >
                                    <p>Logout</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
}

export default Navbar;
