# Test Case Verification Report: Inbox Viewport Fixed Layout (No Outer Scrolling)

**Date:** November 15, 2026  
**Route Tested:** [`/inbox`](http://localhost:1234/inbox)  
**Status:** PASS (100% Green)

---

## Executive Summary

The `/inbox` (Reach > Inbox) view has been configured with a viewport-locked layout on desktop and tablet viewports (width ≥ 761px). The outer window and document scroll are locked to 0 (`window.scrollY === 0`, `scrollHeight === clientHeight`), eliminating outer page scrolling, while allowing the thread list (`.ib-threads`) and message feed (`.ib-msgs`) to scroll independently with the composer (`.ib-compose`) remaining pinned within the viewport.

---

## Key Changes Implemented

1. **Outer Viewport Locking (`signin-styles.css`):**
   - Locked `html:has(.page.ib)`, `body:has(.page.ib)` to `height: 100%`, `max-height: 100%`, `overflow: hidden !important`, `overscroll-behavior: none !important`.
   - Constrained `.app:has(.page.ib)` and `.app:has(.page.ib) .main` to `100dvh` with `overflow: hidden !important`.
   - Pinned `.app:has(.page.ib) .main` bottom padding to `var(--side-x, 14px) !important` to align the grid bottom edge with the fixed sidebar.
   - Pinned `.sr` and `#live` screen reader element to `top: 0; left: 0` inside `.app:has(.page.ib)` to prevent 1px DOM flow height protrusion.
2. **Inbox Grid Flex Sizing (`inbox-DEOq-jdu.css` & `signin-styles.css`):**
   - Changed `.ib-grid` from `height: clamp(540px, 100dvh - 230px, 860px)` to `height: 100%; max-height: 100%; min-height: 0; flex: 1 1 0; margin: 0;`.
   - Retained internal scrolling on `.ib-threads` and `.ib-msgs` with `overflow-y: auto`.
3. **Bottom Composer Pinning:**
   - `.ib-compose` remains visible and pinned at the bottom of the conversation column, exactly aligned with the sidebar bottom edge.

---

## Test Results Matrix

| Test Step | Verification Description | Expected Result | Measured Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-INBOX-01** | Window scrollY on load (1440x900) | `scrollY === 0` | `0` | **PASS** |
| **TC-INBOX-02** | Document scrollHeight vs Window InnerHeight | `scrollHeight === 900px` | `900px` | **PASS** |
| **TC-INBOX-03** | Window scroll attempt (`window.scrollTo(0, 500)`) | `scrollY === 0` (no outer scroll) | `0` | **PASS** |
| **TC-INBOX-04** | Layout bottom alignment (`.side` vs `.ib-grid`) | Aligned at `886px` (14px from bottom) | `side: 886px, grid: 886px` | **PASS** |
| **TC-INBOX-05** | Composer Visibility | `compose.bottom <= 900px` | `885px` | **PASS** |
| **TC-INBOX-06** | Internal Message Feed Scroll Under Load (20+ msgs) | `.ib-msgs` scrolls internally; window stays 0 | `msgsScrollable: true, windowScrollY: 0` | **PASS** |
| **TC-INBOX-07** | Thread Selection Responsiveness | Switched thread retains 0 window scroll & pinned composer | `active: true, scrollY: 0, composer: visible` | **PASS** |
| **TC-INBOX-08** | Smaller Desktop Viewport (1200x800) | Viewport locked at 800px; no outer scroll | `scrollH: 800px, winH: 800px, scrollY: 0` | **PASS** |
| **TC-INBOX-09** | Console & Runtime Stability | Zero uncaught runtime errors | `0 errors` | **PASS** |

---

## Visual Verification Artifacts

- 1440x900 Screenshot: [inbox_fixed_no_scroll.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/inbox_fixed_no_scroll.png)
- 1200x800 Screenshot: [inbox_fixed_1200x800.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/inbox_fixed_1200x800.png)

---

## Automated Test Script Reference

Run test suite anytime via:
```bash
node frontend/test/test-inbox-fixed-no-scroll.mjs
```
