import '../style/bill.css';
import React, { useEffect, useRef, useState, useCallback } from "react";
import { clientToken } from "@/axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Cropper from "react-easy-crop";
import PdfOpener from "@/utility/pdf_opener";
import ExportDropdown from "@/comonant/Bill/ExportDropdown";
import CustomerDropdown from "@/comonant/customer_pop";
import CollapsibleRowCard from "@/comonant/Bill/CollapsibleRowCard";
import BulkEditModal from "@/comonant/Bill/BulkEditModal";
import { GST_STATES } from "@/constants/gst";

/* Renders the cropped region of `imageSrc` onto an offscreen canvas and
   resolves a JPEG Blob — the standard react-easy-crop recipe. */
function getCroppedImageBlob(imageSrc, cropAreaPixels) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(cropAreaPixels.width);
            canvas.height = Math.round(cropAreaPixels.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                img,
                cropAreaPixels.x, cropAreaPixels.y, cropAreaPixels.width, cropAreaPixels.height,
                0, 0, canvas.width, canvas.height
            );
            canvas.toBlob((blob) => {
                if (blob) resolve(blob); else reject(new Error('Crop failed'));
            }, 'image/jpeg', 0.92);
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

const formatHeaderTitle = (title) => {
    if (!title) return '';
    let formatted = title.replace(/_/g, ' ');
    return formatted.replace(/\w\S*/g, (txt) => {
        const lower = txt.toLowerCase();
        if (ACRONYMS.has(lower)) return txt.toUpperCase();
        if (lower === 'hsn/sac') return 'HSN/SAC';
        return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    });
};

const ACRONYMS = new Set(['gst', 'hsn', 'sac', 'sku', 'mrp', 'upi', 'igst', 'cgst', 'sgst']);

// Quantity, rate, tax and amount columns are right-aligned so figures line up.
const NUMERIC_TITLE = /^(qty|quantity|rate|price|mrp|gst|disc|discount|amount|total)\b/i;
const isNumericColumn = (item) =>
    !!item && (item.is_calculable || NUMERIC_TITLE.test(item.input_title || ''));

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
    'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const twoDigitWords = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`);
const belowThousandWords = (n) => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return [h ? `${ONES[h]} hundred` : '', rest ? twoDigitWords(rest) : ''].filter(Boolean).join(' ');
};
// Indian grouping: thousand, lakh, crore (the last unit repeats for larger values).
const integerToIndianWords = (n) => {
    if (n === 0) return 'zero';
    const parts = [];
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const rest = n % 1000;
    if (crore) parts.push(`${crore >= 100 ? integerToIndianWords(crore) : twoDigitWords(crore)} crore`);
    if (lakh) parts.push(`${twoDigitWords(lakh)} lakh`);
    if (thousand) parts.push(`${twoDigitWords(thousand)} thousand`);
    if (rest) parts.push(belowThousandWords(rest));
    return parts.join(' ');
};
const amountInWords = (amount) => {
    const value = Math.round((Number(amount) || 0) * 100);
    if (value <= 0) return '';
    const rupees = Math.floor(value / 100);
    const paise = value % 100;
    const rupeeWords = rupees ? `${integerToIndianWords(rupees)} ${rupees === 1 ? 'rupee' : 'rupees'}` : '';
    const paiseWords = paise ? `${twoDigitWords(paise)} ${paise === 1 ? 'paisa' : 'paise'}` : '';
    const words = `${[rupeeWords, paiseWords].filter(Boolean).join(' and ')} only`;
    return words.charAt(0).toUpperCase() + words.slice(1);
};
const formatINR = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Dates and payment terms ─────────────────────────────────────────────
// Whole-day maths on YYYY-MM-DD strings in UTC, so a timezone offset can never
// move a due date by a day.
const parseISO = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
const addDaysISO = (iso, days) => {
    const base = parseISO(iso);
    return base === null ? '' : new Date(base + days * 86400000).toISOString().slice(0, 10);
};
const daysBetweenISO = (from, to) => {
    const a = parseISO(from);
    const b = parseISO(to);
    return a === null || b === null ? null : Math.round((b - a) / 86400000);
};
const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const PAYMENT_TERMS = [[0, 'Due on receipt'], [7, 'Net 7'], [15, 'Net 15'], [30, 'Net 30'], [45, 'Net 45'], [60, 'Net 60']];

const isGstStateCode = (code) => {
    const n = Number(code);
    return Number.isInteger(n) && ((n >= 1 && n <= 38) || n === 97 || n === 99);
};

// One labelled field in the header card. Styling lives in bill.css (.bill_field).
const HeaderField = ({ label, htmlFor, basis = 140, hint, spacer, grow = true, children }) => (
    <div className="bill_field" style={grow ? { flex: `1 1 ${basis}px`, minWidth: basis } : { flex: '0 0 auto' }}>
        {spacer
            ? <span className="bill_spacer" aria-hidden="true">&nbsp;</span>
            : <label htmlFor={htmlFor}>{label}</label>}
        {children}
        {hint && <span className="bill_hint">{hint}</span>}
    </div>
);

const formatGstPercent = (value) => {
    if (value === '' || value === null || value === undefined) return value;
    const n = Number(value);
    return Number.isNaN(n) ? value : `${n}%`;
};

/* ── Toast Notification Component ──────────────────────────────── */
const ToastContainer = ({ toasts, onDismiss }) => (
    <div style={{
        position: 'fixed', top: '20px', right: '20px',
        zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '10px',
        pointerEvents: 'none',
    }}>
        {toasts.map((t) => (
            <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: t.type === 'error' ? '#fee2e2' : t.type === 'warning' ? '#fef9c3' : '#dcfce7',
                border: `1px solid ${t.type === 'error' ? '#fca5a5' : t.type === 'warning' ? '#fde047' : '#86efac'}`,
                borderLeft: `4px solid ${t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#eab308' : '#22c55e'}`,
                color: t.type === 'error' ? '#991b1b' : t.type === 'warning' ? '#713f12' : '#14532d',
                padding: '12px 16px', borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                minWidth: '260px', maxWidth: '360px',
                animation: 'slideInToast 0.3s ease',
                pointerEvents: 'all',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px', fontWeight: 500,
            }}>
                <span style={{ fontSize: '18px' }}>
                    {t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : '✅'}
                </span>
                <span style={{ flex: 1 }}>{t.message}</span>
                <button
                    onClick={() => onDismiss(t.id)}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '16px', opacity: 0.6, padding: '0 2px',
                        color: 'inherit', lineHeight: 1,
                    }}
                    aria-label="Dismiss"
                >✕</button>
            </div>
        ))}
        <style>{`
            @keyframes slideInToast {
                from { transform: translateX(110%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
        `}</style>
    </div>
);



