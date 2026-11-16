# Test Case Verification Report: Calendar Alignment & Control Exclusion Fix

**Date:** November 16, 2026  
**Route Tested:** [`/calendar`](http://localhost:1234/calendar)  
**Status:** PASS (100% Green - 15/15 Assertions Passed)  
**Evidence Artifacts:**
- Root Report Screenshot: [calendar_alignment_fixed.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/calendar_alignment_fixed.png)
- Frontend Report Screenshot: [calendar_alignment_fixed.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test-reports/calendar_alignment_fixed.png)

---

## Executive Summary

On the `/calendar` (Reach > Calendar) route, calendar task chips (`.ca-chip`), expand buttons (`.ca-more`), day cells (`.ca-cell`), and completion toggle checkboxes (`.check`) were erroneously being transformed into circular 34x34px action buttons (`.tl-act`) by `enhanceActionButtons()` in `global-themed-controls.js`. Because task descriptions and labels naturally contain action keywords such as `"mail"`, `"email"`, `"send"`, `"view"`, `"review"`, or `"visit"`, the global action enhancer mistook them for tabular row action buttons. This resulted in broken layouts, displaced task times, truncated titles, and circular 50% border-radius distortions.

With this fix, strict calendar scope exclusions have been applied to `global-themed-controls.js` (including regex pattern matching, container check via `isCalendarElement()`, and active cleanup of any errant classes). In addition, `calendar-BbPXLijb.css` was enhanced to guarantee full-width pill alignment, crisp subpixel boundary alignment for `+N more` buttons, and defensive CSS overrides preventing any action-button styling within calendar containers.

---

## Root Cause Analysis & Solution

1. **Root Cause:**
   - `enhanceActionButtons()` in `frontend/assets/global-themed-controls.js` queried generic `button, a.ibtn, a.btn` without excluding `.ca-*` elements.
   - `globalActKind()` inspected button title, aria-label, and text for substrings like `send`, `view`, `mail`, `edit`, which matched legitimate calendar task names (e.g. *"Email client..."*, *"Send Daniela the final terrazzo contract"*, *"Vanity proposal review"*).
   - This converted calendar task pill chips into 34px round circular buttons (`tl-act`, `border-radius: 50%`) with displaced icons and hidden/mangled titles.
   - Calendar completion buttons (`.check`) were also matched when aria-label contained `"Mark 'Send...' done"`.

2. **Implemented Fix:**
   - **Exclusion Function:** Added `isCalendarElement(el)` in `frontend/assets/global-themed-controls.js` to match elements with `ca-` classes or nested inside `.ca-wrap, .ca-grid, .ca-cell, .ca-month, .ca-day, .ca-ag, .ca-row, .ca-list`.
   - **Skip Regex:** Updated `CHIP_SKIP` regex to include `ca-\S*`.
   - **Action Kind Exclusion:** Updated `globalActKind(el)` to return `null` immediately for any calendar element.
   - **Active Sanitation:** `enhanceActionButtons()` now sweeps and strips any `.tl-act` or `data-tl-act` attributes from calendar elements.
   - **Cancel Enhancer:** Updated `enhanceCancelButtons()` to ignore calendar controls.
   - **CSS Enhancements (`calendar-BbPXLijb.css`):**
     - Reinforced `.ca-chip` to use full cell width (`width: 100%`, `box-sizing: border-box`, `border-radius: 7px`).
     - Aligned `.ca-more` button with `border-left: 3px solid transparent` so its text aligns on the exact subpixel horizontal axis as task chip icons above it.
     - Added defensive CSS rules: `.ca-wrap button.tl-act, .ca-chip.tl-act, .ca-cell button.tl-act { width: 100% !important; border-radius: 7px !important; }`.

---

## Test Results Matrix

| Test ID | Verification Category | Verification Check | Expected Result | Measured Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CAL-01** | Auth & Mount | Authenticate and mount `/calendar` | Transition to `/calendar` | `http://localhost:1234/calendar` | **PASS** |
| **TC-CAL-02** | Structure | Calendar wrapper `.ca-wrap` mounted | Present in DOM | Found | **PASS** |
| **TC-CAL-03** | Grid | Calendar grid `.ca-grid` with cells | ≥ 28 day cells mounted | 35 day cells found | **PASS** |
| **TC-CAL-04** | Task Chips | Task chips (`.ca-chip`) populated | > 0 task chips in active month | 22 task chips found | **PASS** |
| **TC-CAL-05** | Control Exclusion | `.tl-act` elements inside `.ca-wrap` | 0 elements | **0 elements** | **PASS** |
| **TC-CAL-06** | Chip Sanitation | `.ca-chip` with `.tl-act` or `data-tl-act` | 0 chips | **0 chips** | **PASS** |
| **TC-CAL-07** | More Sanitation | `.ca-more` with `.tl-act` or `data-tl-act` | 0 buttons | **0 buttons** | **PASS** |
| **TC-CAL-08** | Checkbox Sanitation| `.check` with `.tl-act` or `data-tl-act` | 0 checkboxes | **0 checkboxes** | **PASS** |
| **TC-CAL-09** | Geometry | Zero chips styled as 34x34 50% circular buttons | 0 circular chips | **0 circular chips** | **PASS** |
| **TC-CAL-10** | Pill Styling | Chips render with proper pill layout (`width > 50px`, `radius ~7px`) | 100% compliant pills | 22/22 chips compliant (width ~100.6px, height 22px, radius 7px) | **PASS** |
| **TC-CAL-11** | Layout Model | Chip uses flexbox alignment | `display: flex; align-items: center` | `display: flex, align-items: center` | **PASS** |
| **TC-CAL-12** | Leading Icon | Chip contains leading SVG icon | `hasIcon: true`, width > 0 | `hasIcon: true`, iconWidth = 11px | **PASS** |
| **TC-CAL-13** | Title Text | Chip contains title span | `hasSpan: true`, visible text | `hasSpan: true` (e.g. "Saltgrass bar tops...") | **PASS** |
| **TC-CAL-14** | Overflow Expand | `+N more` button styling | Clean text button, non-circular | `+1 more` button renders as pill-aligned text | **PASS** |
| **TC-CAL-15** | Visual Proof | Capture high-res screenshot evidence | PNG written to both report paths | 166KB PNG files generated | **PASS** |

---

## Detailed Chip Inspection Measurements

Sample measurements across diverse task types on `/calendar`:

| Task Title | Rendered Width | Rendered Height | Border Radius | Has Icon | Time Badge | Layout Style |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *Saltgrass bar tops delivery check* | 100.6px | 22.0px | `7px` | Yes (11px) | None | Pill chip |
| *Brownstone kitchens: send encaustic...* | 100.6px | 22.0px | `7px` | Yes (11px) | None | Pill chip (done) |
| *Send Daniela the final terrazzo contract* | 100.6px | 22.0px | `7px` | Yes (11px) | 11:30am | Pill chip |
| *Hale & Wren atrium mock-up review* | 100.6px | 22.0px | `7px` | Yes (11px) | 4:00pm | Pill chip |
| *Site visit: Harbour Row show home* | 100.6px | 22.0px | `7px` | Yes (11px) | 1:00pm | Pill chip |
| *Vanity proposal review with Daniela* | 100.6px | 22.0px | `7px` | Yes (11px) | 11:00am | Pill chip |
| *+1 more* expand button | 100.6px | 20.0px | N/A | No | None | Text button (aligned) |

---

## Visual Verification Artifacts

- **Report Screenshot (Root):** [calendar_alignment_fixed.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/calendar_alignment_fixed.png)
- **Report Screenshot (Frontend):** [calendar_alignment_fixed.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test-reports/calendar_alignment_fixed.png)

---

## Automated Test Script Execution

The automated verification suite can be re-run at any time using:
```bash
cd frontend && node test/test-calendar-alignment.mjs
```
