import { Stage, Layer, Circle, Image, Text, Rect, Group} from 'react-konva';
import { useEffect, useState, useRef } from 'react';
import useImage from 'use-image';
import {clientToken} from "../axios";

const TemplateDesign = () => {
    const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
    const [message, setMessage] = useState('');
    const [selectedElement, setSelectedElement] = useState(null);
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [showPropertyPanel, setShowPropertyPanel] = useState(false);
    const [config, setConfig] = useState({
        Bill: {
            harder: [],
            back_ground_image: [],
            product: {
                start: 452,
                product_list: []
            },
            footer: []
        }
    });

    const [bill_image] = useImage('SBS_BILL_page_1.jpg');
    const stageRef = useRef();



    useEffect(() => {
        clientToken.get("yaml/").then((r) => setConfig(r.data));
    }, []);

    const handleElementSelect = (element, layer, index) => {
        setSelectedElement(element);
        setSelectedLayer(layer);
        setSelectedIndex(index);
        setShowPropertyPanel(true);
    };

    const handleElementUpdate = (newProperties) => {
        if (!selectedElement || selectedLayer === null || selectedIndex === null) return;

        setConfig(prev => {
            const newConfig = { ...prev };
            const key = Object.keys(selectedElement)[0];

            if (selectedLayer === 'harder') {
                newConfig.Bill.harder[selectedIndex] = {
                    [key]: { ...selectedElement[key], ...newProperties }
                };
            } else if (selectedLayer === 'product') {
                newConfig.Bill.product.product_list[selectedIndex] = {
                    [key]: { ...selectedElement[key], ...newProperties }
                };
            } else if (selectedLayer === 'footer') {
                newConfig.Bill.footer[selectedIndex] = {
                    [key]: { ...selectedElement[key], ...newProperties }
                };
            }

            return newConfig;
        });

        // Update selected element
        const key = Object.keys(selectedElement)[0];
        setSelectedElement({
            [key]: { ...selectedElement[key], ...newProperties }
        });
    };

    const addNewElement = (layer) => {
        const newElement = {
            [`new_element_${Date.now()}`]: {
                x: 100,
                y: 100,
                font_size: 12,
                limit: 30,
                text: "New Element"
            }
        };

        setConfig(prev => {
            const newConfig = { ...prev };
            if (layer === 'harder') {
                newConfig.Bill.harder.push(newElement);
            } else if (layer === 'product') {
                newConfig.Bill.product.product_list.push(newElement);
            } else if (layer === 'footer') {
                newConfig.Bill.footer.push(newElement);
            }
            return newConfig;
        });
    };

    const removeElement = () => {
        if (selectedLayer === null || selectedIndex === null) return;

        setConfig(prev => {
            const newConfig = { ...prev };
            if (selectedLayer === 'harder') {
                newConfig.Bill.harder.splice(selectedIndex, 1);
            } else if (selectedLayer === 'product') {
                newConfig.Bill.product.product_list.splice(selectedIndex, 1);
            } else if (selectedLayer === 'footer') {
                newConfig.Bill.footer.splice(selectedIndex, 1);
            }
            return newConfig;
        });

        setSelectedElement(null);
        setSelectedLayer(null);
        setSelectedIndex(null);
        setShowPropertyPanel(false);
    };

    const saveToBackend = async () => {
        try {
            const response = await clientToken.post("yaml/save", config);
            setMessage('Configuration saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error saving configuration');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    function renderPoints(item, index, y = null, layerType = 'harder') {
        const key = Object.keys(item)[0];
        const values = item[key];

        function handleDragEnd(e) {
            const newX = e.target.x() / zoom;
            const newY = (pageSize.height - e.target.y() / zoom);

            setConfig((prev) => {
                const newConfig = { ...prev };
                const updatedElement = {
                    [key]: { ...values, x: newX, y: newY }
                };

                if (layerType === 'harder') {
                    newConfig.Bill.harder[index] = updatedElement;
                } else if (layerType === 'product') {
                    newConfig.Bill.product.product_list[index] = updatedElement;
                } else if (layerType === 'footer') {
                    newConfig.Bill.footer[index] = updatedElement;
                }

                if (selectedIndex === index && selectedLayer === layerType) {
                    setSelectedElement(updatedElement);
                }

                return newConfig;
            });
        }
        if (values.x !== undefined) {
            let y_value = values.y ? values.y : y;
            const isSelected = selectedIndex === index && selectedLayer === layerType;

            return (
                <Group key={`${layerType}-${index}`} >
                    <Text
                        text={values.dummy_value || key}

                        fontFamily={values.font_family || "Calibri"}
                        fontSize={(values.font_size || 7) * zoom}
                        x={values.x * zoom}
                        y={(pageSize.height - y_value - 7) * zoom}
                        fill={values.color || "black"}
                        fontStyle={values.bold ? 'bold' : 'normal'}
                        textDecoration={values.underline ? 'underline' : 'none'}
                        onClick={() => handleElementSelect(item, layerType, index)}
                    />
                    {
                        values.limit && <Rect
                            x={values.x * zoom}
                            y={(pageSize.height - y_value - (values.font_size || 7)) * zoom}
                            width={values.limit * 4}
                            height={(values.font_size || 7) * zoom}
                            radius={5 * zoom}
                            stroke={isSelected ? "red" : "black"}
                            strokeWidth={isSelected ? 2 : 1}
                            fill={isSelected ? "rgba(255, 0, 0, 0.1)" : "transparent"}
                            draggable
                            onDragStart={() => console.log('drag start')}
                            onMouseEnter={() => {
                                document.body.style.cursor = 'pointer';
                            }}
                            onMouseLeave={() => {
                                document.body.style.cursor = 'default';
                            }}

                            onClick={() => handleElementSelect(item, layerType, index)}
                        />

                    }
                    {values.next_line && <Rect
                        x={(values.next_line.x || values.x) * zoom}
                        y={(pageSize.height - y_value - (values.font_size || 7)  + (values.next_line.gap || 0)) * zoom}
                        width={values.limit * 4}
                        height={(values.font_size || 7) * zoom}
                        radius={5 * zoom}
                        stroke={isSelected ? "red" : "black"}
                        strokeWidth={isSelected ? 2 : 1}
                        fill={isSelected ? "rgba(255, 0, 0, 0.1)" : "transparent"}
                        draggable
                        onDragStart={() => console.log('drag start')}
                        onMouseEnter={() => {
                            document.body.style.cursor = 'pointer';
                        }}
                        onMouseLeave={() => {
                            document.body.style.cursor = 'default';
                        }}

                        onClick={() => handleElementSelect(item, layerType, index)}
                    />}


                </Group>
            );
        }
        return null;
    }

    const PropertyPanel = () => {
        if (!selectedElement || !showPropertyPanel) return null;

        const key = Object.keys(selectedElement)[0];
        const values = selectedElement[key];

        const field = (label, type, val, onChange, extra = {}) => (
            <div>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                    type={type}
                    value={val ?? (type === 'number' ? 0 : '')}
                    onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    className="w-full p-2 border rounded"
                    {...extra}
                />
            </div>
        );

        return (
            <div className="fixed right-0 top-0 w-80 h-full bg-white shadow-lg p-4 overflow-y-auto border-l">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Edit Element: {key}</h3>
                    <button onClick={() => setShowPropertyPanel(false)} className="text-gray-500 hover:text-gray-700">×</button>
                </div>

                <div className="space-y-4">
                    {field('Text', 'text', values.text, v => handleElementUpdate({ text: v }))}
                    <div className="grid grid-cols-2 gap-2">
                        {field('X Position', 'number', values.x, v => handleElementUpdate({ x: v }))}
                        {field('Y Position', 'number', values.y, v => handleElementUpdate({ y: v }))}
                    </div>
                    {field('Font Size', 'number', values.font_size || 12, v => handleElementUpdate({ font_size: parseInt(v) }))}

                    <div>
                        <label className="block text-sm font-medium mb-1">Font Family</label>
                        <select
                            value={values.font_family || 'Calibri'}
                            onChange={e => handleElementUpdate({ font_family: e.target.value })}
                            className="w-full p-2 border rounded"
                        >
                            {['Calibri', 'Arial', 'Times New Roman', 'Helvetica'].map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>

                    {field('Color', 'color', values.color || '#000000', v => handleElementUpdate({ color: v }))}
                    {field('Character Limit', 'number', values.limit || 30, v => handleElementUpdate({ limit: parseInt(v) }))}
                    {field('Dummy Value', 'number', values.dummy_value, v => handleElementUpdate({ dummy_value: parseInt(v) }))}

                    {values.next_line && (
                        <>
                            {field('Gap', 'number', values.next_line.gap, v => handleElementUpdate({ next_line: { ...values.next_line, gap: parseInt(v) } }))}
                            {field('X', 'number', values.next_line.x || values.x, v => handleElementUpdate({ next_line: { ...values.next_line, x: parseInt(v) } }))}
                            {field('Font Size', 'number', values.next_line.font_size, v => handleElementUpdate({ next_line: { ...values.next_line, font_size: parseInt(v) } }))}
                        </>
                    )}

                    <div className="flex gap-2">
                        {['bold', 'underline'].map(opt => (
                            <label key={opt} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={values[opt] || false}
                                    onChange={e => handleElementUpdate({ [opt]: e.target.checked })}
                                    className="mr-2"
                                />
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </label>
                        ))}
                    </div>

                    <button onClick={removeElement} className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600">
                        Remove Element
                    </button>
                </div>
            </div>
        );
    };


    return (
        <div className="flex h-screen">
            {/* Main editor area */}
            <div className="flex-1 flex">
                {/* Left toolbar */}
                <div className="bg-blue-400 flex flex-col p-2 space-y-2">
                    <button
                        onClick={() => setZoom(e => e + 0.1)}
                        className="p-2 bg-white rounded cursor-pointer text-sm"
                    >
                        + Zoom
                    </button>
                    <button
                        onClick={() => setZoom(e => e >= 1 ? e - 0.1 : e)}
                        className="p-2 bg-white rounded cursor-pointer text-sm"
                    >
                        - Zoom
                    </button>

                    <div className="border-t border-white pt-2">
                        <p className="text-white text-xs mb-2">Add Elements:</p>
                        <button
                            onClick={() => addNewElement('harder')}
                            className="w-full p-2 bg-green-500 text-white rounded text-xs mb-1"
                        >
                            + Header
                        </button>
                        <button
                            onClick={() => addNewElement('product')}
                            className="w-full p-2 bg-green-500 text-white rounded text-xs mb-1"
                        >
                            + Product
                        </button>
                        <button
                            onClick={() => addNewElement('footer')}
                            className="w-full p-2 bg-green-500 text-white rounded text-xs mb-1"
                        >
                            + Footer
                        </button>
                    </div>

                    <div className="border-t border-white pt-2">
                        <button
                            onClick={saveToBackend}
                            className="w-full p-2 bg-purple-500 text-white rounded text-xs"
                        >
                            Save Config
                        </button>
                    </div>
                </div>

                {/* Canvas area */}
                <div className="flex-1 overflow-auto bg-gray-100">
                    {message && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 mx-4 mt-4">
                            {message}
                        </div>
                    )}

                    <Stage
                        width={pageSize.width * zoom}
                        height={pageSize.height * zoom}
                        ref={stageRef}
                        onClick={(e) => {
                            // Deselect if clicking on empty space
                            if (e.target === e.target.getStage()) {
                                setSelectedElement(null);
                                setSelectedLayer(null);
                                setSelectedIndex(null);
                                setShowPropertyPanel(false);
                            }
                        }}
                    >
                        <Layer>
                            {bill_image && (
                                <Image
                                    x={0}
                                    y={0}
                                    image={bill_image}
                                    width={pageSize.width * zoom}
                                    height={pageSize.height * zoom}
                                />
                            )}
                        </Layer>
                        <Layer>
                            {config.Bill.harder.map((item, index) =>
                                renderPoints(item, index, null, 'harder')
                            )}
                        </Layer>
                        <Layer>
                            {config.Bill.product.product_list.map((item, index) =>
                                renderPoints(item, index, config.Bill.product.start, 'product')
                            )}
                        </Layer>
                        <Layer>
                            {config.Bill.footer.map((item, index) =>
                                renderPoints(item, index, null, 'footer')
                            )}
                        </Layer>
                    </Stage>
                </div>
            </div>

            {/* Property panel */}
            <PropertyPanel />
        </div>
    );
};

export default TemplateDesign;