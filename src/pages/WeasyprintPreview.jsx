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

/* Stand-in for the UPI QR on the design canvas. The real code can only be
   generated once the invoice total is known, which happens server-side at
   export time, so the editor shows a same-shaped square instead of a QR that
   would encode nothing. */
const UPI_QR_PLACEHOLDER =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
            <rect width="160" height="160" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
            <rect x="18" y="18" width="34" height="34" fill="none" stroke="#334155" stroke-width="7"/>
            <rect x="108" y="18" width="34" height="34" fill="none" stroke="#334155" stroke-width="7"/>
            <rect x="18" y="108" width="34" height="34" fill="none" stroke="#334155" stroke-width="7"/>
            <text x="80" y="86" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#334155">UPI QR</text>
            <text x="80" y="103" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">added on export</text>
        </svg>`
    );

/* Shape of an exported template file. `format` is checked on import so a
   stray JSON file fails with a sentence instead of an empty canvas. */
const TEMPLATE_FILE_FORMAT = 'invoice-template-blocks';
const BLOCK_TYPES = ['text', 'line', 'html', 'image', 'product_table'];

const COLUMN_PLACEHOLDERS = [
    { name: "Sr. No", value: "{{ forloop.counter }}" },
    { name: "Item Name", value: "{{ product.props.item }}" },
    { name: "Item Desc", value: "{{ product.props.description }}" },
    { name: "Quantity", value: "{{ product.props.quantity }}" },
    { name: "Rate", value: "{{ product.props.rate }}" },
    { name: "Total", value: "{{ product.total_amount }}" },
    {
        name: "Image",
        value: '{% if product.props.image %}<img src="{{ product.props.image }}" style="max-width:36px;max-height:36px;object-fit:cover;border-radius:4px;" />{% endif %}'
    }
];

/* The backend exposes each UI Config field on `product.props` under its
   lower-cased title and under each word of it (see invoice/export.py), and
   Django cannot reach a key containing a space or a symbol, so the full title
   is offered with other characters turned into "_" ("PRODUCT/Description" ->
   product_description), which the backend also publishes. Titles that would
   not be a valid variable name are left out rather than offered as something
   that renders blank. */
const uiConfigColumnOptions = (titles) => {
    const seen = new Set(COLUMN_PLACEHOLDERS.map(p => p.value));
    const out = [];
    titles.forEach((title) => {
        const key = String(title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (!/^[a-z_][a-z0-9_]*$/.test(key)) return;
        const value = `{{ product.props.${key} }}`;
        if (seen.has(value)) return;
        seen.add(value);
        out.push({ name: title, value });
    });
    return out;
};

const ALL_PLACEHOLDERS = [
    {
        category: "Invoice Details",
        items: [
            { label: "Invoice Number", token: "{{ invoice.invoice_number }}", desc: "Unique identifier of the invoice" },
            { label: "Invoice Date", token: "{{ invoice.date }}", desc: "Date of issue" },
            { label: "Due Date", token: "{{ invoice.due_date }}", desc: "Payment due date" },
            { label: "Place of Supply", token: "{{ invoice.place_of_supply }}", desc: "State the supply is made to, e.g. Maharashtra (27)" },
            { label: "Payment Status", token: "{{ invoice.payment_status }}", desc: "Paid, Unpaid, Partially Paid or Overdue" },
            { label: "Payment Method", token: "{{ invoice.payment_method }}", desc: "Cash, UPI, Bank Transfer and so on" },
            { label: "Total Final Amount", token: "{{ invoice.total_final_amount }}", desc: "Total amount including taxes" },
            { label: "GST Final Amount", token: "{{ invoice.gst_final_amount }}", desc: "Total accumulated tax amount" },
            { label: "Notes", token: "{{ invoice.notes }}", desc: "Notes for the customer, from the invoice" },
            { label: "Terms and Conditions", token: "{{ invoice.terms }}", desc: "Terms and conditions, from the invoice" }
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
            { label: "Company GST Number", token: "{{ company.company_gst_number }}", desc: "Your company GSTIN" },
            { label: "UPI ID", token: "{{ company.upi_id }}", desc: "Your UPI id / VPA, from Company Details" },
            { label: "UPI Payment QR", token: "{{ company.upi_qr }}", desc: "QR image for this invoice's total \u2014 use as an <img> src" }
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

/* Fonts offered in the pickers. The value is the CSS stack that ends up in the
   saved template, so each name carries fallbacks: a viewer or PDF host that
   lacks the first face falls through to a metric-similar one instead of
   dropping to the browser default. Names stay unquoted - they sit inside
   style="..." attributes. */
const FONT_GROUPS = [
    { group: 'Sans-serif', fonts: [
        ['Arial, Liberation Sans, sans-serif', 'Arial'],
        ['Helvetica, Arial, sans-serif', 'Helvetica'],
        ['Verdana, DejaVu Sans, sans-serif', 'Verdana'],
        ['Tahoma, Verdana, sans-serif', 'Tahoma'],
        ['Trebuchet MS, Lucida Grande, sans-serif', 'Trebuchet MS'],
        ['Calibri, Carlito, sans-serif', 'Calibri'],
        ['Segoe UI, Roboto, sans-serif', 'Segoe UI'],
        ['Gill Sans, Gill Sans MT, sans-serif', 'Gill Sans'],
        ['Century Gothic, Avant Garde, sans-serif', 'Century Gothic'],
        ['Lucida Sans, Lucida Grande, sans-serif', 'Lucida Sans'],
        ['Optima, Candara, sans-serif', 'Optima'],
        ['DejaVu Sans, sans-serif', 'DejaVu Sans'],
        ['Noto Sans, sans-serif', 'Noto Sans'],
    ] },
    { group: 'Serif', fonts: [
        ['Times New Roman, Liberation Serif, serif', 'Times New Roman'],
        ['Georgia, serif', 'Georgia'],
        ['Garamond, Baskerville, serif', 'Garamond'],
        ['Palatino, Palatino Linotype, Book Antiqua, serif', 'Palatino'],
        ['Cambria, Caladea, serif', 'Cambria'],
        ['Baskerville, Baskerville Old Face, serif', 'Baskerville'],
        ['Didot, Bodoni MT, serif', 'Didot'],
        ['Rockwell, Courier New, serif', 'Rockwell'],
        ['DejaVu Serif, serif', 'DejaVu Serif'],
        ['Noto Serif, serif', 'Noto Serif'],
    ] },
    { group: 'Monospace', fonts: [
        ['Courier New, Liberation Mono, monospace', 'Courier New'],
        ['Consolas, Menlo, monospace', 'Consolas'],
        ['Menlo, Monaco, monospace', 'Menlo'],
        ['Lucida Console, Monaco, monospace', 'Lucida Console'],
        ['DejaVu Sans Mono, monospace', 'DejaVu Sans Mono'],
    ] },
    { group: 'Display & script', fonts: [
        ['Impact, Haettenschweiler, sans-serif', 'Impact'],
        ['Copperplate, Copperplate Gothic Light, fantasy', 'Copperplate'],
        ['Brush Script MT, cursive', 'Brush Script'],
        ['Comic Sans MS, Comic Neue, cursive', 'Comic Sans'],
        ['Papyrus, fantasy', 'Papyrus'],
    ] },
];
const DEFAULT_FONT = 'Arial, sans-serif';

/* A number field that lets you type "0.5". A type="number" input reports ""
   for the half-typed "0." and ".", and mapping that to 0 made React rewrite
   the box mid-keystroke, so a sub-pixel value could never be entered. This
   keeps what is typed as text and only commits complete numbers. */
const DecimalInput = ({ value, onChange, className }) => {
    const [text, setText] = useState(value == null ? '' : String(value));
    React.useEffect(() => {
        setText(t => (Number(t) === Number(value) && t !== '' ? t : (value == null ? '' : String(value))));
    }, [value]);
    return (
        <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={e => {
                const t = e.target.value;
                if (!/^\d*\.?\d*$/.test(t)) return;
                setText(t);
                if (t !== '' && t !== '.' && !Number.isNaN(Number(t))) onChange(Number(t));
            }}
            onBlur={() => setText(value == null ? '' : String(value))}
            className={className}
        />
    );
};

/* Canvas size/transform for a rule. Browsers snap a box thinner than a pixel
   up to 1px, but the PDF draws it at its true thickness. A borderless rule
   under 1px is therefore laid out 1px thick and scaled down, which shows the
   real (fainter, thinner) result. */
const thinRuleStyle = (el) => {
    if (el.type !== 'line' || el.borderWidth) return null;
    const w = el.width ?? 0, h = el.height ?? 0;
    const sx = w > 0 && w < 1 ? w : 1;
    const sy = h > 0 && h < 1 ? h : 1;
    if (sx === 1 && sy === 1) return null;
    return { width: sx < 1 ? 1 : w, height: sy < 1 ? 1 : h, scale: `${sx}, ${sy}`, dx: (sx - 1) / 2, dy: (sy - 1) / 2 };
};

/* border-width shorthand (top right bottom left) for a rule that draws only
   some of its sides - e.g. a dotted leader that should be one bottom line. */
const borderWidthCss = (width, sides) => {
    const w = `${width}px`;
    switch (sides) {
        case 'bottom': return `0 0 ${w} 0`;
        case 'top': return `${w} 0 0 0`;
        case 'left': return `0 0 0 ${w}`;
        case 'right': return `0 ${w} 0 0`;
        case 'horizontal': return `${w} 0 ${w} 0`;
        case 'vertical': return `0 ${w} 0 ${w}`;
        default: return w;
    }
};

/* A dropdown whose rows are drawn in their own typeface. A native <select>
   cannot do that reliably (Safari ignores option styling). `value` may be an
   older saved stack that is not in the list; it is shown as-is. */
const FontPicker = ({ value, onChange, inheritLabel, compact }) => {
    const [open, setOpen] = useState(false);
    const known = FONT_GROUPS.flatMap(g => g.fonts).find(([v]) => v === value);
    const legacy = !known && value ? value.split(',')[0].trim() : null;
    const label = value ? (known ? known[1] : legacy) : (inheritLabel || 'Default');
    const pick = (v) => { onChange(v); setOpen(false); };
    const rowCls = 'w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 flex items-center justify-between gap-2';
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className={`w-full text-left border rounded-md bg-white flex items-center justify-between ${compact ? 'text-xs p-1.5' : 'text-sm p-2'}`}
                style={{ fontFamily: value || undefined }}>
                <span className="truncate">{label}</span>
                <span className="text-gray-400 text-[10px] ml-2">▾</span>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto bg-white border rounded-md shadow-lg">
                        {inheritLabel && (
                            <button type="button" onClick={() => pick('')} className={`${rowCls} text-xs text-gray-500 border-b ${!value ? 'bg-indigo-50' : ''}`}>
                                {inheritLabel}
                            </button>
                        )}
                        {legacy && (
                            <button type="button" onClick={() => pick(value)} className={`${rowCls} bg-indigo-50`} style={{ fontFamily: value }}>
                                <span className="text-sm">{legacy}</span><span className="text-[10px] text-gray-400">current</span>
                            </button>
                        )}
                        {FONT_GROUPS.map(g => (
                            <div key={g.group}>
                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 sticky top-0">{g.group}</div>
                                {g.fonts.map(([v, name]) => (
                                    <button type="button" key={v} onClick={() => pick(v)} className={`${rowCls} ${v === value ? 'bg-indigo-50' : ''}`} style={{ fontFamily: v }}>
                                        <span className="text-sm">{name}</span>
                                        <span className="text-xs text-gray-400" style={{ fontFamily: v }}>Aa 123 ₹</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

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

    /* Border and spacing knobs. Every default below is the value that used to
       be hard-coded here, so a table saved before these existed recompiles to
       exactly the same markup. */
    const bw = el.borderWidth ?? 1;
    const bs = el.borderStyle || 'solid';
    const radius = el.borderRadius || 0;
    const pad = el.cellPadding ?? 6;
    const grid = el.gridLines || 'rows';
    const hw = el.headerRuleWidth ?? bw;   // header underline; used to be 2x the border width
    const stripe = el.zebraColor || '';

    /* Header, body and line colours/fonts are separate knobs. Each one that is
       unset falls back to what the table used before it existed. */
    const hrCol = el.headerRuleColor || borderCol;   // header underline
    const gridCol = el.gridColor || borderCol;       // inner row / column lines
    const rowBg = el.rowBgColor || '';
    const tableFont = el.fontFamily || 'sans-serif';
    const headFont = el.headerFontFamily ? ` font-family: ${el.headerFontFamily};` : '';
    const headSize = el.headerFontSize ? ` font-size: ${el.headerFontSize}px;` : '';
    const headWeight = el.headerFontWeight ? ` font-weight: ${el.headerFontWeight};` : '';
    const headStyle = el.headerFontStyle === 'italic' ? ' font-style: italic;' : '';
    const headCase = el.headerUppercase ? ' text-transform: uppercase;' : '';
    const headLS = el.headerLetterSpacing ? ` letter-spacing: ${el.headerLetterSpacing}px;` : '';
    const headVPad = el.headerPadding != null ? el.headerPadding : null;
    const bodyFont = el.bodyFontFamily ? ` font-family: ${el.bodyFontFamily};` : '';
    const bodySize = el.bodyFontSize ? ` font-size: ${el.bodyFontSize}px;` : '';
    const bodyWeight = el.bodyFontWeight ? ` font-weight: ${el.bodyFontWeight};` : '';

    /* Which rules each Grid Lines mode draws. */
    const GRID_MODES = {
        none:           { frame: false, head: false, rows: false, cols: false },
        outer:          { frame: true,  head: false, rows: false, cols: false },
        rows:           { frame: true,  head: true,  rows: true,  cols: false },
        rows_open:      { frame: false, head: true,  rows: true,  cols: false },
        body_rows:      { frame: true,  head: false, rows: true,  cols: false },
        header:         { frame: true,  head: true,  rows: false, cols: false },
        columns:        { frame: true,  head: false, rows: false, cols: true  },
        header_columns: { frame: true,  head: true,  rows: false, cols: true  },
        full:           { frame: true,  head: true,  rows: true,  cols: true  },
    };
    const mode = GRID_MODES[grid] || GRID_MODES.rows;

    const edge = (width, color = borderCol) => `${width}px ${bs} ${color}`;

    /* A collapsed table ignores border-radius, and the separate border model
       never paints borders set on a <tr>. So a rounded table switches models
       and carries its rules on the cells instead, with the top corners rounded
       on the end header cells so the header fill cannot square them off. */
    const separate = radius > 0;

    let ths = '';
    let tds = '';
    columns.forEach((col, idx) => {
        const align = col.align === 'right' ? 'text-align: right;' : 'text-align: left;';
        const w = col.width ? `width: ${col.width};` : '';
        const vRule = (mode.cols && idx < columns.length - 1)
            ? ` border-right: ${edge(bw, gridCol)};` : '';
        const headRule = (separate && mode.head) ? ` border-bottom: ${edge(hw, hrCol)};` : '';
        const rowRule = (separate && mode.rows) ? ` border-bottom: ${edge(bw, gridCol)};` : '';
        let corner = '';
        if (separate && idx === 0) corner = ` border-top-left-radius: ${radius}px;`;
        else if (separate && idx === columns.length - 1) corner = ` border-top-right-radius: ${radius}px;`;

        /* Per-column padding overrides the table-wide cell padding side by side. */
        const padCss = `padding: ${pad}px ${col.padRight ?? pad}px ${pad}px ${col.padLeft ?? pad}px;`;
        const headPadCss = headVPad == null ? padCss
            : `padding: ${headVPad}px ${col.padRight ?? pad}px ${headVPad}px ${col.padLeft ?? pad}px;`;
        const wrap = ' overflow-wrap: break-word;';

        ths += `<th style="${headPadCss} color: ${headerText};${headFont}${headSize}${headWeight}${headStyle}${headCase}${headLS} ${align} ${w}${wrap}${vRule}${headRule}${corner}">${col.label}</th>\n`;
        tds += `<td style="${padCss} color: ${textCol};${bodyFont}${bodySize}${bodyWeight} ${align}${wrap}${rowRule}${vRule}">${col.value}</td>\n`;
    });

    /* table-layout: fixed makes the per-column widths authoritative. Without
       it the browser sizes columns to their content, so a column set to 5%
       still grows to fit its heading - and on a ruled form the printed rules
       no longer line up with the text. */
    const model = separate
        ? 'border-collapse: separate; border-spacing: 0; table-layout: fixed;'
        : 'border-collapse: collapse; table-layout: fixed;';
    const radiusCss = radius ? ` border-radius: ${radius}px;` : '';
    const headerTrRule = (!separate && mode.head) ? ` border-bottom: ${edge(hw, hrCol)};` : '';
    const rowTrCss = ((!separate && mode.rows) ? `border-bottom: ${edge(bw, gridCol)};` : '')
        + (rowBg ? ` background-color: ${rowBg};` : '');
    const bodyTr = stripe
        ? `<tr style="${rowTrCss}{% if forloop.counter|divisibleby:2 %} background-color: ${stripe};{% endif %}">`
        : (rowTrCss ? `<tr style="${rowTrCss}">` : '<tr>');
    const frameCss = mode.frame ? edge(bw) : 'none';

    return `<table style="width: 100%; ${model} text-align: left; font-size: ${fs}px; font-family: ${tableFont}; border: ${frameCss};${radiusCss}">
  <thead>
    <tr style="background-color: ${headerBg};${headerTrRule}">
      ${ths}
    </tr>
  </thead>
  <tbody>
    {% for product in invoice.products %}
    ${bodyTr}
      ${tds}
    </tr>
    {% endfor %}
  </tbody>
