import '../style/Companys.css';
const table_content=[
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
    {Name:'ACC', GST_Number:'4578123JDSFH',State:'GOA',},
]

function Companys_table(){
    return(
        <div className={'companys_table_raper'}>
           <table className={'table'}>
            <thead>
            <tr>
                <td><input type='checkbox'  className={'check-box'}/></td>
                <td> Name</td>
                <td> GST Number</td>
                <td> State</td>
            </tr>
            </thead>
               <tbody>
               {table_content.map(
                   (obj)=>{
                   return(<tr>
                       <td><input type='checkbox'  className={'check-box'}/></td>
                       <td> {obj.Name}</td>
                       <td> {obj.GST_Number}</td>
                       <td> {obj.State}</td>
                       </tr>
                   )
               })}
               </tbody>
           </table>

        </div>
    )
}

export default Companys_table;

