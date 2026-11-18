/** GST state codes. Mirrors invoice_api/accounts/gst_utils.py and MobileApp/constants/gst.ts. */
export const GST_STATES = [
  [1, 'Jammu and Kashmir'], [2, 'Himachal Pradesh'], [3, 'Punjab'], [4, 'Chandigarh'], [5, 'Uttarakhand'],
  [6, 'Haryana'], [7, 'Delhi'], [8, 'Rajasthan'], [9, 'Uttar Pradesh'], [10, 'Bihar'], [11, 'Sikkim'],
  [12, 'Arunachal Pradesh'], [13, 'Nagaland'], [14, 'Manipur'], [15, 'Mizoram'], [16, 'Tripura'],
  [17, 'Meghalaya'], [18, 'Assam'], [19, 'West Bengal'], [20, 'Jharkhand'], [21, 'Odisha'], [22, 'Chhattisgarh'],
  [23, 'Madhya Pradesh'], [24, 'Gujarat'], [26, 'Dadra and Nagar Haveli and Daman and Diu'],
  [27, 'Maharashtra'], [29, 'Karnataka'], [30, 'Goa'], [31, 'Lakshadweep'], [32, 'Kerala'], [33, 'Tamil Nadu'],
  [34, 'Puducherry'], [35, 'Andaman and Nicobar Islands'], [36, 'Telangana'], [37, 'Andhra Pradesh'],
  [38, 'Ladakh'], [97, 'Other Territory'],
].map(([code, name]) => ({ code, name }));

/**
 * Choices for an invoice's place of supply: every state plus 96 "Other Countries", the place of supply of an
 * export. 96 is never a GSTIN prefix, so it stays out of GST_STATES (which GSTINs are parsed against).
 */
export const PLACE_OF_SUPPLY_STATES = [...GST_STATES, { code: 96, name: 'Other Countries' }];

const GSTIN_RE = /^(\d{2})[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const normalizeGstin = (v) => String(v || '').replace(/\s+/g, '').toUpperCase();

/** The state a complete, well-formed GSTIN belongs to, or null while it is still being typed or invalid. */
export function stateFromGstin(raw) {
  const m = GSTIN_RE.exec(normalizeGstin(raw));
  return m ? GST_STATES.find((s) => s.code === Number(m[1])) || null : null;
}

export const stateByName = (name) => {
  const wanted = String(name || '').replace(/\s+/g, ' ').trim().toLowerCase().replace('&', 'and');
  return GST_STATES.find((s) => s.name.toLowerCase() === wanted) || null;
};

/**
 * Whether a line-item column holds the GST rate. Mirrors invoice_api/gst.py `is_gst_column`, which the server
 * recomputes totals with — so a column titled "GST %" or "Tax" is read as tax rather than multiplied into the total.
 */
const GST_COLUMN_KEYS = new Set(['gst', 'gstrate', 'gstpercent', 'gstpercentage', 'tax', 'taxrate', 'taxpercent', 'taxpercentage', 'igst']);
export const isGstColumn = (title) => GST_COLUMN_KEYS.has(String(title || '').toLowerCase().replace(/[^a-z]/g, ''));

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The 15th (check) character of a GSTIN from its first 14. Mirrors accounts/gst_utils.gstin_check_char. */
export function gstinCheckChar(first14) {
  let total = 0;
  for (let i = 0; i < 14; i += 1) {
    const v = GSTIN_CHARS.indexOf(first14[i]) * (i % 2 ? 2 : 1);
    total += Math.floor(v / 36) + (v % 36);
  }
  return GSTIN_CHARS[(36 - (total % 36)) % 36];
}

/** Why a GSTIN can't be saved, or null when it's fine (blank counts as fine: an unregistered party). */
export function gstinError(raw) {
  const gstin = normalizeGstin(raw);
  if (!gstin) return null;
  if (gstin.length !== 15) return 'A GST number has 15 characters.';
  if (!stateFromGstin(gstin)) return 'Enter a valid GST number, e.g. 29ABCDE1234F1ZW.';
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) return 'This GST number has a typo: its last character does not match the rest.';
  return null;
}

