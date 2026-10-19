# Invoice Orvine design system

The visual language of the web app (`bill_makeing_sof`). Use this when you build or restyle any page so the whole site looks like one product.

Every value below is taken from code that already ships (`src/style/navbar.css`, `src/style/Companys.css`, `src/index.css`, `src/comonant/history.jsx`, and the Customers page). Where something is a recommendation rather than current practice, it says so.

Contents: [Principles](#1-principles) · [Color](#2-color) · [Typography](#3-typography) · [Shape, spacing, shadow](#4-shape-spacing-and-shadow) · [Layout](#5-layout-and-breakpoints) · [Components](#6-components) · [States](#7-states) · [Motion](#8-motion) · [Icons](#9-icons) · [Writing](#10-writing) · [Legacy to retire](#11-legacy-styles-to-retire) · [Token sheet](#12-copy-paste-token-sheet) · [Checklist](#13-new-page-checklist)

---

## 1. Principles

1. **One accent.** Indigo to violet (`#4f46e5` → `#7c3aed`) is the brand. It marks the single most important action on a screen and nothing else.
2. **Quiet surfaces.** Pages are near-white slate (`#f8fafc`) with white cards. Color is for meaning (status, money owed, actions), not decoration.
3. **Dark sidebar, light content.** Navigation is deep indigo (`#1e1b4b`). Content is always light.
4. **Soft and rounded.** Generous radii (10 to 22px), soft indigo-tinted shadows, no hard borders heavier than 1.5px.
5. **Numbers are the content.** Money and counts are bold, right-aligned in tables, and never clipped. Use compact forms (`₹5.28 L`, `₹70.4 Cr`) in lists and the exact figure in detail views.

---

## 2. Color

### Brand

| Role | Value | Use |
| --- | --- | --- |
| Brand indigo | `#4f46e5` | Gradient start, focus ring, links, active chip text border |
| Brand violet | `#7c3aed` | Gradient end |
| Brand gradient | `linear-gradient(135deg, #4f46e5, #7c3aed)` | Primary buttons, icon tiles, large avatars |
| Brand dark | `#4338ca` | Text on indigo tints, secondary button text |
| Brand deeper | `#312e81` | Gradient headers, print/PDF headers |

### Indigo tints (selection and secondary surfaces)

| Value | Use |
| --- | --- |
| `#eef2ff` | Secondary button fill, selected row, active chip |
| `#e0e7ff` | Hover on the above |
| `#c7d2fe` | Border on the above, light focus borders |
| `#f5f3ff` | Menu item hover |

### Neutrals (slate)

| Value | Use |
| --- | --- |
| `#0f172a` | Primary text, headings, large numbers |
| `#1e293b` | Dark button hover |
| `#334155` | Labels |
| `#475569` | Secondary text, table headers |
| `#64748b` | Muted text, captions, helper text |
| `#94a3b8` | Placeholders, faint icons |
| `#cbd5e1` | Strong borders, disabled outlines |
| `#e2e8f0` | Default borders and dividers |
| `#f1f5f9` | Row dividers, subtle fills |
| `#f8fafc` | **Page background**, input fill, KPI tile fill |
| `#ffffff` | Cards, popups, focused inputs |

### Sidebar

| Value | Use |
| --- | --- |
| `#1e1b4b` | Sidebar background |
| `rgba(255,255,255,0.7)` | Nav text; `white` on hover and active |
| `rgba(255,255,255,0.4)` | Section titles ("MAIN MENU") |
| `rgba(255,255,255,0.08)` | Nav hover |
| `rgba(79,70,229,0.4)` | Active nav item |
| `rgba(239,68,68,0.15)` | Danger hover (logout) |

### Semantic

| Meaning | Text | Fill | Border |
| --- | --- | --- | --- |
| Danger / owed | `#dc2626` (strong: `#b91c1c`, `#991b1b`) | `#fef2f2`, `#fee2e2` | `#fecaca`, `#fca5a5` |
| Danger button | gradient `#ef4444` → `#dc2626` | | |
| Success / paid | `#166534` (also `#16a34a`) | `#dcfce7` | |
| Warning / partial | `#b45309` (also `#92400e`) | `#fef3c7` | |
| Overdue | `#9f1239` | `#fecdd3` | |

### Money colors

Outstanding balance uses one rule everywhere (`owedColor` in the Customers page):

- Owed (positive): `#dc2626`
- Overpaid (negative): `#16a34a`
- Zero: `#0f172a`

### Payment status badges

From `src/comonant/history.jsx`. Reuse these exact pairs for any invoice status.

| Status | Label | Background | Text |
| --- | --- | --- | --- |
| `unpaid` | Unpaid | `#eef2ff` | `#4338ca` |
| `partially_paid` | Partial | `#fef3c7` | `#b45309` |
| `paid` | Paid | `#dcfce7` | `#166534` |
| `overdue` | Overdue | `#fecdd3` | `#9f1239` |

Unpaid uses the neutral indigo tint so red stays reserved for overdue. "Overdue" is derived on the server: the explicit `overdue` status, or any open invoice older than `INVOICE_OVERDUE_AFTER_DAYS` (30 by default). A bill can therefore be overdue while its stored status still says unpaid, so list rows use `is_overdue` before `payment_status`.

### Avatars (initials)

One color for every person, so lists stay calm and on-theme: `#eef2ff` fill, `1px #c7d2fe` border, `#4338ca` text. On a selected row (also `#eef2ff`) the avatar fill flips to white. Large avatars (detail headers) use the brand gradient with white text. Initials are the first letters of the first two words that start with a letter or digit, so "Patel & Sons" is "PS".

--- | --- |
| `#eef2ff` | `#4338ca` |
| `#dcfce7` | `#166534` |
| `#fef3c7` | `#92400e` |
| `#fce7f3` | `#9d174d` |

Large avatars (detail headers) use the brand gradient with white text.

---

## 3. Typography

- **Font:** Inter, with `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` fallback. Already set on `body` in `src/index.css`. Smoothing is on (`-webkit-font-smoothing: antialiased`).
- **Weights:** 400 body, 500 to 600 emphasis, 700 headings and buttons, 800 only for large figures and legacy titles. Prefer 700 for page titles.
- **Numerals:** use `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` so amounts group as lakh and crore (`₹1,94,903.22`). Don't use `toFixed` for display.

| Style | Size / weight | Color | Where |
| --- | --- | --- | --- |
| Page title | 22px / 700, letter-spacing -0.01em | `#0f172a` | `h1` beside the icon tile (19px on phones) |
| Page subtitle | 13px / 400 | `#64748b` | Under the title |
| Panel title | 18px / 800 | `#0f172a` | Detail panel, popup titles |
| Big number | 20px / 800 | `#0f172a` or money color | KPI tiles |
| Body | 14px / 400 to 500 | `#0f172a` | Default |
| Row name | 14px / 600 | `#0f172a` | List rows |
| Label | 13px / 600 | `#64748b` | Form and filter labels |
| Caption | 12px / 400 to 600 | `#64748b` | Row subtext, KPI labels |
| Section title | 11px / 700, uppercase, +0.05em | muted | Sidebar groups only |

Inputs must be **16px on phones**. Smaller sizes make iOS Safari zoom the page on focus (see the media query in `Companys.css`).

---

## 4. Shape, spacing, and shadow

### Radius

| Value | Use |
| --- | --- |
| 8px | Small tiles, logo |
| 10px | Inputs in popups, nav items, small buttons |
| 12px | Buttons, search field, icon tiles, KPI tiles |
| 14px | Dropdown menus |
| 16px | Content cards and the list/detail card |
| 20px | Filter card |
| 22px | Modal popups |
| 999px | Chips, pills |

### Spacing

Use a 4px base: 4, 8, 12, 16, 20, 24, 28. Page gutters are 24px (12 to 16px on phones). Gaps between buttons are 10 to 12px. List rows pad 12px × 16px.

### Shadow

| Token | Value | Use |
| --- | --- | --- |
| Card | `0 2px 16px rgba(0,0,0,0.06)` | Tables and list/detail cards |
| Soft card | `0 4px 20px rgba(0,0,0,0.04)` | Filter card |
| Brand glow | `0 4px 14px rgba(79,70,229,0.3)` | Primary buttons |
| Brand glow, hover | `0 8px 20px rgba(79,70,229,0.4)` | Primary button hover (with `translateY(-1px)`) |
| Icon tile | `0 4px 14px rgba(79,70,229,0.25)` | Gradient tiles and avatars |
| Danger glow | `0 4px 14px rgba(239,68,68,0.28)` | Danger gradient button |
| Menu | `0 12px 40px rgba(0,0,0,0.12)` | Dropdowns |
| Modal | `0 24px 64px rgba(0,0,0,0.2)` over `rgba(15,23,42,0.55)` + `blur(4px)` | Popups |
| Focus ring | `0 0 0 3px rgba(79,70,229,0.12)` with border `#4f46e5` | Focused inputs |

---

## 5. Layout and breakpoints

- **Breakpoint:** `767px` is the one that matters. Below it the sidebar becomes a bottom bar plus overlay, filters stack, and master/detail layouts collapse to a single column. Tailwind's `md` (768px) lines up with it.
- **Sidebar:** 250px expanded, 70px collapsed, header 70px tall. The page body gets a matching `margin-left` (250px or 70px, 0 on phones).
- **Content width:** pages sit in a container with `max-width: 1280px`, centered.
- **Page header:** icon tile + title/subtitle on the left, primary action on the right. On phones the action drops to its own full-width row.
- **Master/detail:** `grid-template-columns: minmax(300px, 420px) minmax(0, 1fr)` inside one 16px-radius card. The detail panel is sticky. On phones the detail becomes a full-screen sheet opened by tapping a row, with a "← All customers" back link.
- **Always** `minmax(0, 1fr)` in grids that hold long text, and `overflow-wrap: anywhere` on values such as GST numbers and addresses.

---

## 6. Components

Class names here exist in `src/style/Companys.css`. The tokens are what matter; reuse the class if the page can import it, otherwise copy the values.

### Buttons

| Variant | Look | Class |
| --- | --- | --- |
| Primary | Brand gradient, white text, 700 / 14px, radius 12, brand glow, lifts 1px on hover | `.button` inside `.head_actions` / `.button-div`, or `.cust_btn.primary` |
| Secondary | `#eef2ff` fill, `#c7d2fe` border, `#4338ca` text, radius 12, height 40 | `.cust_btn` |
| Danger | Red gradient `#ef4444` → `#dc2626`, white text | `.button.delete` |
| Danger, quiet | `#fef2f2` fill, `#fecaca` border, `#dc2626` text | `.cust_btn.danger` (icon-only, 34px square) |
| Chip | Pill, `#e2e8f0` border, `#475569` text; selected: `#eef2ff` / `#c7d2fe` / `#4338ca` | `.cust_chip` / `.cust_chip.on` |

Rules:

- **One primary per screen.** Everything else is secondary.
- Heights: 44 primary in a panel, 40 secondary, 34 in headers.
- Put an icon (15 to 16px, 8px gap) before the label when it helps scanning.
- Destructive actions live in the header next to Edit as a quiet icon button, always behind a confirm.

> The global `.button` in `root.css` is navy (`#071952`) with a 1.3rem font. It does **not** match this system. Any page using bare `.button` must override it (see [Legacy](#11-legacy-styles-to-retire)).

**Class names are global.** Vite loads every page's stylesheet into one namespace, so two files that both define `.header-button .button` (as `history.css` and `Companys.css` do, next to `root.css`'s `.button`) fight at equal specificity, and the later-loaded file wins property by property. The result is half-overridden buttons, such as white text on a pale fill, that change with import order and hot reload.

- Give every page's own components a page prefix: `bill-btn`, `bill-actions`, `bill-summary`. Don't create or restyle bare `.button`, `.header-button`, `.table`, `.container` or `.total` for a single page.
- Never style `td:nth-child(n)` or `td:first-child` outside a page-scoped selector. `history.css` colours the 1st and 4th cell of every `.table`, and `Companys.css` the 2nd.
- Reusing a shared class (`.button`, `.cust_btn`) is fine only if you don't override it. If you need a different look, use a prefixed class instead.
- The bill editor follows this: `.bill-btn` (secondary), `.bill-btn-danger`, `.bill-btn-add`, in `src/style/bill.css`.

### Inputs

- Fill `#f8fafc`, border `1.5px solid #e2e8f0`, radius 10 (popup fields) or 12 (search), font 14px / 600, color `#0f172a`.
- Focus: border `#4f46e5`, ring `0 0 0 3px rgba(79,70,229,0.12)`, fill white.
- Labels sit above the field: 12 to 13px / 700 (popups) or 600 (filters), `#64748b`.
- Search fields carry a 18px magnifier on the left (padding-left 40px) and a placeholder that says what is searchable.

### Cards

White, radius 16 to 20, card shadow, no border. Lists and tables sit inside one card, with `#f1f5f9` row dividers and `#e2e8f0` between panes.

### List row

Checkbox · 36px avatar · name (14/600) over subtext (12, muted) · right-aligned amount. Hover `#f8fafc`, selected `#eef2ff`.

### KPI tile

`#f8fafc` fill, radius 12, padding 12 × 14: 12px/600 muted label above a 20px/800 value.

### Key-value rows (detail facts)

Label left in `#64748b`, value right in `#0f172a` 600, 13px, `#f1f5f9` dividers, 9px vertical padding.

### Icon tile and avatar

- Page icon tile: 44px, radius 12, brand gradient, white 20px icon, icon-tile shadow.
- Avatar: circle, initials 13px / 700 (16px at 48px size).

### Modal

Centered card, radius 22, padding 32 × 28, width `min(580px, 92vw)`, max-height 90vh, scrolls inside. Header is a 38px gradient icon tile + title (18/800) + muted helper line. Close button top-right: 32px square, `#f1f5f9`, radius 8. Footer buttons right-aligned, 10px gap. Click on the backdrop closes it.

### Dropdown menu

White, `1.5px #e2e8f0` border, radius 14, menu shadow, padding 6. Items: 13px / 600, radius 10, hover `#f5f3ff` with `#4f46e5` text. Enter with the `dropIn` animation.

### Table (wide data)

Use only when users compare many columns. Header row is solid `#4f46e5`-family with white text in the legacy tables; the preferred direction is a light header (`#f8fafc`, 11px / 600 muted caps-free labels). Numbers right-aligned. Wrap in `overflow-x: auto` and set a `min-width`, so nothing is clipped. Prefer a list/detail layout over a table with more than 7 columns.

### Sidebar

- Background `#1e1b4b`, white text, items radius 10, padding 10 × 12, icon 20px in a 24px box, label 14/500.
- Active: `rgba(79,70,229,0.4)`, white, 600. Hover: `rgba(255,255,255,0.08)`.
- **Main menu** holds daily work (Dashboard, Invoices, Customers, Inventory, Reports, Purchases). **Settings** holds configuration (My Company, Templates, Access Control, Plan & Billing, WhatsApp). The account footer has avatar + name (opens Profile) and a logout button. Don't put Profile or Logout in the item list.
- Every icon in the menu must be unique.

---

## 7. States

| State | Treatment |
| --- | --- |
| Loading | Muted centered text ("Loading customers…") while the list is empty; keep old rows visible on refetch |
| Empty (no data yet) | White card, 64px indigo-tint circle with icon, 18/700 headline, 14 muted line, one primary button |
| Empty (filters match nothing) | Say what was searched, offer "Clear search and filters". Never show the first-run empty state here |
| Error | Banner: `#fef2f2` fill, `#fecaca` border, `#dc2626` text, dismiss ✕ on the right |
| Disabled | Avoid. Keep the control enabled and explain on click |
| Confirm | Browser `confirm()` for destructive actions: single delete, bulk delete |
| Partial failure | One summary message ("2 of 5 could not be deleted…"), one reload |

---

## 8. Motion

- Hover on primary buttons: `translateY(-1px)` + stronger glow, 150ms.
- Color/background transitions: 150 to 200ms.
- Sidebar width and body margin: 300ms ease.
- Popup in: `popIn` (opacity 0, scale .95, 8px down → rest), 200ms.
- Menu in: `dropIn` (6px up, scale .96), 180ms.
- Respect `prefers-reduced-motion` on any new animation.

---

## 9. Icons

- Library: **lucide-react** (already used by the sidebar and Customers page). Don't mix icon sets.
- Sizes: 20px nav and page tiles, 16px inside buttons, 14 to 15px in small buttons and menus. Stroke is the default (2).
- Icon-only buttons need `aria-label` and a `title`.

---

## 10. Writing

- Sentence case for buttons, headings, tabs and labels: "New invoice", "Delete customer".
- Buttons start with a verb, 1 to 3 words.
- Empty states invite an action ("Add your first customer"); errors say what happened and what to do.
- Placeholders show real input: "Search by name, GST number or phone…".
- Use ₹ with Indian grouping everywhere.

---

## 11. Legacy styles to retire

These still exist and clash with the system. Don't copy them into new work; migrate them when you touch the page.

| Where | What | Replace with |
| --- | --- | --- |
| `src/style/root.css` `:root` and `body` | Teal gradient background (`#75FFE8` → `#35A29F`, `#C5FCF3` → `#91FEEC`) and `--primary-color-1…6` teal variables | `body` background `#f8fafc` (already set in `index.css`) and the tokens in section 12 |
| `src/style/root.css` `.button` | Navy `#071952`, `font-size: 1.3rem`, `border-radius: 0.8vw` (a viewport-relative radius) | Primary button spec above |
| `src/style/root.css` `.button-line` | Navy outline button sized in `vw` | Secondary button spec |
| `tailwind.config.js` `buttonBlue: '#071952'` | Navy brand color | Brand gradient / `#4f46e5` |
| `history.css` and `Companys.css` unscoped `.header-button .button`, `.button-div .button`, `.table tbody td:nth-child(n)` | Page-specific styles registered globally; they leak onto the bill editor and any other page that reuses the class names | Page-prefixed classes (see Buttons, "Class names are global") |
| `Urbanist` and `Poppins` font imports in `root.css` | Extra fonts nobody should use | Inter only |
| Table headers painted solid purple | Heavy, wide, clips on laptops | Light header, or list/detail layout |
| Inline `style={{…}}` color literals repeated across pages | Hard to restyle | CSS variables from section 12 |

---

## 12. Copy-paste token sheet

This is **not yet imported anywhere**. It is the proposed single source of truth. To adopt it, save it as `src/style/tokens.css`, import it once in `src/index.css`, and then replace literals with `var(--…)` as pages are touched.

```css
:root {
  /* brand */
  --brand-indigo: #4f46e5;
  --brand-violet: #7c3aed;
  --brand-dark: #4338ca;
  --brand-deeper: #312e81;
  --brand-gradient: linear-gradient(135deg, #4f46e5, #7c3aed);

  /* indigo tints */
  --tint-50: #f5f3ff;
  --tint-100: #eef2ff;
  --tint-200: #e0e7ff;
  --tint-300: #c7d2fe;

  /* neutrals */
  --text: #0f172a;
  --text-label: #334155;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-faint: #94a3b8;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --divider: #f1f5f9;
  --page-bg: #f8fafc;
  --surface: #ffffff;

  /* sidebar */
  --sidebar-bg: #1e1b4b;
  --sidebar-text: rgba(255, 255, 255, 0.7);
  --sidebar-muted: rgba(255, 255, 255, 0.4);
  --sidebar-hover: rgba(255, 255, 255, 0.08);
  --sidebar-active: rgba(79, 70, 229, 0.4);

  /* semantic */
  --danger: #dc2626;
  --danger-strong: #b91c1c;
  --danger-bg: #fef2f2;
  --danger-bg-hover: #fee2e2;
  --danger-border: #fecaca;
  --danger-gradient: linear-gradient(135deg, #ef4444, #dc2626);
  --success: #166534;
  --success-bg: #dcfce7;
  --success-money: #16a34a;
  --warning: #b45309;
  --warning-bg: #fef3c7;
  --overdue: #9f1239;
  --overdue-bg: #fecdd3;

  /* shape */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-menu: 14px;
  --radius-card: 16px;
  --radius-panel: 20px;
  --radius-modal: 22px;
  --radius-pill: 999px;

  /* shadow */
  --shadow-card: 0 2px 16px rgba(0, 0, 0, 0.06);
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.04);
  --shadow-brand: 0 4px 14px rgba(79, 70, 229, 0.3);
  --shadow-brand-hover: 0 8px 20px rgba(79, 70, 229, 0.4);
  --shadow-menu: 0 12px 40px rgba(0, 0, 0, 0.12);
  --shadow-modal: 0 24px 64px rgba(0, 0, 0, 0.2);
  --focus-ring: 0 0 0 3px rgba(79, 70, 229, 0.12);

  /* type */
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

Ready-made primary and secondary buttons using the tokens:

```css
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 44px; padding: 0 18px; border: 0; border-radius: var(--radius-lg);
  background: var(--brand-gradient); color: #fff;
  font: 700 14px var(--font); cursor: pointer; white-space: nowrap;
  box-shadow: var(--shadow-brand);
  transition: transform .15s, box-shadow .15s;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: var(--shadow-brand-hover); }

.btn-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 16px; border-radius: var(--radius-lg);
  border: 1px solid var(--tint-300); background: var(--tint-100); color: var(--brand-dark);
  font: 700 14px var(--font); cursor: pointer; white-space: nowrap;
  transition: background .15s;
}
.btn-secondary:hover { background: var(--tint-200); }
```

---

## 13. New page checklist

- [ ] Page background `#f8fafc`; content in white cards (radius 16+, card shadow).
- [ ] Header: gradient icon tile, 22/700 title, 13px muted subtitle, one primary button on the right.
- [ ] Exactly one primary (gradient) button per screen; the rest secondary.
- [ ] Page CSS uses a page prefix for its own classes; no new bare `.button`, `.header-button`, `.table` or `td:nth-child` rules.
- [ ] Inter only; money formatted with `en-IN`; amounts right-aligned or in KPI tiles.
- [ ] Status shown with the shared badge colors; owed money in `#dc2626`.
- [ ] Loading, empty, filtered-empty and error states all designed.
- [ ] Works at 375px: filters stack, inputs 16px, actions full width, no sideways scroll.
- [ ] Destructive actions confirmed; icon-only buttons labelled.
- [ ] No new hard-coded colors outside this file's palette.
