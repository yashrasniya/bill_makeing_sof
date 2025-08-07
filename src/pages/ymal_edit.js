import React, {useEffect, useState, useRef} from 'react';
import {clientToken} from "../axios";

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    overflow:'scroll',
    height:'1684px', // Increased height to prevent double scrollbars
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
    borderRadius: '4px'
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
  }
};


const YAMLEditor = () => {
  const [config, setConfig] = useState({
    Bill: {
      harder: [],
      product: {
        start: 452,
        product_list: []
      },
      footer:[]
    }
  });
  const canvasRef = useRef(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null)
  let new_global_newConfig = null


  useEffect(() => {
    clientToken.get("yaml/").then((r)=>setConfig(r.data))
  }, []);

  // Effect to load the background image for the canvas
  useEffect(() => {
    const image = new Image();
    // IMPORTANT: Place your invoice background image in the `public` folder
    // of your React project. This path is relative to that public folder.
    image.src = '/SBS_BILL_page_1.jpg';
    image.onload = () => {
      setBackgroundImage(image);
    };
    image.onerror = () => {
      console.error("Could not load the background image. Make sure it's in the public folder and the path is correct.");
    }
  }, []);

  // Effect to draw on the canvas when config or the background image changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config.Bill) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const n = 2;

    // Set canvas dimensions (e.g., A4 aspect ratio)
    canvas.width = 595 * n;
    canvas.height = 842 * n;

    // Clear canvas before redrawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the background image first if it's loaded
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    const drawMarker = (x, y, color, isDragged = false) => {
      const radius = isDragged ? 7 : 5; // Make dragged marker larger
      ctx.fillStyle = isDragged ? 'orange' : color; // Highlight dragged marker
      ctx.beginPath();
      ctx.arc(x * n, (842 - y) * n, radius, 0, 2 * Math.PI);
      ctx.fill();
    };

    // Draw "harder" section items
    config.Bill.harder.forEach((item, index) => {
      const key = Object.keys(item)[0];
      const values = item[key];
      const isDragged = draggedItem?.section === 'harder' && draggedItem?.index === index;
      if (values.x !== undefined && values.y !== undefined) {
        drawMarker(values.x, values.y, 'blue', isDragged);
      }
    });

    // Draw "product_list" section items
    const productStartY = config.Bill.product.start;
    if (productStartY) {
      config.Bill.product.product_list.forEach((item, index) => {
        const key = Object.keys(item)[0];
        const values = item[key];
        const isDragged = draggedItem?.section === 'product_list' && draggedItem?.index === index;
        if (values.x !== undefined) {
          drawMarker(values.x, productStartY, 'green', isDragged);
        }
      });
    }

    // Draw "footer" section items
    config.Bill.footer.forEach((item, index) => {
      const key = Object.keys(item)[0];
      const values = item[key];
      const isDragged = draggedItem?.section === 'footer' && draggedItem?.index === index;
      if (values.x !== undefined && values.y !== undefined) {
        drawMarker(values.x, values.y, 'red', isDragged);
      }
    });

  }, [config, backgroundImage, draggedItem]);

  // Effect for handling drag and drop on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config.Bill) return;

    const n = 2;
    const markerRadius = 10; // Make the clickable area a bit larger

    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const findMarkerAtPos = (mousePos) => {
      // Check harder items (in reverse to select top-most markers first)
      for (let i = config.Bill.harder.length - 1; i >= 0; i--) {
        const item = config.Bill.harder[i];
        const key = Object.keys(item)[0];
        const values = item[key];
        if (values.x !== undefined && values.y !== undefined) {
          const markerX = values.x * n;
          const markerY = (842 - values.y) * n;
          const distance = Math.sqrt(Math.pow(mousePos.x - markerX, 2) + Math.pow(mousePos.y - markerY, 2));
          if (distance < markerRadius) {
            return { section: 'harder', index: i, key, dragY: true };
          }
        }
      }

      // Check product list items
      const productStartY = config.Bill.product.start;
      if (productStartY) {
        for (let i = config.Bill.product.product_list.length - 1; i >= 0; i--) {
          const item = config.Bill.product.product_list[i];
          const key = Object.keys(item)[0];
          const values = item[key];
          if (values.x !== undefined) {
            const markerX = values.x * n;
            const markerY = (842 - productStartY) * n;
            const distance = Math.sqrt(Math.pow(mousePos.x - markerX, 2) + Math.pow(mousePos.y - markerY, 2));
            if (distance < markerRadius) {
              return { section: 'product_list', index: i, key, dragY: false };
            }
          }
        }
      }

      // Check footer items
      for (let i = config.Bill.footer.length - 1; i >= 0; i--) {
        const item = config.Bill.footer[i];
        const key = Object.keys(item)[0];
        const values = item[key];
        if (values.x !== undefined && values.y !== undefined) {
          const markerX = values.x * n;
          const markerY = (842 - values.y) * n;
          const distance = Math.sqrt(Math.pow(mousePos.x - markerX, 2) + Math.pow(mousePos.y - markerY, 2));
          if (distance < markerRadius) {
            return { section: 'footer', index: i, key, dragY: true };
          }
        }
      }
      return null;
    };

    const handleMouseDown = (e) => {
      const pos = getMousePos(e);
      const marker = findMarkerAtPos(pos);
      if (marker) {
        setDraggedItem(marker)
        canvas.style.cursor = 'grabbing';
        console.log(marker)

      }
    };

    const handleMouseMove = (e) => {
      const pos = getMousePos(e);
      console.log(draggedItem)
      if (!draggedItem) {
        canvas.style.cursor = findMarkerAtPos(pos) ? 'grab' : 'default';
        return;
      }

      const newX = Math.round(pos.x / n);
      const newY = Math.round(842 - (pos.y / n));

      // Create a deep copy to modify
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
        if (draggedItem.dragY) { // Only update Y if allowed
          itemToUpdate[key].y = newY;
        }
        // setConfig(newConfig);
        new_global_newConfig = newConfig
      }
    };

    const handleMouseUp = () => {
      console.log("outside")
      // draggedItem= null
      if(new_global_newConfig) setConfig(new_global_newConfig)
      new_global_newConfig = null
      canvas.style.cursor = 'default';
    };
  const handeldblclick = () => {
    console.log("dblclick")
  }
    // canvas.addEventListener('mousedown', handleMouseDown);
    // canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp); // Listen on window to catch mouseup outside canvas

    return () => {
      canvas.removeEventListener('click', handleMouseDown);
      // canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [config, backgroundImage]); // Rerun if config changes to get latest marker positions

  const handleChange = (section, index, fieldPath, value) => {
    // Use a deep copy to avoid state mutation issues.
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
      // Traverse path until the last key
      for (let i = 0; i < path.length - 1; i++) {
        // Create nested object if it doesn't exist
        current = current[path[i]] = current[path[i]] || {};
      }
      // Set the value on the final key
      current[path[path.length - 1]] = value;
    }
    setConfig(newConfig);
  };
  function MissingItem({values, index,section}){
    return(
        <>
          {values?.limit !== undefined && <div>
            <label style={styles.label}>limit</label>
            <input
                style={styles.input}
                type="number"
                value={values.limit}
                onChange={(e) => handleChange(section, index, 'limit', parseInt(e.target.value))}
            />
          </div>}
          {values?.no_lines !== undefined && <div>
            <label style={styles.label}>no lines</label>
            <input
                style={styles.input}
                type="number"
                value={values.no_lines}
                onChange={(e) => handleChange(section, index, 'no_lines', parseInt(e.target.value))}
            />
          </div>}{values?.font_size !== undefined && <div>
          <label style={styles.label}>font size</label>
          <input
              style={styles.input}
              type="number"
              value={values.font_size}
              onChange={(e) => handleChange(section, index, 'font_size', parseInt(e.target.value))}
          />
        </div>}{values?.value !== undefined && <div>
          <label style={styles.label}>Default value</label>
          <input
              style={styles.input}
              type="text"
              value={values.value}
              onChange={(e) => handleChange(section, index, 'value', e.target.value)}
          />
        </div>}{values?.suffix !== undefined && <div>
          <label style={styles.label}>Suffix</label>
          <input
              style={styles.input}
              type="text"
              value={values.suffix}
              onChange={(e) => handleChange(section, index, 'suffix', e.target.value)}
          />
        </div>}
          {values?.next_line && <div>
            <div style={styles.fieldTitle}>Next Line</div>
            <div style={styles.inputGroup}>
              {values.next_line.gap !== undefined && <div><label style={styles.label}>Gap</label><input
                  style={styles.input}
                  type="number"
                  value={values.next_line.gap}
                  onChange={(e) => handleChange(section, index, 'next_line.gap', parseInt(e.target.value))}
              /></div>}
              {values.next_line.font_size !== undefined && <div><label style={styles.label}>font Size</label>
                <input
                    style={styles.input}
                    type="number"
                    value={values.next_line.font_size}
                    onChange={(e) => handleChange(section, index, 'next_line.font_size', parseInt(e.target.value))}
                /></div>}
              {values.next_line.x !== undefined && <div><label style={styles.label}>X</label>
                <input
                    style={styles.input}
                    type="number"
                    value={values.next_line.x}
                    onChange={(e) => handleChange(section, index, 'next_line.x', parseInt(e.target.value))}
                /></div>}
            </div>


          </div>}
        </>

    )
  }

  return (<div style={{display:'flex',flexDirection:'row',justifyContent:'space-evenly'}}>
        <div style={styles.container}>

          {/* Harder Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Harder Section</div>
            {config.Bill.harder.map((item, index) => {
              const key = Object.keys(item)[0];
              const values = item[key];
              return (
                  <div key={key} style={styles.fieldGroup}>
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
                      <MissingItem values={values} index={index}  section={"harder"}/>
                    </div>
                  </div>
              );
            })}
          </div>

          {/* Product List Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Product List</div>
            {config.Bill.product.product_list.map((item, index) => {
              const key = Object.keys(item)[0];
              const values = item[key];
              return (
                  <div key={key} style={styles.fieldGroup}>
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
                      <MissingItem values={values} index={index} section={"product_list"}/>
                    </div>

                  </div>
              );
            })}
          </div>

          {/* Footer Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Footer Section</div>
            {config.Bill.footer.map((item, index) => {
              const key = Object.keys(item)[0];
              const values = item[key];
              return (
                  <div key={key} style={styles.fieldGroup}>
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
                      <MissingItem values={values} index={index} section={"footer"}/>
                    </div>
                  </div>
              );
            })}
          </div>
        </div>
        <canvas ref={canvasRef} style={{backgroundColor:"white", border: '1px solid #ccc',overflow:'scroll'}}>
        </canvas>
      </div>
  );
};

export default YAMLEditor;