</table>`;
};

/* Content box for text blocks. Each {{ variable }} is shown as one chip
   (contentEditable=false), so Backspace/Delete removes the whole variable and
   its braces can never be half-edited. The stored value is still the plain
   string with {{ ... }} tokens, so saving, the canvas and the PDF export are
   unchanged. */
const TOKEN_RE = /\{\{[^{}]*\}\}/g;

const tokenLabel = (token) => {
    const norm = (t) => t.replace(/\s+/g, '');
    const hit = ALL_PLACEHOLDERS.flatMap(c => c.items).find(i => norm(i.token) === norm(token))
        || COLUMN_PLACEHOLDERS.map(c => ({ label: c.name, token: c.value })).find(i => norm(i.token) === norm(token));
    if (hit) return hit.label;
    const path = token.replace(/^\{\{|\}\}$/g, '').trim();
    if (!path) return 'empty variable';
    const last = path.split('|')[0].trim().split('.').pop();
    return last.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const makeChip = (token) => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.token = token;
    chip.title = token;
    chip.textContent = tokenLabel(token);
    const empty = !token.replace(/^\{\{|\}\}$/g, '').trim();
    chip.style.cssText = 'display:inline-block;margin:0 1px;padding:0 6px;border-radius:9999px;font-size:11px;font-weight:600;line-height:18px;user-select:none;cursor:default;'
        + (empty ? 'background:#fee2e2;color:#b91c1c;' : 'background:#e0e7ff;color:#4338ca;');
    return chip;
};

const textToNodes = (text) => {
    const frag = document.createDocumentFragment();
    let last = 0;
    const pushText = (str) => str.split('\n').forEach((line, i) => {
        if (i > 0) frag.appendChild(document.createElement('br'));
        if (line) frag.appendChild(document.createTextNode(line));
    });
    for (const m of text.matchAll(TOKEN_RE)) {
        pushText(text.slice(last, m.index));
        frag.appendChild(makeChip(m[0]));
        last = m.index + m[0].length;
    }
    pushText(text.slice(last));
    // A trailing <br> is only a placeholder that lets the caret sit on the
    // last line; add one so a stored trailing newline stays visible.
    if (text.endsWith('\n')) frag.appendChild(document.createElement('br'));
    return frag;
};

const nodesToText = (root) => {
    let out = '';
    root.childNodes.forEach((n) => {
        if (n.nodeType === 3) out += n.textContent;
        else if (n.nodeName === 'BR') out += '\n';
        else if (n.dataset && n.dataset.token) out += n.dataset.token;
        else out += nodesToText(n);
    });
    return out;
};

const TokenTextEditor = ({ value, onChange, singleLine = false, placeholder }) => {
    const ref = useRef(null);
    const lastEmitted = useRef(null);

    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el || value === lastEmitted.current) return;
        el.replaceChildren(textToNodes(value || ''));
        lastEmitted.current = value || '';
    }, [value]);

    const emit = () => {
        const el = ref.current;
        let text = nodesToText(el);
        if (el.lastChild && el.lastChild.nodeName === 'BR' && text.endsWith('\n')) text = text.slice(0, -1);
        lastEmitted.current = text;
        onChange(text);
    };

    const insertAtCaret = (text) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = textToNodes(text);
        const lastNode = frag.lastChild;
        range.insertNode(frag);
        if (lastNode) { range.setStartAfter(lastNode); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
        emit();
    };

    return (
        <>
        <style>{`.token-editor:empty:before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none}`}</style>
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={emit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); if (!singleLine) insertAtCaret('\n'); }
            }}
            onPaste={(e) => {
                e.preventDefault();
                const t = e.clipboardData.getData('text/plain');
                insertAtCaret(singleLine ? t.replace(/\s*\n\s*/g, ' ') : t);
            }}
            data-placeholder={placeholder}
            className={`token-editor w-full text-sm p-2 border rounded-md mb-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 ${singleLine ? 'min-h-[38px] overflow-x-auto' : 'h-24 overflow-y-auto'}`}
            style={{ whiteSpace: singleLine ? 'nowrap' : 'pre-wrap', wordBreak: 'break-word' }}
        />
        </>
    );
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
    /* Several blocks selected at once (drag a box on empty canvas, or
       shift-click). While this holds 2+ ids, selectedId is null. */
    const [multiIds, setMultiIds] = useState([]);
    const [marquee, setMarquee] = useState(null);
    const marqueeRef = useRef(null);
    const [isGroupDragging, setIsGroupDragging] = useState(false);

    /* Canvas zoom. The page is drawn at 1:1 and scaled with a CSS transform,
       so every pointer position below is divided by `zoom` to get back to
       page pixels. */
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    zoomRef.current = zoom;
    const scrollRef = useRef(null);
    const zoomAnchor = useRef(null);   // page point to keep under the cursor
    const PAGE_W = 595, PAGE_H = 842;

    /* Undo / redo. Snapshots of `elements` are taken from an effect, so every
       edit path (drag, typing, panel fields, import) is covered without
       touching the setters. Changes within 500ms of each other (a drag, a
       burst of typing) count as one step. */
    const undoStack = useRef([]);
    const redoStack = useRef([]);
    const prevElements = useRef(null);
    const lastChangeAt = useRef(0);
    const skipHistory = useRef(false);   // set while undo/redo itself writes elements
    const resetHistory = useRef(false);  // set when a saved template replaces the layout
    const [histCount, setHistCount] = useState({ undo: 0, redo: 0 });
    const groupDragRef = useRef(null);
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
    const [uiConfigTitles, setUiConfigTitles] = useState([]);
    const [customFields, setCustomFields] = useState([]);

    React.useEffect(() => {
        clientToken.get('custom-fields/').then((r) => {
            setCustomFields(Array.isArray(r.data) ? r.data : (r.data?.results || []));
        }).catch(() => setCustomFields([]));
    }, []);

    // Custom fields are exposed to templates as invoice.<name>, with the name
    // lower-cased and runs of other characters turned into "_" (see
    // invoice/export.py); names that can't make a valid variable are skipped.
    const placeholderCategories = React.useMemo(() => {
        const items = [];
        const seen = new Set();
        customFields.forEach((cf) => {
            const key = String(cf.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            if (!/^[a-z_][a-z0-9_]*$/.test(key) || seen.has(key)) return;
            seen.add(key);
            items.push({ label: cf.name, token: `{{ invoice.${key} }}`, desc: `Your custom field (${cf.field_type || 'text'})` });
        });
        return items.length ? [...ALL_PLACEHOLDERS, { category: 'My Custom Fields', items }] : ALL_PLACEHOLDERS;
    }, [customFields]);

    // Line-item cells may only use a variable defined in UI Config (or a
    // built-in column), so load the company's field titles for the picker.
    React.useEffect(() => {
        clientToken.get('new/product/in/frontend/').then((r) => {
            const rows = Array.isArray(r.data) ? r.data : (r.data?.results || []);
            setUiConfigTitles([...new Set(rows.map((x) => x.input_title).filter(Boolean))]);
        }).catch(() => setUiConfigTitles([]));
    }, []);

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

    React.useEffect(() => {
        if (prevElements.current === null || resetHistory.current) {
            resetHistory.current = false;
            undoStack.current = [];
            redoStack.current = [];
            prevElements.current = elements;
            setHistCount({ undo: 0, redo: 0 });
            return;
        }
        if (skipHistory.current) {
            skipHistory.current = false;
            prevElements.current = elements;
            lastChangeAt.current = 0;
            return;
        }
        if (elements === prevElements.current) return;
        const now = Date.now();
        if (now - lastChangeAt.current > 500) {
            undoStack.current.push(prevElements.current);
            if (undoStack.current.length > 100) undoStack.current.shift();
        }
        lastChangeAt.current = now;
        redoStack.current = [];
        prevElements.current = elements;
        setHistCount({ undo: undoStack.current.length, redo: 0 });
    }, [elements]);

    const clampZoom = (z) => Math.min(3, Math.max(0.25, Math.round(z * 100) / 100));

    /* Zoom, keeping the page point under (clientX, clientY) - or the centre
       of the visible area - where it is. */
    const zoomTo = (next, clientX, clientY) => {
        const scroller = scrollRef.current;
        const canvas = canvasRef.current;
        const z = clampZoom(next);
        if (!scroller || !canvas || z === zoomRef.current) { setZoom(z); return; }
        const sr = scroller.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        const mx = clientX != null ? clientX - sr.left : sr.width / 2;
        const my = clientY != null ? clientY - sr.top : sr.height / 2;
        zoomAnchor.current = {
            cx: (sr.left + mx - cr.left) / zoomRef.current,
            cy: (sr.top + my - cr.top) / zoomRef.current,
            mx, my,
        };
        setZoom(z);
    };

    const fitToWidth = () => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        zoomAnchor.current = null;
        setZoom(clampZoom((scroller.clientWidth - 64) / PAGE_W));
    };

    const fitToPage = () => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        zoomAnchor.current = null;
        setZoom(clampZoom(Math.min((scroller.clientWidth - 64) / PAGE_W, (scroller.clientHeight - 64) / PAGE_H)));
    };

    // After the scaled page has been laid out, put the anchor point back under the cursor.
    React.useLayoutEffect(() => {
        const a = zoomAnchor.current;
        const scroller = scrollRef.current;
        const canvas = canvasRef.current;
        if (!a || !scroller || !canvas) return;
        zoomAnchor.current = null;
        const sr = scroller.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        scroller.scrollLeft += (cr.left + a.cx * zoom) - (sr.left + a.mx);
        scroller.scrollTop += (cr.top + a.cy * zoom) - (sr.top + a.my);
    }, [zoom]);

    // Ctrl/Cmd + wheel (and trackpad pinch) zooms. Needs a non-passive listener to stop the browser zooming the whole page.
    React.useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        const onWheel = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
        };
        scroller.addEventListener('wheel', onWheel, { passive: false });
        return () => scroller.removeEventListener('wheel', onWheel);
    }, []);

    const restoreSnapshot = (snapshot) => {
        skipHistory.current = true;
        setElements(snapshot);
        const ids = new Set(snapshot.map(el => el.id));
        setSelectedId(id => (id && ids.has(id) ? id : null));
        setMultiIds(list => list.filter(id => ids.has(id)));
        setHistCount({ undo: undoStack.current.length, redo: redoStack.current.length });
    };

    const undo = () => {
        if (!undoStack.current.length) return;
        redoStack.current.push(elements);
        restoreSnapshot(undoStack.current.pop());
    };

    const redo = () => {
        if (!redoStack.current.length) return;
        undoStack.current.push(elements);
        restoreSnapshot(redoStack.current.pop());
    };

    // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo. A focused text
    // field keeps the browser's own undo for what is typed in it.
    React.useEffect(() => {
        const onKey = (e) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            const tag = (e.target && e.target.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
            const k = e.key.toLowerCase();
            if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

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

    /* Small field renderers for the table settings sections. */
    const tColor = (el, label, key, def, clearable) => (
        <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
            <div className="flex items-center gap-1">
                <input type="color" value={el[key] || def} onChange={e => updateTableProperty(key, e.target.value, el)} className="flex-1 min-w-0 h-8 p-1 border rounded-md" />
                {clearable && <button onClick={() => updateTableProperty(key, '', el)} className="text-[10px] text-gray-400 hover:text-gray-700" title="Remove">{el[key] ? 'Off' : ''}</button>}
            </div>
        </div>
    );
    const tNumber = (el, label, key, placeholder, opts = {}) => (
        <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
            <input type="number" min={opts.min ?? 0} step={opts.step ?? 1} value={el[key] ?? ''} placeholder={placeholder}
                onChange={e => updateTableProperty(key, e.target.value === '' ? undefined : Number(e.target.value), el)}
                className="w-full text-xs p-1.5 border rounded-md" />
        </div>
    );
    const tSelect = (el, label, key, options, fallback = '') => (
        <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
            <select value={el[key] ?? fallback} onChange={e => updateTableProperty(key, e.target.value || undefined, el)} className="w-full text-xs p-1.5 border rounded-md bg-white">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
        </div>
    );
    const tFont = (el, label, key, inheritLabel) => (
        <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
            <FontPicker compact value={el[key] || ''} inheritLabel={inheritLabel}
                onChange={v => updateTableProperty(key, v || undefined, el)} />
        </div>
    );
    const tSection = (title, children) => (
        <div className="border-b pb-3 mb-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
            <div className="grid grid-cols-2 gap-3">{children}</div>
        </div>
    );

    /* One-click looks: each preset sets several table properties at once. */
    const TABLE_PRESETS = {
        classic:  { label: 'Classic (full grid)',            props: { gridLines: 'full', borderStyle: 'solid', borderWidth: 1, headerRuleWidth: 2, zebraColor: '' } },
        minimal:  { label: 'Minimal (row rules, no box)',    props: { gridLines: 'rows_open', borderStyle: 'solid', borderWidth: 1, headerRuleWidth: 1, borderRadius: 0, zebraColor: '' } },
        header:   { label: 'Header underline only',          props: { gridLines: 'header', borderStyle: 'solid', borderWidth: 1, headerRuleWidth: 2, zebraColor: '' } },
        vertical: { label: 'Vertical lines only',            props: { gridLines: 'columns', borderStyle: 'solid', borderWidth: 1, zebraColor: '' } },
        dotted:   { label: 'Dotted row rules',               props: { gridLines: 'rows', borderStyle: 'dotted', borderWidth: 1, headerRuleWidth: 1, zebraColor: '' } },
        zebra:    { label: 'Zebra stripes, no lines',        props: { gridLines: 'none', borderWidth: 1, headerRuleWidth: 1, zebraColor: '#f3f4f6' } },
        rounded:  { label: 'Rounded, light rules',           props: { gridLines: 'rows', borderStyle: 'solid', borderWidth: 1, headerRuleWidth: 1, borderRadius: 8, borderColor: '#d1d5db', zebraColor: '' } },
    };

    const applyTablePreset = (key, currentEl) => {
        const preset = TABLE_PRESETS[key];
        if (!preset) return;
        const updatedEl = { ...currentEl, ...preset.props };
        setElements(elements.map(el => el.id === currentEl.id ? { ...updatedEl, content: generateTableHtml(updatedEl) } : el));
    };

    /* Sample values for the "show preview data" canvas. Keyed by token path so
       text blocks and html/table blocks resolve the same set - a block template
       is mostly text blocks, and showing them raw {{ tokens }} while the table
       next to them shows real words is what makes a layout unreadable. */
    const previewValues = () => ({
        'invoice.invoice_number': 'INV-2026-0001',
        'invoice.date': 'Oct 25, 2026',
        'invoice.due_date': 'Nov 25, 2026',
        'invoice.total_final_amount': '1,180.00',
        'invoice.gst_final_amount': '180.00',
        'invoice.receiver_name': 'Acme Client Corp',
        'invoice.receiver_address': '42 Market Road, Dehradun, Uttarakhand',
        'invoice.receiver_gst_number': '05AAAAA0000A1Z5',
        'invoice.receiver_phone': '+91 98765 43210',
        'invoice.receiver_email': 'accounts@client.com',
        'invoice.payment_method': 'UPI',
        'invoice.payment_status': 'Unpaid',
        'invoice.place_of_supply': 'Maharashtra (27)',
        'invoice.notes': 'Thank you for your business.',
        'invoice.terms': 'Payment is due within 30 days. Goods once sold are not returnable.',
        'company.company_name': companyInfo?.company_name || 'Acme Corporation',
        'company.company_logo': companyInfo?.company_logo || 'https://via.placeholder.com/150',
        'company.company_address': companyInfo?.company_address || '123 Business Lane, Suite 100, Financial District',
        'company.company_phone': companyInfo?.company_phone || '+1 (555) 019-2834',
        'company.company_email': companyInfo?.company_email_id || 'billing@acme.com',
        'company.company_email_id': companyInfo?.company_email_id || 'billing@acme.com',
        'company.gst_number': companyInfo?.company_gst_number || '22AAAAA0000A1Z5',
        'company.company_gst_number': companyInfo?.company_gst_number || '22AAAAA0000A1Z5',
        'company.company_state': companyInfo?.state || 'Uttarakhand',
        'company.bank_name': companyInfo?.bank_name || 'State Bank of India',
        'company.account_number': companyInfo?.account_number || '000123456789',
        'company.ifsc_code': companyInfo?.ifsc_code || 'SBIN0000123',
        'company.upi_id': companyInfo?.upi_id || 'acme@okaxis',
        // Canvas preview only: the real QR is generated server-side at export
        // time, because it has to encode the finished invoice total.
        'company.upi_qr': UPI_QR_PLACEHOLDER,
        'footer.total_amount_with_out_gst': '1,000.00',
        'footer.total_taxable_amount_with_extra_non_gst': '1,000.00',
        'footer.gst': '18',
        'footer.center_gst': '9',
        'footer.state_gst': '9',
        'footer.gst_amount': '180.00',
        'footer.center_gst_amount': '90.00',
        'footer.state_gst_amount': '90.00',
        'footer.total_amount_with_gst': '1,180.00',
        'footer.total_amount_in_text': 'One Thousand One Hundred Eighty',
    });

    /* Tokens carry Django filters ({{ company.company_name|upper }},
       {{ product.props.rate|default:"0" }}), so match an optional filter tail
       rather than only the bare path. */
    const substituteTokens = (str, values) => {
        let out = str;
        Object.entries(values).forEach(([path, value]) => {
            const escaped = path.replace(/\./g, '\\.');
            out = out.replace(
                new RegExp('\\{\\{\\s*' + escaped + '\\s*(\\|[^}]*?)?\\s*\\}\\}', 'g'),
                value
            );
        });
        return out;
    };

    /* A token with no sample value is blank on the canvas, the way the PDF
       prints a field the invoice leaves empty, rather than a raw {{ token }}. */
    const blankUnresolved = (str) => str.replace(/\{\{[\s\S]*?\}\}/g, '');

    const getPreviewContent = (content, type) => {
        if (!showPreviewData || !content) return content;

        const values = previewValues();

        if (type === 'text') {
            // Tags such as {% if %} guard optional lines; the canvas shows the
            // line they wrap, not the tag itself.
            return blankUnresolved(substituteTokens(content, values).replace(/\{%.*?%\}/g, ''));
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
                        /* Column values are user-defined, so the named cases below
                           cover the built-in columns and the trailing sweep gives
                           every other product column ("making", "hns", …) a
                           stand-in instead of leaving a raw token on the canvas. */
                        let row = substituteTokens(innerTemplate, {
                            'forloop.counter': p.counter,
                            'product.props.item': p.item,
                            'product.props.description': p.description,
                            'product.props.quantity': p.qty,
                            'product.props.rate': p.rate,
                            'product.props.amount': p.amount,
                            'product.total_amount': p.total,
                            'product.item': p.item,
                            'product.description': p.description,
                            'product.quantity': p.qty,
                            'product.rate': p.rate,
                            'product.amount': p.amount,
                        });
                        row = row.replace(/\{\{\s*product(\.props)?\.[a-z0-9_]+\s*(\|[^}]*?)?\s*\}\}/gi,
                            p.counter === 1 ? 'Sample' : '--');
                        return row;
                    }).join('');
                });
            }

            result = substituteTokens(result, values);

            // Strip any remaining django template tags (like {% ... %})
            result = result.replace(/\{%.*?%\}/g, '');
            return blankUnresolved(result);
        }
        return blankUnresolved(substituteTokens(content, values));
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
                        resetHistory.current = true;
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
            // An empty {{ }} cannot be compiled and makes every export of this
            // template fail, so refuse to save it rather than break the PDF.
            if (/\{\{\s*\}\}/.test(htmlContent)) {
                const empty = /\{\{\s*\}\}/;
                const bad = elements.find(el =>
                    empty.test(el.content || '') || empty.test(el.url || '')
                    || (el.columns || []).some(c => empty.test(c.value || '')));
                if (bad) setSelectedId(bad.id);
                const where = bad
                    ? `It is in the selected block (${bad.type}${bad.content ? `: "${String(bad.content).replace(/\{\{\s*\}\}/g, '[empty]').slice(0, 40)}"` : ''}). Look for the red "empty variable" chip, delete it, then save again.`
                    : "Check the HTML blocks and table cells, then save again.";
                alert(`This template contains an empty {{ }} placeholder. ${where}`);
                return;
            }
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
                /* Without a width a text block is shrink-to-fit and only stops
                   at the page edge, so it cannot wrap inside a column and
                   text-align has nothing to align against. */
                const tw = el.width ? `width: ${el.width}px; ` : '';
                const formattedContent = (el.content || '').replace(/\n/g, '<br>');
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; font-size: ${fs}px; color: ${c}; font-weight: ${fw}; font-family: ${ff}; text-align: ${ta}; font-style: ${fst}; text-decoration: ${td}; line-height: ${lh}; ${tw}${ls}${rot}white-space: pre-wrap;">${formattedContent}</div>\n`;
            } else if (el.type === 'line') {
                const w = el.width || 100;
                const h = el.height || 2;
                const bg = el.backgroundColor || 'transparent';
                const br = el.borderRadius ? `border-radius: ${el.borderRadius}px; ` : '';
                const bw = el.borderWidth ? `border-width: ${borderWidthCss(el.borderWidth, el.borderSides)}; ` : '';
                const bc = el.borderColor ? `border-color: ${el.borderColor}; ` : (el.borderWidth ? 'border-color: #000000; ' : '');
                const bs = el.borderStyle === 'none' ? '' : (el.borderStyle || el.borderWidth ? `border-style: ${el.borderStyle || 'solid'}; ` : '');
                const rot = el.rotate ? `transform: rotate(${el.rotate}deg); transform-origin: center; ` : '';
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px; background-color: ${bg}; ${br}${bw}${bc}${bs}${rot}"></div>\n`;
            } else if (el.type === 'html' || el.type === 'product_table') {
                const w = el.width || 200;
                const h = el.height || 100;
                const rot = el.rotate ? `transform: rotate(${el.rotate}deg); transform-origin: center; ` : '';
                innerHtml += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${w}px; height: ${h}px; overflow: hidden; ${rot}">${el.content || ''}</div>\n`;
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

        /* A big hollow outline (the bill border, a framed panel) covers the
           blocks inside it. Pressing in its interior starts a selection box
           instead of grabbing the outline; its edge (6px) still grabs it. */
        const target = elements.find(x => x.id === id);
        if (target && target.type === 'line' && canvasRef.current
            && (!target.backgroundColor || target.backgroundColor === 'transparent')
            && target.width > 30 && target.height > 30) {
            const rect = canvasRef.current.getBoundingClientRect();
            const px = (e.clientX - rect.left) / zoom - target.x;
            const py = (e.clientY - rect.top) / zoom - target.y;
            const edge = 6;
            if (px > edge && py > edge && px < target.width - edge && py < target.height - edge) {
                handleCanvasPointerDown(e);
                return;
            }
        }

        // Shift / Cmd / Ctrl-click adds or removes a block from the selection.
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
            const current = multiIds.length ? multiIds : (selectedId ? [selectedId] : []);
            const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
            if (next.length > 1) { setMultiIds(next); setSelectedId(null); }
            else { setMultiIds([]); setSelectedId(next[0] ?? null); }
            return;
        }

        // Grabbing any block of a multi-selection moves the whole group.
        if (multiIds.includes(id) && canvasRef.current) {
            const positions = {};
            elements.forEach(el => { if (multiIds.includes(el.id)) positions[el.id] = { x: el.x, y: el.y }; });
            groupDragRef.current = { startX: e.clientX, startY: e.clientY, positions };
            setIsGroupDragging(true);
            e.target.setPointerCapture(e.pointerId);
            return;
        }

        setMultiIds([]);
        setSelectedId(id);

        const el = elements.find(el => el.id === id);
        if (!el || !canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Calculate offset from mouse click relative to the elements top-left corner
        setDragOffset({
            x: (e.clientX - canvasRect.left) / zoom - el.x,
            y: (e.clientY - canvasRect.top) / zoom - el.y
        });
        setIsDragging(true);

        // Capture pointer events beyond the element bounds
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (isGroupDragging && groupDragRef.current) {
            const { startX, startY, positions } = groupDragRef.current;
            const dx = (e.clientX - startX) / zoom;
            const dy = (e.clientY - startY) / zoom;
            setElements(elements.map(el => positions[el.id]
                ? { ...el, x: Math.round(positions[el.id].x + dx), y: Math.round(positions[el.id].y + dy) }
                : el));
            return;
        }

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
            const deltaX = (e.clientX - resizeStartPointer.x) / zoom;
            const deltaY = (e.clientY - resizeStartPointer.y) / zoom;
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

        const newX = (e.clientX - canvasRect.left) / zoom - dragOffset.x;
        const newY = (e.clientY - canvasRect.top) / zoom - dragOffset.y;

        setElements(elements.map(el => el.id === selectedId ? { ...el, x: Math.round(newX), y: Math.round(newY) } : el));
    };

    const handlePointerUp = (e) => {
        if (isGroupDragging) {
            setIsGroupDragging(false);
            groupDragRef.current = null;
            if (e.target.releasePointerCapture) {
                e.target.releasePointerCapture(e.pointerId);
            }
        }
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
    /* Drag a box on empty canvas to select the blocks that lie entirely inside
       it. A block that only pokes into the box (or wraps it, like the page
       outline) is left out. */
    const canvasPoint = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(PAGE_W, (e.clientX - rect.left) / zoom)),
            y: Math.max(0, Math.min(PAGE_H, (e.clientY - rect.top) / zoom)),
        };
    };

    const handleCanvasPointerDown = (e) => {
        if (!canvasRef.current || e.button > 0) return;
        const { x, y } = canvasPoint(e);
        marqueeRef.current = { additive: e.shiftKey || e.metaKey || e.ctrlKey };
        setMarquee({ x0: x, y0: y, x1: x, y1: y });
        canvasRef.current.setPointerCapture(e.pointerId);
    };

    const handleCanvasPointerMove = (e) => {
        if (!marqueeRef.current || !canvasRef.current) return;
        const { x, y } = canvasPoint(e);
        setMarquee(m => (m ? { ...m, x1: x, y1: y } : m));
    };

    const handleCanvasPointerUp = (e) => {
        if (!marqueeRef.current || !canvasRef.current) return;
        const { additive } = marqueeRef.current;
        marqueeRef.current = null;
        const box = marquee;
        setMarquee(null);
        try { canvasRef.current.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }
        if (!box) return;

        const left = Math.min(box.x0, box.x1), right = Math.max(box.x0, box.x1);
        const top = Math.min(box.y0, box.y1), bottom = Math.max(box.y0, box.y1);

        // A click, not a drag: clear the selection.
        if (right - left < 3 && bottom - top < 3) {
            if (!additive) { setSelectedId(null); setMultiIds([]); }
            return;
        }

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const hits = elements.filter(el => {
            const node = document.getElementById(`canvas-el-${el.id}`);
            if (!node) return false;
            const r = node.getBoundingClientRect();
            const l = (r.left - canvasRect.left) / zoom, t = (r.top - canvasRect.top) / zoom;
            const rr = (r.right - canvasRect.left) / zoom, b = (r.bottom - canvasRect.top) / zoom;
            // Only blocks that sit completely inside the box are selected.
            return l >= left && rr <= right && t >= top && b <= bottom;
        }).map(el => el.id);

        const ids = additive
            ? Array.from(new Set([...(multiIds.length ? multiIds : (selectedId ? [selectedId] : [])), ...hits]))
            : hits;

        if (ids.length > 1) { setMultiIds(ids); setSelectedId(null); }
        else { setMultiIds([]); setSelectedId(ids[0] ?? null); }
    };

    const deleteGroup = () => {
        setElements(elements.filter(el => !multiIds.includes(el.id)));
        setMultiIds([]);
    };

    const duplicateGroup = () => {
        const stamp = Date.now();
        const copies = elements
            .filter(el => multiIds.includes(el.id))
            .map((el, i) => ({ ...el, id: `${stamp}-${i}`, x: el.x + 10, y: el.y + 10 }));
        setElements([...elements, ...copies]);
        setMultiIds(copies.map(c => c.id));
    };

    // Delete / Escape / arrow keys act on the selection unless a field has focus.
    React.useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target && e.target.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
            const ids = multiIds.length ? multiIds : (selectedId ? [selectedId] : []);
            if (!ids.length) return;
            if (e.key === 'Escape') { setSelectedId(null); setMultiIds([]); return; }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                setElements(els => els.filter(el => !ids.includes(el.id)));
                setMultiIds([]);
                setSelectedId(null);
                return;
            }
            const step = e.shiftKey ? 10 : 1;
            const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
            if (d) {
                e.preventDefault();
                setElements(els => els.map(el => ids.includes(el.id) ? { ...el, x: el.x + d[0], y: el.y + d[1] } : el));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [multiIds, selectedId]);

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

    // ── Export / Import ──
    /* The file carries the blocks, not the compiled HTML: the HTML is derived
       from them on save (and by install_jewellery_template.py), so shipping
       both would let the two disagree. */
    const exportTemplateFile = () => {
        const payload = {
            format: TEMPLATE_FILE_FORMAT,
            version: 1,
            template_name: templateName,
            elements,
        };
        const url = URL.createObjectURL(
            new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(templateName || 'template').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.blocks.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const readImportedElements = (parsed) => {
        /* A file written by another tool is fine as long as it holds blocks -
           only a file that declares a different format is refused. */
        if (parsed?.format && parsed.format !== TEMPLATE_FILE_FORMAT) {
            throw new Error(`unexpected format "${parsed.format}"`);
        }
        const list = Array.isArray(parsed) ? parsed : parsed?.elements;
        if (!Array.isArray(list)) throw new Error('no "elements" array in this file');
        const blocks = list
            .filter(el => el && BLOCK_TYPES.includes(el.type))
            .map((el, idx) => {
                const block = {
                    ...el,
                    id: String(el.id || `${Date.now()}-${idx}`),
                    x: Number(el.x) || 0,
                    y: Number(el.y) || 0,
                };
                /* A hand-written definition may carry only the column config;
                   derive the markup from it the same way editing a column does. */
                if (block.type === 'product_table' && !block.content) {
                    block.content = generateTableHtml(block);
                }
                return block;
            });
        if (!blocks.length) throw new Error('no blocks in this file that the editor understands');
        return blocks;
    };

    const importTemplateFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';   // so re-picking the same file fires onChange
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const blocks = readImportedElements(parsed);
            const ok = window.confirm(
                `Load ${blocks.length} block(s) from ${file.name}?\n\n` +
                'This replaces the layout on the canvas. It comes in as a new ' +
                'template, so "Save to Cloud" will create one rather than ' +
                'overwriting the template currently open.'
            );
            if (!ok) return;
            setElements(blocks);
            setSelectedId(null);
            setTemplateId(null);
            if (parsed.template_name) setTemplateName(parsed.template_name);
            setPdfUrl(null);
        } catch (err) {
            console.error('Template import failed', err);
            alert(`Could not import this file: ${err.message}`);
        }
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
                    <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                        <button
                            onClick={undo}
                            disabled={!histCount.undo}
                            title="Undo (Ctrl/Cmd+Z)"
                            className="px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            ↶ Undo
                        </button>
                        <button
                            onClick={redo}
                            disabled={!histCount.redo}
                            title="Redo (Ctrl/Cmd+Shift+Z)"
                            className="px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent border-l-2 border-gray-200"
                        >
                            ↷ Redo
                        </button>
                    </div>
                    <button
                        onClick={exportTemplateFile}
                        title="Download this template's blocks as a .json file"
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                    >
                        ⬇ Export
                    </button>
                    <label
                        title="Load blocks from an exported .json file"
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
                    >
                        <input
                            type="file"
                            accept="application/json,.json"
                            onChange={importTemplateFile}
                            className="hidden"
                        />
                        ⬆ Import
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
                <div className="flex-1 relative bg-gray-100 min-w-0">
                  <div ref={scrollRef} className="absolute inset-0 overflow-auto p-4 sm:p-8">
                    <div className="w-fit h-fit mx-auto" style={{ width: PAGE_W * zoom, height: PAGE_H * zoom }}>
                        {/* A4 Canvas Scale Wrapper (fixed exactly to A4 72dpi size) */}
                        <div
                            ref={canvasRef}
                            onPointerDown={handleCanvasPointerDown}
                            onPointerMove={handleCanvasPointerMove}
                            onPointerUp={handleCanvasPointerUp}
                            className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden shrink-0"
                            style={{ width: `${PAGE_W}px`, height: `${PAGE_H}px`, touchAction: 'none', transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                        >
                            {/* Grid Pattern Background for visual aid */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                                backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                                backgroundSize: '20px 20px',
                                opacity: 0.5
                            }}></div>

                            {elements.map(el => {
                                const isSelected = selectedId === el.id;
                                const inGroup = multiIds.includes(el.id);
                                return (
                                    <div
                                        key={el.id}
                                        id={`canvas-el-${el.id}`}
                                        onPointerDown={(e) => handlePointerDown(e, el.id)}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerUp}
                                        className={`absolute cursor-move select-none ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : inGroup ? 'ring-2 ring-indigo-400 ring-offset-1' : 'hover:ring-1 hover:ring-gray-300'}`}
                                        style={{
                                            left: el.x,
                                            top: el.y,
                                            ...(el.type === 'text' ? {
                                                width: el.width,
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
                                                width: thinRuleStyle(el)?.width ?? el.width,
                                                height: thinRuleStyle(el)?.height ?? el.height,
                                                backgroundColor: el.backgroundColor || 'transparent',
                                                borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                                                borderWidth: el.borderWidth ? borderWidthCss(el.borderWidth, el.borderSides) : undefined,
                                                borderColor: el.borderColor || (el.borderWidth ? '#000000' : undefined),
                                                borderStyle: el.borderStyle || (el.borderWidth ? 'solid' : undefined),
                                            }),
                                            overflow: (el.type === 'html' || el.type === 'product_table') ? 'hidden' : 'visible',
                                            transform: (() => {
                                                const thin = thinRuleStyle(el);
                                                const parts = [];
                                                if (thin) parts.push(`translate(${thin.dx}px, ${thin.dy}px)`);
                                                if (el.rotate) parts.push(`rotate(${el.rotate}deg)`);
                                                if (thin) parts.push(`scale(${thin.scale})`);
                                                return parts.length ? parts.join(' ') : undefined;
                                            })(),
                                            transformOrigin: 'center'
                                        }}
                                    >
                                        {el.type === 'html' || el.type === 'product_table' ? (
                                            <iframe
                                                srcDoc={`<!DOCTYPE html><html><head><style>* { box-sizing: border-box; } html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; width: 100%; height: 100%; }</style></head><body>${getPreviewContent(el.content, el.type)}</body></html>`}
                                                className="w-full h-full border-none pointer-events-none"
                                                title={`sandbox-${el.id}`}
                                            />
                                        ) : el.type === 'text' ? (
                                            getPreviewContent(el.content, el.type)
                                        ) : el.type === 'image' ? (
                                            <img src={showPreviewData && el.url && el.url.includes('{{ company.upi_qr }}') ? UPI_QR_PLACEHOLDER : (showPreviewData && el.url && el.url.includes('{{ company.company_logo }}') ? (companyInfo?.company_logo || 'https://via.placeholder.com/150') : el.url)} className="w-full h-full object-contain pointer-events-none" alt="element" />
                                        ) : null}
                                        {/* Thin rules are hard to grab. The extra hit area is a transparent
                                            child, so the rule itself keeps the exact size and position the
                                            exported PDF gives it (padding on the rule itself used to hide
                                            1px lines and push them 5px down on the canvas only). */}
                                        {el.type === 'line' && (el.height <= 2 || el.width <= 2) && (
                                            <div className="absolute" style={{ left: -5, right: -5, top: -5, bottom: -5 }} />
                                        )}
                                        {/* Resize Handle */}
                                        {isSelected && (
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

                            {marquee && (
                                <div className="absolute pointer-events-none z-30 border border-dashed border-indigo-500 bg-indigo-500/10"
                                    style={{
                                        left: Math.min(marquee.x0, marquee.x1),
                                        top: Math.min(marquee.y0, marquee.y1),
                                        width: Math.abs(marquee.x1 - marquee.x0),
                                        height: Math.abs(marquee.y1 - marquee.y0),
                                    }} />
                            )}
                        </div>
                    </div>
                  </div>

                  {/* Zoom controls */}
                  <div className="absolute bottom-4 left-4 z-20 flex items-center bg-white border rounded-xl shadow-md overflow-hidden text-sm select-none">
                      <button onClick={() => zoomTo(zoom - 0.1)} disabled={zoom <= 0.25} title="Zoom out (Ctrl/Cmd + scroll)" className="px-3 py-1.5 hover:bg-gray-50 disabled:opacity-30 font-semibold">−</button>
                      <button onClick={() => zoomTo(1)} title="Reset to 100%" className="px-2 py-1.5 w-14 text-center border-x hover:bg-gray-50 font-semibold text-gray-700">{Math.round(zoom * 100)}%</button>
                      <button onClick={() => zoomTo(zoom + 0.1)} disabled={zoom >= 3} title="Zoom in (Ctrl/Cmd + scroll)" className="px-3 py-1.5 hover:bg-gray-50 disabled:opacity-30 font-semibold">+</button>
                      <button onClick={fitToWidth} title="Fit page width" className="px-3 py-1.5 border-l hover:bg-gray-50 text-xs font-semibold text-gray-600">Fit width</button>
                      <button onClick={fitToPage} title="Fit whole page" className="px-3 py-1.5 border-l hover:bg-gray-50 text-xs font-semibold text-gray-600">Fit page</button>
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
                                            <h3 className="text-sm font-bold text-gray-800">Edit {selectedEl.label || (selectedEl.type === 'text' ? 'Text' : selectedEl.type === 'html' ? 'HTML Block' : 'Shape')}</h3>
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
                                                    <TokenTextEditor
                                                        key={selectedEl.id}
                                                        value={selectedEl.content || ''}
                                                        onChange={v => updateSelected('content', v)}
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
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Width (px)</label>
                                                        <input type="number" min="0" value={selectedEl.width || 0} onChange={e => updateSelected('width', Number(e.target.value) || undefined)} className="w-full text-sm p-2 border rounded-md" placeholder="0 = fit text" />
                                                        <p className="text-[10px] text-gray-400 mt-1 leading-snug">0 fits the text and never wraps. A width wraps the text and makes Text Align work.</p>
                                                    </div>
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
                                                    <FontPicker value={selectedEl.fontFamily || DEFAULT_FONT} onChange={v => updateSelected('fontFamily', v || DEFAULT_FONT)} />
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
                                                {/* Styles, split into sections */}
                                                {tSection('Header', <>
                                                    {tColor(selectedEl, 'Background', 'headerBgColor', '#f3f4f6')}
                                                    {tColor(selectedEl, 'Text Color', 'headerTextColor', '#000000')}
                                                    {tFont(selectedEl, 'Font', 'headerFontFamily', 'Same as table')}
                                                    {tNumber(selectedEl, 'Font Size (px)', 'headerFontSize', String(selectedEl.fontSize || 12))}
                                                    {tSelect(selectedEl, 'Weight', 'headerFontWeight', [['', 'Bold (default)'], ['normal', 'Normal'], ['600', 'Semi-bold'], ['bold', 'Bold'], ['800', 'Extra bold']])}
                                                    {tSelect(selectedEl, 'Style', 'headerFontStyle', [['', 'Normal'], ['italic', 'Italic']])}
                                                    {tNumber(selectedEl, 'Letter Spacing (px)', 'headerLetterSpacing', '0', { step: 0.5 })}
                                                    {tNumber(selectedEl, 'Top/Bottom Padding (px)', 'headerPadding', String(selectedEl.cellPadding ?? 6))}
                                                    <label className="col-span-2 flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                                                        <input type="checkbox" checked={!!selectedEl.headerUppercase} onChange={e => updateTableProperty('headerUppercase', e.target.checked, selectedEl)} />
                                                        UPPERCASE header text
                                                    </label>
                                                </>)}

                                                {tSection('Rows (Body)', <>
                                                    {tColor(selectedEl, 'Text Color', 'textColor', '#333333')}
                                                    {tColor(selectedEl, 'Row Background', 'rowBgColor', '#ffffff', true)}
                                                    {tFont(selectedEl, 'Font', 'bodyFontFamily', 'Same as table')}
                                                    {tNumber(selectedEl, 'Font Size (px)', 'bodyFontSize', String(selectedEl.fontSize || 12))}
                                                    {tSelect(selectedEl, 'Weight', 'bodyFontWeight', [['', 'Normal'], ['600', 'Semi-bold'], ['bold', 'Bold']])}
                                                    {tColor(selectedEl, 'Zebra Stripe Color', 'zebraColor', '#f3f4f6', true)}
                                                </>)}

                                                {tSection('Table Defaults', <>
                                                    {tFont(selectedEl, 'Base Font', 'fontFamily', null)}
                                                    {tNumber(selectedEl, 'Base Font Size (px)', 'fontSize', '12')}
                                                    {tNumber(selectedEl, 'Cell Padding (px)', 'cellPadding', '6')}
                                                    {tNumber(selectedEl, 'Corner Radius (px)', 'borderRadius', '0')}
                                                </>)}

                                                <div className="border-b pb-3 mb-3">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lines &amp; Borders</h4>
                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                        {tColor(selectedEl, 'Outer Border Color', 'borderColor', '#e5e7eb')}
                                                        {tColor(selectedEl, 'Header Line Color', 'headerRuleColor', selectedEl.borderColor || '#e5e7eb', true)}
                                                        {tColor(selectedEl, 'Inner Lines Color', 'gridColor', selectedEl.borderColor || '#e5e7eb', true)}
                                                        {tNumber(selectedEl, 'Border Width (px)', 'borderWidth', '1', { step: 0.5 })}
                                                        {tNumber(selectedEl, 'Header Line (px)', 'headerRuleWidth', String(selectedEl.borderWidth ?? 1), { step: 0.5 })}
                                                        {tSelect(selectedEl, 'Border Style', 'borderStyle', [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted'], ['double', 'Double'], ['none', 'None']], 'solid')}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Grid Lines</label>
                                                        <select value={selectedEl.gridLines || 'rows'} onChange={e => updateTableProperty('gridLines', e.target.value, selectedEl)} className="w-full text-xs p-1.5 border rounded-md bg-white">
                                                            <option value="none">No lines at all</option>
                                                            <option value="outer">Outer border only</option>
                                                            <option value="rows">Header + row rules</option>
                                                            <option value="rows_open">Header + row rules (no outer box)</option>
                                                            <option value="body_rows">Row rules only (no header rule)</option>
                                                            <option value="header">Header underline only</option>
                                                            <option value="columns">Vertical lines only</option>
                                                            <option value="header_columns">Header underline + vertical lines</option>
                                                            <option value="full">Full grid (rows + columns)</option>
                                                        </select>
                                                    </div>
                                                    <div className="mt-3">
                                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Style Preset</label>
                                                        <select value="" onChange={e => e.target.value && applyTablePreset(e.target.value, selectedEl)} className="w-full text-xs p-1.5 border rounded-md bg-white">
                                                            <option value="">Apply a preset…</option>
                                                            {Object.entries(TABLE_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-2 leading-snug">A corner radius switches the table to spaced borders, the only model that rounds corners - row rules then sit on the cells, so spacing can shift by a pixel.</p>
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
                                                    {(() => {
                                                        const cols = selectedEl.columns || [];
                                                        const pct = cols.reduce((n, c) => n + (String(c.width || '').endsWith('%') ? parseFloat(c.width) : 0), 0);
                                                        const auto = cols.filter(c => !c.width).length;
                                                        if (!cols.length) return null;
                                                        return (
                                                            <p className={`text-[10px] mb-2 ${pct > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                                                                Fixed widths total {Math.round(pct)}%{auto ? `, ${auto} auto column${auto > 1 ? 's' : ''} share the rest` : ''}.{pct > 100 ? ' Over 100% - the table will squeeze columns.' : ''}
                                                            </p>
                                                        );
                                                    })()}
                                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                                        {(selectedEl.columns || []).map((col, idx) => (
                                                            <div key={idx} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-2 relative group">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-gray-400">Column {idx + 1} of {(selectedEl.columns || []).length}</span>
                                                                    <div className="flex items-center gap-0.5">
                                                                        {[
                                                                            { icon: '⏮', title: 'Move to first', to: 0 },
                                                                            { icon: '◀', title: 'Move left', to: idx - 1 },
                                                                            { icon: '▶', title: 'Move right', to: idx + 1 },
                                                                            { icon: '⏭', title: 'Move to last', to: (selectedEl.columns || []).length - 1 },
                                                                        ].map(m => (
                                                                            <button
                                                                                key={m.title}
                                                                                disabled={m.to < 0 || m.to >= (selectedEl.columns || []).length || m.to === idx}
                                                                                onClick={() => {
                                                                                    const cols = [...(selectedEl.columns || [])];
                                                                                    const [moved] = cols.splice(idx, 1);
                                                                                    cols.splice(m.to, 0, moved);
                                                                                    updateTableProperty('columns', cols, selectedEl);
                                                                                }}
                                                                                className="w-6 h-6 text-[11px] rounded border bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-600"
                                                                                title={m.title}
                                                                            >
                                                                                {m.icon}
                                                                            </button>
                                                                        ))}
                                                                        <button
                                                                            onClick={() => {
                                                                                const cols = (selectedEl.columns || []).filter((_, cIdx) => cIdx !== idx);
                                                                                updateTableProperty('columns', cols, selectedEl);
                                                                            }}
                                                                            className="w-6 h-6 text-[11px] rounded text-red-500 hover:bg-red-50 ml-1"
                                                                            title="Delete Column"
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                    </div>
                                                                </div>
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
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="block text-[10px] font-semibold text-gray-400">Column Width</label>
                                                                        <button
                                                                            onClick={() => {
                                                                                const cols = [...(selectedEl.columns || [])];
                                                                                const { width: _w, ...rest } = col;
                                                                                cols[idx] = rest;
                                                                                updateTableProperty('columns', cols, selectedEl);
                                                                            }}
                                                                            className={`text-[10px] ${col.width ? 'text-indigo-600 hover:text-indigo-800' : 'text-gray-400'}`}
                                                                            title="Let the table share the leftover space"
                                                                        >
                                                                            {col.width ? 'Reset to auto' : 'Auto'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="range" min="2" max="80" step="1"
                                                                            disabled={!!col.width && !String(col.width).endsWith('%')}
                                                                            value={parseFloat(col.width) || 15}
                                                                            onChange={e => {
                                                                                const cols = [...(selectedEl.columns || [])];
                                                                                cols[idx] = { ...col, width: `${e.target.value}%` };
                                                                                updateTableProperty('columns', cols, selectedEl);
                                                                            }}
                                                                            className="flex-1"
                                                                        />
                                                                        <input
                                                                            type="number" min="1" step="1"
                                                                            value={parseFloat(col.width) || ''}
                                                                            placeholder="auto"
                                                                            onChange={e => {
                                                                                const cols = [...(selectedEl.columns || [])];
                                                                                const unit = String(col.width || '%').endsWith('px') ? 'px' : '%';
                                                                                cols[idx] = { ...col, width: e.target.value === '' ? undefined : `${e.target.value}${unit}` };
                                                                                updateTableProperty('columns', cols, selectedEl);
                                                                            }}
                                                                            className="w-14 text-xs p-1 border rounded"
                                                                        />
                                                                        <select
                                                                            value={String(col.width || '%').endsWith('px') ? 'px' : '%'}
                                                                            onChange={e => {
                                                                                const cols = [...(selectedEl.columns || [])];
                                                                                const n = parseFloat(col.width) || 15;
                                                                                cols[idx] = { ...col, width: `${n}${e.target.value}` };
                                                                                updateTableProperty('columns', cols, selectedEl);
                                                                            }}
                                                                            className="text-xs p-1 border rounded bg-white"
                                                                        >
                                                                            <option value="%">%</option>
                                                                            <option value="px">px</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {[['padLeft', 'Left Padding (px)'], ['padRight', 'Right Padding (px)']].map(([key, label]) => (
                                                                        <div key={key}>
                                                                            <label className="block text-[10px] font-semibold text-gray-400">{label}</label>
                                                                            <input
                                                                                type="number" min="0" step="1"
                                                                                value={col[key] ?? ''}
                                                                                placeholder={String(selectedEl.cellPadding ?? 6)}
                                                                                onChange={e => {
                                                                                    const cols = [...(selectedEl.columns || [])];
                                                                                    cols[idx] = { ...col, [key]: e.target.value === '' ? undefined : Number(e.target.value) };
                                                                                    updateTableProperty('columns', cols, selectedEl);
                                                                                }}
                                                                                className="w-full text-xs p-1 border rounded"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-semibold text-gray-400">Cell Value</label>
                                                                    {(() => {
                                                                        const uiOpts = uiConfigColumnOptions(uiConfigTitles);
                                                                        const known = [...COLUMN_PLACEHOLDERS, ...uiOpts];
                                                                        const isCustom = col.value && !known.some(k => k.value === col.value);
                                                                        return (
                                                                            <select
                                                                                value={col.value || ''}
                                                                                onChange={e => {
                                                                                    const cols = [...(selectedEl.columns || [])];
                                                                                    cols[idx] = { ...col, value: e.target.value };
                                                                                    updateTableProperty('columns', cols, selectedEl);
                                                                                }}
                                                                                className="w-full text-xs p-1 border rounded bg-white"
                                                                                title="Pick a field. Add new fields on the UI Config page."
                                                                            >
                                                                                <option value="">Select a field…</option>
                                                                                {isCustom && <option value={col.value}>Custom (existing): {col.value.replace(/<[^>]+>/g, '').slice(0, 40)}</option>}
                                                                                <optgroup label="Built-in">
                                                                                    {COLUMN_PLACEHOLDERS.map((p, i) => <option key={i} value={p.value}>{p.name}</option>)}
                                                                                </optgroup>
                                                                                {uiOpts.length > 0 && (
                                                                                    <optgroup label="UI Config fields">
                                                                                        {uiOpts.map((p, i) => <option key={i} value={p.value}>{p.name}</option>)}
                                                                                    </optgroup>
                                                                                )}
                                                                            </select>
                                                                        );
                                                                    })()}
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
                                                <TokenTextEditor
                                                    key={selectedEl.id}
                                                    singleLine
                                                    placeholder="https://..."
                                                    value={selectedEl.url || ''}
                                                    onChange={v => updateSelected('url', v)}
                                                />
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    <button type="button" onClick={() => updateSelected('url', '{{ company.company_logo }}')} className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded hover:bg-purple-100">Use Company Logo</button>
                                                    <button type="button" onClick={() => updateSelected('url', '{{ company.upi_qr }}')} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded hover:bg-emerald-100">Use UPI Payment QR</button>
                                                </div>
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
                                                    <button
                                                        onClick={() => updateSelected('url', '{{ company.upi_qr }}')}
                                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-150 hover:bg-emerald-100 transition-all active:scale-95"
                                                    >
                                                        📱 Use UPI QR
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 mb-2">You can also use <code className="bg-gray-100 px-1 rounded">{`{{ company.company_logo }}`}</code> here if the logo exists!</p>
                                                <p className="text-[10px] text-gray-400 mt-1 mb-2"><code className="bg-gray-100 px-1 rounded">{`{{ company.upi_qr }}`}</code> renders a QR carrying this invoice's grand total. Set a UPI ID in Company Details and turn the QR on there first. Keep it at least 90×90px so it stays scannable.</p>

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
                                                        <DecimalInput value={selectedEl.width} onChange={v => updateSelected('width', v)} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Height (px)</label>
                                                        <DecimalInput value={selectedEl.height} onChange={v => updateSelected('height', v)} className="w-full text-sm p-2 border rounded-md" />
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
                                                        <DecimalInput value={selectedEl.borderWidth || 0} onChange={v => updateSelected('borderWidth', v)} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Border Radius (px)</label>
                                                        <input type="number" value={selectedEl.borderRadius || 0} onChange={e => updateSelected('borderRadius', Number(e.target.value))} className="w-full text-sm p-2 border rounded-md" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Border Sides</label>
                                                    <select value={selectedEl.borderSides || 'all'} onChange={e => updateSelected('borderSides', e.target.value)} className="w-full text-sm p-2 border rounded-md">
                                                        <option value="all">All four sides</option>
                                                        <option value="bottom">Bottom only</option>
                                                        <option value="top">Top only</option>
                                                        <option value="left">Left only</option>
                                                        <option value="right">Right only</option>
                                                        <option value="horizontal">Top + bottom</option>
                                                        <option value="vertical">Left + right</option>
                                                    </select>
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
                                ) : multiIds.length > 1 ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-bold text-gray-800">{multiIds.length} items selected</h3>
                                            <div className="flex gap-3">
                                                <button onClick={duplicateGroup} className="text-xs text-indigo-600 hover:underline">Duplicate</button>
                                                <button onClick={deleteGroup} className="text-xs text-red-600 hover:underline">Delete</button>
                                                <button onClick={() => setMultiIds([])} className="text-xs text-gray-500 hover:underline">Deselect</button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-snug">
                                            Drag any selected item to move them all together. Arrow keys nudge by 1px (Shift: 10px). Shift-click an item to add or remove it. Esc deselects.
                                        </p>
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
                            {placeholderCategories.map((cat, catIdx) => (
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
