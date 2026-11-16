# Test Case Report — Classic Corporate Quotation: Signature Dark Header UI/UX Parity

**Date:** 2026-11-15  
**Module:** Invoicing & Commercial Documents → Document Templates (`/finance/templates`)  
**Files Modified:**
- `frontend/assets/finance-DfxZzuIj.js`

**Test Suite:**
- Frontend Headless Chrome E2E: `frontend/test/test-templates-page.mjs` (`node frontend/test/test-templates-page.mjs`)

**Visual Artifacts Captured:**
- `test-reports/quotation_dark_header_fixed.png` (Live Preview showing the Classic Corporate Quotation with the complete signature UI/UX header: dark band, white logo box, cyan slash, and dynamic accent slash matching the chosen swatch)

---

## 1. Problem Statement & Root Cause

### 1.1 Reported Issue
In the Document Templates preview screen (`/finance/templates`), when previewing **Classic Corporate** in Quotation mode, the document header was missing its signature UI/UX design (the dark angled header with white logo box, cyan slash, and accent slash as shown on the library card thumbnail). Instead, only a thin plain red border (`borderTop: 6px solid ...`) was being displayed.

### 1.2 Root Cause
In `frontend/assets/finance-DfxZzuIj.js`:
```javascript
const TMPL_VIS = {
  classic: {
    id: 'classic',
    name: 'Classic Corporate',
    tag: 'Invoice - A4',
    accent: SPEC.indigo,
    kind: 'invoice',
    headerVariant: 'dark',
    quoteHeaderVariant: 'light', // <-- Root cause: set to 'light' for quotations
...
```
Because `quoteHeaderVariant` was set to `'light'`, when toggling to Quotation mode, `resolveVis('classic', 'quotation')` switched the header variant to `'light'`, rendering the fallback 6px top line instead of the iconic dark header with logo box and diagonal slashes.

---

## 2. Solution & Implementation

Updated `quoteHeaderVariant` to `'dark'` in both `TMPL_VIS.classic` and `VIS_FALLBACK` in [finance-DfxZzuIj.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js):

```javascript
const TMPL_VIS = {
  classic: {
    id: 'classic',
    name: 'Classic Corporate',
    tag: 'Invoice - A4',
    accent: SPEC.indigo,
    kind: 'invoice',
    headerVariant: 'dark',
    quoteHeaderVariant: 'dark', // <-- Fixed: preserves signature dark header for quotations
...
```

Now, both Tax Invoices and Commercial Quotations under Classic Corporate render the complete flagship statutory layout:
1. **Dark Geometric Polygon** (`fill: '#0b1120'`) on the left with the elevated white logo box (`SpecLogo`).
2. **Cyan Accent Slash** (`fill: '#00d2ff'`).
3. **Dynamic Template Accent Slash** (`fill: tc('#4d33b6')`) that dynamically updates with any chosen color swatch.
4. **Quotation Right Coordinates**: Large `QUOTATION` title, `COMMERCIAL QUOTATION` pill, and metadata.

---

## 3. Verification

1. **Automated E2E Suite**: `node frontend/test/test-templates-page.mjs` passed **33 / 33 tests (0 failed)**.
2. **Visual Proof**: Captured screenshot in `test-reports/quotation_dark_header_fixed.png` verifies the full dark header layout in Quotation mode with the active color swatch.
