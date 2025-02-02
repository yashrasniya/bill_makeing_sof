import '../style/Companys.css';
import {clintToken, global} from '../App.js'
import {clientToken} from "../axios";
import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

function CompanysTable(){

    const navigate = useNavigate();

    const [table_content,set_table_content]=useState([])
    const [url ,set_url]=useState('companies/')
    const [urls ,set_urls]=useState({})
    let [checkbox,setCheckBox]=useState({})
    const [company_data,set_company_data]=useState({})
    const [refresh,set_refesh]=useState(false)
    const [update,set_update]=useState(false)
    const [SearchValue,set_SearchValue]=useState('')


    useEffect(() => {
        clientToken.get(url).then((response)=>{
            if (response.status===200){
                set_table_content(response.data.results)
                set_urls({
                    next:response.data.next,
                    previous:response.data.previous,

                })
                let a={}
                for(let i=0;i<response.data.results.length;i++){
                    a={...a,[response.data.results[i].id]:false}
                }
                setCheckBox(a)
            }
        }).catch((error)=>{
            console.log(error)
            alert(`error ${error.request.status}`)
        })
    }, [url,refresh]);
    const handelCheckBox = (obj) => {
        console.log(obj.target.checked)
        setCheckBox({...checkbox,[obj.target.id]:obj.target.checked })
        console.log(checkbox)
        // checkbox[obj.target.id]=obj.target.checked

    }

    const handelsave = (u='companies/') => {
        const form=new FormData()
        Object.keys(company_data).map((obj)=>form.append(obj,company_data[obj]))
        clientToken.post(u,form).then((response)=>{
            if(response.status===200){
                document.getElementById('new_company_box').style.display='none'
                set_company_data({
                    name:'',
                    address:'',
                    gst_number:'',
                    state:'',
                    state_code:'',
                })
                set_refesh(!refresh)

            }

        }).catch((e)=>alert(e.request.status))
    }
    const handelUpdate = () => {
        handelsave(`companies/${company_data.id}/`)
    }
    const handelDelete = (id) => {
        clientToken.delete(`companies/${id}/`).then((response)=>{
            if(response.status===204){
                document.getElementById('new_company_box').style.display='none'
                set_company_data({
                    name:'',
                    address:'',
                    gst_number:'',
                    state:'',
                    state_code:'',
                })
                set_refesh(!refresh)

            }

        }).catch((e)=>alert(e?.request.status))
    }
    const handelMultiDelete = () => {
        if (window.confirm("are you sure?")){

            Object.keys(checkbox).map((obj)=>{
            if(checkbox[obj]){
                handelDelete(obj)
            }
        })
        }
    }
    const handelItemsOpen = (index) => {
            set_company_data(table_content[index])
            set_update(true)
            document.getElementById('new_company_box').style.display='flex'





    }
    const handelUrl = (e) => {
        set_url(urls[e.target.id])
        setCheckBox({})
    }
    const handelSearch = (e) => {
      set_SearchValue(e.target.value)
        set_url(`companies/?s=${e.target.value}`)
    }
    return(
        <>
        <div className={'companys_header_raper'}>
            <div className={'title-div'}>
                <p>Company's</p>
                <input placeholder='Search' onChange={handelSearch} value={SearchValue} className={'search input'}/>
            </div>
            <div className={'button-div'}>
                <div className={'button'} onClick={()=>{
                    set_update(false)
                    document.getElementById('new_company_box').style.display='flex'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 36 35" fill="none">
                        <path d="M22.4655 16.0523L22.4759 7.19432C22.4759 6.80597 22.3196 6.43352 22.0413 6.15891C21.763 5.8843 21.3856 5.73002 20.9921 5.73002C20.5985 5.73002 20.2211 5.8843 19.9429 6.15891C19.6646 6.43352 19.5083 6.80596 19.5083 7.19432L19.5187 16.0523L10.5426 16.042C10.1491 16.042 9.77166 16.1963 9.49339 16.4709C9.21512 16.7455 9.05879 17.1179 9.05879 17.5063C9.05879 17.8947 9.21512 18.2671 9.49339 18.5417C9.77166 18.8163 10.1491 18.9706 10.5426 18.9706L19.5187 18.9603L19.5083 27.8183C19.5075 28.0108 19.5453 28.2016 19.6196 28.3796C19.6939 28.5576 19.8031 28.7193 19.9411 28.8554C20.079 28.9916 20.2429 29.0994 20.4233 29.1727C20.6037 29.246 20.797 29.2834 20.9921 29.2826C21.1872 29.2834 21.3805 29.246 21.5609 29.1727C21.7412 29.0994 21.9051 28.9916 22.0431 28.8554C22.181 28.7193 22.2903 28.5576 22.3646 28.3796C22.4389 28.2016 22.4767 28.0108 22.4759 27.8183L22.4655 18.9603L31.4415 18.9706C31.6366 18.9714 31.8299 18.934 32.0103 18.8607C32.1907 18.7874 32.3546 18.6796 32.4926 18.5435C32.6305 18.4073 32.7398 18.2456 32.814 18.0676C32.8883 17.8896 32.9262 17.6988 32.9254 17.5063C32.9262 17.3138 32.8883 17.123 32.814 16.945C32.7398 16.767 32.6305 16.6053 32.4926 16.4691C32.3546 16.333 32.1907 16.2252 32.0103 16.1519C31.8299 16.0785 31.6366 16.0412 31.4415 16.042L22.4655 16.0523Z" fill="white"/>
                    </svg>
                    Company</div>
                <div className={'button delete'} onClick={handelMultiDelete}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" fill="none">
                        <path d="M11.25 20.25C11.5484 20.25 11.8345 20.1315 12.0455 19.9205C12.2565 19.7095 12.375 19.4234 12.375 19.125V12.375C12.375 12.0766 12.2565 11.7905 12.0455 11.5795C11.8345 11.3685 11.5484 11.25 11.25 11.25C10.9516 11.25 10.6655 11.3685 10.4545 11.5795C10.2435 11.7905 10.125 12.0766 10.125 12.375V19.125C10.125 19.4234 10.2435 19.7095 10.4545 19.9205C10.6655 20.1315 10.9516 20.25 11.25 20.25ZM22.5 6.75H18V5.625C18 4.72989 17.6444 3.87145 17.0115 3.23851C16.3786 2.60558 15.5201 2.25 14.625 2.25H12.375C11.4799 2.25 10.6214 2.60558 9.98851 3.23851C9.35558 3.87145 9 4.72989 9 5.625V6.75H4.5C4.20163 6.75 3.91548 6.86853 3.7045 7.0795C3.49353 7.29048 3.375 7.57663 3.375 7.875C3.375 8.17337 3.49353 8.45952 3.7045 8.6705C3.91548 8.88147 4.20163 9 4.5 9H5.625V21.375C5.625 22.2701 5.98058 23.1286 6.61351 23.7615C7.24645 24.3944 8.10489 24.75 9 24.75H18C18.8951 24.75 19.7536 24.3944 20.3865 23.7615C21.0194 23.1286 21.375 22.2701 21.375 21.375V9H22.5C22.7984 9 23.0845 8.88147 23.2955 8.6705C23.5065 8.45952 23.625 8.17337 23.625 7.875C23.625 7.57663 23.5065 7.29048 23.2955 7.0795C23.0845 6.86853 22.7984 6.75 22.5 6.75ZM11.25 5.625C11.25 5.32663 11.3685 5.04048 11.5795 4.8295C11.7905 4.61853 12.0766 4.5 12.375 4.5H14.625C14.9234 4.5 15.2095 4.61853 15.4205 4.8295C15.6315 5.04048 15.75 5.32663 15.75 5.625V6.75H11.25V5.625ZM19.125 21.375C19.125 21.6734 19.0065 21.9595 18.7955 22.1705C18.5845 22.3815 18.2984 22.5 18 22.5H9C8.70163 22.5 8.41548 22.3815 8.2045 22.1705C7.99353 21.9595 7.875 21.6734 7.875 21.375V9H19.125V21.375ZM15.75 20.25C16.0484 20.25 16.3345 20.1315 16.5455 19.9205C16.7565 19.7095 16.875 19.4234 16.875 19.125V12.375C16.875 12.0766 16.7565 11.7905 16.5455 11.5795C16.3345 11.3685 16.0484 11.25 15.75 11.25C15.4516 11.25 15.1655 11.3685 14.9545 11.5795C14.7435 11.7905 14.625 12.0766 14.625 12.375V19.125C14.625 19.4234 14.7435 19.7095 14.9545 19.9205C15.1655 20.1315 15.4516 20.25 15.75 20.25Z" fill="white"/>
                    </svg>
                    Delete </div>
            </div>
            <div className={'pop-up-box'} id={'new_company_box'}>
                <a className={'close'}   onClick={()=>{
                    document.getElementById('new_company_box').style.display='none'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none">
                        <path d="M24.585 22L32.4683 14.135C32.8136 13.7898 33.0075 13.3216 33.0075 12.8333C33.0075 12.3451 32.8136 11.8769 32.4683 11.5317C32.1231 11.1864 31.6549 10.9925 31.1667 10.9925C30.6785 10.9925 30.2102 11.1864 29.865 11.5317L22 19.415L14.135 11.5317C13.7898 11.1864 13.3216 10.9925 12.8333 10.9925C12.3451 10.9925 11.8769 11.1864 11.5317 11.5317C11.1865 11.8769 10.9925 12.3451 10.9925 12.8333C10.9925 13.3216 11.1865 13.7898 11.5317 14.135L19.415 22L11.5317 29.865C11.3598 30.0354 11.2235 30.2382 11.1304 30.4616C11.0373 30.685 10.9894 30.9246 10.9894 31.1667C10.9894 31.4087 11.0373 31.6483 11.1304 31.8717C11.2235 32.0951 11.3598 32.2979 11.5317 32.4683C11.7021 32.6402 11.9049 32.7766 12.1283 32.8696C12.3517 32.9627 12.5913 33.0106 12.8333 33.0106C13.0754 33.0106 13.315 32.9627 13.5384 32.8696C13.7618 32.7766 13.9646 32.6402 14.135 32.4683L22 24.585L29.865 32.4683C30.0354 32.6402 30.2382 32.7766 30.4616 32.8696C30.685 32.9627 30.9247 33.0106 31.1667 33.0106C31.4087 33.0106 31.6483 32.9627 31.8717 32.8696C32.0951 32.7766 32.2979 32.6402 32.4683 32.4683C32.6402 32.2979 32.7766 32.0951 32.8696 31.8717C32.9627 31.6483 33.0106 31.4087 33.0106 31.1667C33.0106 30.9246 32.9627 30.685 32.8696 30.4616C32.7766 30.2382 32.6402 30.0354 32.4683 29.865L24.585 22Z" fill="#071952"/>
                    </svg></a>
                <p>New Company </p>
                <div className={'pop-up-box_inputs'}>
                    <div className={'form_box'} style={{flexBasis:'48%'}}>Company Name
                        <input id="name" value={company_data["name"]}
                               onChange={(e)=>set_company_data({...company_data,[e.target.id]:e.target.value})} /></div>
                    <div className={'form_box'} style={{flexBasis:'48%'}} >Company Address
                        <input id="address" value={company_data["address"]}
                               onChange={(e)=>set_company_data({...company_data,[e.target.id]:e.target.value})} /></div>
                    <div className={'form_box' } style={{flexBasis:'48%'}}>Company GST Number
                        <input id="gst_number" value={company_data["gst_number"]}
                               onChange={(e)=>set_company_data({...company_data,[e.target.id]:e.target.value})}/></div>
                    <div className={'form_box'} style={{flexBasis:'22%'}}>State
                        <input id="state" value={company_data["state"]}
                               onChange={(e)=>set_company_data({...company_data,[e.target.id]:e.target.value})} /></div>
                    <div className={'form_box'} style={{flexBasis:'22%'}}>State code
                        <input id="state_code"   value={company_data["state_code"]}
                               onChange={(e)=> {
                                   if(!isNaN(e.target.value)){
                                       set_company_data({...company_data, [e.target.id]: e.target.value})
                                   }

                               }} /></div>
                </div>
                <div className={'pop-up-box_buttons'}>
                    {update?<div className={'button delete'} onClick={()=>handelDelete(company_data.id)}>Delete</div>:''}
                    {update?<div className={'button'} onClick={handelUpdate}>Update</div>:<div className={'button'} onClick={()=>handelsave()}>Save</div>}
                </div>
            </div>
        </div>
        <div className={'companys_table_raper'}>
           <table className={'table'}>
            <thead>
            <tr>
                <td><input type='checkbox'
                           onChange={ (base_obj)=> {
                               var list={}
                               Object.keys(checkbox).map((obj) => list[obj]=base_obj.target.checked)
                               setCheckBox(list)
                           }}
                           className={'check-box'}/></td>
                <td> Name</td>
                <td> GST Number</td>
                <td> State</td>
                <td> State Code</td>
            </tr>
            </thead>
               <tbody>
               {table_content.map(
                   (obj,key)=>{
                   return(<tr>
                       <td><input type='checkbox'
                                  checked={checkbox[obj.id]}
                                  onChange={handelCheckBox}
                                  id={obj.id}
                                  className={'check-box'}/></td>
                       <td onClick={()=>handelItemsOpen(key)} style={{color:"var(--primary-color-4)"}}> {obj.name===''?"-":obj.name}</td>
                       <td> {obj.gst_number}</td>
                       <td> {obj.state}</td>
                       <td> {obj.state_code}</td>
                       </tr>
                   )
               })}
               </tbody>
           </table>
        <div className={'paging'}>
            {urls.previous?<div id="previous" onClick={handelUrl}> Previous</div>:''}
            {urls.next?<div id="next" onClick={handelUrl}>  Next</div>:''}
        </div>
        </div>
        </>
    )
}

export default CompanysTable;

