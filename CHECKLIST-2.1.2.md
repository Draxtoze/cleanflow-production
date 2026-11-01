# 2.1.2 planning corrective review

Publication and confirmed-cleaning cancellation were subsequently authorized.
Version bumped to 2.1.2; the final addition passed one targeted UI/payment/undo
check. Earlier checklist text records the original review scope.

Base: production v2.1.1 / 75b5b74, isolated branch codex/planning-ux-212.
Version stays 2.1.1 during the review; 2.1.2 bump/publication only after approval.
No 2.2.0 modules, media schema, guest features or employee-report changes.

- [x] Inspect existing planning, zero-selection branches, snapshots, history/undo,
  translations, backups and transaction boundaries.
- [x] Baseline 50 unit/filesystem tests pass.
- [x] Capture old interface using synthetic data.
- [x] Large planning panel: fixed employee/date/status header, single scroll area,
  visible summary and footer, full-screen narrow layout.
- [x] Separate priority/checkouts/other sections; selected rows survive search.
- [x] Full-row selection, saved prices and dog bonuses, clear live totals.
- [x] Integrated full cancellation confirmation with employee/date/count/amount;
  zero selection changes primary action; no native confirmation.
- [x] Separate completion review restricted to originally planned apartments;
  partial completion, dog adjustments, actual amount/difference and zero redirect.
- [x] Confirmed correction warning plus explicit integrated confirmation;
  no simple cancellation and payments preserved.
- [x] Atomic cancellation/history, stale-write and duplicate checks; safe undo.
- [x] Existing database/schema, backups and identity preserved.
- [x] Complete English/Polish interface and keyboard/reduced-motion behavior.

## Mandatory validation
1. [x] Create one apartment.
2. [x] Create several apartments.
3. [x] Untick last apartment.
4. [x] Clear zero state.
5. [x] Cancel via primary.
6. [x] Cancel via dedicated action.
7. [x] Keep/refuse cancellation leaves original unchanged.
8. [x] Task completely disappears.
9. [x] No empty task saved/displayed.
10. [x] Expected amount updates.
11. [x] Real balance unchanged by cancellation.
12. [x] Payments unchanged.
13. [x] Dog bonus removed from expected amount.
14. [x] Checkout suggestions return.
15. [x] Turnover priorities return first.
16. [x] Confirm all.
17. [x] Confirm subset.
18. [x] Zero completed redirects to cancellation.
19. [x] Safe confirmed correction.
20. [x] Single atomic history event.
21. [x] Safe cancellation undo, including reassignment conflict.
22. [x] Manual backups before/after cancellation.
23. [x] Automatic file after cancellation.
24. [x] Clean-profile backup import.
25. [x] English flow.
26. [x] Polish flow.
27. [x] Wide/narrow layouts.
28. [x] No double scroll.
29. [x] Important controls remain visible.
30. [x] Booking/owner/balance/report/backup regressions.

## Handoff
- [x] Isolated demo opened; before/after captures and review notes supplied.
- [ ] User explicitly approves.
- [ ] Only then bump 2.1.2, build/publish installer/blockmap/latest.yml/checksums/notes.

Evidence: 56 unit/filesystem tests; planning-browser, planning-atomic and planning-desktop pass. Existing full browser A/B restores, four PDF types EN/PL, themes/views and owner/balance/report regressions pass. See REVIEW-2.1.2.md for financial and backup proofs. Demo verified open on two selected apartments, PLN 247.50, version 2.1.1/schema 4 in its own review profile.
