# Test Case Report — Document Templates Table Header: Strict Template Color Parity

**Date:** 2026-11-15  
**Module:** Invoicing & Commercial Documents → Document Templates (`/finance/templates`)  
**Files Modified:**
- `frontend/assets/global-themed-controls.js`
- `frontend/test/test-templates-page.mjs`

**Test Suite:**
- Frontend Headless Chrome E2E: `frontend/test/test-templates-page.mjs` (`node frontend/test/test-templates-page.mjs`)

**Visual Artifacts Captured:**
- `test-reports/template_pink_header_fixed.png` (Live Preview showing the pink `#db2777` swatch active and the line items table header correctly painted in matching pink `rgb(219, 39, 119)`, completely free of the CRM theme primary color)

---

## 1. Problem Statement & Root Cause

### 1.1 Reported Issue
In the Document Templates preview screen (`/finance/templates`), when previewing templates (e.g. Classic Corporate or Crimson Creative) or choosing custom template color swatches (e.g., Pink `#db2777`), the line items table header (`NO. | DELIVERABLE DESCRIPTION | RATE (₹) | QTY | HSN/SAC | TOTAL (₹)`) was erroneously painted in the purple CRM theme color (`#7627c4` / `rgb(118, 39, 196)`) instead of the template's designated color palette.

### 1.2 Root Cause
In commit `7a7bd28`, a global table header theming engine was introduced in `frontend/assets/global-themed-controls.js`:
```javascript
var R5 = ':root:root:root:root:root ';
var TH_CSS =
  R5 + 'th,' +
  R5 + 'thead th,' + ... {
  background: var(--primary) !important;
  color: var(--primary-contrast, var(--on-primary, #ffffff)) !important;
}
```
Because the CSS selector included bare `th` and `thead th` with high specificity (`:root:root:root:root:root`) and `!important`, it matched and overrode table headers across the entire DOM, including the document template preview sheets (`.spec-sheet`, `[data-spec-sheet]`, `[data-spec-items]`), stripping away the template's inline background color (`vis.thBg`).

---

## 2. Solution & Implementation

### 2.1 CSS Exclusion for Document Templates
Updated `frontend/assets/global-themed-controls.js` to explicitly exclude all document templates, invoice/quotation sheets, preview stages, and printable sheets:

```javascript
var R5 = ':root:root:root:root:root ';
var NOT_TMPL = ':not([data-spec-sheet] *):not(.spec-sheet *):not([data-spec-items] *):not([data-spec-items]):not(.tmpl-preview *):not(.inv-editor__sheet *):not(#printable-invoice-doc *)';

var TH_CSS =
  R5 + 'th' + NOT_TMPL + ',' +
  R5 + 'thead th' + NOT_TMPL + ',' +
  R5 + '.table th' + NOT_TMPL + ',' +
  R5 + '.ivb-table th' + NOT_TMPL + '{' +
  'background: var(--primary) !important;' +
  'color: var(--primary-contrast, var(--on-primary, #ffffff)) !important;' +
  'border-bottom-color: transparent !important;' +
  '}' +
  R5 + 'th' + NOT_TMPL + ' .ico,' +
  R5 + 'thead th' + NOT_TMPL + ' .ico{' +
  'color: var(--primary-contrast, var(--on-primary, #ffffff));' +
  '}';
```

### 2.2 Template Palette Fidelity
With this exclusion in place:
1. **Classic Corporate**: Uses its native statutory indigo header (`#4d33b6` / `rgb(77, 51, 182)`).
2. **Crimson Creative**: Uses its geometric crimson red header (`#e5252a` / `rgb(229, 37, 42)`).
3. **Color Swatch Customization**: Selecting any palette swatch (e.g. Pink `#db2777`, Teal `#0891b2`, Amber `#d97706`) instantly updates the line items table header to that exact color (`vis.thBg`).
4. **CRM Independence**: Changing the CRM system theme (light/dark/custom colors) no longer pollutes or affects the statutory document template rendering.

---

## 3. Automated Verification Results

Running `node frontend/test/test-templates-page.mjs`:
```
[TEST-RUNNER] server on http://localhost:8098
--- TEMPLATE SELECTION PAGE (THEME UI/UX + DISTINCT TEMPLATES) ---

=== 1. MOUNT + TOP CONTAINER ===
  ✓ [PASS] Page renders inside the CRM app shell (sidebar present)
  ✓ [PASS] Breadcrumb reads "Invoice / Templates"
  ✓ [PASS] Exactly ONE page-header container renders (got 1 - no duplicated header)
  ✓ [PASS] Kind-toggle button lives in the top container
  ✓ [PASS] Set-as-Default button lives in the top container

=== 2. TEMPLATE GALLERY ===
  ✓ [PASS] Gallery renders 2 selectable templates (got 2)
  ✓ [PASS] Cards: Classic Corporate, Crimson Creative (Settlement Fintech removed from the library)
  ✓ [PASS] Default selection is Classic Corporate

=== 3. TWO DISTINCT TEMPLATES ===
  ✓ [PASS] Classic renders its dark-band header (slashes + logo box)
  ✓ [PASS] Classic: indigo line-items header (rgb(77, 51, 182))
  ✓ [PASS] Classic: pink swatch renders template header in pink rgb(219, 39, 119) (rgb(219, 39, 119))
  ✓ [PASS] Classic: reset returns header to indigo (rgb(77, 51, 182))
  ✓ [PASS] Crimson Creative renders a distinct geometric header
  ✓ [PASS] Crimson Creative: crimson red line-items header (rgb(229, 37, 42))
  ✓ [PASS] Crimson Creative: white footer band (rgb(255, 255, 255))
  ✓ [PASS] Settlement Fintech card is no longer in the library
  ✓ [PASS] Each template has its own line-items header design (rgb(77, 51, 182) / rgb(229, 37, 42))

=== 4. INVOICE <-> QUOTATION ===
  ✓ [PASS] Toggling kind swaps the sheet to Quotation (quotation)
  ✓ [PASS] Quotation sheet shows quotation header
  ✓ [PASS] Toggle back returns to invoice sheet (invoice)

=== 5. SPEC SHEET FIDELITY ===
  ✓ [PASS] Sheet shows the Billed-To panel
  ✓ [PASS] Sheet shows the Issuer panel
  ✓ [PASS] Dedicated GST and PAN rows rendered
  ✓ [PASS] Scan-to-Pay UPI QR present
  ✓ [PASS] FOR AEDENTEK signature block present
  ✓ [PASS] Bank & Wire remittance tray present
  ✓ [PASS] A4 sheet fluid within panel, never > 794px (752px)

=== 6. THEME (LIGHT) ===
  ✓ [PASS] Light: card surface light (rgb(255, 255, 255))

=== 7. THEME (DARK) ===
  ✓ [PASS] Dark: card surface re-themes (rgb(255, 255, 255) -> rgb(21, 26, 34))
  ✓ [PASS] Dark: A4 sheet stays print-crisp white
  ✓ [PASS] Dark: line-items header stays indigo regardless of app theme

=== 8. SET AS DEFAULT ===
  ✓ [PASS] Set as Default persists the chosen template ({"kind":"invoice","selected":"retail","byKind":{"invoice":"retail"}})

=== 9. CONSOLE AUDIT ===
  ✓ [PASS] Zero uncaught console errors (count 0: [])
  ✓ screenshots: templates_page_light/dark.png

===========================================
TEMPLATE PAGE UI/UX TEST RESULT: 33 passed, 0 failed
===========================================
```
