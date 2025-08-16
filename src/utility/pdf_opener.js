const PdfOpener = (response,InvoiceData,company_name) => {
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
}

export default PdfOpener;