# CleanFlow 1.5.0

## Windows download

Download **CleanFlow-Setup-1.5.0.exe**, run it, and open CleanFlow from the Start
menu or desktop shortcut. No Node.js, Git, terminal or manually started server is
required. The installer is not digitally signed; Windows may display an unknown
publisher warning. Review the source and checksum before installing.

**Before updating: export a JSON backup from the current app.** This first
Electron installer has its own local storage container. If the old application
uses browser storage or another launcher, it is not erased or automatically
imported. Export from the old app, then use Backup & restore in the new app to
review and confirm the import. Import replaces the target app's current data.

Production starts blank. No user database, demo records, generated reports or
development browser profiles are included in the installer or repository.

## New features

- Reservation payment status: paid or cash to collect, with a validated PLN amount
  and optional note. These customer amounts never affect employee payroll.
- Booking dog option preselects a dog-cleaning bonus for checkout planning.
  Already-saved cleaning snapshots are not silently changed by booking edits.
- Per-apartment dog bonus with configurable default and immutable saved amount.
  Planned bonuses affect expected earnings; confirmed bonuses affect real earnings.
- Explicit cancellation of plans, including removing all selected apartments;
  confirmed corrections require approval and retain confirmed status.
- Owners with contact details, archive/reactivation, apartment association and
  safe deletion with reassignment. Apartment records and histories are preserved.
- Employee PDFs for inclusive custom periods, finances disabled by default.
  Monthly owner PDFs exclude employee wages, balances and payments. Optional owner
  cleaning charges use a separate field, not employee pay.
- Saved apartment order per category with dragging and up/down controls; Save and
  Cancel stay at the top. Owner-card action buttons align at the bottom.
- Entire booking month fits without horizontal scrolling, continuous rounded stay
  blocks, same-day arrival/departure support and hovered-date column highlighting
  in both calendars.
- Compact dog-bonus controls without horizontal overflow; English and Polish
  labels and safer preservation of business text during language changes.
- PDF generation feedback yields two frames before processing. Windows retains
  Blob + iframe previews. Closing the installed Windows window ends the app.

## Data migration

IndexedDB name remains `cleanflow-db`; schema 4 adds owners without resetting old
stores. Additive defaults preserve existing records. Backups support versions
1–4, including owners, ordering, booking payment/dog fields and bonus snapshots.

## Verification and limitations

27 business/regression tests, Edge UI workflows, layout/hover tests and a packaged
Windows smoke test were run on Windows. Weekly and monthly previews were opened
twice in one session. The packaged app was tested with an isolated blank profile
and synthetic records, not user data.

Native macOS PDFKit integration and a macOS installer are not supplied or tested
in this release. Source contains the existing optional WebKit PDF message bridge;
a native macOS launcher must provide that handler. Physical touch-device testing,
physical printing and upgrades from an installed previous Electron release have
not been verified. See IMPLEMENTATION-CHECKLIST.md for the exact validation scope.
