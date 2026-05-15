import React, { useState, useRef } from 'react';
import { clientToken } from '../axios';

const initialElements = [
    { id: '1', type: 'text', content: 'INVOICE', x: 40, y: 40, fontSize: 32, color: '#4F46E5', fontWeight: 'bold' },
    { id: '2', type: 'text', content: 'Date: Oct 25, 2026', x: 40, y: 80, fontSize: 14, color: '#333333', fontWeight: 'normal' },
    { id: '3', type: 'text', content: 'Billed To:\nAcme Corp', x: 40, y: 140, fontSize: 13, color: '#000000', fontWeight: 'normal' },
    { id: '4', type: 'line', x: 40, y: 110, width: 515, height: 2, backgroundColor: '#eeeeee' },
    { id: '5', type: 'text', content: 'Total: $500.00', x: 400, y: 200, fontSize: 18, color: '#000000', fontWeight: 'bold' },
];

const WeasyprintPreview = () => {
    // ── Editor State ──
    const [elements, setElements] = useState(() => {
        const saved = localStorage.getItem('weasyprint_layout');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) { console.error('Failed to parse saved layout', e); }
        }
        return initialElements;
    });
    
    const [selectedId, setSelectedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // ── PDF State ──
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Backend State ──
    const [templateId, setTemplateId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const canvasRef = useRef(null);

    // ── Local Storage & Cloud Persistence ──
    React.useEffect(() => {
        const fetchCloudTemplate = async () => {
            try {
                const response = await clientToken.get('/yaml/?is_html=true');
                if (response.data && response.data.id) {
                    setTemplateId(response.data.id);
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
                await clientToken.put('/yaml/', { id: templateId, is_html: true, elements, html_content: htmlContent });
                alert("Template successfully saved to cloud!");
            } else {
                const response = await clientToken.post('/yaml/', { template_name: "Web Editor Layout", is_html: true, elements, html_content: htmlContent });
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
                const formattedContent = (el.content || '').replace(/\n/g, '<br>');
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; font-size: ${fs}px; color: ${c}; font-weight: ${fw}; white-space: pre-wrap; font-family: Arial, sans-serif;">${formattedContent}</div>\n`;
            } else if (el.type === 'line') {
                const w = el.width || 100;
                const h = el.height || 2;
                const bg = el.backgroundColor || '#000000';
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px; background-color: ${bg};"></div>\n`;
            } else if (el.type === 'html' || el.type === 'product_table') {
                const w = el.width || 200;
                const h = el.height || 100;
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px;">${el.content || ''}</div>\n`;
            } else if (el.type === 'image') {
                const w = el.width || 100;
                const h = el.height || 100;
                const src = el.url || 'https://via.placeholder.com/150';
                innerHtml += `<img src="${src}" style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px; object-fit: contain;" />\n`;
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
            setElements([...elements, { id: newId, type: 'line', x: 50, y: 50, width: 200, height: 2, backgroundColor: '#000000' }]);
        } else if (type === 'html') {
            setElements([...elements, { id: newId, type: 'html', content: '<div>Your custom HTML</div>', x: 50, y: 50, width: 300, height: 100 }]);
        } else if (type === 'image') {
            setElements([...elements, { id: newId, type: 'image', url: 'https://via.placeholder.com/150', x: 50, y: 50, width: 100, height: 100 }]);
        } else if (type === 'product_table') {
            const tableHtml = `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; font-family: sans-serif;">
  <thead>
    <tr style="border-bottom: 2px solid #ccc;">
      <th style="padding: 6px;">Sr. No</th>
      <th style="padding: 6px;">Item Description</th>
      <th style="padding: 6px;">Qty</th>
      <th style="padding: 6px;">Rate</th>
      <th style="padding: 6px; text-align: right;">Total</th>
    </tr>
  </thead>
  <tbody>
    {% for product in invoice.products %}
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 6px;">{{ forloop.counter }}</td>
      <td style="padding: 6px;"><b>{{ product.props.item|default:product.props.description }}</b></td>
      <td style="padding: 6px;">{{ product.props.quantity }}</td>
      <td style="padding: 6px;">{{ product.props.rate }}</td>
      <td style="padding: 6px; text-align: right;">{{ product.total_amount }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>`;
            setElements([...elements, { id: newId, type: 'product_table', content: tableHtml, x: 20, y: 250, width: 550, height: 200 }]);
        }
        setSelectedId(newId);
    };

    const duplicateSelected = () => {
        if (!selectedId) return;
        const target = elements.find(el => el.id === selectedId);
        if(!target) return;
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

    const selectedEl = elements.find(el => el.id === selectedId);

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-gray-800 font-sans">
            {/* ── Header ── */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
                <div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        HTML Layout Builder
                    </h1>
                    <p className="text-sm text-gray-500">Design your invoice visually for WeasyPrint PDF</p>
                </div>
                <div className="flex gap-3">
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
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.2
                                        } : {
                                            width: el.width,
                                            height: el.height,
                                            backgroundColor: el.backgroundColor
                                        }),
                                        // Visual aid to make dragging shapes easier if they are thin
                                        padding: el.type === 'line' && el.height <= 2 ? '5px 0' : '0',
                                        backgroundClip: 'content-box',
                                        overflow: el.type === 'html' ? 'hidden' : 'visible'
                                    }}
                                >
                                    {el.type === 'html' || el.type === 'product_table' ? (
                                        <div dangerouslySetInnerHTML={{ __html: el.content }} className="w-full h-full pointer-events-none" />
                                    ) : el.type === 'text' ? (
                                        el.content
                                    ) : el.type === 'image' ? (
                                        <img src={el.url} className="w-full h-full object-contain pointer-events-none" alt="element" />
                                    ) : null}
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
                        <button className={`flex-1 py-3 text-sm font-semibold ${pdfUrl ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => { if(!pdfUrl) generatePdf(); }}>
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
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">X Position</label>
                                                <input type="number" value={selectedEl.x} onChange={e => updateSelected('x', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Y Position</label>
                                                <input type="number" value={selectedEl.y} onChange={e => updateSelected('y', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
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
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Font Weight</label>
                                                    <select value={selectedEl.fontWeight} onChange={e => updateSelected('fontWeight', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                        <option value="normal">Normal</option>
                                                        <option value="bold">Bold</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* HTML / Table Properties */}
                                        {(selectedEl.type === 'html' || selectedEl.type === 'product_table') && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                                    {selectedEl.type === 'product_table' ? 'Table HTML Layout' : 'HTML Content'}
                                                </label>
                                                <textarea 
                                                    value={selectedEl.content} 
                                                    onChange={e => updateSelected('content', e.target.value)} 
                                                    className="w-full text-xs p-2 border rounded-md h-48 font-mono bg-gray-50"
                                                />
                                                {selectedEl.type === 'product_table' && (
                                                    <p className="text-[10px] text-gray-400 mt-1">This natively supports `invoice.products` looping.</p>
                                                )}
                                                
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
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Background Color</label>
                                                    <input type="color" value={selectedEl.backgroundColor} onChange={e => updateSelected('backgroundColor', e.target.value)} className="w-full h-[38px] p-1 border rounded-md" />
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
        </div>
    );
};

export default WeasyprintPreview;
