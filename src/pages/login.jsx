import "@/style/login.css"
import logo from "../assets/bill_ninja_logo.png_white.png"
import logo_background from "../assets/bill_ninja_logo.png"

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { clientToken } from "@/axios";
import {fetchUser} from "@/store/userSlice";
import {useDispatch} from "react-redux";

function Login(){
    const navigate = useNavigate();
    const [username, set_username] = useState('')
    const [password, set_password] = useState('')
    const [error, setError] = useState('')
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false)   // ✅ loading state

    const handelLogin = () => {
        setLoading(true);
        setError('')
        clientToken.post('login/', {
            username: username,
            password: password,
        }).then((response) => {
            if (response.status === 200) {
                setLoading(false);
                dispatch(fetchUser());
                navigate('/home')
            }
        }).catch((error) => {
            if (error.response?.status === 400) {
                setError('Password or Username is Wrong !!!')
            } else {
                setError("Something went wrong, please try again.")
            }
            setLoading(false);
        })
    }

    return (
        <div className="container">
            <div className="login_box left">
                <div className="flex justify-center items-center w-full">
                    <img src={logo} alt={'logo'} className={'h-1/4 '} />
                </div>
            </div>

            <div className="login_box right">
                <div className="logo_css heading">
                    <img src={logo} alt={'logo'} id={'logo_first'} />
                    <img src={logo_background} id={'logo_two'} alt={'logo'} className={'h-1/2'} />
                </div>

                <div className="raper">
                    <h3 className="login-heading">Login</h3>
                    <div className="input-raper">
                        <p>User Name</p>
                        <input
                            type="text"
                            name="username"
                            className={'bg-white'}
                            value={username}
                            onChange={(e) => set_username(e.target.value)}
                        />
                    </div>
                    <div className="input-raper">
                        <p>Password</p>
                        <input
                            type="password"
                            name="password"
                            className={'bg-white'}
                            value={password}
                            onChange={(e) => set_password(e.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    handelLogin();
                                }
                            }}
                        />
                    </div>

                    <p style={{ color: "red", padding: '10px 0 0 0' }}>{error}</p>

                    <button onClick={handelLogin} disabled={loading}>
                        {loading ? "Logging in..." : "Login"}  {/* ✅ button changes */}
                    </button>

                    {loading && (
                        <div className="loader" style={{ marginTop: "10px" }}>
                            <div className="spinner"></div>
                        </div>
                    )}

                    <p className='SignUp-text' onClick={() => { navigate("/SignUp"); }}>
                        SignUp
                    </p>
                </div>
            </div>
        </div>
    )
}

export { Login };
