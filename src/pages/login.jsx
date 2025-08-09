import "../style/login.css"
// import logo from "../assets/logo.png"
import logo from "../assets/bill_ninja_logo.png_white.png"
import logo_background from "../assets/bill_ninja_logo.png"

import { useNavigate } from "react-router-dom";
import {useEffect, useState} from "react";
import {clientToken} from "../axios";


function Login({setLoading}){
    const navigate = useNavigate();
    const [username,set_username]=useState('')
    const [password,set_password]=useState('')
    const [error, setError] = useState('')


    const handelLogin = (e) => {
        setLoading(true);
        clientToken.post('login/',{
            username:username,
            password:password,
        }).then((response)=>{
            if(response.status===200){
                 setLoading(false);
                // window.localStorage.setItem('token',response.data.token)
                navigate('/home')
            }

        }).catch((error)=>{
            // alert(error)
            if(error.response.status===400){
                setLoading(false);
                setError('Password or Username is Wrong !!!')
                console.log(error.response.status);
            }else {
                setError(error)
             setLoading(false);
            console.log(error.response.status);
            }

            }

        )
    }

    return(
        <div className="container" >
        <div className="login_box left">
            <div className="flex justify-center items-center w-full">
                <img src={logo} alt={'logo'} className={'h-1/4 '} ></img>

            </div>
        </div>
            <div className="login_box right">


                <div className="logo_css heading"><img src={logo} alt={'logo'} id={'logo_first'} ></img>
                    <img src={logo_background} id={'logo_two'} alt={'logo'}  className={'h-1/2'}></img>
                </div>



            <div className="raper">
                <h3 className="login-heading">Login</h3>
                <div className="input-raper">
                    <p>User Name</p>
                    <input type="text" name="username" className={'bg-white'}
                           value={username}
                           onChange={(e)=>set_username(e.target.value)}/>
                </div>
                <div className="input-raper">
                    <p>Password</p>
                    <input type="password" name="password" className={'bg-white'}
                           value={password}
                           onChange={(e)=>set_password(e.target.value)}
                           onKeyDown={(event)=>{
                               if (event.key === 'Enter') {
                                   // 👇 Get input value
                                   handelLogin();
                               }
                           }}
                    />
                </div>
                <p style={{color:"red",padding:'10px 0 0 0'}}>{error}</p>
                <button onClick={handelLogin}>Login</button>
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
    const [user_details,set_user_details]=useState({
        username:'',
        email:'',
        first_name:'',
        last_name:'',
        mobile_number:'',
        password:'',
    })
    const [error, setError] = useState({
        message:'',
        username:'',
        email:'',
        first_name:'',
        last_name:'',
        mobile_number:'',
        password:'',})
    const handelChange = (e) => {
        set_user_details({
            ...user_details,
            [e.target.name]:e.target.value
        })
    }
    const handelSignUp = (e) => {
        clientToken.post('register/',{
                username:user_details.username,
                email:user_details.email,
                first_name:user_details.first_name,
                last_name:user_details.last_name,
                mobile_number:user_details.mobile_number,
                password:user_details.password,
            }
        ).then((response)=>{
            if(response.status===201){
                alert("Account Created Successfully")
                navigate('/')
            }
        }).catch((error)=>{
            if(error.response.status ===400){

                    console.log(error.response.data)
                    setError(error.response.data)
            }
            else {
                console.log(error.response.data);
                setError({...error,message:"Something went Wrong Try again"})

            }
        })
    }
    return(
        <div className="container" >
            <div className="login_box left h-fit">
                <div className="flex justify-center items-center w-full"><img src={logo} alt={'logo'} className={'h-1/4'} ></img></div>
            </div>
            <div className="login_box right">
                <div className="logo_css heading"><img src={logo} alt={'logo'} id={'logo_first'} ></img>
                    <img src={logo_background} id={'logo_two'} alt={'logo'}  className={'h-1/2'}></img>
                </div>
                <h3 className="login-heading">SignUp</h3>

                <div className="raper">
                    {error?.message && <p style={{color:"red",padding:'10px 0 0 0'}}>{error?.message}</p>}

                    <div className="input-raper">
                        <p>User Name</p>{error.username && <span style={{color: "red",fontSize:"15px"}}> {error?.username}</span>}
                        <input type="text" name="username" value={user_details.username} onChange={handelChange} className={'bg-white'}/>
                    </div>
                    <div className="input-raper">
                        <p>Email address</p>{error.email && <span style={{color: "red",fontSize:"15px"}}> {error?.email}</span>}
                        <input type="email" name="email" value={user_details.email} onChange={handelChange} className={'bg-white'} />
                    </div>
                    <div className="input-raper">
                        <p>First Name</p>{error.first_name && <span style={{color: "red",fontSize:"15px"}}> {error?.first_name}</span>}
                        <input type="text" name="first_name" value={user_details.first_name} onChange={handelChange} className={'bg-white'} />
                    </div>
                    <div className="input-raper">
                        <p>Last Name</p>{error.last_name && <span style={{color: "red",fontSize:"15px"}}> {error?.last_name}</span>}
                        <input type="text" name="last_name" value={user_details.last_name} onChange={handelChange} className={'bg-white'} />
                    </div>
                    <div className="input-raper">
                        <p>Mobile number</p>{error.mobile_number && <span style={{color: "red",fontSize:"15px"}}> {error?.mobile_number}</span>}
                        <input type="text" name="mobile_number" value={user_details.mobile_number} onChange={handelChange} className={'bg-white'} />
                    </div>
                    <div className="input-raper">
                        <p>Password</p>{error.password && <span style={{color: "red",fontSize:"15px"}}> {error?.password}</span>}
                        <input type="password" name="password" value={user_details.password} onChange={handelChange} className={'bg-white'}/>
                    </div>
                    <button  onClick={handelSignUp} >Create New Account</button>
                    <p className='SignUp-text' onClick={()=>{ navigate("/");}}>
                        Login
                    </p>
                </div>

            </div>
        </div>
    )
}
export  {Login, SignUp};
