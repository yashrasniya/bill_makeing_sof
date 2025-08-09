import '../style/box.css';
import {useEffect, useState} from "react";
import {clientToken} from "../axios";
import GrowthBar from "./GrowthBar";


function Boxes() {
    const [userInfo, setUserInfo] = useState({
        'name': '',
        month_total_final_amount: 0,
        percentage_change: 0,
        percentage_gst_amount:0,
        month_gst_final_amount:0
    })
    useEffect(() => {
        clientToken.get('user_info/').then((response) => {

            if (response.status === 200) {
                setUserInfo(response.data)
            }
        }).catch((error) => {
            console.log(error)
        })
    }, [])

    return (<div className='boxes_raper'>
            <div className={'inner_card '}>
                <div className={'card_content card-two'}>
                    <p className={'text-3xl'}>Hi {userInfo.name}</p>

                </div>
                <div className={'card_content card-two amount_div'}>
                    <p style={{fontSize: '1.4vw'}}>This month Sales </p>
                    <p className={'text-5xl'}>{userInfo?.month_total_final_amount.toLocaleString('en-IN')} ₹</p>

                </div>
                <div className={'progress_bar_wrapper pt-8'}>
                    <GrowthBar percentageChange={userInfo.percentage_change} invoices_this_month_count={'This Month Bill Count ' + userInfo.invoices_this_month_count}/>

                </div>
            </div>
            {/*<div className={'inner_card'}>*/}
            {/*    <div className={'card_content '}>*/}
            {/*        <p className={'f1'}>Discount</p>*/}
            {/*        <p className={'f2'}>20%<samp className={'f1'}>Off</samp></p>*/}
            {/*        <p className={''}>20,000 15,000/Yearly Subscription</p>*/}
            {/*    </div>*/}
            {/*    <div className={'card_content two'}>*/}
            {/*        <div style={{paddingLeft: '20px'}}>*/}
            {/*            <li>User/5 Gb Storage</li>*/}
            {/*            <li>2 Cr Monthly Limite</li>*/}
            {/*            <li>10 User</li>*/}
            {/*        </div>*/}
            {/*        <div className={'button'}>*/}
            {/*            Change Plan*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}
            <div className={'inner_card '}>
                <div className={'card_content card-two'}>

                </div>
                <div className={'card_content card-two amount_div'}>
                    <p style={{fontSize: '1.4vw'}}>This month GST </p>
                    <p className={'text-5xl'}>{userInfo?.month_gst_final_amount.toLocaleString('en-IN')} ₹</p>

                </div>
                <div className={'progress_bar_wrapper pt-8'}>
                    <GrowthBar percentageChange={userInfo.percentage_gst_amount} invoices_this_month_count={'Prv Month Bill Count ' + userInfo.invoices_prv_month_count}/>

                </div>
            </div>

        </div>
    )
}

export default Boxes;

// 'https://www.figma.com/file/vp95ns3DvIiUQbv3OFfViF/bill-software?type=design&node-id=43%3A2&mode=design&t=ejbnDqrNN1VJHiue-1'