const bill_body_items = [
    { input_title: 'Name of Product', size: '40%', show: true, calculable: false },
    { input_title: 'Quantity', size: '16%', show: true, calculable: true },
    { input_title: 'Type', size: '16%', show: false, calculable: false },
    { input_title: 'Rate', size: '16%', show: true, calculable: true },
    { input_title: 'Product Description', size: '40%', show: false, calculable: false },
    { input_title: 'HSN/SAC', size: '16%', show: false, calculable: false },
    { input_title: 'Disc', size: '16%', show: false, calculable: true, formula: { variable: '-', } },
    { input_title: 'GST', size: '16%', show: true, calculable: false },
]
function NewBillBody({ id }) {
    let [new_product, setNewProduct] = useState({ product_properties: [] })
    let [table_content, setTable_content] = useState([])
    let [Pop_up_properties, setPop_up_properties] = useState('none')
    let [checkbox, setCheckBox] = useState({})
    let [company_name, setCompany_name] = useState([])
    let [bill_body_items, setBill_body_items] = useState([])
    const [update, set_update] = useState(false)
    const [InvoiceData, setInvoiceData] = useState({})
    const [url, setUrl] = useState(id ? `invoice/${id}/update/` : 'invoice/')
    const [refresh, setRefresh] = useState(false)
    const { features: planFeatures, permissions: userPermissions, status: accessStatus, lineItemImagesEnabled, companyStateCode } = useSelector((s) => s.access);
    const canInventory = accessStatus !== 'succeeded' ||
        (planFeatures.includes('inventory') && userPermissions.includes('inventory.manage'));
    // Pro-plan feature AND the company's own opt-in toggle (off by default,
    // set in Company Settings) — both must be true for this to show at all.
    const canLineItemImages = planFeatures.includes('line_item_images') && lineItemImagesEnabled;
    const [newDataFormat, setNewDataFormat] = useState({})
    const [invoiceNumber, setInvoiceNumber] = useState(InvoiceData?.invoice_number ?? "");
    const [inventoryProducts, setInventoryProducts] = useState([]);
    const [selectedInventoryProductId, setSelectedInventoryProductId] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
    const [headerCfg, setHeaderCfg] = useState(null); // company's header-field settings; null until loaded
    const [inlineDraft, setInlineDraft] = useState({}); // field id -> value for the inline add-item row
    const [inlineInventoryId, setInlineInventoryId] = useState(null);
    const [inlineBusy, setInlineBusy] = useState(false);
    const inlineNameRef = useRef(null);
    const [customFields, setCustomFields] = useState([]);
    const [showCFPopup, setShowCFPopup] = useState(false);
    const [cfValues, setCFValues] = useState({});
    const [uploadingImg, setUploadingImg] = useState(false);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [productImages, setProductImages] = useState([]);
    const [imagePickerNext, setImagePickerNext] = useState(null);
    const imageFileInputRef = useRef(null);
    const [cropAspect, setCropAspect] = useState(1);
    const [cropModal, setCropModal] = useState(null); // { src, file } | null
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    let navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const typeParam = params.get('type');
        // Only override if creating a new bill (no id) and no type is selected yet
        if (typeParam && !id && !InvoiceData?.invoice_type) {
            setInvoiceData(prev => ({ ...prev, invoice_type: typeParam }));
        }
        // ?customer=<id> (from the Customers page) starts the bill for that customer
        const customerParam = params.get('customer');
        if (customerParam && !id && !InvoiceData?.receiver) {
            setInvoiceData(prev => (prev.receiver ? prev : { ...prev, receiver: customerParam }));
        }
        // ?vendor=<id> (from the Vendors page) starts the purchase for that vendor
        const vendorParam = params.get('vendor');
        if (vendorParam && !id && !InvoiceData?.vendor) {
            setInvoiceData(prev => (prev.vendor ? prev : { ...prev, vendor: vendorParam }));
        }
    }, [location.search, id]);

    const showToast = useCallback((message, type = 'error') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    useEffect(() => {
        console.log("InvoiceData", InvoiceData);
    });

    useEffect(() => {
        // Which optional header fields this company shows, and their defaults.
        // If it can't be read, every field stays visible (the old behaviour).
        clientToken.get("invoice-header-config/", { suppressErrorToast: true })
            .then((response) => setHeaderCfg(response.data?.fields || null))
            .catch(() => setHeaderCfg(null));
    }, []);

    useEffect(() => {
        clientToken.get("custom-fields/").then((response) => {
            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setCustomFields(data.filter(cf => !cf.hidden));
        }).catch(err => console.error("Failed to load custom fields:", err));
    }, []);

    useEffect(() => {
        // Steers the upload-time crop tool so a photo isn't force-squashed
        // later — falls back to a square silently if it can't be read.
        // Skipped entirely when the feature is off: the endpoint 403s then,
        // and there is nothing to crop for either.
        if (!canLineItemImages) return;
        clientToken.get("product-images/crop-ratio/", { suppressErrorToast: true }).then((response) => {
            const { width, height } = response.data || {};
            if (width && height) setCropAspect(width / height);
        }).catch(() => {});
    }, [canLineItemImages]);

    useEffect(() => {
        if (InvoiceData?.custom_header_field) {
            try {
                const val = typeof InvoiceData.custom_header_field === 'string'
                    ? JSON.parse(InvoiceData.custom_header_field)
                    : InvoiceData.custom_header_field;
                setCFValues(val || {});
            } catch (e) {
                console.error("Failed to parse custom_header_field:", e);
            }
        }
    }, [InvoiceData?.custom_header_field]);


    // var checkbox={}
    let grandTotal = 0
    let grandGstTotal = 0
    let grandSubtotal = 0   // taxable value, before GST
    let grandAdjustments = 0 // post-GST additions/deductions (extraCal)
    const gstByRate = {}    // GST rate -> GST amount collected at that rate
    useEffect(() => {
        let endpoint = 'companies/?page_size=999';
        if (InvoiceData?.invoice_type === 'purchase') {
            endpoint = 'vendors/?page_size=999';
        }
        
        clientToken.get(endpoint).then((response) => {
            if (response.status === 200) {
                setCompany_name(response.data.results)
            }
        }).catch((error) => {
            console.log(error)
            showToast(`Error ${error?.request?.status ?? ''}: Failed to load companies/vendors`)
        })

        // inventory suggestions are optional — skip when the plan/permission
        // doesn't include inventory (avoids a 403 toast on every save)
        if (canInventory) {
            clientToken.get('/inventory/products/?limit=500', { suppressErrorToast: true }).then((res) => {
                if (res.status === 200) {
                    setInventoryProducts(res.data.results || res.data)
                }
            }).catch(err => console.error("Could not load inventory: ", err));
        }
    }, [refresh, canInventory]);

    useEffect(() => {
        // Already in sync (e.g. the server just sent us an auto-generated
        // number) -- re-saving would fire a redundant second POST.
        if (InvoiceData.invoice_number === invoiceNumber) return;
        const handler = setTimeout(() => {
            // Debounced update (runs only after 500ms pause)
            setInvoiceData((prev) => ({ ...prev, invoice_number: invoiceNumber }));
            setRefresh((r) => !r);
        }, 500); // 500ms debounce time

        // Cleanup timeout if user keeps typing
        return () => clearTimeout(handler);
    }, [invoiceNumber]);

    useEffect(() => {
        clientToken.get('new/product/in/frontend/').then((response) => {
            if (response.status === 200) {
                setBill_body_items(response.data)
                let d = []
                response.data.map((item) => { 
                    d.push({ 
                        new_product_in_frontend: item, 
                        value: item.default_value || '' 
                    }) 
                })
                setNewDataFormat({ product_properties: d })
                setNewProduct({ ...new_product, product_properties: JSON.parse(JSON.stringify(d)) })
            }
        }).catch((error) => {
            console.log(error)
            showToast(`Error ${error?.request?.status ?? ''}: Failed to load product fields`)
        })
    }, [refresh]);
    useEffect(() => {
        // Only auto-save/create if there is actual data or an existing ID
        const hasData = Object.keys(InvoiceData).some(k => k !== 'invoice_type' && InvoiceData[k]);
        if (!id && !hasData) return;

        let form = new FormData()
        // Keys that must be sent even when empty, so they can be cleared.
        // Only on update: omitting invoice_number on create is what asks the
        // server to auto-generate one.
        const alwaysSend = url === 'invoice/' ? [] : ['invoice_number', 'due_date', 'place_of_supply', 'customer_notes', 'terms']
        Object.keys(InvoiceData).map((obj) => {

            if (('products' !== obj) && (InvoiceData[obj] || alwaysSend.includes(obj))) {
                if((obj == 'receiver' || obj == 'vendor') && typeof InvoiceData[obj] =='object'){
                    form.append(obj, InvoiceData[obj].id)
                } else if (obj === 'custom_header_field') {
                    form.append(obj, typeof InvoiceData[obj] === 'object' ? JSON.stringify(InvoiceData[obj]) : InvoiceData[obj])
                } else {
                    form.append(obj, InvoiceData[obj] ?? '')
                }

            }

        })
        if (grandTotal !== 0) {
            form.set('total_final_amount', parseFloat(grandTotal).toFixed(2))
            form.set('gst_final_amount', parseFloat(grandGstTotal).toFixed(2))
        }

        setSaveState('saving')
        clientToken.post(url, form).then((response) => {
            if (response.status === 200) {
                setSaveState('saved')
                setInvoiceData(response.data)
                setInvoiceNumber(response.data.invoice_number ?? "")
                if (url === 'invoice/') {
                    navigate(`/bill/${response.data.id}`)
                }

                setUrl(`invoice/${response.data.id}/update/`)
                // window.location.href=window.location.href+`/${response.data.id}`


                setTable_content(response.data.products)
            }

        }).catch((error) => {
            console.log(error)
            setSaveState('error')
            showToast(`Error ${error?.request?.status ?? ''}: Failed to save invoice`)
            if (error?.response?.status === 404) {
                navigate('/')
            }
        })


    }, [refresh]);


    const calculateProductTotals = (productProps) => {
        let total = 1;
        let extraCal = 0;
        
        function calculate(abc) {
            const item = abc.new_product_in_frontend;
            let currentCalculatedVal = abc.value;

            if (item.is_calculable) {
                if (item.formula) {
                    const val = parseFloat(abc.value) || 0;
                    if (item.formula === '+') {
                        if (item.on_with_out_gst_amount) extraCal += val;
                        else total += val;
                    } else if (item.formula === '-') {
                        if (item.on_with_out_gst_amount) extraCal -= val;
                        else total -= val;
                    } else if (item.formula === '/') {
                        total /= val || 1;
                    } else if (item.formula === '%+') {
                        currentCalculatedVal = (val / 100) * total;
                        if (item.on_with_out_gst_amount) extraCal += currentCalculatedVal;
                        else total += currentCalculatedVal;
                    } else if (item.formula === '%-') {
                        currentCalculatedVal = (val / 100) * total;
                        if (item.on_with_out_gst_amount) extraCal -= currentCalculatedVal;
                        else total -= currentCalculatedVal;
                    }
                } else {
                    if (abc.value && item.input_title !== 'GST') {
                        total *= parseFloat(abc.value);
                    }
                }
            }
        }

        [...productProps]
            .sort((a, b) => {
                const aFormula = a.new_product_in_frontend?.formula;
                const bFormula = b.new_product_in_frontend?.formula;
                if (!aFormula && bFormula) return -1;
                if (aFormula && !bFormula) return 1;
                return 0;
            })
            .forEach(calculate);

        let gstAmount = 0;
        if (
            productProps.length > 0 &&
            bill_body_items.some((o) => o.input_title === 'GST')
        ) {
            const gstItem = bill_body_items.find((o) => o.input_title === 'GST');
            const gstProp = productProps.find(p => p.new_product_in_frontend?.id === gstItem.id);
            const gst = gstProp ? gstProp.value : 0;
            gstAmount = gst ? total * (parseFloat(gst) / 100) : 0;
        }

        return {
            total_amount: (total + gstAmount + extraCal).toFixed(2),
            gst_amount: gstAmount.toFixed(2)
        };
    };

    // `override` ({ product, inventoryId }) lets the inline add-item row save a
    // line without going through the modal's new_product / inventory state. The
    // create path returns a promise resolving to true only when the line was added.
    const handelSave = (obj, update_data = false, override = null) => {
        console.log(new_product)
        var temp_opj = { product_properties: [] }
        console.log(table_content)
        if (update_data) {
            const totals = calculateProductTotals(new_product.product_properties);
            const promises = new_product.product_properties.map((obj) => {
                if (obj.id !== undefined) {
                    const form = new FormData()
                    form.append('value', obj.value)
                    return clientToken.post(`product/properties/${obj.id}/update/`, form)
                } else {
                    const productPropertiesForm = new FormData()
                    productPropertiesForm.append('new_product_in_frontend', obj.new_product_in_frontend.id)
                    productPropertiesForm.append('value', obj.value)
                    return clientToken.post('product/properties/', productPropertiesForm).then((response) => {
                        if (response.status === 200) {
                            const productUpdateForm = new FormData()
                            productUpdateForm.append('product_properties', response.data.id)
                            productUpdateForm.append('gst_amount', totals.gst_amount)
                            productUpdateForm.append('total_amount', totals.total_amount)
                            return clientToken.post(`product/${new_product.id}/update/`, productUpdateForm)
                        }
                    })
                }
            })

            Promise.all(promises).then(() => {
                const productUpdateForm = new FormData()
                productUpdateForm.append('gst_amount', totals.gst_amount)
                productUpdateForm.append('total_amount', totals.total_amount)
                productUpdateForm.append('image_id', new_product.image?.id ?? '')
                return clientToken.post(`product/${new_product.id}/update/`, productUpdateForm)
            }).then(() => {
                setNewProduct(JSON.parse(JSON.stringify(newDataFormat)))
                setPop_up_properties('none')
                setRefresh(r => !r)
            }).catch((error) => {
                console.error(error)
                showToast("Some product properties failed to update/create", "error")
                setRefresh(r => !r)
            })
        }
        else {
            let id = -1
            const product = override?.product ?? new_product
            const inventoryId = override ? override.inventoryId : selectedInventoryProductId

            // Extract quantity if the user selected an inventory product
            let parsedQuantity = 0;
            if (inventoryId) {
                const qtyField = bill_body_items.find(item => item.input_title === 'Quantity');
                if (qtyField) {
                    let qValue = product.product_properties.find(s => +s.new_product_in_frontend?.id === +qtyField.id)?.value;
                    if (qValue && !isNaN(qValue)) parsedQuantity = parseFloat(qValue);
                }
            }

            const totals = calculateProductTotals(product.product_properties);
            const form = new FormData()
            form.append('product_properties', '')
            form.append('gst_amount', totals.gst_amount)
            form.append('total_amount', totals.total_amount)
            form.append('image_id', product.image?.id ?? '')

            // Helper: ensure we have an invoice ID before adding products.
            // On a brand-new invoice the auto-save may not have fired yet,
            // so InvoiceData.id can be undefined. Create the invoice first.
            const ensureInvoiceId = async () => {
                if (InvoiceData.id) return InvoiceData.id;
                const invoiceForm = new FormData();
                Object.keys(InvoiceData).forEach(k => {
                    if (k !== 'products' && InvoiceData[k]) {
                        if ((k === 'receiver' || k === 'vendor') && typeof InvoiceData[k] === 'object') {
                            invoiceForm.append(k, InvoiceData[k].id);
                        } else if (k === 'custom_header_field') {
                            invoiceForm.append(k, typeof InvoiceData[k] === 'object' ? JSON.stringify(InvoiceData[k]) : InvoiceData[k]);
                        } else {
                            invoiceForm.append(k, InvoiceData[k]);
                        }
                    }
                });
                const res = await clientToken.post('invoice/', invoiceForm);
                if (res.status === 200) {
                    setInvoiceData(res.data);
                    setInvoiceNumber(res.data.invoice_number);
                    setUrl(`invoice/${res.data.id}/update/`);
                    navigate(`/bill/${res.data.id}`);
                    return res.data.id;
                }
                throw new Error('Failed to create invoice');
            };

            return clientToken.post('product/', form).then(async (response) => {
                if (response.status === 200) {
                    id = response.data.id
                    if (product.product_properties.length > 0) {
                        const invoiceId = await ensureInvoiceId();
                        return clientToken.post(`invoice/${invoiceId}/product/add/`, { product_id: response.data.id }).then((response) => {
                            if (response.status === 200) {
                                // NEW STOCK DEDUCTION LOGIC (Runs exactly once per product added)
                                if (inventoryId && parsedQuantity > 0) {
                                    const stockForm = new FormData();
                                    stockForm.append('product', inventoryId);
                                    stockForm.append('quantity', parsedQuantity);
                                    stockForm.append('movement_type', 'OUT');
                                    stockForm.append('notes', `Auto-deducted for Invoice #${invoiceId || 'Unknown'}`);

                                    // Fire and forget stock deduction
                                    clientToken.post('/inventory/stock-movements/', stockForm, { suppressErrorToast: true })
                                        .catch(err => console.error("Failed to deduct stock:", err));
                                }

                                console.log(new_product)
                                product.product_properties.map((obj) => {
                                    const productPropertiesForm = new FormData()
                                    productPropertiesForm.append('new_product_in_frontend', obj.new_product_in_frontend.id)
                                    productPropertiesForm.append('value', obj.value)
                                    clientToken.post('product/properties/', productPropertiesForm).then((response) => {
                                        if (response.status === 200) {
                                            const productUpdateForm = new FormData()
                                            productUpdateForm.append('product_properties', response.data.id)
                                            productUpdateForm.append('gst_amount', totals.gst_amount)
                                            productUpdateForm.append('total_amount', totals.total_amount)
                                            clientToken.post(`product/${id}/update/`, productUpdateForm).then((response) => {
                                                if (response.status === 200) {
                                                    setRefresh(prev => !prev);
                                                    setTimeout(() => {
                                                        setRefresh(prev => !prev);
                                                    }, 3000);
                                                }
                                            }).catch((error) => {
                                                console.log(error)
                                                showToast(`Error ${error?.request?.status ?? ''}: Failed to update product properties`)
                                            })
                                        }
                                    }).catch((error) => {
                                        console.log(error)
                                        showToast(`Error ${error?.request?.status ?? ''}: Failed to save product properties`)
                                    })
                                })

                                setNewProduct(JSON.parse(JSON.stringify(newDataFormat)))
                                setPop_up_properties('none')
                                setSelectedInventoryProductId(null);
                                return true
                            }
                            return false
                        }).catch((error) => {
                            console.log(error)
                            showToast(`Error ${error?.request?.status ?? ''}: Failed to add product to invoice`)
                            return false
                        })
                    } else {
                        showToast('Please fill in the product details before saving', 'warning')
                        return false
                    }
                }
                return false
            }).catch((error) => {
                console.log(error)
                showToast(`Error ${error?.request?.status ?? ''}: Failed to create product`)
                return false
            })
            console.log(new_product.product_properties)

            console.log(new_product)
        }
    }
    const handelInput = (obj) => {
        let array = new_product?.product_properties ? new_product?.product_properties : []
        let index = array.findIndex((s) => +s.new_product_in_frontend.id === +obj.target.id)
        let is_calculable = bill_body_items.find((l) => +l.id === +obj.target.id)?.is_calculable
        // console.log(is_calculable,index,array,obj.target.id,bill_body_items)
        if (is_calculable && isNaN(obj.target.value)) {
            return ''
        } else {
            index !== -1 ? array[index] = { ...array[index], value: obj.target.value } : array.push({ value: obj.target.value, new_product_in_frontend: { id: obj.target.id } })
            // console.log(array,new_product)
            setNewProduct({ ...new_product, product_properties: array })
        }

    }

    const autoFillFromInventory = (e) => {
        const selectedProductId = e.target.value;
        if (!selectedProductId) return;

        const product = inventoryProducts.find(p => p.id === parseInt(selectedProductId));
        if (!product) return;

        let array = new_product?.product_properties ? [...new_product.product_properties] : [];

        // Find IDs for Name, Rate, and GST fields based on bill_body_items
        const nameField = bill_body_items.find(item => item.input_title === 'Name of Product');
        const rateField = bill_body_items.find(item => item.input_title === 'Rate');
        const gstField = bill_body_items.find(item => item.input_title === 'GST');

        if (nameField) {
            let nIndex = array.findIndex(s => +s.new_product_in_frontend.id === +nameField.id);
            if (nIndex !== -1) array[nIndex].value = product.name;
            else array.push({ value: product.name, new_product_in_frontend: { id: nameField.id } });
        } else {
            const descField = bill_body_items.find(item => item.input_title.toLowerCase().includes('description') || item.input_title.toLowerCase().includes('decription'));
            if (descField) {
                let dIndex = array.findIndex(s => +s.new_product_in_frontend.id === +descField.id);
                if (dIndex !== -1) array[dIndex].value = product.name;
                else array.push({ value: product.name, new_product_in_frontend: { id: descField.id } });
            }
        }

        if (rateField) {
            let rIndex = array.findIndex(s => +s.new_product_in_frontend.id === +rateField.id);
            if (rIndex !== -1) array[rIndex].value = product.price;
            else array.push({ value: product.price, new_product_in_frontend: { id: rateField.id } });
        }

        if (gstField && product.gst_percentage !== undefined) {
            let gIndex = array.findIndex(s => +s.new_product_in_frontend.id === +gstField.id);
            if (gIndex !== -1) array[gIndex].value = product.gst_percentage;
            else array.push({ value: product.gst_percentage, new_product_in_frontend: { id: gstField.id } });
        }

        setSelectedInventoryProductId(product.id);
        setNewProduct({ ...new_product, product_properties: array });
    };

    const loadProductImages = (url = 'product-images/') => {
        clientToken.get(url).then((res) => {
            if (res.status === 200) {
                const rows = res.data.results || res.data || [];
                setProductImages(prev => url === 'product-images/' ? rows : [...prev, ...rows]);
                setImagePickerNext(res.data.next || null);
            }
        }).catch((error) => {
            console.log(error)
            showToast(`Error ${error?.request?.status ?? ''}: Failed to load images`)
        });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Cropping happens before upload, not after — open the crop modal
        // instead of posting straight away.
        setCropModal({ src: URL.createObjectURL(file), file });
        setCropPosition({ x: 0, y: 0 });
        setCropZoom(1);
        setCroppedAreaPixels(null);
    };

    const onCropComplete = useCallback((_croppedArea, areaPixels) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const cancelCrop = () => {
        if (cropModal) URL.revokeObjectURL(cropModal.src);
        setCropModal(null);
        if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    };

    const confirmCrop = async () => {
        if (!cropModal || !croppedAreaPixels) return;
        setUploadingImg(true);
        try {
            const blob = await getCroppedImageBlob(cropModal.src, croppedAreaPixels);
            const form = new FormData();
            form.append('image', blob, cropModal.file.name);
            const res = await clientToken.post('product-images/', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.status === 201 || res.status === 200) {
                setNewProduct(prev => ({ ...prev, image: res.data }));
                setProductImages(prev => [res.data, ...prev]);
            }
        } catch (error) {
            console.log(error)
            showToast(`Error ${error?.request?.status ?? ''}: Failed to upload image`)
        } finally {
            setUploadingImg(false);
            URL.revokeObjectURL(cropModal.src);
            setCropModal(null);
            if (imageFileInputRef.current) imageFileInputRef.current.value = '';
        }
    };

    const selectExistingImage = (img) => {
        setNewProduct(prev => ({ ...prev, image: img }));
        setShowImagePicker(false);
    };

    const removeProductImage = () => {
        setNewProduct(prev => ({ ...prev, image: null }));
    };
    const handelCheckBox = (obj) => {
        console.log(obj.target.checked)
        setCheckBox({ ...checkbox, [obj.target.id]: obj.target.checked })
        console.log(checkbox)
        // checkbox[obj.target.id]=obj.target.checked

    }
    const handelUpdate = () => {
        handelSave('', true)

    }
    const delete_product = (id) => {
        clientToken.delete(`product/${id}/update/`).then((response) => {
            if (response.status === 204) {
                setRefresh(!refresh)

            }
        }).catch((error) => {
            console.log(error)
            showToast(`Error ${error?.request?.status ?? ''}: Failed to delete product`)
        })
    }
    const handelDelete = (e) => {
        const selected = Object.keys(checkbox).filter((k) => checkbox[k]).length
        if (!selected) return
        if (!window.confirm(`Delete ${selected} selected item${selected > 1 ? 's' : ''}? This can't be undone.`)) return
        console.log(checkbox)
        Object.keys(checkbox).map((obj) => {
            console.log(checkbox[obj])
            if (checkbox[obj]) {
                delete_product(obj)
                setCheckBox({})

            }

        })
        // setTable_content(array)
        // setCheckBox(check_list)
    }
    // Bulk edit works on the checked rows, or on the whole table when nothing
    // is checked — same selection convention as the bulk delete button.
    const checkedRowIds = Object.keys(checkbox).filter((k) => checkbox[k]).map(Number);
    const bulkEditRows = checkedRowIds.length
        ? table_content.filter((row) => checkedRowIds.includes(+row.id))
        : table_content;

    const closeProductModal = () => {
        setPop_up_properties('none')
        setNewProduct(JSON.parse(JSON.stringify(newDataFormat)))
        setSelectedInventoryProductId(null)
    }
    const handelOpen = (key) => {
        set_update(true)
        console.log(key.target.parentElement.id)
        // console.log(table_content,key.target.parentElement.id)
        setNewProduct(table_content.find((obj) => obj.id === +key.target.parentElement.id))
        setPop_up_properties('flex')
    }
    const handelExport = (id, template_id) => {
        clientToken.get(`pdf/?id=${id}&template_id=${template_id}`, { responseType: 'blob' }) // 'blob' is important for binary data
            .then((r) => PdfOpener(r, InvoiceData, company_name))
            .catch((error) => {
                console.error('Error downloading the PDF:', error);
            });
    }
    // ── Inline add-item row ───────────────────────────────────────────────
    const visibleBillItems = bill_body_items.filter((o) => o.is_show);
    const inlineNameItem = bill_body_items.find((o) => o.input_title === 'Name of Product')
        || visibleBillItems.find((o) => !isNumericColumn(o));
    const itemTitled = (title) => bill_body_items.find((o) => o.input_title === title);

    const inlineProperties = () => (newDataFormat.product_properties || []).map((p) => {
        const typed = inlineDraft[p.new_product_in_frontend.id];
        return { ...p, new_product_in_frontend: { ...p.new_product_in_frontend }, value: typed !== undefined ? typed : p.value };
    });

    const handleInlineChange = (item, value) => {
        if (item.is_calculable && value !== '' && isNaN(value)) return;
        const next = { ...inlineDraft, [item.id]: value };
        // Typing an inventory product's exact name fills its rate and GST.
        if (inlineNameItem && item.id === inlineNameItem.id) {
            const match = inventoryProducts.find((p) => p.name === value);
            setInlineInventoryId(match ? match.id : null);
            if (match) {
                const rateItem = itemTitled('Rate');
                const gstItem = itemTitled('GST');
                if (rateItem && match.price !== undefined) next[rateItem.id] = String(match.price);
                if (gstItem && match.gst_percentage !== undefined) next[gstItem.id] = String(match.gst_percentage);
            }
        }
        setInlineDraft(next);
    };

    const commitInlineRow = () => {
        if (inlineBusy) return;
        if (!bill_body_items.length || !newDataFormat.product_properties) {
            showToast('Product fields are still loading', 'warning');
            return;
        }
        const typedName = inlineNameItem ? String(inlineDraft[inlineNameItem.id] ?? '').trim() : 'ok';
        if (!typedName) {
            showToast('Enter an item name', 'warning');
            inlineNameRef.current?.focus();
            return;
        }
        setInlineBusy(true);
        Promise.resolve(handelSave(null, false, {
            product: { product_properties: inlineProperties() },
            inventoryId: inlineInventoryId,
        })).then((added) => {
            if (added === true) {
                setInlineDraft({});
                setInlineInventoryId(null);
                inlineNameRef.current?.focus();
            }
        }).finally(() => setInlineBusy(false));
    };

    const onInlineKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitInlineRow();
        }
    };

    const inlineHasNumbers = Object.keys(inlineDraft).some((k) => {
        const item = bill_body_items.find((o) => String(o.id) === String(k));
        return item && isNumericColumn(item) && inlineDraft[k] !== '' && inlineDraft[k] !== undefined;
    });
    const inlineTotals = inlineHasNumbers && newDataFormat.product_properties
        ? calculateProductTotals(inlineProperties())
        : null;

    // Company header settings. A default is only *shown* on a brand-new invoice;
    // the server fills it in for real when the invoice is created.
    const isNewInvoice = !id && !InvoiceData?.id;
    const cfgOf = (key) => headerCfg?.[key] || { visible: true, use_default: false, default: null };
    const showField = (key) => cfgOf(key).visible;
    const newDefault = (key) => {
        const c = cfgOf(key);
        return isNewInvoice && c.use_default && c.default !== null && c.default !== '' ? c.default : undefined;
    };
    const posValue = InvoiceData?.place_of_supply ?? newDefault('place_of_supply') ?? '';
    const statusValue = InvoiceData?.payment_status || newDefault('payment_status') || 'unpaid';
    const methodValue = InvoiceData?.payment_method || newDefault('payment_method') || '';
    const notesInitial = InvoiceData?.customer_notes || newDefault('customer_notes') || '';
    const termsInitial = InvoiceData?.terms || newDefault('terms') || '';
    const dueValue = InvoiceData?.due_date
        ?? (newDefault('payment_terms') !== undefined
            ? addDaysISO(InvoiceData?.date || todayISO(), Number(newDefault('payment_terms')))
            : '');

    // CGST+SGST vs IGST: compare your state with the place of supply (the
    // invoice's own, else the customer's). Sales only; with either unknown the
    // card shows plain GST rather than guessing a split.
    const isSale = InvoiceData?.invoice_type !== 'purchase';
    const showPlaceOfSupply = isSale && showField('place_of_supply');
    // The second row only exists when it has something to show; "Header options"
    // (custom fields) joins it if so, otherwise it sits at the end of the first row.
    const showSecondRow = showPlaceOfSupply || showField('payment_status') || showField('payment_method');
    const headerOptionsButton = customFields && customFields.length > 0 ? (
        <HeaderField spacer grow={false}>
            <button type="button" className="bill-btn" onClick={() => setShowCFPopup(true)}>
                Header options
            </button>
        </HeaderField>
    ) : null;
    const supplyCode = posValue !== '' ? posValue : (InvoiceData?.receiver_state_code ?? null);
    const canSplitGst = isSale && isGstStateCode(companyStateCode) && isGstStateCode(supplyCode);
    const intraState = canSplitGst && Number(companyStateCode) === Number(supplyCode);

    // Payment terms are derived from the two dates rather than stored: the
    // select shows "Net 15" whenever due date is invoice date + 15 days.
    const termDays = dueValue
        ? daysBetweenISO(InvoiceData?.date || todayISO(), dueValue)
        : null;
    const termValue = termDays === null
        ? ''
        : (PAYMENT_TERMS.some(([d]) => d === termDays) ? String(termDays) : 'custom');

    // Hide the Image column until at least one line item actually has an image.
    const showImageCol = canLineItemImages && table_content.some((r) => r.image?.image);
    const visibleItems = bill_body_items.filter((o) => o.is_show);
    const statusLabels = { paid: 'Paid', unpaid: 'Unpaid', partially_paid: 'Partially paid', overdue: 'Overdue' };
    const paymentStatus = InvoiceData?.payment_status || 'unpaid';
    const displayNumber = InvoiceData?.invoice_number || invoiceNumber;
    const pageTitle = InvoiceData?.invoice_type === 'purchase'
        ? (displayNumber ? `Purchase ${displayNumber}` : (id ? `Purchase #${id}` : 'New purchase'))
        : (displayNumber ? `Invoice ${displayNumber}` : (id ? `Invoice #${id}` : 'New invoice'));

    const Rows = (obj) => {
        const key = obj.id;
        let total = 1;
        let extraCal = 0;
        let calculatedValues = {};
        // inner calculator
        function calculate(abc) {
            const item = abc.new_product_in_frontend;
            let currentCalculatedVal = abc.value;

            if (item.is_calculable) {
                if (item.formula) {
                    const val = parseFloat(abc.value) || 0;
                    if (item.formula === '+') {
                        currentCalculatedVal = val;
                        if (item.on_with_out_gst_amount) extraCal += val;
                        else total += val;
                    } else if (item.formula === '-') {
                        currentCalculatedVal = val;
                        if (item.on_with_out_gst_amount) extraCal -= val;
                        else total -= val;
                    } else if (item.formula === '/') {
                        currentCalculatedVal = val;
                        total /= val || 1;
                    } else if (item.formula === '%+') {
                        currentCalculatedVal = (val / 100) * total;
                        if (item.on_with_out_gst_amount) extraCal += currentCalculatedVal
                        else total += currentCalculatedVal;
                    } else if (item.formula === '%-') {
                        currentCalculatedVal = (val / 100) * total;
                        if (item.on_with_out_gst_amount) extraCal -= currentCalculatedVal;
                        else total -= currentCalculatedVal;
                    } else {
                        total = 'error';
                    }
                } else {
                    // multiply if not GST
                    if (abc.value && item.input_title !== 'GST') {
                        total *= parseFloat(abc.value);
                        currentCalculatedVal = abc.value;
                    }
                }
            }
            calculatedValues[item.id] = currentCalculatedVal;
        }

        // run calculations - process non-formula fields first to get base total
        [...obj.product_properties]
            .sort((a, b) => {
                const aFormula = a.new_product_in_frontend.formula;
                const bFormula = b.new_product_in_frontend.formula;
                if (!aFormula && bFormula) return -1;
                if (aFormula && !bFormula) return 1;
                return 0;
            })
            .forEach(calculate);

        // compute GST
        let gstAmount = 0;
        if (
            obj.product_properties.length > 0 &&
            bill_body_items.some((o) => o.input_title === 'GST')
        ) {
            const gstItem = bill_body_items.find((o) => o.input_title === 'GST');
            const gstProp = obj.product_properties.find(p => p.new_product_in_frontend.id === gstItem.id);
            const gst = gstProp ? gstProp.value : 0;
            gstAmount = gst ? total * (parseFloat(gst) / 100) : 0;
            if (gstAmount) {
                const rate = parseFloat(gst) || 0;
                gstByRate[rate] = (gstByRate[rate] || 0) + gstAmount;
            }
        }

        // update totals (assuming grandTotal & grandGstTotal are state/outer scope)
        grandTotal += total + gstAmount + extraCal;
        grandGstTotal = grandGstTotal + gstAmount;
        grandSubtotal += total;
        grandAdjustments += extraCal;

        // ensure checkbox entry exists
        if (checkbox[key] === undefined) {
            setCheckBox({ ...checkbox, [key]: false });
        }

        // render table row
        return (
            <tr key={key} id={key} className="table-row">
                <td className="check-col">
                    <input
                        type="checkbox"
                        className="check-box"
                        id={key}
                        checked={checkbox[key]}
                        onChange={handelCheckBox}
                    />
                </td>
                {showImageCol && (
                    <td onClick={handelOpen}>
                        {obj.image?.image
                            ? <img src={obj.image.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                            : '—'}
                    </td>
                )}

                {obj.product_properties
                    .sort(
                        (a, b) =>
                            a.new_product_in_frontend.id - b.new_product_in_frontend.id
                    )
                    .map((headObj, idx) =>
                        headObj.new_product_in_frontend.is_show ? (
                            <td key={idx} onClick={handelOpen}
                                className={isNumericColumn(headObj.new_product_in_frontend) ? 'num-col' : undefined}>
                                {headObj.new_product_in_frontend.show_calculated_value 
                                    ? (parseFloat(calculatedValues[headObj.new_product_in_frontend.id]) || 0).toFixed(2)
                                    : headObj.new_product_in_frontend.input_title?.toLowerCase() === 'gst'
                                        ? formatGstPercent(headObj.value)
                                        : headObj.value}
                            </td>
                        ) : (
                            ''
                        )
                    )}

                <td className="num-col" onClick={handelOpen}>{parseFloat(gstAmount).toFixed(2)}</td>
                <td className="num-col" onClick={handelOpen}>
                    {parseFloat(total + gstAmount + extraCal).toFixed(2)}
                </td>
                <td className="action-col"></td>
            </tr>
        );
    };

    return (
        <div className={'container space'}>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {showBulkEdit && <BulkEditModal
                rows={bulkEditRows}
                billBodyItems={bill_body_items}
                invoiceId={InvoiceData?.id}
                calculateProductTotals={calculateProductTotals}
                onClose={() => setShowBulkEdit(false)}
                onSaved={() => {
                    // First pass reloads the line items; the invoice's own
                    // total_final_amount is derived from the *previous* render's
                    // table_content, so a second pass is needed to persist it.
                    // Same two-step the single-product add uses.
                    setRefresh(r => !r)
                    setTimeout(() => setRefresh(r => !r), 3000)
                }}
                showToast={showToast}
            />}

            {/* Crop a newly picked image before it's uploaded */}
            {canLineItemImages && cropModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10001,
                    background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'white', borderRadius: 16, padding: 20,
                        width: 'min(480px, 92vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            Crop Image
                        </h3>
                        <div style={{ position: 'relative', width: '100%', height: 320, background: '#111', borderRadius: 10, overflow: 'hidden' }}>
                            <Cropper
                                image={cropModal.src}
                                crop={cropPosition}
                                zoom={cropZoom}
                                aspect={cropAspect}
                                onCropChange={setCropPosition}
                                onZoomChange={setCropZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Zoom</span>
                            <input
                                type="range" min={1} max={3} step={0.05}
                                value={cropZoom}
                                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                onClick={cancelCrop}
                                disabled={uploadingImg}
                                style={{
                                    padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                    background: 'white', color: '#334155', fontWeight: 600, fontSize: 13,
                                    cursor: uploadingImg ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCrop}
                                disabled={uploadingImg || !croppedAreaPixels}
                                style={{
                                    padding: '8px 18px', borderRadius: 8, border: 'none',
                                    background: (uploadingImg || !croppedAreaPixels) ? '#c7d2fe' : '#4f46e5',
                                    color: 'white', fontWeight: 700, fontSize: 13,
                                    cursor: (uploadingImg || !croppedAreaPixels) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {uploadingImg ? 'Uploading…' : 'Crop & Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Existing-image picker */}
            {canLineItemImages && showImagePicker && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'white', borderRadius: 20, padding: 24,
                        width: 'min(560px, 92vw)', maxHeight: '80vh', overflowY: 'auto',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Choose an Image</h3>
                            <button
                                onClick={() => setShowImagePicker(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
                                aria-label="Close"
                            >✕</button>
                        </div>
                        {productImages.length === 0 ? (
                            <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                                No images uploaded yet. Use "Upload New" to add one.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
                                {productImages.map((img) => (
                                    <div
                                        key={img.id}
                                        onClick={() => selectExistingImage(img)}
                                        title={img.original_filename}
                                        style={{ cursor: 'pointer', border: '2px solid transparent', borderRadius: 10, overflow: 'hidden' }}
                                    >
                                        <img
                                            src={img.image}
                                            alt={img.original_filename}
                                            style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        {imagePickerNext && (
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <button
                                    onClick={() => loadProductImages(imagePickerNext)}
                                    style={{
                                        padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                                        border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer',
                                    }}
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Header Fields Popup */}
            {showCFPopup && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', padding: '28px',
                        width: 'min(500px, 92vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                        position: 'relative', maxHeight: '90vh', overflowY: 'auto',
                        fontFamily: 'Inter, system-ui, sans-serif'
                    }}>
                        {/* Close button */}
                        <button 
                            onClick={() => setShowCFPopup(false)}
                            style={{
                                position: 'absolute', top: '20px', right: '20px',
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Header Options</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>Configure custom header details for this invoice</p>

                        {customFields.length === 0 ? (
                            <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '12px' }}>
                                No custom fields defined. You can add them under UI Configuration.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                {customFields.map((cf) => {
                                    const cfKey = Object.keys(cfValues).find(k => k.toLowerCase() === cf.name.toLowerCase()) || cf.name;
                                    const val = cfValues[cfKey] !== undefined ? cfValues[cfKey] : (cf.default_value || "");
                                    return (
                                        <div key={cf.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                                {cf.name}
                                            </label>
                                            
                                            {cf.field_type === 'select' || cf.field_type === 'multiselect' ? (
                                                <select
                                                    value={val}
                                                    onChange={(e) => setCFValues({ ...cfValues, [cfKey]: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 12px', fontSize: '14px',
                                                        border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                        outline: 'none', background: 'white'
                                                    }}
                                                >
                                                    <option value="">Select option...</option>
                                                    {Array.isArray(cf.multioption_value) ? (
                                                        cf.multioption_value.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))
                                                    ) : (
                                                        typeof cf.multioption_value === 'string' && 
                                                        cf.multioption_value.split(',').map(opt => (
                                                            <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                                        ))
                                                    )}
                                                </select>
                                            ) : cf.field_type === 'date' ? (
                                                <input
                                                    type="date"
                                                    value={val}
                                                    onChange={(e) => setCFValues({ ...cfValues, [cfKey]: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 12px', fontSize: '14px',
                                                        border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                        outline: 'none', background: 'white'
                                                    }}
                                                />
                                            ) : cf.field_type === 'number' ? (
                                                <input
                                                    type="number"
                                                    value={val}
                                                    onChange={(e) => setCFValues({ ...cfValues, [cfKey]: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 12px', fontSize: '14px',
                                                        border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                        outline: 'none', background: 'white'
                                                    }}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={val}
                                                    onChange={(e) => setCFValues({ ...cfValues, [cfKey]: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 12px', fontSize: '14px',
                                                        border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                                        outline: 'none', background: 'white'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button
                                onClick={() => setShowCFPopup(false)}
                                style={{
                                    padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#64748b',
                                    background: 'none', border: 'none', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setInvoiceData({ ...InvoiceData, custom_header_field: cfValues });
                                    setShowCFPopup(false);
                                    setRefresh(r => !r);
                                }}
                                style={{
                                    padding: '8px 24px', fontSize: '14px', fontWeight: 700, color: 'white',
                                    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none',
                                    borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.2)'
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={'top_head'}>
                <div>
                    <p className="crumb">
                        <a onClick={() => navigate('/bill_list')}>Invoices</a>
                        {' / '}{id ? `#${id}` : 'New'}
                    </p>
                    <div className="title_row">
                        <h1>{pageTitle}</h1>
                        {id && (
                            <span className={`status_badge ${paymentStatus}`}>
                                {statusLabels[paymentStatus] || paymentStatus}
                            </span>
                        )}
                        {saveState === 'saving' && <span className="save_state">Saving…</span>}
                        {saveState === 'saved' && <span className="save_state">All changes saved</span>}
                        {saveState === 'error' && <span className="save_state error">Couldn't save. Your last change may be missing.</span>}
                    </div>
                    <div className="type_toggle" role="group" aria-label="Invoice type">
                        {[['sales', 'Sales'], ['purchase', 'Purchase']].map(([value, label]) => {
                            const active = (InvoiceData?.invoice_type || 'sales') === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    className={active ? 'on' : ''}
                                    aria-pressed={active}
                                    onClick={() => {
                                        if (active) return;
                                        setInvoiceData({ ...InvoiceData, invoice_type: value });
                                        setRefresh(r => !r);
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {/*<div className={'button'} onClick={()=>InvoiceData["receiver"]?handelExport(InvoiceData?.id):alert("Receiver is not set")}>Export</div>*/}
                <ExportDropdown
                    InvoiceData={InvoiceData}
                    handelExport={handelExport}
                    showToast={showToast}
                >

                </ExportDropdown>
            </div>
                <div
                    id={'new_company_box'}
                    onMouseDown={(e) => { if (e.target === e.currentTarget) closeProductModal(); }}
                    style={{
                        display: Pop_up_properties,      /* 'flex' or 'none' */
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(15,23,42,0.55)',
                        backdropFilter: 'blur(4px)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* ── centred white card ── */}
                    <div style={{
                        background: 'white', borderRadius: '20px',
                        padding: '28px', width: 'min(640px, 92vw)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                        position: 'relative',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <div className="bill_modal_head">
                            <h2>{update ? 'Edit item' : 'Add item'}</h2>
                            <button type="button" className="bill_modal_close" aria-label="Close" onClick={closeProductModal}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {canLineItemImages && (
                        <div className="bill_modal_image">
                            {new_product?.image?.image ? (
                                <div className="thumb">
                                    <img src={new_product.image.image} alt="" />
                                    <button type="button" onClick={removeProductImage} title="Remove image" aria-label="Remove image">✕</button>
                                </div>
                            ) : (
                                <div className="thumb empty">No image</div>
                            )}
                            <div className="meta">
                                <span className="meta_label">Line item image</span>
                                <div className="actions">
                                    <button
                                        type="button"
                                        className="bill-btn bill-btn-sm"
                                        onClick={() => imageFileInputRef.current?.click()}
                                        disabled={uploadingImg}
                                    >
                                        {uploadingImg ? 'Uploading…' : 'Upload new'}
                                    </button>
                                    <button
                                        type="button"
                                        className="bill-btn bill-btn-sm"
                                        onClick={() => { setShowImagePicker(true); loadProductImages(); }}
                                    >
                                        Choose existing
                                    </button>
                                </div>
                                <input
                                    ref={imageFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                        )}

                        {!update && canInventory && (
                            <div className="mb-4 mt-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                    Quick Fill from Inventory
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-indigo-50/30"
                                    onChange={autoFillFromInventory}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select a product to auto-fill...</option>
                                    {inventoryProducts.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (₹{p.price}) - {p.current_stock} in stock
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="bill_modal_grid">
                            {bill_body_items.map((obj) => {
                                let value = new_product?.product_properties.find((obj_2) => +obj_2.new_product_in_frontend.id === +obj.id)
                                value = value ? value.value : ''
                                return (
                                    <div className={'form_box'} id={obj.input_title} key={obj.id}
                                        style={{ gridColumn: `span ${Math.min(3, Math.max(1, Math.round(+obj.size / 10 * 3) || 1))}` }}>
                                        <label htmlFor={obj.id}>{formatHeaderTitle(obj.input_title)}</label>
                                        {obj.presets ? (
                                            <select 
                                                id={obj.id} 
                                                onChange={handelInput} 
                                                value={value}
                                                className="bill_modal_select"
                                            >
                                                <option value="">-- Select {formatHeaderTitle(obj.input_title)} --</option>
                                                {obj.presets.split(',').map(preset => (
                                                    <option key={preset.trim()} value={preset.trim()}>
                                                        {preset.trim()}
                                                    </option>
                                                ))}
                                                <option value="CUSTOM">-- Custom Value --</option>
                                            </select>
                                        ) : (
                                            <input id={obj.id} onChange={handelInput} value={value} />
                                        )}
                                        {/* If user selects CUSTOM or if no presets, allow manual entry? 
                                            Actually, let's keep it simple: if presets exist, it's a dropdown. 
                                            If user wants custom, they can add it to presets in UIConfig. 
                                        */}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="bill_modal_footer">
                            {update && (
                                <button
                                    type="button"
                                    className="bill-btn bill-btn-danger"
                                    onClick={() => {
                                        if (!window.confirm("Delete this item from the invoice? This can't be undone.")) return;
                                        delete_product(new_product?.id);
                                        closeProductModal();
                                    }}
                                >
                                    Delete item
                                </button>
                            )}
                            <span className="spacer" />
                            <button type="button" className="bill-btn" onClick={closeProductModal}>Cancel</button>
                            <button type="button" className="bill-btn bill-btn-primary" onClick={update ? handelUpdate : handelSave}>
                                {update ? 'Save changes' : 'Add item'}
                            </button>
                        </div>
                    </div>
                </div>
            <div className={'bill_head'}>
                {/* Header: who and when, then tax and payment */}
                <div className="bill_row">
                    <HeaderField label="Invoice No." htmlFor="invoice_number" basis={140}>
                        <input
                            placeholder="Auto"
                            id="invoice_number"
                            type="text"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                        />
                    </HeaderField>

                    <CustomerDropdown companyName={company_name} InvoiceData={InvoiceData} setRefresh={setRefresh} setInvoiceData={setInvoiceData} />

                    <HeaderField label="Invoice Date" htmlFor="date" basis={160}>
                        <input
                            id="date"
                            type="date"
                            value={InvoiceData?.date || ''}
                            onChange={(e) => {
                                const newDate = e.target.value;
                                const next = { ...InvoiceData, date: newDate };
                                // Moving the invoice date carries the due date with it, so a
                                // "Net 15" invoice stays Net 15 and never ends up due before it is issued.
                                if (newDate && InvoiceData?.due_date) {
                                    const term = daysBetweenISO(InvoiceData.date, InvoiceData.due_date);
                                    next.due_date = addDaysISO(newDate, term === null ? 0 : Math.max(term, 0));
                                }
                                setInvoiceData(next);
                                setRefresh(r => !r);
                            }}
                        />
                    </HeaderField>

                    {showField('payment_terms') && (<>
                    <HeaderField label="Payment Terms" htmlFor="payment_terms" basis={140}>
                        <select
                            id="payment_terms"
                            value={termValue}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === 'custom') return;
                                const due = v === '' ? '' : addDaysISO(InvoiceData?.date || todayISO(), Number(v));
                                setInvoiceData({ ...InvoiceData, due_date: due });
                                setRefresh(r => !r);
                            }}
                        >
                            <option value="">No due date</option>
                            {PAYMENT_TERMS.map(([days, label]) => (
                                <option key={days} value={String(days)}>{label}</option>
                            ))}
                            {termValue === 'custom' && <option value="custom">Custom</option>}
                        </select>
                    </HeaderField>

                    <HeaderField label="Due Date" htmlFor="due_date" basis={160}>
                        <input
                            id="due_date"
                            type="date"
                            min={InvoiceData?.date || undefined}
                            value={dueValue || ''}
                            onChange={(e) => {
                                setInvoiceData({ ...InvoiceData, due_date: e.target.value });
                                setRefresh(r => !r);
                            }}
                        />
                    </HeaderField>
                    </>)}
                    {!showSecondRow && headerOptionsButton}
                </div>

                {showSecondRow && (
                <div className="bill_row bill_row_secondary">
                    {/* Sales only: it decides CGST+SGST vs IGST on what you charge */}
                    {showPlaceOfSupply && (
                        <HeaderField
                            label="Place of Supply"
                            htmlFor="place_of_supply"
                            basis={240}
                            hint={posValue !== ''
                                ? "Overrides the customer's state for GST."
                                : InvoiceData?.receiver_state_code
                                    ? `Using the customer's state: ${InvoiceData.receiver_state || ''} (${InvoiceData.receiver_state_code})`
                                    : InvoiceData?.receiver
                                        ? 'This customer has no state. Choose one so GST splits correctly.'
                                        : "Defaults to the customer's state."}
                        >
                            <select
                                id="place_of_supply"
                                value={posValue}
                                onChange={(e) => {
                                    setInvoiceData({ ...InvoiceData, place_of_supply: e.target.value === '' ? null : Number(e.target.value) });
                                    setRefresh(r => !r);
                                }}
                            >
                                <option value="">Same as customer's state</option>
                                {GST_STATES.map((st) => (
                                    <option key={st.code} value={st.code}>{`${st.name} (${st.code})`}</option>
                                ))}
                            </select>
                        </HeaderField>
                    )}

                    {showField('payment_status') && (
                    <HeaderField label="Payment Status" htmlFor="payment_status" basis={140}>
                        <select
                            id="payment_status"
                            value={statusValue}
                            onChange={(e) => {
                                setInvoiceData({ ...InvoiceData, payment_status: e.target.value });
                                setRefresh(r => !r);
                            }}
                        >
                            <option value="unpaid">Unpaid</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </HeaderField>
                    )}

                    {showField('payment_method') && (
                    <HeaderField label="Payment Method" htmlFor="payment_method" basis={140}>
                        <select
                            id="payment_method"
                            value={methodValue}
                            onChange={(e) => {
                                setInvoiceData({ ...InvoiceData, payment_method: e.target.value });
                                setRefresh(r => !r);
                            }}
                        >
                            <option value="">Not set</option>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="card">Card</option>
                            <option value="other">Other</option>
                        </select>
                    </HeaderField>
                    )}

                    {headerOptionsButton}
                </div>
                )}
            </div>
            <div className={'bill-actions'}>
                {checkedRowIds.length > 0 && (
                    <span className="selected_count">{checkedRowIds.length} selected</span>
                )}
                {checkedRowIds.length > 0 && (
                    <div className={'bill-btn bill-btn-danger'} onClick={handelDelete}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                        </svg>
                        Delete ({checkedRowIds.length})
                    </div>
                )}
                {(table_content.length > 0 || InvoiceData?.id) && (
                    <div
                        className={'bill-btn'}
                        onClick={() => {
                            if (bill_body_items.length === 0) {
                                showToast('Product fields are still loading', 'warning');
                                return;
                            }
                            setShowBulkEdit(true);
                        }}
                        title={checkedRowIds.length
                            ? `Edit ${checkedRowIds.length} selected line item(s)`
                            : 'Edit all line items'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Bulk edit{checkedRowIds.length ? ` (${checkedRowIds.length})` : ''}
                    </div>
                )}
                <div className={'bill-btn bill-btn-add'} onClick={() => {
                    setPop_up_properties('flex')
                    set_update(false)
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="lbl-desktop">Add with details</span>
                    <span className="lbl-mobile">Add item</span>
                </div>
            </div>
            <div className={'companys_table_raper'}>
                <div className="pb-20 md:pb-0">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="table bill-items w-full border-collapse">
                            <thead>
                                <tr>
                                    <td className="check-col">
                                        <input
                                            type="checkbox"
                                            className="check-box"
                                            onChange={(base_obj) => {
                                                var list = {};
                                                Object.keys(checkbox).map(
                                                    (obj) => (list[obj] = base_obj.target.checked)
                                                );
                                                setCheckBox(list);
                                            }}
                                        />
                                    </td>
                                    {showImageCol && <td>Image</td>}
                                    {bill_body_items.map((obj) =>
                                        obj.is_show ? (
                                            <td key={obj.input_title} className={isNumericColumn(obj) ? 'num-col' : undefined}>
                                                {obj.input_title?.toLowerCase() === 'gst' ? 'GST %' : formatHeaderTitle(obj.input_title)}
                                            </td>
                                        ) : null
                                    )}
                                    <td className="num-col">GST Amount</td>
                                    <td className="num-col">Total Amount</td>
                                    <td className="action-col"></td>
                                </tr>
                            </thead>
                            <tbody>
                                {table_content.length === 0 && (
                                    <tr className="empty-row">
                                        <td colSpan={1 + (showImageCol ? 1 : 0) + visibleItems.length + 3}>
                                            No items yet. Add the first one in the row below.
                                        </td>
                                    </tr>
                                )}
                                {table_content.map(Rows)}
                                <tr className="add-row">
                                    <td className="check-col"></td>
                                    {showImageCol && <td></td>}
                                    {visibleBillItems.map((item) => {
                                        const numeric = isNumericColumn(item);
                                        const isName = inlineNameItem && item.id === inlineNameItem.id;
                                        const value = inlineDraft[item.id] ?? '';
                                        const label = formatHeaderTitle(item.input_title);
                                        return (
                                            <td key={item.id} className={numeric ? 'num-col' : undefined}>
                                                {item.presets ? (
                                                    <select
                                                        className={'inline-input'}
                                                        aria-label={label}
                                                        value={value}
                                                        onChange={(e) => handleInlineChange(item, e.target.value)}
                                                        onKeyDown={onInlineKeyDown}
                                                    >
                                                        <option value="">{label}</option>
                                                        {item.presets.split(',').map((preset) => (
                                                            <option key={preset.trim()} value={preset.trim()}>{preset.trim()}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        className={`inline-input${numeric ? ' num' : ''}`}
                                                        ref={isName ? inlineNameRef : undefined}
                                                        aria-label={label}
                                                        list={isName && inventoryProducts.length ? 'inline-inventory-products' : undefined}
                                                        placeholder={isName ? 'Item name' : (item.input_title?.toLowerCase() === 'gst' ? 'GST %' : label)}
                                                        value={value}
                                                        onChange={(e) => handleInlineChange(item, e.target.value)}
                                                        onKeyDown={onInlineKeyDown}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="num-col">
                                        {inlineTotals ? formatINR(inlineTotals.gst_amount) : ''}
                                    </td>
                                    <td className="num-col">
                                        {inlineTotals ? formatINR(inlineTotals.total_amount) : ''}
                                    </td>
                                    <td className="action-col">
                                        <button
                                            type="button"
                                            className="inline-add-btn"
                                            aria-label="Add item to invoice"
                                            title="Add item (Enter)"
                                            disabled={inlineBusy}
                                            onClick={commitInlineRow}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                            {inlineBusy ? 'Adding…' : 'Add'}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <datalist id="inline-inventory-products">
                            {inventoryProducts.map((p) => (
                                <option key={p.id} value={p.name}>
                                    {`₹${p.price} · ${p.current_stock} in stock`}
                                </option>
                            ))}
                        </datalist>
                    </div>

                    {/* Mobile Card View */}
                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-4">
                        {table_content.length === 0 ? (
                            <div className="p-4 border rounded-lg shadow bg-white text-center">
                                No Data Available
                            </div>
                        ) : (
                            table_content.map((obj, index) => (
                                <CollapsibleRowCard
                                    key={obj.id}
                                    rowData={obj}
                                    checkbox={checkbox}
                                    handelCheckBox={handelCheckBox}
                                    rowIndex={index}
                                    billBodyItems={bill_body_items}
                                    handelOpen={handelOpen}
                                />
                            ))
                        )}


                    </div>

                </div>

                <div className="bill_bottom">
                {(showField('customer_notes') || showField('terms')) && (
                <div className="notes-panel">
                    {showField('customer_notes') && (<>
                    <label htmlFor="customer_notes">Notes</label>
                    <textarea
                        id="customer_notes"
                        key={`notes-${InvoiceData?.id ?? 'new'}`}
                        rows={3}
                        placeholder="Thanks for your business"
                        defaultValue={notesInitial}
                        onBlur={(e) => {
                            if (e.target.value === notesInitial) return;
                            setInvoiceData({ ...InvoiceData, customer_notes: e.target.value });
                            setRefresh(r => !r);
                        }}
                    />
                    </>)}
                    {showField('terms') && (<>
                    <label htmlFor="invoice_terms">Terms and conditions</label>
                    <textarea
                        id="invoice_terms"
                        key={`terms-${InvoiceData?.id ?? 'new'}`}
                        rows={3}
                        placeholder="Payment due within the terms above. Goods once sold are not returnable."
                        defaultValue={termsInitial}
                        onBlur={(e) => {
                            if (e.target.value === termsInitial) return;
                            setInvoiceData({ ...InvoiceData, terms: e.target.value });
                            setRefresh(r => !r);
                        }}
                    />
                    </>)}
                </div>
                )}
                {/* Desktop view */}
                <div className="hidden md:flex justify-end" style={{ marginLeft: 'auto' }}>
                    <div className="summary-card">
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>{formatINR(grandSubtotal)}</span>
                        </div>
                        {Object.keys(gstByRate)
                            .sort((x, y) => Number(x) - Number(y))
                            .map((rate) => {
                                const amount = gstByRate[rate];
                                if (canSplitGst && intraState) {
                                    const half = Math.round(amount * 100 / 2) / 100;
                                    return (
                                        <React.Fragment key={rate}>
                                            <div className="summary-row">
                                                <span>CGST @ {Number(rate) / 2}%</span>
                                                <span>{formatINR(half)}</span>
                                            </div>
                                            <div className="summary-row">
                                                <span>SGST @ {Number(rate) / 2}%</span>
                                                <span>{formatINR(amount - half)}</span>
                                            </div>
                                        </React.Fragment>
                                    );
                                }
                                return (
                                    <div className="summary-row" key={rate}>
                                        <span>{canSplitGst ? 'IGST' : 'GST'} @ {Number(rate)}%</span>
                                        <span>{formatINR(amount)}</span>
                                    </div>
                                );
                            })}
                        {isSale && !canSplitGst && Object.keys(gstByRate).length > 0 && (
                            <div className="summary-note">
                                {isGstStateCode(companyStateCode)
                                    ? 'Choose a place of supply to split this into CGST + SGST or IGST.'
                                    : 'Add your state in My Company to split GST into CGST + SGST or IGST.'}
                            </div>
                        )}
                        {Math.abs(grandAdjustments) > 0.004 && (
                            <div className="summary-row">
                                <span>Other adjustments</span>
                                <span>{grandAdjustments < 0 ? '−' : ''}{formatINR(Math.abs(grandAdjustments))}</span>
                            </div>
                        )}
                        <div className="summary-total">
                            <span>Total</span>
                            <span>{formatINR(grandTotal)}</span>
                        </div>
                        {amountInWords(grandTotal) && (
                            <div className="summary-words">{amountInWords(grandTotal)}</div>
                        )}
                        {typeof InvoiceData?.balance_due === 'number' && InvoiceData.balance_due > 0 && (
                            <div className="summary-row summary-balance">
                                <span>Balance due</span>
                                <span>{formatINR(InvoiceData.balance_due)}</span>
                            </div>
                        )}
                    </div>
                </div>
                </div>

                {/* Mobile view */}
                <div className="block md:hidden fixed bottom-0 left-0 w-full mobile-totals px-8 py-2 rounded-t-xl" style={{ background: 'linear-gradient(110deg, #312e81, #4f46e5)' }}>

                    <div className="flex justify-between text-white font-semibold text-lg mb-1 ">
                        <span>Total Amount</span>
                        <span>₹{Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold text-xs">
                        <span>Total GST Amount</span>
                        <span>₹{Number(grandGstTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

            </div>

        </div>
    )
}


export { NewBillBody };