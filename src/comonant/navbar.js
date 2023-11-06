import {nav}from "../style/navbar.css"
import logo from "../assets/logo.png"
import profle from "../assets/profle.webp"
import { useNavigate } from "react-router-dom";
const navItems=[
    {title:'Home',icon:'' ,link:'/home'},
    {title:'Company’s',icon:'',link:'/companys'},
    {title:'Our Detail’s',icon:'',link:'/home'},
]

function Navbar(){

    let navigate =useNavigate()

    return(
        <div className="nav">
        <div className="img-css"><img src={logo}/></div>
            <div className="links">
                 <div className="items">
                     {navItems.map((obj)=><div className='text-raper' onClick={()=> {navigate(obj.link)}}> {obj.icon} <p> {obj.title} </p></div>)}

                    {/*<div className='text-raper'><i className="fa-regular fa-address-book"></i><p> Contact</p></div>*/}
                    {/*<div className='text-raper'> <i className="fa-solid fa-phone"></i><p> Call</p></div>*/}

            </div>
              <div className='profile-raper'>  <div className="profile-icon" style={{backgroundImage:`url(${profle})`,backgroundSize:"50px"}} onClick={()=>{
                  document.getElementsByClassName('items-responsive')[0].style.display=document.getElementsByClassName('items-responsive')[0].style.display=='block'?'none':'block'}}></div>
              </div>
                <div className='items-raper'> <div className="items-responsive">

                    {navItems.map((obj)=><div className='text-raper' onClick={()=> {navigate(obj.link)}}> {obj.icon} <p> {obj.title} </p></div>)}

                </div>

            </div>
            </div>
        </div>
    )
}

export default Navbar;