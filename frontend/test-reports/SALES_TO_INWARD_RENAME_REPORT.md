# Sales → Inward rename report

## Summary
The "Sales" module in Accounts is now called **Inward** everywhere a user can see it. The route (`/accounts/sales`) and API (`/api/accounts/sales`) are unchanged so existing links, bookmarks and data keep working.

## Changes
| Where | Before | After |
|---|---|---|
| Sidebar sub-item (Accounts) | Sales | Inward |
| Top-bar page title | Sales & Invoicing | Inward & Invoicing |
| Accounts section list | Sales | Inward |
| KPI tile | TOTAL SALES | TOTAL INWARD |
| Table card title | Sales invoices | Inward invoices |
| Drawer title | Create sales invoice | Create inward invoice |
| Toasts | Sales invoice saved / Could not save the sales invoice | Inward invoice saved / Could not save the inward invoice |
| Delete confirmation entity | sales invoice | inward invoice |
| Overview subtitle | "…sales, spend, cash and profit…" | "…inward, spend, cash and profit…" |
| P&L row | Sales returns & credit notes | Inward returns & credit notes |

Files: `frontend/assets/index-DG0_cRQu.js`, `frontend/assets/accounts-Acc7mK2p.js`; tests updated: `test-accounts-module.mjs`, `test-action-buttons-global.mjs`, `test-accounts-hr-tabular.mjs`.

## Intentionally not changed
- HR job titles / roles ("Sales development", settings role "Sales", commission rules): these describe people, not the module.
- Route id, API paths, DB field names (`totalSales`, etc.): internal identifiers.
- Workspace tagline "Calder & Moss · Sales" and the browser tab title: company descriptors.
- The existing "Inward & Expenses" page keeps its name; it now sits next to "Inward", so you may want to rename one of them.

## Verification
- Syntax check of the patched bundle passed.
- Browser check of `/accounts/sales` on the final build: title "Inward & Invoicing", sidebar "Inward", KPI "TOTAL INWARD", no "Sales" text left on the page.
- `test-accounts-module.mjs`: 41 pass / 19 fail. The failures are stale expectations (page header / section bar removed, Reports page deleted, Settings/HR tab counts) from earlier requested changes, not this rename.