const HSN_COLUMN_KEYS = new Set(['hsn', 'sac', 'hsncode', 'saccode', 'hsnsac', 'hsnsaccode', 'hsnorsac', 'hns', 'hnscode']);
const UNIT_COLUMN_KEYS = new Set(['unit', 'units', 'uqc', 'uom']);
const titleKey = (title) => String(title || '').toLowerCase().replace(/[^a-z]/g, '');
/** Line-item column holding the HSN/SAC code. Mirrors invoice_api/gst.py `is_hsn_column`. */
export const isHsnColumn = (title) => HSN_COLUMN_KEYS.has(titleKey(title));
export const isUnitColumn = (title) => UNIT_COLUMN_KEYS.has(titleKey(title));

/** Why an HSN/SAC code is malformed, or null (blank is fine). */
export const hsnError = (raw) => {
  const code = String(raw || '').replace(/\s+/g, '');
  return !code || /^(\d{4}|\d{6}|\d{8})$/.test(code) ? null : 'HSN/SAC codes are 4, 6 or 8 digits (e.g. 8471 or 998314).';
};

/**
 * A party form after typing `value` into its GST field: a complete, valid GSTIN also sets the state,
 * because a business has one GST number per state. `states` is the form's own state list ({ name, code }).
 */
export function withGstin(form, value, states = GST_STATES) {
  const gst_number = normalizeGstin(value);
  const st = stateFromGstin(gst_number);
  const gst_treatment = treatmentFor(form.gst_treatment, !!gst_number);
  if (!st || gstinError(gst_number)) return { ...form, gst_number, gst_treatment };
  const local = states.find((s) => Number(s.code) === st.code);
  return { ...form, gst_number, gst_treatment, state: local ? local.name : st.name, state_code: st.code };
}

/** How GST applies to a customer/vendor. Mirrors companies.models.GST_TREATMENT_CHOICES. */
export const TREATMENTS_WITH_GSTIN = [
  { value: 'registered', label: 'Registered business (regular)' }, { value: 'composition', label: 'Registered business (composition)' },
  { value: 'sez', label: 'Special Economic Zone (SEZ)' }, { value: 'deemed_export', label: 'Deemed export' },
];
export const TREATMENTS_WITHOUT_GSTIN = [
  { value: 'unregistered', label: 'Unregistered business' }, { value: 'consumer', label: 'Consumer' },
  { value: 'overseas', label: 'Overseas' },
];
/** Keep a treatment consistent with whether there is a GSTIN, the same rule the server applies. */
export function treatmentFor(current, hasGstin) {
  const ok = (hasGstin ? TREATMENTS_WITH_GSTIN : TREATMENTS_WITHOUT_GSTIN).some((t) => t.value === current);
  return ok ? current : hasGstin ? 'registered' : 'unregistered';
}
export const ZERO_RATE_CATEGORIES = [
  { value: 'nil', label: 'Nil-rated' }, { value: 'exempt', label: 'Exempt' }, { value: 'non_gst', label: 'Non-GST' },
];

/** Input tax credit on a purchase (GSTR-3B Table 4). Mirrors invoice.models.ITC_CHOICES. */
export const ITC_OPTIONS = [
  { value: 'eligible', label: 'Claim credit' }, { value: 'blocked', label: 'Blocked (s.17(5))' },
  { value: 'reversal', label: 'Not yet' },
];

/** A bill line's GST rate as a number, or null when its GST cell is empty or missing. */
export function lineGstRate(properties, columns) {
  const col = (columns || []).find((c) => isGstColumn(c.input_title));
  if (!col) return null;
  const raw = (properties || []).find((p) => +p.new_product_in_frontend?.id === +col.id)?.value;
  return raw === undefined || raw === null || String(raw).trim() === '' || isNaN(raw) ? null : Number(raw);
}

/** What to save as a line's tax_category: only a 0% line can be nil-rated / exempt / non-GST. */
export function lineTaxCategory(line, columns) {
  const zero = lineGstRate(line?.product_properties, columns) === 0;
  const chosen = line?.tax_category;
  return zero && chosen && chosen !== 'taxable' ? chosen : 'taxable';
}

/** A GST-treatment <select> for party forms; overseas also moves the party to state 96. */
export function treatmentChange(form, value) {
  return { ...form, gst_treatment: value, ...(value === 'overseas' ? { state: 'Other Countries', state_code: 96 } : {}) };
}
