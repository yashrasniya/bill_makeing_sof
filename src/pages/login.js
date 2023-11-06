import "../style/login.css"
import logo from "../assets/logo.png"
import { useNavigate } from "react-router-dom";


function Login(){
    const navigate = useNavigate();

    return(
        <div className="container" >
        <div className="login_box left">
            <div className="logo_css"><img src={logo} alt={'logo'} ></img></div>
        </div>
            <div className="login_box right">


                <div className="logo_css heading"><img src={logo} alt={'logo'} ></img></div>



            <div className="raper">
                <h3 className="login-heading">Login</h3>
                <div className="input-raper">
                    <p>User Name</p>
                    <input type="text" name="username" />
                </div>
                <div className="input-raper">
                    <p>Password</p>
                    <input type="password" name="password"/>
                </div>
                <button onClick={()=>{ navigate("/home");}}>Login</button>
                <button >
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 32 32" fill="none">
                        <g >
                            <path d="M31.9831 16.2994C31.9831 14.9884 31.8742 14.0317 31.6386 13.0396H16.3187V18.9569H25.3112C25.1299 20.4274 24.1509 22.642 21.9753 24.1301L21.9448 24.3282L26.7886 27.9952L27.1242 28.0279C30.2063 25.2463 31.9831 21.1537 31.9831 16.2994Z" fill="#4285F4"/>
                            <path d="M16.3187 31.8901C20.7242 31.8901 24.4227 30.4727 27.1242 28.0279L21.9752 24.1301C20.5974 25.0691 18.7481 25.7246 16.3187 25.7246C12.0038 25.7246 8.34151 22.9432 7.03602 19.0986L6.84466 19.1145L1.80793 22.9236L1.74207 23.1025C4.42529 28.3112 9.93684 31.8901 16.3187 31.8901Z" fill="#34A853"/>
                            <path d="M7.03611 19.0986C6.69164 18.1065 6.49229 17.0434 6.49229 15.945C6.49229 14.8465 6.69164 13.7835 7.01799 12.7914L7.00886 12.5801L1.90901 8.70984L1.74215 8.7874C0.636269 10.9489 0.00170898 13.3761 0.00170898 15.945C0.00170898 18.5139 0.636269 20.941 1.74215 23.1025L7.03611 19.0986Z" fill="#FBBC05"/>
                            <path d="M16.3187 6.16537C19.3826 6.16537 21.4494 7.45869 22.6279 8.53948L27.2329 4.14571C24.4047 1.57679 20.7242 0 16.3187 0C9.93684 0 4.42529 3.57875 1.74207 8.78742L7.0179 12.7915C8.34151 8.94693 12.0038 6.16537 16.3187 6.16537Z" fill="#EB4335"/>
                        </g>
                        <defs>
                            <clipPath id="clip0_140_74">
                                <rect width="32" height="32" fill="white"/>
                            </clipPath>
                        </defs>
                    </svg>
                    oogle</button>
                <p className='SignUp-text' onClick={()=>{ navigate("/SignUp");}}>
                    SignUp
                </p>
            </div>

            </div>
        </div>
    )
}
function SignUp(){
    const navigate = useNavigate();
    return(
        <div className="container" >
            <div className="login_box left">
                <div className="logo_css"><img src={logo} alt={'logo'} ></img></div>
            </div>
            <div className="login_box right">


                <div className="logo_css heading"><img src={logo} alt={'logo'} ></img></div>

                <h3 className="login-heading">SignUp</h3>

                <div className="raper">
                    <div className="input-raper">
                        <p>User Name</p>
                        <input type="text" name="username" />
                    </div>
                    <div className="input-raper">
                        <p>Password</p>
                        <input type="password" name="password"/>
                    </div>
                    <button >Create New Account</button>
                    <p className='SignUp-text' onClick={()=>{ navigate("/");}}>
                        Login
                    </p>
                </div>

            </div>
        </div>
    )
}
export  {Login, SignUp};
