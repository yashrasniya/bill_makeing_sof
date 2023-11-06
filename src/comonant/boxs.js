import  '../style/box.css';


function Boxes(){
    return(<div className='boxes_raper'>

           <div className={'inner_card'}>
               <div className={'card_content '}>
            <p className={'f1'}>Discount</p>
            <p className={'f2'}>20%<samp className={'f1'}>Off</samp></p>
            <p className={''}>20,000 15,000/Yearly Subscription</p>
               </div>
               <div className={'card_content two'}>
                   <div style={{paddingLeft:'20px'}}>
                   <li>User/5 Gb Storage</li>
                   <li>2 Cr Monthly Limite</li>
                   <li>10 User</li></div>
                   <div className={'button'}>
                       Change Plan
                   </div>
                   </div>
               </div>



                <div className={'inner_card'}>
                    <div className={'card_content card-two'}>
                        <p className={'f1'}>Yash <br/>Rasniya</p>

                    </div>
                    <div className={'card_content card-two amount_div'}>
                        <p style={{fontSize:'1.4vw'}}>This month Sales </p>
                        <p className={'f3'}>100 ₹</p>

                    </div>
                    <div className={'progress_bar_wrapper'}>
                        <p className={''}>35% Left Monthly Target </p>
                        <div className={'gray'}>
                            <div className={'blue'}></div>
                        </div>

                    </div>
                </div>
    </div>
    )
}

export default Boxes;

// 'https://www.figma.com/file/vp95ns3DvIiUQbv3OFfViF/bill-software?type=design&node-id=43%3A2&mode=design&t=ejbnDqrNN1VJHiue-1'