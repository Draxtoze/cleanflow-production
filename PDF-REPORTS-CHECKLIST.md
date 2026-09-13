# PDF reports checklist

- [x] Inspect existing production architecture, local storage, booking, finance and i18n modules.
- [x] Run existing automated tests before changes.
- [x] Select local, offline-compatible PDF and ZIP libraries.
- [x] Bundle jsPDF and JSZip inside the production application.
- [x] Centralise report calculations in business rules without mutating data.
- [x] Add report page with weekly staff and monthly category report controls.
- [x] Add professional A4 weekly staff PDF, with global and staff sections.
- [x] Add one A4 booking PDF per category and selected month.
- [x] Add final / temporary / forecast statuses in UI and PDFs.
- [x] Add integrated PDF preview, print, individual download, and clear errors.
- [x] Add batch category generation and ZIP download.
- [x] Add complete English and Polish translations with safe English fallback.
- [x] Add report-calculation automated tests and run the full suite.
- [x] Verify no report action writes to IndexedDB or alters business data.
- [x] Run syntax, integrity and production-content checks.
- [x] Open the completed local demo for user validation before publishing.
- [x] On approval, increment version and publish only the production build to GitHub.