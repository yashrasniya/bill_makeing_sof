import './App.css';
import './style/root.css';
import {Login,SignUp} from './pages/login.js';
import {Home} from './pages/home.js';
import {BrowserRouter, Routes, Route, useNavigate} from "react-router-dom";
import {Companys} from "./pages/company's";
import {NewBill} from "./pages/new_bill";
import {useEffect, useState} from "react";
import axios from "axios";
import PDF from "./pages/js";

const LogOut = () => {
  window.localStorage.clear()
    window.location.href=window.location.href.split('//')[0]+'//'+window.location.href.split('//')[1].split('/')[0]


}
const client = axios.create({
    baseURL: process.env.REACT_APP_URL,
    headers:{
        'Content-Type': 'application/json'
    },
});

const LoginCheck = () => {
    const [is_login,set_login]=useState(false)

    // const navigate = useNavigate();

    useEffect(() => {

            if(window.localStorage.getItem('token')){
                // if (is_login){
                client.get('profile/',{headers:{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer '+window.localStorage.getItem('token')
                    }}).then((response)=>{
                    if(response.status===200){
                        set_login(true)
                        if(window.location.href.split('//')[1].split('/')[1]===''){
                            // navigate('/home')
                            window.location.href=window.location.href+'home'
                        }

                    }
                }).catch((error)=> {
                    console.log(error.request.status)
                    if (error.request.status===401){
                        console.log(error)

                        window.location.href=window.location.href.split('//')[0]+window.location.href.split('//')[1].split('/')[0]
                    }
                    else {
                        console.log(error)
                        alert(`error ${error.request.status}`)
                    }


                })
                }
            // }
            else {
                set_login(false)
                // debugger;
                console.log(window.location.href.split('//')[1].split('/')[1]==='',window.location.href.split('//')[0]+window.location.href.split('//')[1].split('/')[0])
                if(!(window.location.href.split('//')[1].split('/')[1]==='')){
                    // navigate('/home')
                    console.log('sdf')
                    window.location.href=window.location.href.split('//')[0]+'//'+window.location.href.split('//')[1].split('/')[0]
                }

            }


    }, []);
}
function App() {

  return (<>
      <LoginCheck></LoginCheck>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Login/>}></Route>
          <Route path='/SignUp' element={<SignUp/>}></Route>
          <Route path='/home' element={<Home/>}></Route>
          <Route path='/companys' element={<Companys/>}></Route>
          <Route path='/newbill' element={<NewBill/>}></Route>
          <Route path='/bill/:invoice_id' element={<NewBill/>}></Route>
          <Route path='/logout' element={<LogOut/>}></Route>
          <Route path='/pdf' element={<PDF/>}></Route>
        </Routes>
      </BrowserRouter>
      </>
  );
}

export default App;
