import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Text, Rect, Group, Line, Image as KonvaImage } from 'react-konva';
import { Trash2, Bold, Type, Save, Move, Square, Minus, Copy, Plus, DownloadCloud, Eye } from 'lucide-react';
import { clientToken } from "@/axios";
import useImage from "use-image";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const ReaderBackground = ({ pdf_template }) => {
    const [backgroundImage] = useImage(pdf_template);
    return <KonvaImage image={backgroundImage} x={0} y={0} width={595} height={842} />;
};

/* ── UI Helpers ── */
const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: '13px',
    border: '1.5px solid #cbd5e1', borderRadius: '8px',
    outline: 'none', color: '#0f172a', background: 'white',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};
const focIn = e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; };
const focOut = e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; };

const InvoiceTemplateEditor = () => {
    const [config, setConfig] = useState(null);
    const { userInfo } = useSelector((state) => state.user);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    const [selectedElementId, setSelectedElementId] = useState(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const stageRef = useRef();
    const [Limited_access, setLimited_access] = useState(!userInfo?.is_staff);
    const [saving, setSaving] = useState(false);
    const [exportInvoiceId, setExportInvoiceId] = useState('');
    const [exporting, setExporting] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

    useEffect(() => {
        clientToken.get(`yaml/${id ? '?id=' + id : ''}`).then((r) => {
            setConfig(r.data);
        }).catch(e => alert(e.response?.data?.detail || "Failed to load template"));
    }, [id]);

    useEffect(() => {
        if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)) {
            setLimited_access(true);
        }
    }, []);

    // Extract elements from config dynamically every render
    const extractElements = () => {
        if (!config?.Bill) return [];
        const extracted = [];
        const sections = ['bill_stretcher', 'my_company_details', 'harder', 'footer', 'product_stretcher'];

        sections.forEach(section => {
            if (config.Bill[section]) {
                config.Bill[section].forEach((item, index) => {
                    Object.entries(item).forEach(([key, element]) => {
                        extracted.push({
                            ...element,
                            id: `${section}_${key}_${index}`,
                            section, key, index,
                            // Backend maps Y from bottom (A4 height = 842)
                            canvasY: 842 - element.y
                        });
                    });
                });
            }
        });

        if (config.Bill.product?.product_list) {
            config.Bill.product.product_list.forEach((item, index) => {
                Object.entries(item).forEach(([key, element]) => {
                    extracted.push({
                        ...element,
                        canvasY: 842 - config.Bill.product.start,
                        id: `product_${key}_${index}`,
                        section: 'product', key, index
                    });
                });
            });
        }
        return extracted;
    };

    const allElements = extractElements();
    const activeEl = allElements.find(el => el.id === selectedElementId) || null;

    const updateElement = (elementId, updates) => {
        const newConfig = JSON.parse(JSON.stringify(config)); // Deep copy is critical here!
        const elMeta = allElements.find(el => el.id === elementId);
        if (!elMeta) return;

        // Convert canvasY back to backend's Y coordinate (bottom-based)
        if (updates.canvasY !== undefined) {
            updates.y = 842 - updates.canvasY;
            delete updates.canvasY;
        }

        if (elMeta.section === 'product') {
            const productItem = newConfig.Bill.product.product_list[elMeta.index];
            productItem[elMeta.key] = { ...productItem[elMeta.key], ...updates };
        } else {
            const sectionItem = newConfig.Bill[elMeta.section][elMeta.index];
            sectionItem[elMeta.key] = { ...sectionItem[elMeta.key], ...updates };
        }

        setConfig(newConfig);
    };

    const deleteElement = (elementId) => {
        if (!elementId) return;
        const newConfig = JSON.parse(JSON.stringify(config));
        const elMeta = allElements.find(el => el.id === elementId);
        if (!elMeta) return;

        if (elMeta.section === 'product') {
            newConfig.Bill.product.product_list.splice(elMeta.index, 1);
        } else {
            newConfig.Bill[elMeta.section].splice(elMeta.index, 1);
        }

        setConfig(newConfig);
        setSelectedElementId(null); // Deselect if deleted
    };

    const duplicateElement = (elementId) => {
        if (!elementId) return;
        const newConfig = JSON.parse(JSON.stringify(config));
        const elMeta = allElements.find(el => el.id === elementId);
        if (!elMeta) return;

        const duplicatedProps = {};
        if (elMeta.section === 'product') {
            const productItem = newConfig.Bill.product.product_list[elMeta.index];
            const originalObj = productItem[elMeta.key];
            const newKey = `${elMeta.key}_copy_${Date.now()}`;

            productItem[newKey] = {
                ...originalObj,
                x: (originalObj.x || 0) + 10,
                y: (originalObj.y || 842) - 10,
            };
            setSelectedElementId(`product_${newKey}_${elMeta.index}`);
        } else {
            const sectionItem = newConfig.Bill[elMeta.section][elMeta.index];
            const originalObj = sectionItem[elMeta.key];
            const newKey = `${elMeta.key}_copy_${Date.now()}`;

            sectionItem[newKey] = {
                ...originalObj,
                x: (originalObj.x || 0) + 10,
                y: (originalObj.y || 842) - 10,
            };
            setSelectedElementId(`${elMeta.section}_${newKey}_${elMeta.index}`);
        }

        setConfig(newConfig);
    };

    const addNewElement = (section, type) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const newKey = `new_${type}_${Date.now()}`;

        const defaultObject = {
            type: type,
            x: 50,
            y: 750, // High up on canvas (bottom-anchored)
            value: type === 'text' ? 'New Text' : undefined,
            width: type === 'rectangles' ? 100 : undefined,
            height: type === 'rectangles' ? 50 : undefined,
            x2: type === 'line' ? 150 : undefined,
            y2: type === 'line' ? 750 : undefined,
            font_size: type === 'text' ? 12 : undefined,
        };

        if (section === 'product') {
            if (!newConfig.Bill.product.product_list.length) {
                newConfig.Bill.product.product_list.push({});
            }
            newConfig.Bill.product.product_list[0][newKey] = defaultObject;
            setSelectedElementId(`product_${newKey}_0`);
        } else {
            if (!newConfig.Bill[section]) {
                newConfig.Bill[section] = [{}];
            }
            if (!newConfig.Bill[section].length) {
                newConfig.Bill[section].push({});
            }
            newConfig.Bill[section][0][newKey] = defaultObject;
            setSelectedElementId(`${section}_${newKey}_0`);
        }

        setConfig(newConfig);
        setIsAddMode(false);
    };

    const [isAddMode, setIsAddMode] = useState(false);
    const [addSection, setAddSection] = useState('bill_stretcher');
    const [addElementType, setAddElementType] = useState('text');

    const handleWheel = (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.05;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    };

    const handleSave = () => {
        setSaving(true);
        const payload = JSON.parse(JSON.stringify(config));
        return clientToken.put(`yaml/`, payload).then((r) => {
            if (r.status === 200) {
                alert("Template Saved Successfully ✅");
                return true;
            }
        }).catch(e => {
            alert("Failed to save: " + (e.response?.data?.error || "Unknown error"));
            return false;
        }).finally(() => setSaving(false));
    };

    const handleExport = async () => {
        if (!exportInvoiceId.trim()) {
            alert("Please enter a valid Invoice ID to use as sample data for the PDF.");
            return;
        }

        // Auto-save the template first
        setExporting(true);
        try {
            const payload = JSON.parse(JSON.stringify(config));
            await clientToken.put(`yaml/`, payload);
        } catch (e) {
            alert("Failed to auto-save template before exporting.");
            setExporting(false);
            return;
        }

        clientToken.get(`/pdf/?id=${exportInvoiceId.trim()}&template_id=${id}`, { responseType: 'blob' })
            .then((r) => {
                const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
                setPdfPreviewUrl(url);
            })
            .catch(e => {
                alert("Failed to export PDF! Please make sure the Invoice ID is correct and belongs to you.");
            })
            .finally(() => setExporting(false));
    };

    const closePdfPreview = () => {
        if (pdfPreviewUrl) {
            window.URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
    };

    const getDummyValue = (label) => {
        if (!label) return 'Sample Text';
        const l = label.toLowerCase();
        if (l.includes('date')) return '15/08/2026';
        if (l.includes('invoice_number')) return 'INV-2026-001';
        if (l.includes('receiver,name') || l.includes('customer')) return 'Acme Solutions Ltd.';
        if (l.includes('receiver,address')) return '123 Business Valley, Tech Park,\nCity, 400001';
        if (l.includes('gst') && l.includes('number')) return '27AADCA2230EA1Z';
        if (l.includes('description')) return 'Premium Software License';
        if (l.includes('quantity')) return '10';
        if (l.includes('rate')) return '150.00';
        if (l.includes('amount') && !l.includes('total') && !l.includes('gst')) return '1500.00';
        if (l.includes('total_amount_with_out_gst')) return '1500.00';
        if (l.includes('total_amount_with_gst')) return '1770.00';
        if (l.includes('state_gst_amount') || l.includes('center_gst_amount')) return '135.00';
        if (l.includes('total_amount_in_text')) return 'One Thousand Seven Hundred Seventy Only';
        if (l.includes('s.no') || l === 'sno') return '1';
        if (l === '636' || l === 'title') return 'INVOICE';
        return 'Sample Text';
    };

    /* ── Render Elements ── */
    const RenderNode = ({ shape }) => {
        const isSelected = activeEl?.id === shape.id;
        const color = isSelected ? '#4f46e5' : '#000000';

        const displayValue = (shape.value !== undefined && shape.value !== '')
            ? shape.value
            : (shape.default_value !== undefined && shape.default_value !== '')
                ? shape.default_value
                : getDummyValue(shape.label || shape.key);

        const handleInteraction = (e) => {
            const node = e.target;
            const now = Date.now();
            const lastClick = node.lastClickTime || 0;

            if (now - lastClick < 300) {
                // Double click detected
                if (!Limited_access && (!shape.type || shape.type === 'text')) {
                    const newText = window.prompt("Edit text value:", displayValue);
                    if (newText !== null) {
                        updateElement(shape.id, { value: newText });
                    }
                }
            } else {
                setSelectedElementId(shape.id);
            }
            node.lastClickTime = now;
        };

        const commonProps = {
            draggable: !Limited_access,
            onClick: handleInteraction,
            onTap: handleInteraction,
        };

        if (shape.type === "rectangles") {
            const dragEnd = (e) => {
                const node = e.target;
                updateElement(shape.id, { x: node.x(), canvasY: node.y() });
            };

            if (shape.rectangles_type === "image" || shape.src) {
                const [image] = useImage(shape.src);
                return (
                    <Group {...commonProps} x={shape.x} y={shape.canvasY} onDragEnd={dragEnd}>
                        {isSelected && <Rect width={shape.width} height={-shape.height} stroke="#4f46e5" strokeWidth={2} dash={[4, 4]} />}
                        <KonvaImage image={image} width={shape.width} height={-shape.height} />
                    </Group>
                );
            }
            return (
                <Rect
                    {...commonProps}
                    x={shape.x} y={shape.canvasY} width={shape.width} height={-shape.height}
                    stroke={isSelected ? '#4f46e5' : (shape.stroke || 'black')}
                    strokeWidth={isSelected ? 2 : 1} dash={isSelected ? [4, 4] : []}
                    onDragEnd={dragEnd}
                />
            );
        }

        if (shape.type === "line") {
            return (
                <Line
                    {...commonProps}
                    points={[shape.x, shape.canvasY, shape.x2, 842 - shape.y2]}
                    stroke={isSelected ? '#4f46e5' : (shape.stroke || 'black')}
                    strokeWidth={isSelected ? 2 : 1} hitStrokeWidth={10}
                    onDragEnd={(e) => {
                        const node = e.target;
                        const dx = node.x(); const dy = node.y();
                        node.position({ x: 0, y: 0 }); // Reset pure translation to calculate actual coordinate shift
                        updateElement(shape.id, {
                            x: shape.x + dx, x2: shape.x2 + dx,
                            canvasY: shape.canvasY + dy, y2: shape.y2 - dy // note: y2 is stored as backend coord natively here
                        });
                    }}
                />
            );
        }

        const displayText = `${shape.prefix || ''}${displayValue}${shape.suffix || ''}`;

        // Basic naive line-wrapping simulation for canvas preview if 'limit' or 'no_lines' is provided
        let finalDisplay = displayText === '' ? 'X' : displayText;
        if ((shape.limit && finalDisplay.length > shape.limit) || finalDisplay.includes('\n')) {
            const lines = [];
            const rawLines = finalDisplay.split('\n');
            let maxLines = shape.no_lines || rawLines.length;

            if (shape.limit) {
                // simple wrapping simulation
                let currentLineCount = 0;
                for (const raw of rawLines) {
                    let textLeft = raw;
                    while (textLeft.length > 0 && currentLineCount < maxLines) {
                        lines.push(textLeft.substring(0, shape.limit));
                        textLeft = textLeft.substring(shape.limit);
                        currentLineCount++;
                    }
                }
                finalDisplay = lines.join('\n');
            }
        }

        const fontSize = shape.font_size || 12;

        // Calculate Konva lineHeight based on next_line.gap if provided
        // next_line.gap usually represents absolute pixel distance to next line
        // Konva lineHeight is a multiplier (e.g., 1.5 * fontSize)
        let konvaLineHeight = 1;
        if (shape.next_line && shape.next_line.gap) {
            konvaLineHeight = shape.next_line.gap / fontSize;
        }

        return (
            <Text
                {...commonProps}
                x={shape.x}
                // Convert bottom-anchor "canvasY" to top-anchor via font offset
                y={shape.canvasY - fontSize}
                text={finalDisplay}
                fontSize={fontSize}
                fontFamily={'Times New Roman'}
                lineHeight={konvaLineHeight}
                fontStyle={shape.font === 'bold' ? 'bold' : 'normal'}
                fill={color}
                onDragEnd={(e) => {
                    const node = e.target;
                    // convert node top Y back to canvas bottom Y
                    updateElement(shape.id, { x: node.x(), canvasY: node.y() + fontSize });
                }}
            />
        );
    };

    if (!config) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid #e0e7ff', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* ── Sidebar ── */}
            <div style={{
                width: '340px', background: 'white', borderRight: '1px solid #e2e8f0',
                display: Limited_access ? 'none' : 'flex', flexDirection: 'column',
                boxShadow: '4px 0 24px rgba(0,0,0,0.03)', zIndex: 10,
            }}>
                {/* Header */}
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{
                        fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px',
                        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text', margin: 0,
                    }}>Invoice Editor</h2>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                        Select and configure layout elements
                    </p>
                </div>

                {/* Add Element Section */}
                {!Limited_access && (
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                        {!isAddMode ? (
                            <button
                                onClick={() => setIsAddMode(true)}
                                style={{ width: '100%', padding: '10px', background: '#eef2ff', color: '#4f46e5', border: '1px dashed #a5b4fc', borderRadius: '10px', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                            >
                                <Plus size={16} /> Add New Block
                            </button>
                        ) : (
                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Section Group</label>
                                    <select value={addSection} onChange={e => setAddSection(e.target.value)} style={{ ...inputStyle, padding: '6px 10px' }}>
                                        <option value="bill_stretcher">Bill Header (bill_stretcher)</option>
                                        <option value="my_company_details">Company Details</option>
                                        <option value="harder">Header Info (harder)</option>
                                        <option value="product_stretcher">Product Table Header</option>
                                        <option value="product">Product List Item</option>
                                        <option value="footer">Footer</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Element Type</label>
                                    <select value={addElementType} onChange={e => setAddElementType(e.target.value)} style={{ ...inputStyle, padding: '6px 10px' }}>
                                        <option value="text">Text Box</option>
                                        <option value="rectangles">Rectangle/Square</option>
                                        <option value="line">Line</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setIsAddMode(false)} style={{ flex: 1, padding: '8px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={() => addNewElement(addSection, addElementType)} style={{ flex: 1, padding: '8px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Create</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
                    {/* Active Element Properties */}
                    {activeEl ? (
                        <div style={{
                            background: '#f8fafc', border: '1.5px solid #e2e8f0',
                            borderRadius: '16px', padding: '16px', marginTop: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <div style={{ width: '4px', height: '16px', background: 'linear-gradient(180deg,#4f46e5,#7c3aed)', borderRadius: '4px' }} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {activeEl.type === 'rectangles' ? 'Edit Rectangle' : activeEl.type === 'line' ? 'Edit Line' : 'Edit Text'}
                                </h3>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => duplicateElement(activeEl.id)}
                                        style={{ padding: '6px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                        title="Duplicate Element"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <button
                                        onClick={() => deleteElement(activeEl.id)}
                                        style={{ padding: '6px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                        title="Delete Element"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Shared X, Y Inputs */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>X Pos</label>
                                        <input type="number" value={Math.round(activeEl.x)} onChange={(e) => updateElement(activeEl.id, { x: parseInt(e.target.value) || 0 })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Y Pos (Canvas)</label>
                                        <input type="number" value={Math.round(activeEl.canvasY)} onChange={(e) => updateElement(activeEl.id, { canvasY: parseInt(e.target.value) || 0 })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                    </div>
                                </div>

                                {/* Text Options */}
                                {(!activeEl.type || activeEl.type === 'text') && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Text Content</label>
                                            <textarea
                                                value={activeEl.value || ''}
                                                placeholder={getDummyValue(activeEl.label || activeEl.key)}
                                                onChange={(e) => updateElement(activeEl.id, { value: e.target.value })}
                                                style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                                                onFocus={focIn}
                                                onBlur={focOut}
                                            />
                                        </div>

                                        {/* Multiline / Wrap Settings */}
                                        <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Multi-line & Wrap Rules</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Char Limit / Line</label>
                                                    <input type="number" value={activeEl.limit || ''} placeholder="e.g. 55" onChange={(e) => updateElement(activeEl.id, { limit: parseInt(e.target.value) || undefined })} style={{ ...inputStyle, padding: '4px 8px' }} onFocus={focIn} onBlur={focOut} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Max Lines</label>
                                                    <input type="number" value={activeEl.no_lines || ''} placeholder="e.g. 2" onChange={(e) => updateElement(activeEl.id, { no_lines: parseInt(e.target.value) || undefined })} style={{ ...inputStyle, padding: '4px 8px' }} onFocus={focIn} onBlur={focOut} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }} title="Distance down to next line">Line Gap (Y)</label>
                                                    <input type="number" value={activeEl.next_line?.gap || ''} placeholder="e.g. 12" onChange={(e) => updateElement(activeEl.id, { next_line: { ...(activeEl.next_line || {}), gap: parseInt(e.target.value) || undefined } })} style={{ ...inputStyle, padding: '4px 8px' }} onFocus={focIn} onBlur={focOut} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }} title="X offset for text on next line">Next X</label>
                                                    <input type="number" value={activeEl.next_line?.x || ''} placeholder="Auto" onChange={(e) => updateElement(activeEl.id, { next_line: { ...(activeEl.next_line || {}), x: parseInt(e.target.value) || undefined } })} style={{ ...inputStyle, padding: '4px 8px' }} onFocus={focIn} onBlur={focOut} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }} title="Font size for wrapped lines">Next Font Pt</label>
                                                    <input type="number" value={activeEl.next_line?.font_size || ''} placeholder="Auto" onChange={(e) => updateElement(activeEl.id, { next_line: { ...(activeEl.next_line || {}), font_size: parseInt(e.target.value) || undefined } })} style={{ ...inputStyle, padding: '4px 8px' }} onFocus={focIn} onBlur={focOut} />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Prefix</label>
                                                <input type="text" value={activeEl.prefix || ''} onChange={(e) => updateElement(activeEl.id, { prefix: e.target.value })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Suffix</label>
                                                <input type="text" value={activeEl.suffix || ''} onChange={(e) => updateElement(activeEl.id, { suffix: e.target.value })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Font Size</label>
                                                <input type="number" value={activeEl.font_size || 12} onChange={(e) => updateElement(activeEl.id, { font_size: parseInt(e.target.value) || 1 })} style={inputStyle} onFocus={focIn} onBlur={focOut} min="8" max="72" />
                                            </div>
                                            <button
                                                onClick={() => updateElement(activeEl.id, { font: activeEl.font === 'bold' ? 'normal' : 'bold' })}
                                                style={{ height: '37.5px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${activeEl.font === 'bold' ? '#4f46e5' : '#cbd5e1'}`, background: activeEl.font === 'bold' ? '#4f46e5' : 'white', color: activeEl.font === 'bold' ? 'white' : '#475569', cursor: 'pointer' }}
                                            ><Bold size={16} /></button>
                                        </div>
                                    </>
                                )}

                                {/* Rectangle Options */}
                                {activeEl.type === 'rectangles' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Width</label>
                                            <input type="number" value={Math.round(activeEl.width || 0)} onChange={(e) => updateElement(activeEl.id, { width: parseInt(e.target.value) || 0 })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Height</label>
                                            <input type="number" value={Math.round(activeEl.height || 0)} onChange={(e) => updateElement(activeEl.id, { height: parseInt(e.target.value) || 0 })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                        </div>
                                    </div>
                                )}

                                {/* Line Options */}
                                {activeEl.type === 'line' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>X2 Pos</label>
                                            <input type="number" value={Math.round(activeEl.x2 || 0)} onChange={(e) => updateElement(activeEl.id, { x2: parseInt(e.target.value) || 0 })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Y2 Pos (Backend)</label>
                                            <input type="number" value={Math.round(activeEl.y2 || 0)} onChange={(e) => updateElement(activeEl.id, { y2: parseInt(e.target.value) || 0 })} style={inputStyle} onFocus={focIn} onBlur={focOut} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ display: 'inline-flex', padding: '16px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '16px' }}>
                                <Move size={24} color="#64748b" />
                            </div>
                            <p style={{ fontSize: '13px', margin: 0, fontWeight: 600 }}>No element selected</p>
                            <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Click an element on the canvas.</p>
                        </div>
                    )}

                    {/* All Elements List */}
                    <div style={{ marginTop: '24px', paddingBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '4px', height: '16px', background: '#cbd5e1', borderRadius: '4px' }} />
                            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Component Tree</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {allElements.map(el => (
                                <div
                                    key={el.id}
                                    onClick={() => setSelectedElementId(el.id)}
                                    style={{
                                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                                        background: activeEl?.id === el.id ? '#eef2ff' : 'white',
                                        border: `1.5px solid ${activeEl?.id === el.id ? '#c7d2fe' : '#e2e8f0'}`,
                                        display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.1s',
                                    }}
                                    onMouseEnter={e => { if (activeEl?.id !== el.id) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    onMouseLeave={e => { if (activeEl?.id !== el.id) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                >
                                    {el.type === 'rectangles' ? <Square size={16} color={activeEl?.id === el.id ? "#4f46e5" : "#94a3b8"} />
                                        : el.type === 'line' ? <Minus size={16} color={activeEl?.id === el.id ? "#4f46e5" : "#94a3b8"} />
                                            : <Type size={16} color={activeEl?.id === el.id ? "#4f46e5" : "#94a3b8"} />}

                                    <div style={{ overflow: 'hidden', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: activeEl?.id === el.id ? '#4f46e5' : '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {el.label || el.key || 'Unnamed'}
                                            </div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>
                                                {el.section}
                                            </div>
                                        </div>
                                        {(!el.type || el.type === 'text') && (
                                            <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {el.prefix || ''}{el.value || 'null'}{el.suffix || ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Save & Export Block */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', background: 'white', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Export PDF Sub-section */}
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Preview & Export PDF</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                placeholder="Invoice ID (e.g. 1)"
                                value={exportInvoiceId}
                                onChange={e => setExportInvoiceId(e.target.value)}
                                style={{ ...inputStyle, flex: 1, padding: '8px 10px', fontSize: '12px' }}
                            />
                            <button
                                onClick={handleExport} disabled={exporting}
                                style={{
                                    padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: 'white', whiteSpace: 'nowrap',
                                    background: exporting ? '#94a3b8' : '#0ea5e9', borderRadius: '8px', border: 'none',
                                    cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                }}
                            >
                                <Eye size={14} />
                                {exporting ? "Previewing..." : "Preview"}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleSave} disabled={saving}
                        style={{
                            width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, color: 'white',
                            background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: '12px', border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 14px rgba(79,70,229,0.3)', transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.4)'; } }}
                        onMouseLeave={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.3)'; } }}
                    >
                        <Save size={18} />
                        {saving ? "Saving..." : "Save Template"}
                    </button>
                </div>
            </div>

            {/* ── Canvas Area ── */}
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Template Preview</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                            Click elements to select, drag to move. Use mouse wheel or trackpad to zoom.
                            {Limited_access ? " (View Only)" : ""}
                        </p>
                    </div>
                </div>

                <div style={{
                    flex: 1, background: '#cbd5e1', borderRadius: '16px',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: '20px 20px', position: 'relative',
                }}>
                    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                        <Stage
                            width={window.innerWidth - (Limited_access ? 48 : 388)}
                            height={window.innerHeight - 120}
                            onWheel={handleWheel}
                            scaleX={stageScale} scaleY={stageScale} x={stagePos.x} y={stagePos.y}
                            draggable
                            style={{ cursor: 'grab' }}
                            onMouseDown={(e) => {
                                // clicking empty stage clears selection
                                if (e.target === e.target.getStage()) setSelectedElementId(null);
                            }}
                        >
                            <Layer>
                                {/* A4 Paper Drop Shadow & Background */}
                                <Rect
                                    x={0} y={0} width={595} height={842} fill="white"
                                    shadowColor="rgba(0,0,0,0.15)" shadowBlur={20} shadowOffsetY={10}
                                />
                                <ReaderBackground pdf_template={config.pdf_template} />

                                {/* Render all elements! */}
                                {allElements.map(el => <RenderNode key={el.id} shape={el} />)}

                                {/* Custom Outline around explicit text selections */}
                                {activeEl && (!activeEl.type || activeEl.type === 'text') && (
                                    <Group listening={false}>
                                        <Rect
                                            x={activeEl.x - 4}
                                            // Selected box covers from top of rect to bottom. Display Y = bottom.
                                            y={activeEl.canvasY - (activeEl.font_size || 12) - 4}
                                            width={(activeEl.value?.toString()?.length || 5) * (activeEl.font_size || 12) * 0.6 + 8} // rough width estimate
                                            height={(activeEl.font_size || 12) + 8}
                                            stroke="#4f46e5" strokeWidth={1.5} fill="rgba(79, 70, 229, 0.08)" dash={[4, 4]}
                                        />
                                        <Rect
                                            x={activeEl.x - 6} y={activeEl.canvasY - (activeEl.font_size || 12) - 6}
                                            width={6} height={6} fill="white" stroke="#4f46e5" strokeWidth={1.5}
                                        />
                                    </Group>
                                )}
                            </Layer>
                        </Stage>
                    </div>
                </div>
            </div>

            {/* Modal for PDF Preview */}
            {pdfPreviewUrl && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', padding: '24px'
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        width: '100%', maxWidth: '1000px', height: '100%',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{
                            padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Invoice PDF Preview</h2>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Previewing template with invoice data #{exportInvoiceId}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a
                                    href={pdfPreviewUrl}
                                    download={`template_preview_${id}.pdf`}
                                    style={{
                                        padding: '8px 16px', backgroundColor: '#eef2ff', color: '#4f46e5',
                                        border: '1px solid #c7d2fe', borderRadius: '8px', cursor: 'pointer',
                                        fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <DownloadCloud size={16} /> Download
                                </a>
                                <button
                                    onClick={closePdfPreview}
                                    style={{
                                        padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569',
                                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                                        fontSize: '13px', fontWeight: 600
                                    }}
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#cbd5e1' }}>
                            <iframe
                                src={pdfPreviewUrl}
                                title="PDF Preview"
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceTemplateEditor;