import React, { useState } from 'react';
import { clientToken } from '../axios';

const WeasyprintPreview = () => {
    const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice Template</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
        }
        h1 {
            color: #4F46E5; /* Indigo 600 */
        }
        .invoice-box {
            border: 1px solid #eee;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <h1>Invoice #12345</h1>
        <p>Date: October 25, 2023</p>
        <p><strong>Billed To:</strong> John Doe</p>
        <hr />
        <p>Service: Web Development - $500.00</p>
        <p><strong>Total: $500.00</strong></p>
    </div>
</body>
</html>`);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const generatePdf = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await clientToken.post('/weasyprint_preview/',
                { html_content: htmlContent },
                { responseType: 'blob' }
            );

            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            setPdfUrl(fileURL);
        } catch (err) {
            console.error('Failed to generate PDF:', err);
            setError('Failed to generate PDF. Please check your HTML or server configuration.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                <h1 className="text-xl font-bold text-gray-800">WeasyPrint Template Editor</h1>
                <button
                    onClick={generatePdf}
                    disabled={isLoading}
                    className={`px-6 py-2 rounded-lg font-medium text-white transition-colors
                        ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {isLoading ? 'Generating...' : 'Preview PDF'}
                </button>
            </div>

            {/* Split Pane Container */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Side: Editor */}
                <div className="w-1/2 flex flex-col border-r bg-white">
                    <div className="bg-gray-100 px-4 py-2 border-b text-sm font-semibold text-gray-600">
                        HTML/CSS Editor
                    </div>
                    <textarea
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-gray-800 bg-gray-50 border-none focus:outline-none focus:ring-0 resize-none"
                        spellCheck="false"
                        placeholder="Type your HTML and inline CSS here..."
                    />
                </div>

                {/* Right Side: Preview */}
                <div className="w-1/2 flex flex-col bg-gray-200">
                    <div className="bg-gray-100 px-4 py-2 border-b text-sm font-semibold text-gray-600 flex justify-between items-center">
                        <span>PDF Preview</span>
                        {error && <span className="text-red-500 font-normal">{error}</span>}
                    </div>
                    <div className="flex-1 p-4 flex justify-center items-center overflow-hidden">
                        {pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full border border-gray-300 shadow-lg bg-white rounded"
                                title="PDF Preview"
                            />
                        ) : (
                            <div className="text-gray-400 flex flex-col items-center">
                                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <p>Click "Preview PDF" to generate the document</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeasyprintPreview;
