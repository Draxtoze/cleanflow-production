# CleanFlow 1.5.0 — release validation

- [x] Latest production cloned; Git history preserved.
- [x] Booking payments, validation and English/Polish UI.
- [x] Continuous stays, full month visible, date hover in both calendars.
- [x] Dog bonus snapshots and booking-to-checkout cleaning defaults.
- [x] Safe planned cancellation and confirmed-correction confirmation.
- [x] Employee-period PDFs with finances off by default.
- [x] Owners, archive/reassignment and monthly owner PDFs without staff finances.
- [x] Saved category-specific apartment order; fixed top actions; aligned owner buttons.
- [x] Additive schema 4 migration and backup versions 1–4.
- [x] EN/PL audit of pages and principal forms; remaining legacy strings identified below.
- [x] Demo review and explicit publication approval by user on 7 October 2026.
- [x] Windows installer built, demo module excluded.
- [x] Final checksum, source commit/tag and GitHub asset upload verified.

Published release: https://github.com/Draxtoze/cleanflow-production/releases/tag/v1.5.0
Source tag: `8e07bebb25042021362113fdb5a103842c9834f9`.
GitHub installer SHA-256 matches the locally tested executable and SHA256SUMS.txt.

## Tests actually executed

27 unit/regression tests pass. Edge workflows cover navigation, owner creation,
association/archive/reassignment, dog defaults/snapshot reload, planned cancellation,
cash validation/booking creation, backup fields and unchanged demo payment history.
Booking dog option preselects the checkout bonus and survives saving.

Weekly and monthly previews were opened twice in one session, plus employee/owner
PDFs and Polish preview. Captured PDF text confirms default privacy. No page errors.
Layout checks cover owner action alignment/filtering, top reorder actions after
scrolling, reorder/save, dog controls at 1100/390px, full-month fit at
1440/1024/768/390px, and both date-hover behaviors.

Packaged Windows launcher starts with an isolated blank profile, uses its local
protocol without an HTTP server, disables renderer Node access, and uses Windows
Blob/iframe PDF preview. Synthetic test records never enter production data.

## Limitations — not falsely marked as tested

Native macOS/PDFKit and its installer are absent and untested. Physical printing,
physical touch devices and an upgrade from an installed prior Electron release
have not been verified. Old browser/native-app transfer requires explicit backup
export/import; no automatic transfer or deletion takes place. Installer is unsigned.
All 31 requested scenarios are not individually certified; the scope above is the
actual verification performed. Legacy dynamic validation/import/confirmation copy
still needs a wider audit; main navigation and new-feature labels are translated.

Earlier disk blockage was resolved. Only failed build outputs were removed, not
user data, old apps or business backups.

## Publication boundary

No IndexedDB files, user data, local demo module, browser/test profiles, generated
reports or credentials belong in the production repository or installer. The demo
fixture remains local; only code and synthetic test assertions are published.
