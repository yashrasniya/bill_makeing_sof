import jsPDF from 'jspdf';
import {useRef} from "react";
import './jj.css'
const doc = new jsPDF();
const ReportTemplate = () => {
    const styles = {
        page: {
            marginLeft: '5rem',
            marginRight: '5rem',
            'page-break-after': 'always',
        },

        columnLayout: {
            display: 'flex',
            justifyContent: 'space-between',
            margin: '3rem 0 5rem 0',
            gap: '2rem',
        },

        column: {
            display: 'flex',
            flexDirection: 'column',
        },

        spacer2: {
            height: '2rem',
        },

        fullWidth: {
            width: '100%',
        },

        marginb0: {
            marginBottom: 0,
        },
    };
    return (
        <>
        <div class="head">
            <div class="gst">
                GSTIN : 05ANSPK7139D1ZU</div>
            <div class="logo"> <img src="/logo.svg" alt="logo Yash"/></div>
            <div class="reciept">
                <table class="table table-bordere">
                    <tr><td></td></tr>
                    <tr><td></td></tr>
                    <tr><td></td></tr>
                </table>
                <div>Original for Receipient <br/>Duplicate for Supplier/Transporter <br/>Triplicate for Supplier </div>
            </div>
        </div>
        <div class="title">
            <div class="head1">
                HEAD OFFICE <br/> H.O.44,Indra Nagar, Rishikesh-249201 <br/> Mob.:+91 135 2432021 E-mail : cmykarc@yahoo.co.in
            </div>
            <div class="verticle-line"></div>
            <div class="city">CITY OFFICE <br/>1-A,Astley Hall,Subhash Road ,Dehradun <br/>Mob. +91 9412413498 E-mail:cmykarc@gmail.com</div>
        </div>

        <table class="table-bordered">
            <thead>
            <tr>
                <th scope="col" colspan="6"><span>TAX INVOICE</span></th>
            </tr>
            </thead>
            <tbody>

            <tr>
                <div>
                    <td>Reverse Charge : <br/>Invoice No.: <br/>Invoice Date: <br/>
                        <div class="c">
                            <div>State: Uttarakhand</div>
                            <div><strong>State code: &emsp;&emsp;&emsp;&emsp;</strong></div>
                        </div>
                    </td>
                    <td class="transport">Transport Mode : <br/>Vehicle Number: <br/>Date Of Supply:
                        <br/> Place Of Supply
                    </td>
                </div>

            </tr>
            <tr>
                <td colspan="2">
                    <div class="det1">
                        <div>Details of Receiver/Billed to:</div>
                        <div>Details of Consignee/Shipped to: </div>
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    Name:.......................................................................................... <br/> Address:.......................................................................................... <br/>........................................................................................................... <br/> GSTIN :.............................................................................................
                    <div class="cod">
                        <div>State:....................................................</div>
                        <div>State Code:.............</div>
                    </div>
                </td>
                
                <td> Name:........................................................................................... <br/> Address:.......................................................................................... <br/>........................................................................................................... <br/> GSTIN :.............................................................................................
                    <div class="cod">
                        <div>State:....................................................</div>
                        <div>State Code:...........</div>
                    </div>
                </td>
            </tr>
        </tbody>
        </table>
    <table class="table-bordered">
        <tbody>
        <tr>
            <td class="detail1">S.No</td>
            <td class="detail2">Name Of Product</td>
            <td class="detail3">HSN Code</td>
            <td class="detail4">Qty.</td>
            <td class="detail5">Rate </td>
            <td class="detail6">Amt. </td>
        </tr>
        <tr >
            <td class="work"></td>
            <td class="work1">
                <table class="cgst">
                    <tr><td>CGST%<td>SGST%<td>IGST%</td></td></td></tr>
                    <tr><td><td><td></td></td></td></tr>
                </table>
            </td>
            <td class="work"></td>
            <td class="work"></td>
            <td class="work"><div class="total"><hr/>Total:</div></td>
            <td class="work"><div class="hr"><hr/></div></td>
        </tr>
        <tr>
            <td class="word" colspan="3">
                Total Invoice Amount Words:..................................................................................................................... <br/>...................................................................................................................................................................... <br/>...................................................................................................................................................................... <br/><div class="bank">BankDetails : </div></td>
            <td class="word3" colspan="2">Frowarding Charges <hr/> Tax Amount:GST <hr/>Total Amount After Tax</td>
            <td class="word"> <br/><hr/> <br/><hr/> <br/></td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="bank1">
                    <div>Bank Name: Allahabad Bank <br/>Branch IFSC Code : ALLA0212070</div>
                    <div>Bank Account Number:50498141066 <br/> Branch : HARIDWAR ROAD, RISHIKESH</div>
                </div>
            </td>
            <td class="word" colspan="2">GST Payable on Reverse Charge</td>
            <td class="word"></td>
        </tr>
        </tbody>
    </table>
    <div class="footer">
        <div>
            <h2>Terms & Condition</h2> <br/>
            1.Payment by payers account cheques or DD only in favour of YASH ADVERTISING GROUP payable at Rishikesh <br/>
            2.All disputes will be settled at Rishikesh jurisdiction only <br/>
            3.All jobs enclosed. <br/>
            4.Billa are payable within 15 days the date issue of the bill <br/>
            5.Interest @ 18% will be charged,if payment is not made on due date.
        </div>
        <div><table class="cg">
            <tr><td>Certified that the particular given above are true and correct.</td></tr>
        </table>
            For <strong class="b">YASH ADVERTISING GROUP</strong>
             <br/> <br/> (Authorised Signatory)</div>
    </div>
        </>
    );
};

export default function PDF(){
    const reportTemplateRef = useRef(null);

    const handleGeneratePdf = () => {
        const doc = new jsPDF({
            format: 'a2',
            unit: 'pt',

        });

        // Adding the fonts.
        doc.setFont('Inter-Regular', 'normal');

        doc.html(reportTemplateRef.current, {
            async callback(doc) {
                await doc.save('document');
            },
        });
    };

    return (
        <div>
            <button className="button" onClick={handleGeneratePdf}>
                Generate PDF
            </button>
            <div ref={reportTemplateRef}>
                <ReportTemplate />
            </div>
        </div>
    );
}