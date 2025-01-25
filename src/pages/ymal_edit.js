import React, {useEffect, useState} from 'react';
import {clientToken} from "../axios";

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
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
    gridTemplateColumns: '1fr 1fr',
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
      harder: [
        {
          invoice_number: {
            x: 130,
            y: 622,
            label: 'invoice_number'
          }
        },
        {
          invoice_date: {
            x: 130,
            y: 610,
            label: 'date'
          }
        },
        {
          company_name: {
            x: 90,
            y: 575,
            label: 'receiver,name',
            limit: 55
          }
        },
        {
          company_address: {
            x: 90,
            y: 560,
            limit: 38,
            no_lines: 2,
            font_size: 7,
            next_line: {
              gap: 12
            },
            label: 'receiver,address'
          }
        },
        {
          gst_number: {
            x: 90,
            y: 528,
            label: 'receiver,gst_number'
          }
        },
        {
          state_name: {
            x: 90,
            y: 515,
            label: 'receiver,state'
          }
        },
        {
          state_code: {
            x: 250,
            y: 510,
            label: 'receiver,state_code'
          }
        },
        {
          my_state_name: {
            x: 129,
            y: 600,
            label: 'my_state_name',
            value: 'UTTARAKHAND'
          }
        },
        {
          my_state_code: {
            x: 250,
            y: 600,
            label: 'my_state_code',
            value: '05'
          }
        }
      ],
      product: {
        start: 452,
        product_list: [
          {
            's.no': {
              x: 55,
              label: 's.no'
            }
          },
          {
            product_name: {
              x: 80,
              label: 'Name'
            }
          },
          {
            quantity: {
              x: 372,
              label: 'quantity'
            }
          },
          {
            rate: {
              x: 427,
              label: 'rate',
              suffix: '/-'
            }
          },
          {
            amount: {
              x: 482,
              label: 'amount',
              suffix: '/-'
            }
          }
        ]
      },
      footer: [
        {
          total_amount_with_out_gst: {
            x: 482,
            y: 190,
            label: 'total_amount_with_out_gst',
            suffix: '/-'
          }
        },
        {
          gst_amount: {
            x: 482,
            y: 150,
            label: 'gst_amount',
            suffix: '/-'
          }
        },
        {
          total_amount_in_text: {
            x: 175,
            y: 173,
            label: 'total_amount_in_text',
            limit: 44,
            no_lines: 3,
            next_line: {
              gap: 17,
              x: 55,
              font_size: 7
            },
            suffix: ' only'
          }
        },
        {
          total_amount_with_gst: {
            x: 482,
            y: 130,
            label: 'total_amount_with_gst',
            suffix: '/-'
          }
        },
        {
          center_gst: {
            x: 113,
            y: 216,
            font_size: 7,
            label: 'center_gst'
          }
        },
        {
          state_gst: {
            x: 183,
            y: 216,
            font_size: 7,
            label: 'state_gst'
          }
        },
        {
          center_gst_amount: {
            x: 90,
            y: 202,
            label: 'center_gst_amount',
            suffix: '/-'
          }
        },
        {
          state_gst_amount: {
            x: 160,
            y: 202,
            label: 'state_gst_amount',
            suffix: '/-'
          }
        }
      ]
    }
  });


    useEffect(() => {
        clientToken.get("yaml/").then((r)=>setConfig(r.data))
    }, []);
  const handleChange = (section, index, field, value, subField = null) => {
    console.log(index)
    const newConfig = { ...config };
    if (section === 'harder') {
      if (subField) {
        newConfig.Bill.harder[index][Object.keys(newConfig.Bill.harder[index])[0]][subField] = value;
      } else {
        newConfig.Bill.harder[index][Object.keys(newConfig.Bill.harder[index])[0]][field] = value;
      }
    } else if (section === 'product_list') {
      newConfig.Bill.product.product_list[index][Object.keys(newConfig.Bill.product.product_list[index])[0]][field] = value;
    } else if (section === 'footer') {
      newConfig.Bill.footer[index][Object.keys(newConfig.Bill.footer[index])[0]][field] = value;
    }
    setConfig(newConfig);
  };
  function MissingItem({values, index,section}){
    console.log(values)
  return(
      <>
        {values?.limit ? <div>
                      <label style={styles.label}>limit</label>
                      <input
                          style={styles.input}
                          type="number"
                          value={values.limit}
                          onChange={(e) => handleChange(section, index, 'limit', parseInt(e.target.value))}
                      />
                  </div>:''}
                {values?.no_lines ? <div>
                      <label style={styles.label}>no lines</label>
                      <input
                          style={styles.input}
                          type="number"
                          value={values.no_lines}
                          onChange={(e) => handleChange(section, index, 'no_lines', parseInt(e.target.value))}
                      />
                  </div>:''}{values?.font_size ? <div>
                      <label style={styles.label}>font size</label>
                      <input
                          style={styles.input}
                          type="number"
                          value={values.font_size}
                          onChange={(e) => handleChange(section, index, 'font_size', parseInt(e.target.value))}
                      />
                  </div>:''}{values?.value ? <div>
                      <label style={styles.label}>Default value</label>
                      <input
                          style={styles.input}
                          type="text"
                          value={values.value}
                          onChange={(e) => handleChange(section, index, 'value', e.target.value)}
                      />
                  </div>:''}{values?.suffix ? <div>
                      <label style={styles.label}>Suffix</label>
                      <input
                          style={styles.input}
                          type="text"
                          value={values.suffix}
                          onChange={(e) => handleChange(section, index, 'suffix', e.target.value)}
                      />
                  </div>:''}
                {values?.next_line ? <div>
                  <div style={styles.fieldTitle}>Next Line</div>
                  <div style={styles.inputGroup}>
                    {values?.next_line?.gap ? <div><label style={styles.label}>Gap</label><input
                      style={styles.input}
                      type="number"
                      value={values.next_line.gap}
                      onChange={(e) => handleChange(section, index, 'next_line.gap', parseInt(e.target.value))}
                  /></div> : ""}
                  {values?.next_line?.font_size ? <div><label style={styles.label}>font Size</label>
                    <input
                        style={styles.input}
                        type="number"
                        value={values.next_line.font_size}
                        onChange={(e) => handleChange(section, index, 'next_line.font_size', parseInt(e.target.value))}
                    /></div> : ""}
                  {values?.next_line?.x ? <div><label style={styles.label}>X</label>
                    <input
                        style={styles.input}
                        type="number"
                        value={values.next_line.x}
                        onChange={(e) => handleChange(section, index, 'next_line', parseInt(e.target.value),'x')}
                    /></div> : ""}
                  </div>


                </div> : ""}
      </>

  )
  }

  return (
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
                {values.y && (
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
  );
};

export default YAMLEditor;