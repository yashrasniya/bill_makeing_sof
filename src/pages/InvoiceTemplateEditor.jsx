import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Text, Rect, Group, Line,Image as KonvaImage, } from 'react-konva';
import { Trash2, Bold, Italic, Type, Move, Save } from 'lucide-react';
import {clientToken} from "@/axios";
import useImage from "use-image";
import {useLocation} from "react-router-dom";
import {useSelector} from "react-redux";


const ReaderBackground = ({pdf_template}) =>{
    const [backgroundImage] = useImage(pdf_template );
    return <KonvaImage
                image={backgroundImage}
                x={0}
                y={0}
                width={595}
                height={842} />
}
const InvoiceTemplateEditor = () => {
    const [config, setConfig] = useState(null);
    const { userInfo } = useSelector((state) => state.user);

    const  location = useLocation()
    const params = new URLSearchParams(location.search);
    let id = params.get("id");
    const [selectedElement, setSelectedElement] = useState(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const stageRef = useRef();
    const [Limited_access, setLimited_access] = useState(!userInfo?.is_staff)
console.log(`w-80  shadow-lg p-4 overflow-y-auto ${Limited_access  ? 'hidden':'block'}` )
    // Mock API call - replace with your actual API
    useEffect(() => {
        console.log(id)
        clientToken.get(`yaml/${id? '?id='+id :' '}`).then((r) => {
                setConfig(r.data)
                id = r.data?.id
            console.log(r.data)
            }
        ).catch(e => alert(e.response.data.detail))
    }, []);
    function isMobileDevice() {
        return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
            navigator.userAgent
        );
    }
    useEffect(() => {
        if (isMobileDevice()) {
            setLimited_access(true)
        }
    })

    // Flatten all elements for easier manipulation
    const getAllElements = (stretcher=false) => {
        if (!config?.Bill) return [];

        const elements = [];
        const stretcher_elements = [];
        const sections = ['bill_stretcher', 'my_company_details', 'harder', 'footer','product_stretcher'];

        sections.forEach(section => {
            if (config.Bill[section]) {

                config.Bill[section].forEach((item, index) => {
                    Object.entries(item).forEach(([key, element]) => {
                        if (element.type !== 'rectangles' && element.type !== 'line') {
                            element = {...element, y: 842 - element.y};
                            elements.push({
                                ...element,
                                id: `${section}_${key}_${index}`,
                                section,
                                key,
                                index
                            });
                        }
                        else {
                            stretcher_elements.push({
                                ...element,
                                id: `${section}_${key}_${index}`,
                                section,
                                key,
                                index
                            })
                        }
                    });
                });
            }
        });
        if(stretcher){
            return stretcher_elements
        }
        // Handle product list
        if (config.Bill.product?.product_list) {
            config.Bill.product.product_list.forEach((item, index) => {
                Object.entries(item).forEach(([key, element]) => {
                    elements.push({
                        ...element,
                        y: 842 - config.Bill.product.start,
                        id: `product_${key}_${index}`,
                        section: 'product',
                        key,
                        index
                    });
                });
            });
        }

        return elements;
    };

    const updateElement = (elementId, updates) => {
        const newConfig = { ...config };
        const element = getAllElements().find(el => el.id === elementId);

        if (!element) return;
        if (updates.y){
            updates.y = 842 - updates.y;
        }
        if (element.section === 'product') {
            const productItem = newConfig.Bill.product.product_list[element.index];
            productItem[element.key] = { ...productItem[element.key], ...updates };
        } else {
            const sectionItem = newConfig.Bill[element.section][element.index];

            sectionItem[element.key] = { ...sectionItem[element.key],  ...updates};
        }

        setConfig(newConfig);
        let new_element = getAllElements().find(el => el.id === elementId);
        setSelectedElement(new_element)
    };

    const deleteElement = (elementId) => {
        if (!selectedElement) return;

        const newConfig = { ...config };
        const element = getAllElements().find(el => el.id === elementId);

        if (!element) return;

        if (element.section === 'product') {
            newConfig.Bill.product.product_list.splice(element.index, 1);
        } else {
            newConfig.Bill[element.section].splice(element.index, 1);
        }

        setConfig(newConfig);
        setSelectedElement(null);
    };

    const handleElementDragEnd = (e, elementId) => {
        const newPos = e.target.position();
        updateElement(elementId, { x: newPos.x, y: newPos.y });
    };

    const handleWheel = (e) => {
        e.evt.preventDefault();

        const scaleBy = 1.02;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

        setStageScale(newScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };
    const RenderStretcher = ({shape}) => {
        if (shape.type === "rectangles") {
            if(shape.rectangles_type==="image"){
                const [image] = useImage(shape.src ); // returns <img> once loaded
                return ( <KonvaImage image={image}
                                     x={shape.x}
                                     y={842-shape.y}
                                     width={shape.width}
                                     height={-shape.height} />
                )
            }
            return (
                <Rect
                    key={shape.id}
                    x={shape.x}
                    y={842-shape.y}
                    width={shape.width}
                    height={-shape.height}
                    stroke="black"
                />
            );}
        if (shape.type === "line") {
            return (
                <Line
                    key={shape.id}
                    points={[shape.x, 842-shape.y, shape.x2, 842-shape.y2]}
                    stroke="black"
                />
            );
        }
    }
    const renderElement = (element) => {
        let  displayText = `${element.prefix || ''}${element.value || element.default_value || ''}${element.suffix || ''}`;
        displayText = displayText || 'X'
        return (
            <Text
                key={element.id}
                x={element.x}
                y={element.y - (element.font_size || 12)}
                text={displayText}
                fontSize={element.font_size || 12}
                fontStyle={element.font === 'bold' ? 'bold' : 'normal'}
                fill={selectedElement?.id === element.id ? '#3B82F6' : '#000000'}
                draggable={!Limited_access}
                onClick={() => setSelectedElement(element)}
                onDragEnd={(e) => handleElementDragEnd(e, element.id)}
            />
        );
    };

    const elements = getAllElements();
    const stretcher_elements = getAllElements(true);

    if (!config) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Loading template...</div>
            </div>
        );
    }
    const handelSave = () => {
      clientToken.put(`yaml/`,config).then((r) => {
          if(r.status === 200){
              alert("Template Saved Successfully")
          }
      })
    }
    return (
        <div className="flex h-screen ">

            {/* Sidebar */}
            <div className={`w-80  shadow-lg p-4 overflow-y-auto ${Limited_access  ? 'hidden':'block'}` }>
                <h2 className="text-xl font-bold mb-4">Invoice Editor</h2>

                {selectedElement && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Edit Selected Element</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Text Content:</label>
                                <input
                                    type="text"
                                    value={selectedElement.value || ''}
                                    onChange={(e) => updateElement(selectedElement.id, { value: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Font Size:</label>
                                <input
                                    type="number"
                                    value={selectedElement.font_size || 12}
                                    onChange={(e) => updateElement(selectedElement.id, { font_size: parseInt(e.target.value) })}
                                    className="w-full p-2 border rounded"
                                    min="8"
                                    max="72"
                                />
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => updateElement(selectedElement.id, {
                                        font: selectedElement.font === 'bold' ? 'normal' : 'bold'
                                    })}
                                    className={`p-2 rounded ${selectedElement.font === 'bold' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                                >
                                    <Bold size={16} />
                                </button>

                                <button
                                    onClick={() => deleteElement(selectedElement.id)}
                                    className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">X Position:</label>
                                    <input
                                        type="number"
                                        value={Math.round(selectedElement.x)}
                                        onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) })}
                                        className="w-full p-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Y Position:</label>
                                    <input
                                        type="number"
                                        value={Math.round(selectedElement.y)}
                                        onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) })}
                                        className="w-full p-1 border rounded text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Elements List */}
                <div>
                    <h3 className="font-semibold mb-2">Template Elements</h3>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                        {elements.map(element => (
                            <div
                                key={element.id}
                                onClick={() => setSelectedElement(element)}
                                className={`p-2 rounded cursor-pointer text-sm ${
                                    selectedElement?.id === element.id
                                        ? 'bg-blue-100 border-blue-300'
                                        : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                            >
                                <div className="font-medium">{element.label}</div>
                                <div className="text-xs text-gray-600 truncate">
                                    {element.prefix || ''}{element.value || 'No value'}{element.suffix || ''}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handelSave}
                    className="w-full mt-4 p-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center space-x-2"
                >
                    <Save size={16} />
                    <span>Save Template</span>
                </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-4">
                <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden">
                    <div className="p-4 border-b">
                        <h3 className="font-semibold">Invoice Template Preview</h3>
                        <p className="text-sm text-gray-600">
                            Click elements to select, drag to move. Use mouse wheel to zoom.{Limited_access}
                        </p>
                    </div>

                    <div className="h-full">
                        <Stage
                            width={Limited_access?595:window.innerWidth - 320}
                            height={window.innerHeight - 100}
                            onWheel={handleWheel}
                            scaleX={stageScale}
                            scaleY={stageScale}
                            x={stagePos.x}
                            y={stagePos.y}
                            draggable
                            ref={stageRef}
                        >
                            <Layer>
                                {/* Background */}
                                <Rect
                                    x={0}
                                    y={0}
                                    width={595}
                                    height={842}
                                    fill="white"
                                    stroke="#e5e7eb"
                                    strokeWidth={1}
                                />
                                <ReaderBackground pdf_template={config.pdf_template} />

                                {/* Render all elements */}
                                {stretcher_elements.map(element => <RenderStretcher shape={element}/>)}
                                {elements.map(element => renderElement(element))}

                                {/* Selection indicator */}
                                {selectedElement && (
                                    <Rect
                                        x={selectedElement.x - 2}
                                        y={selectedElement.y - 2}
                                        width={200}
                                        height={selectedElement.font_size + 4 || 16}
                                        stroke="#3B82F6"
                                        strokeWidth={1}
                                        fill="rgba(59, 130, 246, 0.1)"
                                    />
                                )}
                            </Layer>
                        </Stage>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceTemplateEditor;