import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clientToken } from '../axios';

const initialElements = [
    { id: '1', type: 'text', content: 'INVOICE', x: 40, y: 40, fontSize: 32, color: '#4F46E5', fontWeight: 'bold' },
    { id: '2', type: 'text', content: 'Date: Oct 25, 2026', x: 40, y: 80, fontSize: 14, color: '#333333', fontWeight: 'normal' },
    { id: '3', type: 'text', content: 'Billed To:\nAcme Corp', x: 40, y: 140, fontSize: 13, color: '#000000', fontWeight: 'normal' },
    { id: '4', type: 'line', x: 40, y: 110, width: 515, height: 2, backgroundColor: '#eeeeee' },
    { id: '5', type: 'text', content: 'Total: $500.00', x: 400, y: 200, fontSize: 18, color: '#000000', fontWeight: 'bold' },
];

const COLUMN_PLACEHOLDERS = [
    { name: "Sr. No", value: "{{ forloop.counter }}" },
    { name: "Item Name", value: "{{ product.props.item }}" },
    { name: "Item Desc", value: "{{ product.props.description }}" },
    { name: "Quantity", value: "{{ product.props.quantity }}" },
    { name: "Rate", value: "{{ product.props.rate }}" },
    { name: "Total", value: "{{ product.total_amount }}" }
];

const ALL_PLACEHOLDERS = [
    {
        category: "Invoice Details",
        items: [
            { label: "Invoice Number", token: "{{ invoice.invoice_number }}", desc: "Unique identifier of the invoice" },
            { label: "Invoice Date", token: "{{ invoice.date }}", desc: "Date of issue" },
            { label: "Due Date", token: "{{ invoice.due_date }}", desc: "Payment due date" },
            { label: "Total Final Amount", token: "{{ invoice.total_final_amount }}", desc: "Total amount including taxes" },
            { label: "GST Final Amount", token: "{{ invoice.gst_final_amount }}", desc: "Total accumulated tax amount" }
        ]
    },
    {
        category: "Client / Receiver Details",
        items: [
            { label: "Client Name", token: "{{ invoice.receiver_name }}", desc: "Name of the client/buyer" },
            { label: "Client Address", token: "{{ invoice.receiver_address }}", desc: "Billing/shipping address of the client" },
            { label: "Client Phone", token: "{{ invoice.receiver_phone }}", desc: "Contact number of the client" },
            { label: "Client Email", token: "{{ invoice.receiver_email }}", desc: "Email address of the client" }
        ]
    },
    {
        category: "Company / Sender Details",
        items: [
            { label: "Company Logo", token: "{{ company.company_logo }}", desc: "URL of your company logo" },
            { label: "Company Name", token: "{{ company.company_name }}", desc: "Your registered company name" },
            { label: "Company Address", token: "{{ company.company_address }}", desc: "Your company address" },
            { label: "Company Phone", token: "{{ company.company_phone }}", desc: "Your company phone number" },
            { label: "Company Email", token: "{{ company.company_email }}", desc: "Your company email address" },
            { label: "Company GST Number", token: "{{ company.company_gst_number }}", desc: "Your company GSTIN" }
        ]
    },
    {
        category: "Footer & Tax Totals",
        items: [
            { label: "Subtotal (Without GST)", token: "{{ footer.total_amount_with_out_gst }}", desc: "Subtotal before tax additions" },
            { label: "Taxable + Non-GST Charges", token: "{{ footer.total_taxable_amount_with_extra_non_gst }}", desc: "Total taxable plus non-GST additions" },
            { label: "Total GST Amount", token: "{{ footer.gst_amount }}", desc: "Total tax calculated" },
            { label: "Grand Total (With GST)", token: "{{ footer.total_amount_with_gst }}", desc: "Final payable amount" },
            { label: "Grand Total in Words", token: "{{ footer.total_amount_in_text }}", desc: "Payable amount written out in text" },
            { label: "CGST Amount", token: "{{ footer.center_gst_amount }}", desc: "Central GST amount (50% of total GST)" },
            { label: "SGST Amount", token: "{{ footer.state_gst_amount }}", desc: "State GST amount (50% of total GST)" },
            { label: "Average GST %", token: "{{ footer.gst }}", desc: "Average tax rate" },
            { label: "CGST %", token: "{{ footer.center_gst }}", desc: "Central GST rate" },
            { label: "SGST %", token: "{{ footer.state_gst }}", desc: "State GST rate" }
        ]
    }
];

const generateTableHtml = (el) => {
    const columns = el.columns || [
        { label: "Sr. No", value: "{{ forloop.counter }}", width: "10%" },
        { label: "Item Description", value: "<b>{{ product.props.item|default:product.props.description }}</b>" },
        { label: "Qty", value: "{{ product.props.quantity }}" },
        { label: "Rate", value: "{{ product.props.rate }}" },
        { label: "Total", value: "{{ product.total_amount }}", align: "right" }
    ];
    const headerBg = el.headerBgColor || '#f3f4f6';
    const headerText = el.headerTextColor || '#000000';
    const textCol = el.textColor || '#333333';
    const borderCol = el.borderColor || '#e5e7eb';
    const fs = el.fontSize || 12;

    let ths = '';
    let tds = '';
    columns.forEach(col => {
        const align = col.align === 'right' ? 'text-align: right;' : 'text-align: left;';
        const w = col.width ? `width: ${col.width};` : '';
        ths += `<th style="padding: 6px; color: ${headerText}; ${align} ${w}">${col.label}</th>\n`;
        tds += `<td style="padding: 6px; color: ${textCol}; ${align}">${col.value}</td>\n`;
    });

    return `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: ${fs}px; font-family: sans-serif; border: 1px solid ${borderCol};">
  <thead>
    <tr style="background-color: ${headerBg}; border-bottom: 2px solid ${borderCol};">
      ${ths}
    </tr>
  </thead>
  <tbody>
    {% for product in invoice.products %}
    <tr style="border-bottom: 1px solid ${borderCol};">
      ${tds}
    </tr>
    {% endfor %}
  </tbody>
</table>`;
};

