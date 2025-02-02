import '../style/bill.css';
import React, {useEffect, useState} from "react";
import {clientToken} from "../axios";
import {useNavigate} from "react-router-dom";



const bill_body_items=[
    {input_title:'Name of Product',size:'40%',show:true,calculable:false},
    {input_title:'Quantity',size:'16%',show:true,calculable:true},
    {input_title:'Type',size:'16%',show:false,calculable:false},
    {input_title:'Rate',size:'16%',show:true,calculable:true},
    {input_title:'Product Description',size:'40%',show:false,calculable:false},
    {input_title:'HSN/SAC',size:'16%',show:false,calculable:false},
    {input_title:'Disc',size:'16%',show:false,calculable:true,formula:{variable:'-',}},
    {input_title:'GST',size:'16%',show:true,calculable:false},
]
function NewBillBody({id}){
    let [new_product,setNewProduct]=useState({product_properties:[]})
    let [table_content,setTable_content]=useState([])
    let [Pop_up_properties,setPop_up_properties]=useState('none')
    let [checkbox,setCheckBox]=useState({})
    let [company_name,setCompany_name]=useState([])
    let [bill_body_items,setBill_body_items]=useState([])
    const [update,set_update]=useState(false)
    const [InvoiceData,setInvoiceData]=useState({})
    const [url,setUrl]=useState(id?`invoice/${id}/update/`:'invoice/')
    const [refresh,setRefresh]=useState(false)
    const [newDataFormat,setNewDataFormat]=useState({})
    let navigate =useNavigate()


    // var checkbox={}
    var grandTotal=0
    var grandGstTotal=0
    useEffect(() => {
        clientToken.get('companies/?page_size=999').then((response)=>{
            if (response.status===200){
                setCompany_name(response.data.results)
            }
        }).catch((error)=>{
            console.log(error)
            alert(`error ${error.request.status}`)
        })
    }, [refresh]);

    useEffect(() => {
        clientToken.get('new/product/in/frontend/').then((response)=>{
            if (response.status===200){
                setBill_body_items(response.data)
                let d=[]
                response.data.map((item)=>{d.push({new_product_in_frontend:item,value:''})})
                setNewDataFormat({product_properties:d})
                setNewProduct({...new_product,product_properties:JSON.parse(JSON.stringify(d))})
            }
        }).catch((error)=>{
            console.log(error)
            alert(`error ${error?.request.status}`)
        })
    }, [refresh]);
    useEffect(() => {




            let form =new FormData()
            Object.keys(InvoiceData).map((obj)=>{
                if (('products' !== obj)&&(InvoiceData[obj])){
                    form.append(obj,InvoiceData[obj])
                }

            })
            clientToken.post(url,form).then((response)=>{
                if (response.status===200){
                    setInvoiceData(response.data)
                    if(url==='invoice/'){
                        navigate(`/bill/${response.data.id}`)
                    }

                    setUrl(`invoice/${response.data.id}/update/`)
                    // window.location.href=window.location.href+`/${response.data.id}`


                    setTable_content(response.data.products)
                }
            }).catch((error)=> {
                console.log(error)
                alert(`error ${error?.request.status}`)
            })


    }, [refresh]);


    const handelSave =  (obj,update_data=false) => {
        console.log(new_product)
        var temp_opj={product_properties:[]}
        console.log(table_content)
            if(update_data){
                new_product.product_properties.map((obj)=>{
                    const form=new FormData()
                    form.append('value',obj.value)
                    clientToken.post(`product/properties/${obj.id}/update/`,form).then((response)=>{
                        if (response.status===200){
                            setNewProduct(JSON.parse(JSON.stringify(newDataFormat)))

                            setPop_up_properties('none')
                        }
                    }).catch((error)=> {
                        console.log(error)
                        alert(`error ${error?.request.status}`)
                    })
                })


            }
            else {
                let id=-1
                const form=new FormData()
                form.append('product_properties','')
                form.append('gst_amount',0)
                form.append('total_amount',0)
                clientToken.post('product/',form).then((response)=>{
                    if (response.status===200){
                        id=response.data.id
                        if(new_product.product_properties.length>0){

                            clientToken.post(`invoice/${InvoiceData.id}/product/add/`,{product_id:response.data.id}).then((response)=>{
                                if (response.status===200){
                                    console.log(new_product)
                                    new_product.product_properties.map((obj)=> {
                                        const productPropertiesForm=new FormData()
                                        productPropertiesForm.append('new_product_in_frontend',obj.new_product_in_frontend.id)
                                        productPropertiesForm.append('value',obj.value)
                                        clientToken.post('product/properties/',productPropertiesForm).then((response)=>{
                                            if (response.status===200){
                                                const productUpdateForm=new FormData()
                                                productUpdateForm.append('product_properties',response.data.id)
                                                productUpdateForm.append('gst_amount',0)
                                                productUpdateForm.append('total_amount',0)
                                                clientToken.post(`product/${id}/update/`,productUpdateForm).then((response)=>{
                                                    if (response.status===200){
                                                        console.log(response.data)
                                                        setRefresh(!refresh)
                                                    }
                                                }).catch((error)=> {
                                                    console.log(error)
                                                    alert(`error ${error?.request.status}`)
                                                })
                                            }
                                        }).catch((error)=> {
                                            console.log(error)
                                            alert(`error ${error?.request.status}`)
                                        })
                                    })

                                    setNewProduct(JSON.parse(JSON.stringify(newDataFormat)))
                                    console.log(new_product,newDataFormat)
                                    setPop_up_properties('none')
                                }
                            }).catch((error)=> {
                                console.log(error)
                                alert(`error ${error?.request.status}`)
                            })
                        }else {
                            alert(`Fill details`)
                        }
                    }
                }).catch((error)=> {
                    console.log(error)
                    alert(`error ${error?.request.status}`)
                })
                console.log(new_product.product_properties)

                console.log(new_product)}}
    const handelInput = (obj) => {
        let array=new_product?.product_properties?new_product?.product_properties:[]
        let index=array.findIndex((s)=>+s.new_product_in_frontend.id===+obj.target.id)
        let is_calculable=bill_body_items.find((l)=>+l.id===+obj.target.id)?.is_calculable
        // console.log(is_calculable,index,array,obj.target.id,bill_body_items)
        if (is_calculable && isNaN(obj.target.value)){
            return ''
        }else {
            index!==-1?array[index]={...array[index],value:obj.target.value}:array.push({value:obj.target.value,new_product_in_frontend: {id:obj.target.id}})
            console.log(array,new_product)
            setNewProduct({...new_product,product_properties:array})
        }

    }
    const handelCheckBox = (obj) => {
        console.log(obj.target.checked)
        setCheckBox({...checkbox,[obj.target.id]:obj.target.checked })
        console.log(checkbox)
        // checkbox[obj.target.id]=obj.target.checked

    }
    const handelUpdate = () => {
        handelSave('',true)

    }
    const delete_product = (id) => {
        clientToken.delete(`product/${id}/update/`).then((response)=>{
            if (response.status===204){
                setRefresh(!refresh)

            }
        }).catch((error)=> {
            console.log(error)
            alert(`error ${error?.request.status}`)
        })
    }
    const handelDelete = (e) => {
        console.log(checkbox)
        Object.keys(checkbox).map((obj)=>{
            console.log(checkbox[obj])
            if(checkbox[obj]){
                delete_product(obj)
                setCheckBox({})

            }

        })
        // setTable_content(array)
        // setCheckBox(check_list)
    }
    const handelOpen = (key) => {
        set_update(true)
        // console.log(table_content,key.target.parentElement.id)
        setNewProduct(table_content.find((obj)=>obj.id===+key.target.parentElement.id))
        setPop_up_properties('flex')
    }
    const handelExport = (id) => {
clientToken.get(`pdf/?id=${id}`, { responseType: 'blob' }) // 'blob' is important for binary data
  .then((response) => {
    // Create a Blob from the PDF data
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfURL = URL.createObjectURL(pdfBlob);
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(pdfBlob);
    if (!InvoiceData["receiver"]?.name){
        let obj=company_name.find((e)=>e.id===InvoiceData["receiver"])
        InvoiceData["receiver"]=obj
        console.log(obj)
    }
    downloadLink.download = `${InvoiceData["receiver"]?.name}_${new Date().getDate()}-${new Date().getMonth()+1}-${new Date().getFullYear()}.pdf`; // Name for the downloaded file

    // Append the link, trigger the download, and then remove the link
    // document.body.appendChild(downloadLink);
    // downloadLink.click();
    // document.body.removeChild(downloadLink);
      const newWindow = window.open(pdfURL, '_blank');
      if (newWindow) {
      // Optionally set the file name in the new tab
      newWindow.document.title = `${InvoiceData["receiver"]?.name}_${new Date().getDate()}-${new Date().getMonth() + 1}-${new Date().getFullYear()}.pdf`;
    } else {
      console.error('Failed to open a new tab. Please allow popups for this site.');
    }
  })
  .catch((error) => {
    console.error('Error downloading the PDF:', error);
  });
    }
    return(
        <div className={'container space'}>
            <div className={'top_head'}>
                <p>Bill</p>
                <div className={'button'} onClick={()=>InvoiceData["receiver"]?handelExport(InvoiceData?.id):alert("Receiver is not set")}>Export</div>
            </div>
            <div className={'bill_head'}>
                <div className={'pop-up-box'} id={'new_company_box'} style={{display:Pop_up_properties}}>
                    <a className={'close'}  onClick={()=>{
                        setPop_up_properties('none')
                        setNewProduct(JSON.parse(JSON.stringify(newDataFormat)))
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none">
                            <path d="M24.585 22L32.4683 14.135C32.8136 13.7898 33.0075 13.3216 33.0075 12.8333C33.0075 12.3451 32.8136 11.8769 32.4683 11.5317C32.1231 11.1864 31.6549 10.9925 31.1667 10.9925C30.6785 10.9925 30.2102 11.1864 29.865 11.5317L22 19.415L14.135 11.5317C13.7898 11.1864 13.3216 10.9925 12.8333 10.9925C12.3451 10.9925 11.8769 11.1864 11.5317 11.5317C11.1865 11.8769 10.9925 12.3451 10.9925 12.8333C10.9925 13.3216 11.1865 13.7898 11.5317 14.135L19.415 22L11.5317 29.865C11.3598 30.0354 11.2235 30.2382 11.1304 30.4616C11.0373 30.685 10.9894 30.9246 10.9894 31.1667C10.9894 31.4087 11.0373 31.6483 11.1304 31.8717C11.2235 32.0951 11.3598 32.2979 11.5317 32.4683C11.7021 32.6402 11.9049 32.7766 12.1283 32.8696C12.3517 32.9627 12.5913 33.0106 12.8333 33.0106C13.0754 33.0106 13.315 32.9627 13.5384 32.8696C13.7618 32.7766 13.9646 32.6402 14.135 32.4683L22 24.585L29.865 32.4683C30.0354 32.6402 30.2382 32.7766 30.4616 32.8696C30.685 32.9627 30.9247 33.0106 31.1667 33.0106C31.4087 33.0106 31.6483 32.9627 31.8717 32.8696C32.0951 32.7766 32.2979 32.6402 32.4683 32.4683C32.6402 32.2979 32.7766 32.0951 32.8696 31.8717C32.9627 31.6483 33.0106 31.4087 33.0106 31.1667C33.0106 30.9246 32.9627 30.685 32.8696 30.4616C32.7766 30.2382 32.6402 30.0354 32.4683 29.865L24.585 22Z" fill="#071952"/>
                        </svg></a>
                    <p>New Product </p>
                    <div className={'pop-up-box_inputs'}>
                        {bill_body_items.map((obj)=> {
                            let value=new_product?.product_properties.find((obj_2) => +obj_2.new_product_in_frontend.id === +obj.id)
                            // console.log(new_product.product_properties,value)
                            value=value?value.value:''
                            console.log(obj.size)
                            return (<div className={'form_box'} id={obj.input_title}
                                 style={{flexBasis: `${+obj.size*10}%`}}>{obj.input_title}
                                <input id={obj.id} onChange={handelInput} value={value}/></div>)
                        })}
                    </div>
                    <div className={'pop-up-box_buttons'}>
                        {update?<div className={'button delete'} onClick={()=>delete_product(new_product?.id)}>Delete</div>:''}
                        {update?<div className={'button'} onClick={handelUpdate}>Update</div>:<div className={'button'} onClick={handelSave}>Save</div>}
                    </div>
                </div>
                {/* Header */}
                <p>Invoice No.</p>
                <input placeholder={''} id={'invoice_number'}  type="number" value={InvoiceData?.invoice_number}
                       onChange={(e)=> setInvoiceData({...InvoiceData, [e.target.id]: e.target.value})}
                        onSelect={()=>setRefresh(!refresh)}
                    />
                <p>Receiver</p>
                <select  id={'receiver'} onChange={(event)=> {
                    if(event.target.value) {
                        setInvoiceData({...InvoiceData, [event.target.id]: event.target.value})
                        console.log(InvoiceData)
                        setRefresh(!refresh)
                    }
                }}>
                    <option selected={InvoiceData?.receiver===null} value={null}>---</option>
                    {company_name.map((obj)=><option value={obj.id} selected={obj.id === InvoiceData?.receiver}>{obj.name}</option>)}
                </select>
                <p>Invoice Date</p>
                <input type={'date'} id={'date'} value={InvoiceData?.date??new Date().toISOString().split('T')[0]} onChange={(e)=> {
                    setInvoiceData({...InvoiceData, [e.target.id]: e.target.value})
                    setRefresh(!refresh)
                }}/>
            </div>
            <div className={'header-button '}>
                <div className={'button delete'} onClick={handelDelete}><svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" fill="none">
                    <path d="M11.25 20.25C11.5484 20.25 11.8345 20.1315 12.0455 19.9205C12.2565 19.7095 12.375 19.4234 12.375 19.125V12.375C12.375 12.0766 12.2565 11.7905 12.0455 11.5795C11.8345 11.3685 11.5484 11.25 11.25 11.25C10.9516 11.25 10.6655 11.3685 10.4545 11.5795C10.2435 11.7905 10.125 12.0766 10.125 12.375V19.125C10.125 19.4234 10.2435 19.7095 10.4545 19.9205C10.6655 20.1315 10.9516 20.25 11.25 20.25ZM22.5 6.75H18V5.625C18 4.72989 17.6444 3.87145 17.0115 3.23851C16.3786 2.60558 15.5201 2.25 14.625 2.25H12.375C11.4799 2.25 10.6214 2.60558 9.98851 3.23851C9.35558 3.87145 9 4.72989 9 5.625V6.75H4.5C4.20163 6.75 3.91548 6.86853 3.7045 7.0795C3.49353 7.29048 3.375 7.57663 3.375 7.875C3.375 8.17337 3.49353 8.45952 3.7045 8.6705C3.91548 8.88147 4.20163 9 4.5 9H5.625V21.375C5.625 22.2701 5.98058 23.1286 6.61351 23.7615C7.24645 24.3944 8.10489 24.75 9 24.75H18C18.8951 24.75 19.7536 24.3944 20.3865 23.7615C21.0194 23.1286 21.375 22.2701 21.375 21.375V9H22.5C22.7984 9 23.0845 8.88147 23.2955 8.6705C23.5065 8.45952 23.625 8.17337 23.625 7.875C23.625 7.57663 23.5065 7.29048 23.2955 7.0795C23.0845 6.86853 22.7984 6.75 22.5 6.75ZM11.25 5.625C11.25 5.32663 11.3685 5.04048 11.5795 4.8295C11.7905 4.61853 12.0766 4.5 12.375 4.5H14.625C14.9234 4.5 15.2095 4.61853 15.4205 4.8295C15.6315 5.04048 15.75 5.32663 15.75 5.625V6.75H11.25V5.625ZM19.125 21.375C19.125 21.6734 19.0065 21.9595 18.7955 22.1705C18.5845 22.3815 18.2984 22.5 18 22.5H9C8.70163 22.5 8.41548 22.3815 8.2045 22.1705C7.99353 21.9595 7.875 21.6734 7.875 21.375V9H19.125V21.375ZM15.75 20.25C16.0484 20.25 16.3345 20.1315 16.5455 19.9205C16.7565 19.7095 16.875 19.4234 16.875 19.125V12.375C16.875 12.0766 16.7565 11.7905 16.5455 11.5795C16.3345 11.3685 16.0484 11.25 15.75 11.25C15.4516 11.25 15.1655 11.3685 14.9545 11.5795C14.7435 11.7905 14.625 12.0766 14.625 12.375V19.125C14.625 19.4234 14.7435 19.7095 14.9545 19.9205C15.1655 20.1315 15.4516 20.25 15.75 20.25Z" fill="white"/>
                </svg>Delete</div>
                <div className={'button'} onClick={()=>{
                    setPop_up_properties('flex')
                    set_update(false)

                }}><svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 36 35" fill="none">
                    <path d="M22.4655 16.0523L22.4759 7.19432C22.4759 6.80597 22.3196 6.43352 22.0413 6.15891C21.763 5.8843 21.3856 5.73002 20.9921 5.73002C20.5985 5.73002 20.2211 5.8843 19.9429 6.15891C19.6646 6.43352 19.5083 6.80596 19.5083 7.19432L19.5187 16.0523L10.5426 16.042C10.1491 16.042 9.77166 16.1963 9.49339 16.4709C9.21512 16.7455 9.05879 17.1179 9.05879 17.5063C9.05879 17.8947 9.21512 18.2671 9.49339 18.5417C9.77166 18.8163 10.1491 18.9706 10.5426 18.9706L19.5187 18.9603L19.5083 27.8183C19.5075 28.0108 19.5453 28.2016 19.6196 28.3796C19.6939 28.5576 19.8031 28.7193 19.9411 28.8554C20.079 28.9916 20.2429 29.0994 20.4233 29.1727C20.6037 29.246 20.797 29.2834 20.9921 29.2826C21.1872 29.2834 21.3805 29.246 21.5609 29.1727C21.7412 29.0994 21.9051 28.9916 22.0431 28.8554C22.181 28.7193 22.2903 28.5576 22.3646 28.3796C22.4389 28.2016 22.4767 28.0108 22.4759 27.8183L22.4655 18.9603L31.4415 18.9706C31.6366 18.9714 31.8299 18.934 32.0103 18.8607C32.1907 18.7874 32.3546 18.6796 32.4926 18.5435C32.6305 18.4073 32.7398 18.2456 32.814 18.0676C32.8883 17.8896 32.9262 17.6988 32.9254 17.5063C32.9262 17.3138 32.8883 17.123 32.814 16.945C32.7398 16.767 32.6305 16.6053 32.4926 16.4691C32.3546 16.333 32.1907 16.2252 32.0103 16.1519C31.8299 16.0785 31.6366 16.0412 31.4415 16.042L22.4655 16.0523Z" fill="white"/>
                </svg>
                    Product</div>
            </div>
            <div className={'companys_table_raper'}>
                <table className={'table'}>
                    <thead>
                    <tr >
                        <td><input type='checkbox'  className={'check-box'} onChange={ (base_obj)=> {
                            var list={}
                            Object.keys(checkbox).map((obj) => list[obj]=base_obj.target.checked)
                            setCheckBox(list)
                        }}/></td>
                        {bill_body_items.map((obj)=> obj.is_show?<td>{obj.input_title}</td>:''
                        )}

                        <td> GST Amount</td>
                        <td> Total Amount</td>
                    </tr>
                    </thead>
                    <tbody>
                    {table_content.length===0?bill_body_items.map(
                        (head_obj)=>head_obj.show ? <td>None</td> : ''
                    ):''}
                    {table_content.map(
                        (obj,key)=>{
                            key=obj.id
                                var total=1
                            var extra_cal=0
                                function calculate(abc){
                                let item=abc.new_product_in_frontend
                                    if(item.is_calculable){
                                        if (item.formula){
                                            if(item.formula.variable==='+'){
                                                extra_cal=extra_cal+abc.value
                                            }
                                            else if(item.formula.variable==='-'){
                                                extra_cal=extra_cal-abc.value
                                            }
                                            else if(item.formula.variable==='/'){
                                                total=total/abc.value
                                            }

                                            // total=total*obj[item.input_title]*item.formula.variable
                                            else {
                                                total='error'
                                            }
                                        }
                                        else {
                                            if(abc.value && abc.new_product_in_frontend.input_title!=="GST"){
                                                total=total*abc.value
                                            }

                                        }


                                    }
                                }
                            obj.product_properties.filter(calculate)

                                if (obj.product_properties.length>0 && bill_body_items.map((o)=>o.input_title).indexOf('GST')!==-1){
                                    let gst =obj.product_properties[bill_body_items.map((o)=>o.input_title).indexOf('GST')]?.value
                                    var gst_amount=gst?total*(gst/100):0
                                }
                                else{
                                    var gst_amount=0
                                }

                            grandTotal=grandTotal+total+gst_amount+extra_cal
                            grandGstTotal=grandGstTotal+gst_amount

                            if (checkbox[key]===undefined){
                                // console.log('hi how r u',checkbox[key])
                                setCheckBox({...checkbox,[key]:false})
                            }
                                // console.log(obj.product_properties.sort((a,b)=>a.new_product_in_frontend-b.new_product_in_frontend))

                                return(<tr key={key} id={key}  className={'table-row'}>
                                        <td><input type='checkbox'  className={'check-box'} id={key}

                                                   checked={checkbox[key]}
                                                   onChange={handelCheckBox}  /></td>

                                        {obj.product_properties.sort((a,b)=>a.new_product_in_frontend.id-b.new_product_in_frontend.id).map((head_obj,key_2)=> {
                                            return(head_obj.new_product_in_frontend.is_show ? <td onClick={handelOpen}>{head_obj.value}</td> : '')
                                        })}
                                    <td onClick={handelOpen}>{parseFloat(gst_amount).toFixed(2)}</td>
                                        {extra_cal!==0?<td onClick={handelOpen}>{
                                            parseFloat(total+gst_amount).toFixed(2)
                                        } +({extra_cal})={
                                            parseFloat(total+gst_amount+extra_cal).toFixed(2)
                                        }</td>:<td onClick={handelOpen}>{parseFloat(total+gst_amount).toFixed(2)}</td>}

                                    </tr>
                                )
                        })}
                    </tbody>
                </table>
                <div className={'total'}>
                    <table className={'table'}>
                        <thead>
                        <tr>
                            <td>Total GST Amount</td>
                            <td>Total Amount</td>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td>{  parseFloat(grandGstTotal).toFixed(2)}/-</td>
                            <td>{  parseFloat(grandTotal).toFixed(2)}/-</td>
                        </tr>
                        </tbody>
                    </table>

                </div>
            </div>
            
        </div>
    )
}


export {NewBillBody};