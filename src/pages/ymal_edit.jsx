import React, { useEffect, useState, useRef } from 'react';
import {clientToken} from "../axios";


const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    overflow: 'scroll',
    height: '1684px',
    fontFamily: 'Arial, sans-serif'
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1px solid #e1e1e1',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333'
  },
  fieldGroup: {
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    position: 'relative'
  },
  fieldTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#555'
  },
  inputGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
    marginBottom: '10px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    marginBottom: '4px',
    color: '#666'
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  button: {
    padding: '8px 12px',
    margin: '2px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  addButton: {
    backgroundColor: '#4CAF50',
    color: 'white'
  },
  removeButton: {
    backgroundColor: '#f44336',
    color: 'white',
    position: 'absolute',
    top: '5px',
    right: '5px',
    padding: '4px 8px',
    fontSize: '10px'
  },
  toolbar: {
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  canvasContainer: {
    position: 'relative',
    display: 'inline-block'
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '5px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    zIndex: 1000
  }
};

const YAMLEditor = () => {
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
  const canvasRef = useRef(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [resizingItem, setResizingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mode, setMode] = useState('select'); // 'select', 'add'
  const [contextMenu, setContextMenu] = useState(null);
  let newGlobalConfig = null;

  // Mock client token for demo


  useEffect(() => {
    clientToken.get("yaml/").then((r) => setConfig(r.data));
  }, []);

  // Effect to create a simple background for demo
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 595 * 2;
    canvas.height = 842 * 2;
    const ctx = canvas.getContext('2d');

    // Create a simple grid background
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Draw grid
    for (let x = 0; x <= canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        setBackgroundImage(image);
        URL.revokeObjectURL(url);
      };
      image.src = url;
    });
  }, []);

  // Drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config.Bill) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const n = 2;

    canvas.width = 595 * n;
    canvas.height = 842 * n;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    const drawMarker = (type, options = {}) => {
      const {
        x = 0,
        y = 0,
        x2 = 0,
        y2 = 0,
        color = 'black',
        isDragged = false,
        isSelected = false,
        isResizing = false,
        radius = 5,
        width = 50,
        height = 50,
        text = '',
        font = '16px Arial',
        imageSrc = '',
      } = options;

      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      // Draw the element
      switch (type) {
        case 'dot':
          ctx.beginPath();
          ctx.arc(x * n, (842 - y) * n, isDragged ? radius + 2 : radius, 0, 2 * Math.PI);
          ctx.fill();
          break;

        case 'line':
          ctx.beginPath();
          ctx.moveTo(x * n, (842 - y) * n);
          ctx.lineTo(x2 * n, (842 - y2) * n);
          ctx.stroke();
          break;

        case 'rect':
          ctx.beginPath();
          ctx.rect(x * n, (842 - y - height) * n, width * n, height * n);
          ctx.stroke();
          break;

        case 'fillRect':
          ctx.fillRect(x * n, (842 - y - height) * n, width * n, height * n);
          break;

        case 'text':
          ctx.font = font;
          ctx.fillText(text, x * n, (842 - y) * n);
          break;

        case 'image':
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, x * n, (842 - y - height) * n, width * n, height * n);
          };
          img.src = imageSrc;
          break;

        default:
          console.warn('Unknown shape type:', type);
      }

      // Draw selection outline
      if (isSelected) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        if (type === 'dot') {
          ctx.beginPath();
          ctx.arc(x * n, (842 - y) * n, radius + 5, 0, 2 * Math.PI);
          ctx.stroke();
        } else {
          ctx.strokeRect((x - 5) * n, (842 - y - height - 5) * n, (width + 10) * n, (height + 10) * n);
        }

        ctx.setLineDash([]);
        ctx.lineWidth = 1;

        // Draw resize handles for rectangles and images
        if (['rect', 'fillRect', 'image', 'text'].includes(type)) {
          const handles = [
            { x: (x - 3) * n, y: (842 - y - height - 3) * n }, // Top-left
            { x: (x + width + 3) * n, y: (842 - y - height - 3) * n }, // Top-right
            { x: (x - 3) * n, y: (842 - y + 3) * n }, // Bottom-left
            { x: (x + width + 3) * n, y: (842 - y + 3) * n }, // Bottom-right
          ];

          ctx.fillStyle = '#007bff';
          handles.forEach(handle => {
            ctx.fillRect(handle.x - 3, handle.y - 3, 6, 6);
          });
        }
      }
    };

    // Draw all items
    ['harder', 'product_list', 'footer','back_ground_image'].forEach(sectionName => {
      let items = [];
      if (sectionName === 'harder') items = config.Bill.harder;
      else if (sectionName === 'back_ground_image') items = config.Bill.back_ground_image;
      else if (sectionName === 'product_list') items = config.Bill.product.product_list;
      else if (sectionName === 'footer') items = config.Bill.footer;

      items.forEach((item, index) => {
        const key = Object.keys(item)[0];
        const values = item[key];
        const isDragged = draggedItem?.section === sectionName && draggedItem?.index === index;
        const isSelected = selectedItem?.section === sectionName && selectedItem?.index === index;
        const isResizing = resizingItem?.section === sectionName && resizingItem?.index === index;

        if (values.x !== undefined) {
          const y = sectionName === 'product_list' ? config.Bill.product.start : values.y;

          drawMarker(values.type || 'dot', {
            x: values.x,
            y: y,
            x2: values.x2,
            y2: values.y2,
            color: values.color || (sectionName === 'harder' ? 'blue' : sectionName === 'product_list' ? 'green' : 'red'),
            isDragged,
            isSelected,
            isResizing,
            radius: values.radius || 5,
            width: values.width || 50,
            height: values.height || 50,
            text: values.text || '',
            font: values.font || '16px Arial',
            imageSrc: values.imageSrc || '',
          });
        }
      });
    });

  }, [config, backgroundImage, draggedItem, selectedItem, resizingItem]);

  // Canvas interaction effects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config.Bill) return;

    const n = 2;
    const markerRadius = 15;

    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const findElementAtPos = (mousePos) => {
      const sections = [
        { name: 'harder', items: config.Bill.harder },
        { name: 'product_list', items: config.Bill.product.product_list },
        { name: 'footer', items: config.Bill.footer }
      ];

      for (const section of sections) {
        for (let i = section.items.length - 1; i >= 0; i--) {
          const item = section.items[i];
          const key = Object.keys(item)[0];
          const values = item[key];

          if (values.x !== undefined) {
            const y = section.name === 'product_list' ? config.Bill.product.start : values.y;
            const markerX = values.x * n;
            const markerY = (842 - y) * n;
            const width = (values.width || 50) * n;
            const height = (values.height || 50) * n;

            let isInside = false;

            if (values.type === 'dot') {
              const distance = Math.sqrt(Math.pow(mousePos.x - markerX, 2) + Math.pow(mousePos.y - markerY, 2));
              isInside = distance < markerRadius;
            } else {
              // Check if inside rectangle bounds
              isInside = mousePos.x >= markerX &&
                  mousePos.x <= markerX + width &&
                  mousePos.y >= markerY - height &&
                  mousePos.y <= markerY;
            }

            if (isInside) {
              // Check if clicking on resize handle
              const isSelected = selectedItem?.section === section.name && selectedItem?.index === i;
              if (isSelected && ['rect', 'fillRect', 'image', 'text'].includes(values.type)) {
                const handles = [
                  { x: markerX - 3, y: markerY - height - 3, corner: 'tl' },
                  { x: markerX + width + 3, y: markerY - height - 3, corner: 'tr' },
                  { x: markerX - 3, y: markerY + 3, corner: 'bl' },
                  { x: markerX + width + 3, y: markerY + 3, corner: 'br' },
                ];

                for (const handle of handles) {
                  if (Math.abs(mousePos.x - handle.x) < 6 && Math.abs(mousePos.y - handle.y) < 6) {
                    return {
                      section: section.name,
                      index: i,
                      key,
                      action: 'resize',
                      corner: handle.corner,
                      dragY: section.name !== 'product_list'
                    };
                  }
                }
              }

              return {
                section: section.name,
                index: i,
                key,
                action: 'move',
                dragY: section.name !== 'product_list'
              };
            }
          }
        }
      }
      return null;
    };

    const handleMouseDown = (e) => {
      if (e.button === 2) return; // Right click handled separately

      const pos = getMousePos(e);
      const element = findElementAtPos(pos);

      if (mode === 'add') {
        // Add new element
        addNewElement(pos, n);
        return;
      }

      if (element) {
        setSelectedItem({ section: element.section, index: element.index });

        if (element.action === 'resize') {
          setResizingItem({
            section: element.section,
            index: element.index,
            corner: element.corner,
            startPos: pos
          });
          canvas.style.cursor = 'nw-resize';
        } else {
          setDraggedItem(element);
          canvas.style.cursor = 'grabbing';
        }
      } else {
        setSelectedItem(null);
      }
    };

    const handleMouseMove = (e) => {
      const pos = getMousePos(e);

      if (resizingItem) {
        handleResize(pos);
        return;
      }

      if (!draggedItem) {
        const element = findElementAtPos(pos);
        if (mode === 'add') {
          canvas.style.cursor = 'crosshair';
        } else if (element) {
          if (element.action === 'resize') {
            canvas.style.cursor = 'nw-resize';
          } else {
            canvas.style.cursor = 'grab';
          }
        } else {
          canvas.style.cursor = 'default';
        }
        return;
      }

      const newX = Math.round(pos.x / n);
      const newY = Math.round(842 - (pos.y / n));

      const newConfig = JSON.parse(JSON.stringify(config));
      let itemToUpdate;

      if (draggedItem.section === 'harder') {
        itemToUpdate = newConfig.Bill.harder[draggedItem.index];
      } else if (draggedItem.section === 'product_list') {
        itemToUpdate = newConfig.Bill.product.product_list[draggedItem.index];
      } else if (draggedItem.section === 'footer') {
        itemToUpdate = newConfig.Bill.footer[draggedItem.index];
      }

      if (itemToUpdate) {
        const key = Object.keys(itemToUpdate)[0];
        itemToUpdate[key].x = newX;
        if (draggedItem.dragY) {
          itemToUpdate[key].y = newY;
        }
        newGlobalConfig = newConfig;
      }
    };

    const handleResize = (pos) => {
      if (!resizingItem) return;

      const newConfig = JSON.parse(JSON.stringify(config));
      let itemToUpdate;

      if (resizingItem.section === 'harder') {
        itemToUpdate = newConfig.Bill.harder[resizingItem.index];
      } else if (resizingItem.section === 'product_list') {
        itemToUpdate = newConfig.Bill.product.product_list[resizingItem.index];
      } else if (resizingItem.section === 'footer') {
        itemToUpdate = newConfig.Bill.footer[resizingItem.index];
      }

      if (itemToUpdate) {
        const key = Object.keys(itemToUpdate)[0];
        const values = itemToUpdate[key];

        const deltaX = (pos.x - resizingItem.startPos.x) / n;
        const deltaY = (pos.y - resizingItem.startPos.y) / n;

        switch (resizingItem.corner) {
          case 'br': // Bottom-right
            values.width = Math.max(10, (values.width || 50) + deltaX);
            values.height = Math.max(10, (values.height || 50) + deltaY);
            break;
          case 'bl': // Bottom-left
            values.width = Math.max(10, (values.width || 50) - deltaX);
            values.height = Math.max(10, (values.height || 50) + deltaY);
            values.x += deltaX;
            break;
          case 'tr': // Top-right
            values.width = Math.max(10, (values.width || 50) + deltaX);
            values.height = Math.max(10, (values.height || 50) - deltaY);
            if (resizingItem.section !== 'product_list') {
              values.y -= deltaY;
            }
            break;
          case 'tl': // Top-left
            values.width = Math.max(10, (values.width || 50) - deltaX);
            values.height = Math.max(10, (values.height || 50) - deltaY);
            values.x += deltaX;
            if (resizingItem.section !== 'product_list') {
              values.y -= deltaY;
            }
            break;
        }

        newGlobalConfig = newConfig;
      }
    };

    const handleMouseUp = () => {
      if (newGlobalConfig) {
        setConfig(newGlobalConfig);
        newGlobalConfig = null;
      }

      setDraggedItem(null);
      setResizingItem(null);
      canvas.style.cursor = mode === 'add' ? 'crosshair' : 'default';
    };

    const handleRightClick = (e) => {
      e.preventDefault();
      const pos = getMousePos(e);
      const element = findElementAtPos(pos);

      if (element) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          element: element
        });
      } else {
        setContextMenu(null);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('contextmenu', handleRightClick);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('contextmenu', handleRightClick);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [config, backgroundImage, mode, draggedItem, resizingItem, selectedItem]);

  const addNewElement = (pos, n) => {
    const newX = Math.round(pos.x / n);
    const newY = Math.round(842 - (pos.y / n));

    const newElement = {
      [`new_element_${Date.now()}`]: {
        x: newX,
        y: newY,
        type: 'rect',
        width: 100,
        height: 50,
        color: 'blue'
      }
    };

    const newConfig = JSON.parse(JSON.stringify(config));
    newConfig.Bill.harder.push(newElement);
    setConfig(newConfig);
    setMode('select');
  };

  const addElementToSection = (section) => {
    const newElement = {
      [`new_element_${Date.now()}`]: {
        x: 100,
        y: section === 'product_list' ? undefined : 400,
        type: 'rect',
        width: 100,
        height: 50,
        color: section === 'harder' ? 'blue' : section === 'product_list' ? 'green' : 'red'
      }
    };

    const newConfig = JSON.parse(JSON.stringify(config));
    if (section === 'harder') {
      newConfig.Bill.harder.push(newElement);
    } else if (section === 'product_list') {
      newConfig.Bill.product.product_list.push(newElement);
    } else if (section === 'footer') {
      newConfig.Bill.footer.push(newElement);
    }
    setConfig(newConfig);
  };

  const removeElement = (section, index) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    if (section === 'harder') {
      newConfig.Bill.harder.splice(index, 1);
    } else if (section === 'product_list') {
      newConfig.Bill.product.product_list.splice(index, 1);
    } else if (section === 'footer') {
      newConfig.Bill.footer.splice(index, 1);
    }
    setConfig(newConfig);
    setSelectedItem(null);
  };

  const duplicateElement = (section, index) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    let item;

    if (section === 'harder') {
      item = JSON.parse(JSON.stringify(newConfig.Bill.harder[index]));
    } else if (section === 'product_list') {
      item = JSON.parse(JSON.stringify(newConfig.Bill.product.product_list[index]));
    } else if (section === 'footer') {
      item = JSON.parse(JSON.stringify(newConfig.Bill.footer[index]));
    }

    if (item) {
      const key = Object.keys(item)[0];
      const newKey = `${key}_copy_${Date.now()}`;
      const newItem = { [newKey]: { ...item[key], x: item[key].x + 20, y: item[key].y ? item[key].y - 20 : undefined } };

      if (section === 'harder') {
        newConfig.Bill.harder.push(newItem);
      } else if (section === 'product_list') {
        newConfig.Bill.product.product_list.push(newItem);
      } else if (section === 'footer') {
        newConfig.Bill.footer.push(newItem);
      }

      setConfig(newConfig);
    }
  };

  const handleChange = (section, index, fieldPath, value) => {
    const newConfig = JSON.parse(JSON.stringify(config));

    let item;
    if (section === 'harder') {
      item = newConfig.Bill.harder[index];
    } else if (section === 'product_list') {
      item = newConfig.Bill.product.product_list[index];
    } else if (section === 'footer') {
      item = newConfig.Bill.footer[index];
    }

    if (item) {
      const key = Object.keys(item)[0];
      const path = fieldPath.split('.');
      let current = item[key];
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] = current[path[i]] || {};
      }
      current[path[path.length - 1]] = value;
    }
    setConfig(newConfig);
  };

  function MissingItem({ values, index, section }) {
    return (
        <>
          {values?.type !== undefined && (
              <div>
                <label style={styles.label}>Type</label>
                <select
                    style={styles.input}
                    value={values.type}
                    onChange={(e) => handleChange(section, index, 'type', e.target.value)}
                >
                  <option value="dot">Dot</option>
                  <option value="rect">Rectangle</option>
                  <option value="fillRect">Filled Rectangle</option>
                  <option value="text">Text</option>
                  <option value="line">Line</option>
                  <option value="image">Image</option>
                </select>
              </div>
          )}
          {values?.width !== undefined && (
              <div>
                <label style={styles.label}>Width</label>
                <input
                    style={styles.input}
                    type="number"
                    value={values.width}
                    onChange={(e) => handleChange(section, index, 'width', parseInt(e.target.value))}
                />
              </div>
          )}
          {values?.height !== undefined && (
              <div>
                <label style={styles.label}>Height</label>
                <input
                    style={styles.input}
                    type="number"
                    value={values.height}
                    onChange={(e) => handleChange(section, index, 'height', parseInt(e.target.value))}
                />
              </div>
          )}
          {values?.color !== undefined && (
              <div>
                <label style={styles.label}>Color</label>
                <input
                    style={styles.input}
                    type="color"
                    value={values.color}
                    onChange={(e) => handleChange(section, index, 'color', e.target.value)}
                />
              </div>
          )}
          {values?.text !== undefined && (
              <div>
                <label style={styles.label}>Text</label>
                <input
                    style={styles.input}
                    type="text"
                    value={values.text}
                    onChange={(e) => handleChange(section, index, 'text', e.target.value)}
                />
              </div>
          )}
          {values?.font !== undefined && (
              <div>
                <label style={styles.label}>Font</label>
                <input
                    style={styles.input}
                    type="text"
                    value={values.font}
                    onChange={(e) => handleChange(section, index, 'font', e.target.value)}
                />
              </div>
          )}
          {values?.radius !== undefined && (
              <div>
                <label style={styles.label}>Radius</label>
                <input
                    style={styles.input}
                    type="number"
                    value={values.radius}
                    onChange={(e) => handleChange(section, index, 'radius', parseInt(e.target.value))}
                />
              </div>
          )}
        </>
    );
  }

  return (
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}>
        <div style={styles.container}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <button
                style={{
                  ...styles.button,
                  backgroundColor: mode === 'select' ? '#007bff' : '#6c757d',
                  color: 'white'
                }}
                onClick={() => setMode('select')}
            >
              Select Mode
            </button>
            <button
                style={{
                  ...styles.button,
                  backgroundColor: mode === 'add' ? '#007bff' : '#6c757d',
                  color: 'white'
                }}
                onClick={() => setMode('add')}
            >
              Add Mode
            </button>
            <span style={{ fontSize: '12px', color: '#666' }}>
            {mode === 'add' ? 'Click on canvas to add element' : 'Click to select, drag to move, right-click for options'}
          </span>
          </div>

          {/* Harder Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              Harder Section
              <button
                  style={{ ...styles.button, ...styles.addButton, marginLeft: '10px' }}
                  onClick={() => addElementToSection('harder')}
              >
                Add Element
              </button>
            </div>
            {config.Bill.harder.map((item, index) => {
              const key = Object.keys(item)[0];
              const values = item[key];
              const isSelected = selectedItem?.section === 'harder' && selectedItem?.index === index;
              return (
                  <div key={key} style={{
                    ...styles.fieldGroup,
                    backgroundColor: isSelected ? '#e3f2fd' : '#f9f9f9',
                    border: isSelected ? '2px solid #007bff' : '1px solid #ddd'
                  }}>
                    <button
                        style={styles.removeButton}
                        onClick={() => removeElement('harder', index)}
                    >
                      ×
                    </button>
                    <div style={styles.fieldTitle}>{key}</div>
                    <div style={styles.inputGroup}>
                      <div>
                        <label style={styles.label}>X Position</label>
                        <input
                            style={styles.input}
                            type="number"
                            value={values.x}
                            onChange={(e) => handleChange('harder', index, 'x', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Y Position</label>
                        <input
                            style={styles.input}
                            type="number"
                            value={values.y}
                            onChange={(e) => handleChange('harder', index, 'y', parseInt(e.target.value))}
                        />
                      </div>
                      <MissingItem values={values} index={index} section={"harder"} />
                    </div>
                  </div>
              );
            })}
          </div>

          {/* Product List Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              Product List
              <button
                  style={{ ...styles.button, ...styles.addButton, marginLeft: '10px' }}
                  onClick={() => addElementToSection('product_list')}
              >
                Add Element
              </button>
            </div>
            {config.Bill.product.product_list.map((item, index) => {
              const key = Object.keys(item)[0];
              const values = item[key];
              const isSelected = selectedItem?.section === 'product_list' && selectedItem?.index === index;
              return (
                  <div key={key} style={{
                    ...styles.fieldGroup,
                    backgroundColor: isSelected ? '#e8f5e8' : '#f9f9f9',
                    border: isSelected ? '2px solid #28a745' : '1px solid #ddd'
                  }}>
                    <button
                        style={styles.removeButton}
                        onClick={() => removeElement('product_list', index)}
                    >
                      ×
                    </button>
                    <div style={styles.fieldTitle}>{key}</div>
                    <div style={styles.inputGroup}>
                      <div>
                        <label style={styles.label}>X Position</label>
                        <input
                            style={styles.input}
                            type="number"
                            value={values.x}
                            onChange={(e) => handleChange('product_list', index, 'x', parseInt(e.target.value))}
                        />
                      </div>
                      <MissingItem values={values} index={index} section={"product_list"} />
                    </div>
                  </div>
              );
            })}
          </div>

          {/* Footer Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              Footer Section
              <button
                  style={{ ...styles.button, ...styles.addButton, marginLeft: '10px' }}
                  onClick={() => addElementToSection('footer')}
              >
                Add Element
              </button>
            </div>
            {config.Bill.footer.map((item, index) => {
              const key = Object.keys(item)[0];
              const values = item[key];
              const isSelected = selectedItem?.section === 'footer' && selectedItem?.index === index;
              return (
                  <div key={key} style={{
                    ...styles.fieldGroup,
                    backgroundColor: isSelected ? '#ffeaea' : '#f9f9f9',
                    border: isSelected ? '2px solid #dc3545' : '1px solid #ddd'
                  }}>
                    <button
                        style={styles.removeButton}
                        onClick={() => removeElement('footer', index)}
                    >
                      ×
                    </button>
                    <div style={styles.fieldTitle}>{key}</div>
                    <div style={styles.inputGroup}>
                      <div>
                        <label style={styles.label}>X Position</label>
                        <input
                            style={styles.input}
                            type="number"
                            value={values.x}
                            onChange={(e) => handleChange('footer', index, 'x', parseInt(e.target.value))}
                        />
                      </div>
                      {values.y !== undefined && (
                          <div>
                            <label style={styles.label}>Y Position</label>
                            <input
                                style={styles.input}
                                type="number"
                                value={values.y}
                                onChange={(e) => handleChange('footer', index, 'y', parseInt(e.target.value))}
                            />
                          </div>
                      )}
                      <MissingItem values={values} index={index} section={"footer"} />
                    </div>
                  </div>
              );
            })}
          </div>
        </div>

        <div style={styles.canvasContainer}>
          <canvas
              ref={canvasRef}
              style={{
                backgroundColor: "white",
                border: '1px solid #ccc',
                cursor: mode === 'add' ? 'crosshair' : 'default'
              }}
          />

          {/* Context Menu */}
          {contextMenu && (
              <div
                  style={{
                    ...styles.contextMenu,
                    left: contextMenu.x,
                    top: contextMenu.y,
                  }}
                  onMouseLeave={() => setContextMenu(null)}
              >
                <div
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee'
                    }}
                    onClick={() => {
                      duplicateElement(contextMenu.element.section, contextMenu.element.index);
                      setContextMenu(null);
                    }}
                >
                  Duplicate
                </div>
                <div
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      color: '#dc3545'
                    }}
                    onClick={() => {
                      removeElement(contextMenu.element.section, contextMenu.element.index);
                      setContextMenu(null);
                    }}
                >
                  Delete
                </div>
              </div>
          )}
        </div>

        {/* Click outside to close context menu */}
        {contextMenu && (
            <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999
                }}
                onClick={() => setContextMenu(null)}
            />
        )}
      </div>
  );
};

export default YAMLEditor;