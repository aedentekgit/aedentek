# Test Case Report: Template Live Preview Dummy Values Fix

**Target Component:** Document Templates Preview (`Classic Corporate`, `Retail`, `Fintech`)
**Target File:** [`frontend/assets/finance-DfxZzuIj.js`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js)
**Verification Suites:** [`frontend/test/test-templates-page.mjs`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test/test-templates-page.mjs) (33 passed, 0 failed)

---

## 1. Problem Statement & Root Cause

In the user's report screenshot (`media_1794739135229_403b1530.jpg`), the Document Templates preview under `LIVE PREVIEW · Classic Corporate · Quotation` exhibited three hardcoded static dummy values even when the CRM had no bank or signature configured in Settings:

1. **Account Type:** Showed hardcoded `Current Account` while every other bank field showed `—`.
   - *Cause:* `bank.accountType || 'Current Account'` defaulted to `'Current Account'` instead of checking whether a type was configured.
2. **Mock QR Code Image:** Rendered a dummy static QR image (`/assets/spec-qr-code.png`) with "SCAN TO PAY".
   - *Cause:* Unconfigured templates fell back to loading a mock graphic instead of rendering a clean neutral dashed placeholder.
3. **Mock Signature Image:** Rendered a dummy cursive signature of "T. Smith" (`/assets/spec-signature.png`) above `—` / `Authorised Signatory`.
   - *Cause:* Static image `/assets/spec-signature.png` was hardcoded as the default signature instead of checking `invoice.signatorySeal` or `doc.signatorySeal`.

---

## 2. Changes Applied

### A. Dynamic Bank Account Type Handling
- In [`SpecSettlementRow`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js#L4387):
  ```javascript
  ['Account Type', bank.accountType ? (bank.accountType === 'Current' ? 'Current Account' : bank.accountType === 'Savings' ? 'Savings Account' : bank.accountType) : '—', false, false, true]
  ```
  - When bank details are not configured in Settings, `Account Type` now cleanly displays `—`, perfectly consistent with all other remittance coordinates (`Bank Name`, `Account Name`, `Account No`, etc.).

### B. Clean Neutral QR Code Placeholder
- In [`SpecSettlementRow`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js#L4412-L4434) and [`FintechInvoiceSheet`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js#L5174):
  - Checks if user configured an uploaded QR code (`bank.qrCode`), or a valid UPI ID (`bank.upiId` via dynamic SVG `SpecQr`).
  - If neither is configured, renders a clean neutral dashed QR placeholder with `data-spec-qr="true"` and an SVG icon, eliminating the misleading mock QR graphic.

### C. Clean Neutral Signature Block
- In [`SpecSettlementRow`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js#L4439-L4447), [`RetailInvoiceSheet`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js#L4984), and [`FintechInvoiceSheet`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js#L5223):
  - Checks if user configured an uploaded signature stamp/seal (`invoice.signatorySeal` / `doc.signatorySeal`).
  - If not configured, renders a clean neutral `SIGNATURE` dashed pill placeholder with `data-spec-signature="true"`, completely removing the hardcoded "T. Smith" graphic.
- In [`TemplateSelectionView`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/finance-DfxZzuIj.js#L5427):
  - Passed `signatorySeal: sndr.signatorySeal || ''` to ensure user-uploaded seals from Settings seamlessly show in the preview.

---

## 3. Verification & Results

- **Automated Puppeteer Suite:** `node frontend/test/test-templates-page.mjs`
  - **Result:** **33 passed, 0 failed** (zero console errors).
- **DOM Inspection of Settlement Tray:**
  ```json
  {
    "template": "classic",
    "rows": [
      "Bank Name : —",
      "Account Name : —",
      "Account Type : —",
      "Account No : —",
      "IFSC / RTGS : —",
      "Branch : —",
      "UPI ID : —",
      "Branch Address : —"
    ],
    "qrTag": "DIV",
    "qrSrc": null,
    "qrText": "QR CODE",
    "sigTag": "DIV",
    "sigSrc": null,
    "sigText": "SIGNATURE"
  }
  ```
- **Visual Evidence:**
  - Settlement tray preview: [`settlement_quotation_fixed.png`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/settlement_quotation_fixed.png)
  - Full template page preview: [`templates_page_quotation_fixed.png`](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/templates_page_quotation_fixed.png)