const WeasyprintPreview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const urlId = queryParams.get('id');

    // ── Editor State ──
    const [elements, setElements] = useState(() => {
        const saved = localStorage.getItem('weasyprint_layout');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved layout', e); }
        }
        return initialElements;
    });

    const [selectedId, setSelectedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
    const [resizeStartPointer, setResizeStartPointer] = useState({ x: 0, y: 0 });

    const [isRotating, setIsRotating] = useState(false);
    const [rotateCenter, setRotateCenter] = useState({ x: 0, y: 0 });
    const [rotateStartAngle, setRotateStartAngle] = useState(0);
    const [rotateStartElementAngle, setRotateStartElementAngle] = useState(0);

    // ── PDF State ──
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Backend State ──
    const [templateId, setTemplateId] = useState(null);
    const [templateName, setTemplateName] = useState("Untitled Template");
    const [isSaving, setIsSaving] = useState(false);
    const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);

    const canvasRef = useRef(null);

    // ── Preview Dummy Data Toggle & Helper ──
    const [showPreviewData, setShowPreviewData] = useState(true);
    const [companyInfo, setCompanyInfo] = useState(null);

    React.useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const response = await clientToken.get("user-companies/");
                if (response.status === 200) {
                    setCompanyInfo(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch company info", err);
            }
        };
        fetchCompanyInfo();
    }, []);

    const selectedEl = elements.find(el => el.id === selectedId);

    // Auto-enrich product_table element with metadata if missing
    React.useEffect(() => {
        if (selectedEl && selectedEl.type === 'product_table' && !selectedEl.columns) {
            const defaultCols = [
                { label: "Sr. No", value: "{{ forloop.counter }}", width: "10%" },
                { label: "Item Description", value: "<b>{{ product.props.item|default:product.props.description }}</b>" },
                { label: "Qty", value: "{{ product.props.quantity }}" },
                { label: "Rate", value: "{{ product.props.rate }}" },
                { label: "Total", value: "{{ product.total_amount }}", align: "right" }
            ];
            setElements(elements.map(el => el.id === selectedEl.id ? {
                ...el,
                columns: defaultCols,
                headerBgColor: '#f3f4f6',
                headerTextColor: '#000000',
                textColor: '#333333',
                borderColor: '#e5e7eb',
                fontSize: 12
            } : el));
        }
    }, [selectedId, selectedEl, elements]);

    const updateTableProperty = (key, value, currentEl) => {
        const updatedEl = { ...currentEl, [key]: value };
        const newContent = generateTableHtml(updatedEl);
        setElements(elements.map(el => el.id === currentEl.id ? { ...updatedEl, content: newContent } : el));
    };

    const getPreviewContent = (content, type) => {
        if (!showPreviewData || !content) return content;

        const companyName = companyInfo?.company_name || 'Acme Corporation';
        const companyLogo = companyInfo?.company_logo || 'https://via.placeholder.com/150';
        const companyAddress = companyInfo?.company_address || '123 Business Lane, Suite 100, Financial District';
        const companyPhone = companyInfo?.company_phone || '+1 (555) 019-2834';
        const companyEmail = companyInfo?.company_email_id || 'billing@acme.com';
        const companyGst = companyInfo?.company_gst_number || '22AAAAA0000A1Z5';

        if (type === 'text') {
            let result = content;
            result = result.replace(/\{\{\s*invoice\.invoice_number\s*\}\}/g, 'INV-2026-0001');
            result = result.replace(/\{\{\s*invoice\.date\s*\}\}/g, 'Oct 25, 2026');
            result = result.replace(/\{\{\s*invoice\.total_final_amount\s*\}\}/g, '1,180.00');
            result = result.replace(/\{\{\s*invoice\.receiver_name\s*\}\}/g, 'Acme Client Corp');
            result = result.replace(/\{\{\s*company\.company_name\s*\}\}/g, companyName);
            result = result.replace(/\{\{\s*company\.company_logo\s*\}\}/g, companyLogo);
            return result;
        }

        if (type === 'product_table' || type === 'html') {
            let result = content;

            // Strip style tags so they don't contaminate the editor page's styling
            // result = result.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
            result = result.replace(
                /<style[^>]*>[\s\S]*?@page[\s\S]*?<\/style>/gi,

                ''
            );

            // Resolve company logo if block
            const ifLogoRegex = /\{%\s*if\s+company\.company_logo\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;
            result = result.replace(ifLogoRegex, '$1');

            // Match loops like {% for product in invoice.products %} ... {% endfor %} or {% for product in products_data %} ... {% endfor %}
            const loopRegex = /\{%\s*for\s+product\s+in\s+(?:invoice\.products|products_data)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g;
            if (loopRegex.test(result)) {
                result = result.replace(loopRegex, (match, innerTemplate) => {
                    const products = [
                        { counter: 1, item: 'Web Development Services', description: 'Frontend UI Design & API Integration', qty: 1, rate: 800, total: 800, amount: 800 },
                        { counter: 2, item: 'Cloud Hosting Setup', description: 'AWS Deployment & Configuration', qty: 2, rate: 100, total: 200, amount: 200 }
                    ];
                    return products.map(p => {
                        let row = innerTemplate;
                        row = row.replace(/\{\{\s*forloop\.counter\s*\}\}/g, p.counter);
                        row = row.replace(/\{\{\s*product\.props\.item\|default:product\.props\.description\s*\}\}/g, p.item);
                        row = row.replace(/\{\{\s*product\.props\.item\s*\}\}/g, p.item);
                        row = row.replace(/\{\{\s*product\.props\.description\s*\}\}/g, p.description);
                        row = row.replace(/\{\{\s*product\.props\.quantity\s*\}\}/g, p.qty);
                        row = row.replace(/\{\{\s*product\.props\.rate\s*\}\}/g, p.rate);
                        row = row.replace(/\{\{\s*product\.total_amount\s*\}\}/g, p.total);
                        // Also support direct properties (for products_data):
                        row = row.replace(/\{\{\s*product\.item\|default:product\.description\s*\}\}/g, p.item);
                        row = row.replace(/\{\{\s*product\.item\s*\}\}/g, p.item);
                        row = row.replace(/\{\{\s*product\.description\s*\}\}/g, p.description);
                        row = row.replace(/\{\{\s*product\.quantity\|default:"[^"]*"\s*\}\}/g, p.qty);
                        row = row.replace(/\{\{\s*product\.quantity\s*\}\}/g, p.qty);
                        row = row.replace(/\{\{\s*product\.rate\|default:"[^"]*"\s*\}\}/g, p.rate);
                        row = row.replace(/\{\{\s*product\.rate\s*\}\}/g, p.rate);
                        row = row.replace(/\{\{\s*product\.amount\|default:"[^"]*"\s*\}\}/g, p.amount);
                        row = row.replace(/\{\{\s*product\.amount\s*\}\}/g, p.amount);
                        return row;
                    }).join('');
                });
            }

            // Replace standard scalar placeholders
            result = result.replace(/\{\{\s*invoice\.invoice_number\s*\}\}/g, 'INV-2026-0001');
            result = result.replace(/\{\{\s*invoice\.date\s*\}\}/g, 'Oct 25, 2026');
            result = result.replace(/\{\{\s*invoice\.total_final_amount\s*\}\}/g, '1,180.00');
            result = result.replace(/\{\{\s*invoice\.receiver_name\s*\}\}/g, 'Acme Client Corp');
            result = result.replace(/\{\{\s*company\.company_name\s*\}\}/g, companyName);
            result = result.replace(/\{\{\s*company\.company_logo\s*\}\}/g, companyLogo);
            result = result.replace(/\{\{\s*company\.company_address\s*\}\}/g, companyAddress);
            result = result.replace(/\{\{\s*company\.company_phone\s*\}\}/g, companyPhone);
            result = result.replace(/\{\{\s*company\.company_email\s*\}\}/g, companyEmail);
            result = result.replace(/\{\{\s*company\.gst_number\s*\}\}/g, companyGst);
            result = result.replace(/\{\{\s*company\.company_gst_number\s*\}\}/g, companyGst);

            // Footer data placeholders
            result = result.replace(/\{\{\s*footer\.total_amount_with_out_gst\s*\}\}/g, '1,000.00');
            result = result.replace(/\{\{\s*footer\.gst\s*\}\}/g, '18');
            result = result.replace(/\{\{\s*footer\.gst_amount\s*\}\}/g, '180.00');
            result = result.replace(/\{\{\s*footer\.total_amount_with_gst\s*\}\}/g, '1,180.00');
            result = result.replace(/\{\{\s*footer\.total_amount_in_text\s*\}\}/g, 'One Thousand One Hundred Eighty Rupees Only');

            // Strip any remaining django template tags (like {% ... %})
            result = result.replace(/\{%.*?%\}/g, '');
            return result;
        }
        return content;
    };

    // ── Local Storage & Cloud Persistence ──
    React.useEffect(() => {
        const fetchCloudTemplate = async () => {
            try {
                let endpoint = '/yaml/?is_html=true';
                if (urlId) endpoint += `&id=${urlId}`;
                
                const response = await clientToken.get(endpoint);
                if (response.data && response.data.id) {
                    setTemplateId(response.data.id);
                    if (response.data.template_name) {
                        setTemplateName(response.data.template_name);
                    }
                    if (response.data.elements && response.data.elements.length > 0) {
                        setElements(response.data.elements);
                    }
                }
            } catch (err) {
                console.log("No cloud template found, using local fallback.");
            }
        };
        fetchCloudTemplate();
    }, []);

    React.useEffect(() => {
        localStorage.setItem('weasyprint_layout', JSON.stringify(elements));
    }, [elements]);

    const saveTemplateToCloud = async () => {
        setIsSaving(true);
        try {
            const htmlContent = generateHTMLString();
            if (templateId) {
                await clientToken.put('/yaml/', { id: templateId, template_name: templateName, is_html: true, elements, html_content: htmlContent });
                alert("Template successfully saved to cloud!");
            } else {
                const response = await clientToken.post('/yaml/', { template_name: templateName, is_html: true, elements, html_content: htmlContent });
                if (response.data && response.data.id) {
                    setTemplateId(response.data.id);
                    alert("Template successfully saved to cloud!");
                }
            }
        } catch (err) {
            console.error("Failed to save to cloud", err);
            alert("Failed to save template to the cloud.");
        } finally {
            setIsSaving(false);
        }
    };

    // ── HTML Compiler ──
    const generateHTMLString = () => {
        let innerHtml = '';
        elements.forEach(el => {
            if (el.type === 'text') {
                const fs = el.fontSize || 14;
                const fw = el.fontWeight || 'normal';
                const c = el.color || '#000000';
                const ff = el.fontFamily || 'Arial, sans-serif';
                const ta = el.textAlign || 'left';
                const fst = el.fontStyle || 'normal';
                const td = el.textDecoration || 'none';
                const lh = el.lineHeight || 1.2;
                const ls = el.letterSpacing ? `letter-spacing: ${el.letterSpacing}px; ` : '';
                const rot = el.rotate ? `transform: rotate(${el.rotate}deg); transform-origin: center; ` : '';
                const formattedContent = (el.content || '').replace(/\n/g, '<br>');
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; font-size: ${fs}px; color: ${c}; font-weight: ${fw}; font-family: ${ff}; text-align: ${ta}; font-style: ${fst}; text-decoration: ${td}; line-height: ${lh}; ${ls}${rot}white-space: pre-wrap;">${formattedContent}</div>\n`;
            } else if (el.type === 'line') {
                const w = el.width || 100;
                const h = el.height || 2;
                const bg = el.backgroundColor || 'transparent';
                const br = el.borderRadius ? `border-radius: ${el.borderRadius}px; ` : '';
                const bw = el.borderWidth ? `border-width: ${el.borderWidth}px; ` : '';
                const bc = el.borderColor ? `border-color: ${el.borderColor}; ` : '';
                const bs = el.borderStyle && el.borderStyle !== 'none' ? `border-style: ${el.borderStyle}; ` : '';
                const rot = el.rotate ? `transform: rotate(${el.rotate}deg); transform-origin: center; ` : '';
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px; background-color: ${bg}; ${br}${bw}${bc}${bs}${rot}"></div>\n`;
            } else if (el.type === 'html' || el.type === 'product_table') {
                const w = el.width || 200;
                const h = el.height || 100;
                const rot = el.rotate ? `transform: rotate(${el.rotate}deg); transform-origin: center; ` : '';
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px; ${rot}">${el.content || ''}</div>\n`;
            } else if (el.type === 'image') {
                const w = el.width || 100;
                const h = el.height || 100;
                const src = el.url || 'https://via.placeholder.com/150';
                const rot = el.rotate ? `transform: rotate(${el.rotate}deg); transform-origin: center; ` : '';
                innerHtml += `<img src="${src}" style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px; object-fit: contain; ${rot}" />\n`;
            }
        });

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Generated PDF</title>
    <style>
        @page { size: 595px 842px; margin: 0; }
        body { margin: 0; padding: 0; width: 595px; height: 842px; position: relative; background: white; }
        * { box-sizing: border-box; }
    </style>
</head>
<body>
${innerHtml}
</body>
</html>`;
    };

    const generatePdf = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const htmlContent = generateHTMLString();
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

    // ── Pointer Event Handlers for D&D ──
    const handlePointerDown = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(id);

        const el = elements.find(el => el.id === id);
        if (!el || !canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Calculate offset from mouse click relative to the elements top-left corner
        setDragOffset({
            x: (e.clientX - canvasRect.left) - el.x,
            y: (e.clientY - canvasRect.top) - el.y
        });
        setIsDragging(true);

        // Capture pointer events beyond the element bounds
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (isRotating && selectedId) {
            const currentRad = Math.atan2(e.clientY - rotateCenter.y, e.clientX - rotateCenter.x);
            const currentDeg = currentRad * (180 / Math.PI) + 90;
            const deltaAngle = currentDeg - rotateStartAngle;
            let newAngle = Math.round(rotateStartElementAngle + deltaAngle) % 360;
            if (newAngle < 0) newAngle += 360;

            setElements(elements.map(el => el.id === selectedId ? { ...el, rotate: newAngle } : el));
            return;
        }

        if (isResizing && selectedId) {
            const deltaX = e.clientX - resizeStartPointer.x;
            const deltaY = e.clientY - resizeStartPointer.y;
            const newWidth = Math.max(10, resizeStartSize.width + deltaX);
            const newHeight = Math.max(10, resizeStartSize.height + deltaY);
            
            setElements(elements.map(el => {
                if (el.id === selectedId) {
                    const updated = { ...el, width: Math.round(newWidth), height: Math.round(newHeight) };
                    if (el.type === 'product_table') {
                        updated.content = generateTableHtml(updated);
                    }
                    return updated;
                }
                return el;
            }));
            return;
        }

        if (!isDragging || !selectedId || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();

        const newX = (e.clientX - canvasRect.left) - dragOffset.x;
        const newY = (e.clientY - canvasRect.top) - dragOffset.y;

        setElements(elements.map(el => el.id === selectedId ? { ...el, x: Math.round(newX), y: Math.round(newY) } : el));
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            setIsDragging(false);
            if (e.target.releasePointerCapture) {
                e.target.releasePointerCapture(e.pointerId);
            }
        }
        if (isResizing) {
            setIsResizing(false);
            if (e.target.releasePointerCapture) {
                e.target.releasePointerCapture(e.pointerId);
            }
        }
        if (isRotating) {
            setIsRotating(false);
            if (e.target.releasePointerCapture) {
                e.target.releasePointerCapture(e.pointerId);
            }
        }
    };

    const handleResizeStart = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(id);

        const el = elements.find(el => el.id === id);
        if (!el) return;

        setIsResizing(true);
        setResizeStartSize({
            width: el.width || 100,
            height: el.height || 100
        });
        setResizeStartPointer({
            x: e.clientX,
            y: e.clientY
        });

        e.target.setPointerCapture(e.pointerId);
    };

    const handleRotateStart = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(id);

        const el = elements.find(el => el.id === id);
        if (!el) return;

        const domEl = document.getElementById(`canvas-el-${id}`);
        if (!domEl) return;

        const rect = domEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        setIsRotating(true);
        setRotateCenter({ x: centerX, y: centerY });

        const startRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const startDeg = startRad * (180 / Math.PI) + 90;
        setRotateStartAngle(startDeg);
        setRotateStartElementAngle(el.rotate || 0);

        e.target.setPointerCapture(e.pointerId);
    };

    // Deselect if clicking the empty canvas
    const handleCanvasClick = () => {
        setSelectedId(null);
    };

    // ── Element Actions ──
    const updateSelected = (key, value) => {
        if (!selectedId) return;
        setElements(elements.map(el => el.id === selectedId ? { ...el, [key]: value } : el));
    };

    const deleteSelected = () => {
        if (!selectedId) return;
        setElements(elements.filter(el => el.id !== selectedId));
        setSelectedId(null);
    };

    const addElement = (type) => {
        const newId = Date.now().toString();
        if (type === 'text') {
            setElements([...elements, { id: newId, type: 'text', content: 'New Text', x: 50, y: 50, fontSize: 14, color: '#000000', fontWeight: 'normal' }]);
        } else if (type === 'line') {
            setElements([...elements, { 
                id: newId, 
                type: 'line', 
                x: 50, 
                y: 50, 
                width: 200, 
                height: 2, 
                backgroundColor: '#000000',
                borderRadius: 0,
                borderWidth: 0,
                borderColor: '#000000',
                borderStyle: 'none'
            }]);
        } else if (type === 'html') {
            setElements([...elements, { id: newId, type: 'html', content: '<div>Your custom HTML</div>', x: 50, y: 50, width: 300, height: 100 }]);
        } else if (type === 'image') {
            setElements([...elements, { id: newId, type: 'image', url: 'https://via.placeholder.com/150', x: 50, y: 50, width: 100, height: 100 }]);
        } else if (type === 'product_table') {
            const defaultCols = [
                { label: "Sr. No", value: "{{ forloop.counter }}", width: "10%" },
                { label: "Item Description", value: "<b>{{ product.props.item|default:product.props.description }}</b>" },
                { label: "Qty", value: "{{ product.props.quantity }}" },
                { label: "Rate", value: "{{ product.props.rate }}" },
                { label: "Total", value: "{{ product.total_amount }}", align: "right" }
            ];
            const defaultMetadata = {
                columns: defaultCols,
                headerBgColor: '#f3f4f6',
                headerTextColor: '#000000',
                textColor: '#333333',
                borderColor: '#e5e7eb',
                fontSize: 12
            };
            const tableHtml = generateTableHtml(defaultMetadata);
            setElements([...elements, { 
                id: newId, 
                type: 'product_table', 
                content: tableHtml, 
                x: 20, 
                y: 250, 
                width: 550, 
                height: 200,
                ...defaultMetadata
            }]);
        }
        setSelectedId(newId);
    };

    const duplicateSelected = () => {
        if (!selectedId) return;
        const target = elements.find(el => el.id === selectedId);
        if (!target) return;
        const newEl = { ...target, id: Date.now().toString(), x: target.x + 10, y: target.y + 10 };
        setElements([...elements, newEl]);
        setSelectedId(newEl.id);
    };

    const importFullHtmlTemplate = () => {
        const confirm = window.confirm("This will overwrite your entire existing visual layout and replace it with a single HTML block. Are you sure you want to continue?");
        if (confirm) {
            const newId = Date.now().toString();
            setElements([{ id: newId, type: 'html', content: '<!-- Paste your full HTML template here. This block covers the entire page. -->\n<div style="padding: 40px; font-family: sans-serif;">\n  <h1>New Template</h1>\n</div>', x: 0, y: 0, width: 595, height: 842 }]);
            setSelectedId(newId);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-gray-800 font-sans">
            {/* ── Header ── */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
                <div className="flex flex-col gap-1">
                    <input 
                        type="text" 
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="text-xl font-bold bg-clip-text text-indigo-700 bg-transparent border-b-2 border-transparent hover:border-indigo-200 focus:border-indigo-500 focus:outline-none focus:text-indigo-900 transition-all px-1 py-0.5 -ml-1"
                        placeholder="Template Name"
                    />
                    <p className="text-sm text-gray-500">Design your invoice visually for WeasyPrint PDF</p>
                </div>
                <div className="flex gap-3 items-center">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-2.5 rounded-xl border cursor-pointer hover:bg-gray-100 transition-all select-none">
                        <input
                            type="checkbox"
                            checked={showPreviewData}
                            onChange={(e) => setShowPreviewData(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span>Preview Dummy Data</span>
                    </label>
                    <button
                        onClick={saveTemplateToCloud}
                        disabled={isSaving}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-indigo-100 text-indigo-600 transition-all shadow-sm
                            ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50 active:scale-95'}`}
                    >
                        {isSaving ? 'Saving...' : '💾 Save to Cloud'}
                    </button>
                    <button
                        onClick={generatePdf}
                        disabled={isLoading}
                        className={`px-6 py-2.5 rounded-xl font-semibold text-white transition-all shadow-sm
                            ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:transform active:scale-95'}`}
                    >
                        {isLoading ? 'Generating PDF...' : 'Preview PDF Live'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ── Canvas Area (Left Side) ── */}
                <div className="flex-1 bg-gray-100 overflow-auto p-4 sm:p-8">
                    <div className="w-fit h-fit mx-auto">
                        {/* A4 Canvas Scale Wrapper (fixed exactly to A4 72dpi size) */}
                        <div
                            ref={canvasRef}
                            onPointerDown={handleCanvasClick}
                            className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden shrink-0"
                            style={{ width: '595px', height: '842px', touchAction: 'none' }}
                        >
                            {/* Grid Pattern Background for visual aid */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                                backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                                backgroundSize: '20px 20px',
                                opacity: 0.5
                            }}></div>

                            {elements.map(el => {
                                const isSelected = selectedId === el.id;
                                return (
                                    <div
                                        key={el.id}
                                        id={`canvas-el-${el.id}`}
                                        onPointerDown={(e) => handlePointerDown(e, el.id)}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerUp}
                                        className={`absolute cursor-move select-none ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : 'hover:ring-1 hover:ring-gray-300'}`}
                                        style={{
                                            left: el.x,
                                            top: el.y,
                                            ...(el.type === 'text' ? {
                                                fontSize: el.fontSize,
                                                color: el.color,
                                                fontWeight: el.fontWeight,
                                                fontFamily: el.fontFamily || 'Arial, sans-serif',
                                                textAlign: el.textAlign || 'left',
                                                fontStyle: el.fontStyle || 'normal',
                                                textDecoration: el.textDecoration || 'none',
                                                lineHeight: el.lineHeight || 1.2,
                                                letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                                                whiteSpace: 'pre-wrap'
                                            } : {
                                                width: el.width,
                                                height: el.height,
                                                backgroundColor: el.backgroundColor || 'transparent',
                                                borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                                                borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
                                                borderColor: el.borderColor || undefined,
                                                borderStyle: el.borderStyle || undefined,
                                            }),
                                            // Visual aid to make dragging shapes easier if they are thin
                                            padding: el.type === 'line' && el.height <= 2 ? '5px 0' : '0',
                                            backgroundClip: 'content-box',
                                            overflow: el.type === 'html' ? 'hidden' : 'visible',
                                            transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
                                            transformOrigin: 'center'
                                        }}
                                    >
                                        {el.type === 'html' || el.type === 'product_table' ? (
                                            <iframe
                                                srcDoc={`<!DOCTYPE html><html><head><style>html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; width: 100%; height: 100%; }</style></head><body>${getPreviewContent(el.content, el.type)}</body></html>`}
                                                className="w-full h-full border-none pointer-events-none"
                                                title={`sandbox-${el.id}`}
                                            />
                                        ) : el.type === 'text' ? (
                                            getPreviewContent(el.content, el.type)
                                        ) : el.type === 'image' ? (
                                            <img src={showPreviewData && el.url && el.url.includes('{{ company.company_logo }}') ? (companyInfo?.company_logo || 'https://via.placeholder.com/150') : el.url} className="w-full h-full object-contain pointer-events-none" alt="element" />
                                        ) : null}
                                        {/* Resize Handle */}
                                        {isSelected && el.type !== 'text' && (
                                            <div
                                                onPointerDown={(e) => handleResizeStart(e, el.id)}
                                                className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-600 border border-white cursor-se-resize z-20 hover:scale-125 transition-transform"
                                                style={{ transform: 'translate(50%, 50%)', borderRadius: '50%' }}
                                            />
                                        )}
                                        {/* Rotate Handle */}
                                        {isSelected && (
                                            <div 
                                                className="absolute left-1/2 -top-7 flex flex-col items-center -translate-x-1/2 z-20 pointer-events-auto select-none touch-none"
                                            >
                                                <div className="w-[1px] h-3 bg-indigo-500" />
                                                <div
                                                    onPointerDown={(e) => handleRotateStart(e, el.id)}
                                                    className="w-[20px] h-[20px] bg-white border border-indigo-600 rounded-full cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-lg hover:shadow-indigo-100"
                                                    title="Drag to rotate"
                                                >
                                                    <svg className="w-2.5 h-2.5 text-indigo-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Properties Sidebar / PDF Preview Area (Right Side) ── */}
                <div className="w-[380px] flex flex-col bg-white border-l z-10 shrink-0">

                    {/* Tabs for Sidebar logic */}
                    <div className="flex border-b">
                        <button className={`flex-1 py-3 text-sm font-semibold ${!pdfUrl ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setPdfUrl(null)}>
                            Properties Panel
                        </button>
                        <button className={`flex-1 py-3 text-sm font-semibold ${pdfUrl ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => { if (!pdfUrl) generatePdf(); }}>
                            Compiled PDF
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {!pdfUrl ? (
                            <div className="p-6">
                                {/* Tools Section */}
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Add Elements</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => addElement('text')} className="flex-1 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium whitespace-nowrap">
                                            + Text
                                        </button>
                                        <button onClick={() => addElement('line')} className="flex-1 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium whitespace-nowrap">
                                            + Shape
                                        </button>
                                        <button onClick={() => addElement('image')} className="flex-1 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium whitespace-nowrap">
                                            + Image
                                        </button>
                                        <button onClick={() => addElement('product_table')} className="flex-1 py-2 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium whitespace-nowrap">
                                            + Line Items
                                        </button>
                                        <button onClick={() => addElement('html')} className="w-full py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                                            + Raw HTML
                                        </button>
                                    </div>
                                    <button onClick={importFullHtmlTemplate} className="w-full mt-2 py-2 text-sm bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 font-semibold border border-rose-200">
                                        ⚠️ Import Full HTML Template
                                    </button>
                                </div>

                                {selectedEl ? (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-bold text-gray-800">Edit {selectedEl.type === 'text' ? 'Text' : selectedEl.type === 'html' ? 'HTML Block' : 'Shape'}</h3>
                                            <div className="flex gap-2">
                                                <button onClick={duplicateSelected} className="text-xs text-indigo-600 hover:underline">Duplicate</button>
                                                <button onClick={deleteSelected} className="text-xs text-red-600 hover:underline">Delete</button>
                                            </div>
                                        </div>

                                        {/* Common Properties */}
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">X Position (px)</label>
                                                <input type="number" value={selectedEl.x} onChange={e => updateSelected('x', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Y Position (px)</label>
                                                <input type="number" value={selectedEl.y} onChange={e => updateSelected('y', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3 mb-4">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-xs font-bold text-gray-700">Rotation</label>
                                                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">{selectedEl.rotate || 0}°</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="360" 
                                                    value={selectedEl.rotate || 0} 
                                                    onChange={e => updateSelected('rotate', Number(e.target.value))} 
                                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none" 
                                                />
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="360" 
                                                    value={selectedEl.rotate || 0} 
                                                    onChange={e => updateSelected('rotate', Number(e.target.value))} 
                                                    className="w-16 text-center text-sm p-1.5 border rounded-md shadow-sm bg-white" 
                                                />
                                            </div>

                                            <div className="flex gap-1.5 justify-between">
                                                <button onClick={() => updateSelected('rotate', 0)} className="flex-1 py-1 text-[11px] bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition font-medium">0°</button>
                                                <button onClick={() => updateSelected('rotate', 90)} className="flex-1 py-1 text-[11px] bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition font-medium">90°</button>
                                                <button onClick={() => updateSelected('rotate', 180)} className="flex-1 py-1 text-[11px] bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition font-medium">180°</button>
                                                <button onClick={() => updateSelected('rotate', 270)} className="flex-1 py-1 text-[11px] bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition font-medium">270°</button>
                                            </div>
                                        </div>

                                        {/* Text Properties */}
                                        {selectedEl.type === 'text' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Content</label>
                                                    <textarea
                                                        value={selectedEl.content}
                                                        onChange={e => updateSelected('content', e.target.value)}
                                                        className="w-full text-sm p-2 border rounded-md h-24 resize-none mb-1"
                                                    />
                                                    <div className="flex flex-wrap gap-1">
                                                        <button onClick={() => updateSelected('content', (selectedEl.content || '') + '{{ invoice.invoice_number }}')} className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded hover:bg-blue-100">+ Invoice No.</button>
                                                        <button onClick={() => updateSelected('content', (selectedEl.content || '') + '{{ invoice.date }}')} className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded hover:bg-blue-100">+ Date</button>
                                                        <button onClick={() => updateSelected('content', (selectedEl.content || '') + '₹{{ invoice.total_final_amount }}')} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded hover:bg-emerald-100">+ Total Amount</button>
                                                        <button onClick={() => updateSelected('content', (selectedEl.content || '') + '{{ invoice.receiver_name }}')} className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded hover:bg-amber-100">+ Client Name</button>
                                                        <button onClick={() => updateSelected('content', (selectedEl.content || '') + '{{ company.company_name }}')} className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded hover:bg-purple-100">+ Company Name</button>
                                                        <button 
                                                            onClick={() => setShowSuggestionsModal(true)} 
                                                            className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
                                                        >
                                                            🔍 View All Suggestions
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Font Size (px)</label>
                                                        <input type="number" value={selectedEl.fontSize} onChange={e => updateSelected('fontSize', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Color</label>
                                                        <input type="color" value={selectedEl.color} onChange={e => updateSelected('color', e.target.value)} className="w-full h-[38px] p-1 border rounded-md" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Font Weight</label>
                                                        <select value={selectedEl.fontWeight || 'normal'} onChange={e => updateSelected('fontWeight', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                            <option value="normal">Normal</option>
                                                            <option value="bold">Bold</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Font Style</label>
                                                        <select value={selectedEl.fontStyle || 'normal'} onChange={e => updateSelected('fontStyle', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                            <option value="normal">Normal</option>
                                                            <option value="italic">Italic</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Text Align</label>
                                                        <select value={selectedEl.textAlign || 'left'} onChange={e => updateSelected('textAlign', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                            <option value="left">Left</option>
                                                            <option value="center">Center</option>
                                                            <option value="right">Right</option>
                                                            <option value="justify">Justify</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Decoration</label>
                                                        <select value={selectedEl.textDecoration || 'none'} onChange={e => updateSelected('textDecoration', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                            <option value="none">None</option>
                                                            <option value="underline">Underline</option>
                                                            <option value="line-through">Line-Through</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Line Height</label>
                                                        <input type="number" step="0.1" value={selectedEl.lineHeight || 1.2} onChange={e => updateSelected('lineHeight', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Letter Spacing (px)</label>
                                                        <input type="number" step="0.5" value={selectedEl.letterSpacing || 0} onChange={e => updateSelected('letterSpacing', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Font Family</label>
                                                    <select value={selectedEl.fontFamily || 'Arial, sans-serif'} onChange={e => updateSelected('fontFamily', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                        <option value="Arial, sans-serif">Arial (Sans-Serif)</option>
                                                        <option value="Helvetica, sans-serif">Helvetica (Sans-Serif)</option>
                                                        <option value="Times New Roman, serif">Times New Roman (Serif)</option>
                                                        <option value="Georgia, serif">Georgia (Serif)</option>
                                                        <option value="Courier New, monospace">Courier New (Monospace)</option>
                                                        <option value="Verdana, sans-serif">Verdana (Sans-Serif)</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* HTML Properties */}
                                        {selectedEl.type === 'html' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                                    HTML Content
                                                </label>
                                                <textarea
                                                    value={selectedEl.content}
                                                    onChange={e => updateSelected('content', e.target.value)}
                                                    className="w-full text-xs p-2 border rounded-md h-48 font-mono bg-gray-50"
                                                />
                                                <div className="grid grid-cols-2 gap-3 mt-2">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Container Width</label>
                                                        <input type="number" value={selectedEl.width} onChange={e => updateSelected('width', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Container Height</label>
                                                        <input type="number" value={selectedEl.height} onChange={e => updateSelected('height', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Product Table Properties */}
                                        {selectedEl.type === 'product_table' && (
                                            <div className="space-y-4">
                                                {/* Styles sub-section */}
                                                <div className="border-b pb-3 mb-3">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Table Styles</h4>
                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Header Background</label>
                                                            <input type="color" value={selectedEl.headerBgColor || '#f3f4f6'} onChange={e => updateTableProperty('headerBgColor', e.target.value, selectedEl)} className="w-full h-8 p-1 border rounded-md" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Header Text</label>
                                                            <input type="color" value={selectedEl.headerTextColor || '#000000'} onChange={e => updateTableProperty('headerTextColor', e.target.value, selectedEl)} className="w-full h-8 p-1 border rounded-md" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Row Text Color</label>
                                                            <input type="color" value={selectedEl.textColor || '#333333'} onChange={e => updateTableProperty('textColor', e.target.value, selectedEl)} className="w-full h-8 p-1 border rounded-md" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Border Color</label>
                                                            <input type="color" value={selectedEl.borderColor || '#e5e7eb'} onChange={e => updateTableProperty('borderColor', e.target.value, selectedEl)} className="w-full h-8 p-1 border rounded-md" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Font Size (px)</label>
                                                            <input type="number" value={selectedEl.fontSize || 12} onChange={e => updateTableProperty('fontSize', Number(e.target.value), selectedEl)} className="w-full text-xs p-1.5 border rounded-md" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Columns sub-section */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Configure Columns</h4>
                                                        <button 
                                                            onClick={() => {
                                                                const cols = [...(selectedEl.columns || [])];
                                                                cols.push({ label: 'New Header', value: '{{ product.props.item }}', align: 'left', width: '20%' });
                                                                updateTableProperty('columns', cols, selectedEl);
                                                            }}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                                        >
                                                            + Add Column
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                        {(selectedEl.columns || []).map((col, idx) => (
                                                            <div key={idx} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-2 relative group">
                                                                <button 
                                                                    onClick={() => {
                                                                        const cols = (selectedEl.columns || []).filter((_, cIdx) => cIdx !== idx);
                                                                        updateTableProperty('columns', cols, selectedEl);
                                                                    }}
                                                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Delete Column"
                                                                >
                                                                    🗑️
                                                                </button>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="block text-[10px] font-semibold text-gray-400">Header Text</label>
                                                                        <input 
                                                                            type="text" 
                                                                            value={col.label} 
                                                                            onChange={e => {
                                                                                const cols = [...(selectedEl.columns || [])];
                                                                                cols[idx] = { ...col, label: e.target.value };
                                                                                updateTableProperty('columns', cols, selectedEl);
                                                                            }} 
                                                                            className="w-full text-xs p-1 border rounded" 
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] font-semibold text-gray-400">Align</label>
                                                                        <select 
                                                                            value={col.align || 'left'} 
                                                                            onChange={e => {
                                                                                const cols = [...(selectedEl.columns || [])];
                                                                                cols[idx] = { ...col, align: e.target.value };
                                                                                updateTableProperty('columns', cols, selectedEl);
                                                                            }} 
                                                                            className="w-full text-xs p-1 border rounded"
                                                                        >
                                                                            <option value="left">Left</option>
                                                                            <option value="right">Right</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-semibold text-gray-400">Cell Value / Placeholder</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={col.value} 
                                                                        onChange={e => {
                                                                            const cols = [...(selectedEl.columns || [])];
                                                                            cols[idx] = { ...col, value: e.target.value };
                                                                            updateTableProperty('columns', cols, selectedEl);
                                                                        }} 
                                                                        className="w-full text-xs p-1 border rounded font-mono" 
                                                                    />
                                                                    <div className="flex gap-1 flex-wrap pt-1.5">
                                                                        {COLUMN_PLACEHOLDERS.map((p, pIdx) => (
                                                                            <button 
                                                                                key={pIdx}
                                                                                onClick={() => {
                                                                                    const cols = [...(selectedEl.columns || [])];
                                                                                    cols[idx] = { ...col, value: p.value };
                                                                                    updateTableProperty('columns', cols, selectedEl);
                                                                                }}
                                                                                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[9px] font-semibold border border-blue-100"
                                                                            >
                                                                                + {p.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Advanced Raw HTML block edit toggle */}
                                                <div className="border-t pt-3 mt-3">
                                                    <button 
                                                        onClick={() => {
                                                            // Set type to 'html' to switch to raw editor view
                                                            updateSelected('type', 'html');
                                                        }}
                                                        className="w-full text-center py-2 text-xs bg-gray-50 border text-gray-500 rounded-lg hover:bg-gray-100 font-medium"
                                                    >
                                                        🛠️ Edit Raw Table HTML Layout
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Image Properties */}
                                        {selectedEl.type === 'image' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL</label>
                                                <input
                                                    type="text"
                                                    value={selectedEl.url || ''}
                                                    onChange={e => updateSelected('url', e.target.value)}
                                                    placeholder="https://..."
                                                    className="w-full text-sm p-2 border rounded-md mb-2"
                                                />
                                                <div className="mb-3">
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Upload Image</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        disabled={uploadingImg}
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            setUploadingImg(true);
                                                            const formData = new FormData();
                                                            formData.append('image', file);
                                                            try {
                                                                const res = await clientToken.post('upload_image/', formData, {
                                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                                });
                                                                if (res.data && res.data.url) {
                                                                    updateSelected('url', res.data.url);
                                                                }
                                                            } catch (err) {
                                                                alert('Image upload failed!');
                                                            } finally {
                                                                setUploadingImg(false);
                                                            }
                                                        }}
                                                        className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                                                    />
                                                    {uploadingImg && <span className="text-[10px] text-indigo-600 block mt-1">Uploading...</span>}
                                                </div>
                                                <div className="flex gap-2 mb-3">
                                                    <button
                                                        onClick={() => updateSelected('url', '{{ company.company_logo }}')}
                                                        className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-xl border border-purple-150 hover:bg-purple-100 transition-all active:scale-95"
                                                    >
                                                        💼 Use Company Logo
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 mb-2">You can also use <code className="bg-gray-100 px-1 rounded">{`{{ company.company_logo }}`}</code> here if the logo exists!</p>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Width (px)</label>
                                                        <input type="number" value={selectedEl.width} onChange={e => updateSelected('width', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Height (px)</label>
                                                        <input type="number" value={selectedEl.height} onChange={e => updateSelected('height', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Line/Shape Properties */}
                                        {selectedEl.type === 'line' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Width (px)</label>
                                                        <input type="number" value={selectedEl.width} onChange={e => updateSelected('width', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Height (px)</label>
                                                        <input type="number" value={selectedEl.height} onChange={e => updateSelected('height', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <label className="block text-xs font-semibold text-gray-500">Background Color</label>
                                                            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedEl.backgroundColor === 'transparent'}
                                                                    onChange={e => updateSelected('backgroundColor', e.target.checked ? 'transparent' : '#000000')}
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                                                                />
                                                                <span>None</span>
                                                            </label>
                                                        </div>
                                                        <input 
                                                            type="color" 
                                                            disabled={selectedEl.backgroundColor === 'transparent'} 
                                                            value={selectedEl.backgroundColor && selectedEl.backgroundColor !== 'transparent' ? selectedEl.backgroundColor : '#000000'} 
                                                            onChange={e => updateSelected('backgroundColor', e.target.value)} 
                                                            className="w-full h-[38px] p-1 border rounded-md disabled:opacity-50" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Border Color</label>
                                                        <input 
                                                            type="color" 
                                                            disabled={selectedEl.borderStyle === 'none'} 
                                                            value={selectedEl.borderColor || '#000000'} 
                                                            onChange={e => updateSelected('borderColor', e.target.value)} 
                                                            className="w-full h-[38px] p-1 border rounded-md disabled:opacity-50" 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Border Width (px)</label>
                                                        <input type="number" value={selectedEl.borderWidth || 0} onChange={e => updateSelected('borderWidth', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Border Radius (px)</label>
                                                        <input type="number" value={selectedEl.borderRadius || 0} onChange={e => updateSelected('borderRadius', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Border Style</label>
                                                    <select value={selectedEl.borderStyle || 'none'} onChange={e => updateSelected('borderStyle', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                        <option value="none">None (Border Width: 0)</option>
                                                        <option value="solid">Solid</option>
                                                        <option value="dashed">Dashed</option>
                                                        <option value="dotted">Dotted</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
                                        <p className="text-sm text-gray-400 font-medium tracking-wide">Select an element to edit</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 h-full relative bg-gray-200">
                                {error ? (
                                    <div className="p-4 m-4 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
                                ) : (
                                    <iframe
                                        src={pdfUrl}
                                        className="w-full h-full border-none"
                                        title="PDF Preview"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Suggestions Modal */}
            {showSuggestionsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden transform scale-100 transition-all">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">All Available Variables</h3>
                                <p className="text-xs text-gray-500 font-medium">Click a variable to insert it into the selected text element</p>
                            </div>
                            <button 
                                onClick={() => setShowSuggestionsModal(false)}
                                className="text-gray-400 hover:text-gray-650 font-bold text-lg p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {ALL_PLACEHOLDERS.map((cat, catIdx) => (
                                <div key={catIdx} className="space-y-2.5">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{cat.category}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {cat.items.map((item, itemIdx) => (
                                            <button
                                                key={itemIdx}
                                                onClick={() => {
                                                    if (selectedEl) {
                                                        updateSelected('content', (selectedEl.content || '') + item.token);
                                                    }
                                                    setShowSuggestionsModal(false);
                                                }}
                                                className="flex flex-col text-left p-3 border rounded-xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group"
                                            >
                                                <span className="text-xs font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{item.label}</span>
                                                <span className="text-[10px] font-mono text-gray-550 mt-1 select-all bg-gray-50 px-1 py-0.5 rounded group-hover:bg-indigo-50 transition-colors">{item.token}</span>
                                                <span className="text-[9px] text-gray-400 mt-1 line-clamp-1">{item.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                            <button 
                                onClick={() => setShowSuggestionsModal(false)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeasyprintPreview;
