# Operations upgrade: 1.5.0

This implementation was reviewed by the user, who authorized publication on
7 October 2026. See the validation checklist and release notes for the exact test
scope and remaining platform/manual limitations.

## Data and migration

The existing IndexedDB name `cleanflow-db` is retained. Schema version 4 only adds
the `owners` object store. An additive in-memory migration defaults owners to an
empty collection, apartment owners to unassigned, customer payments to paid, and
dog bonuses to disabled. Existing user strings are preserved. Apartment ordering
is initialized from the existing category/alphabetical order. Backups export
schema 4 and import versions 1–4 after validation and replacement confirmation.
The development demo uses a different database and a separate local origin.

Customer payments are stored in `reservation.customerPayment` (status, grosz
amount, note). Paid reservations do not need an amount. Cash-to-collect requires
a positive amount. They are never read by employee balance calculations.

Apartment cleaning snapshots keep dog-enabled and dog-bonus-grosz fields. Totals
include the bonus only if enabled. Planned snapshots affect expected earnings;
confirmed snapshots affect real earnings. Payments remain unchanged. Confirmed
corrections require explicit approval and retain confirmed status.

Owners can be created, edited, archived, reactivated or deleted with apartment
reassignment/clearing in one transaction. Archived owners retain associations.
Owner cleaning charges have a separate apartment field and a cleaning snapshot;
they are not employee wages. They default to zero, and inclusion in PDF reports
is opt-in.

## Usage

Bookings: choose category and two dates on the same apartment. The wider scrollable
calendar uses one stay button with payment cues; labels and headings stay visible.
Reorder apartments opens a category-specific modal. Drag or use up/down buttons,
then Save; Cancel discards the draft.

Cleaning settings sets the default dog bonus. Each selected apartment can enable
and edit its own bonus. Save preserves that snapshot. Cancel planned cleaning
removes the record after confirmation; unticking all apartments also removes it.

Reports: Employee work report selects one employee and an inclusive date period;
financial details default off. Monthly owner report selects owner/month; charges
default off. Preview opens the existing Windows iframe with Print/Download.
PDF buttons yield two animation frames before generation. The macOS WebKit bridge
sends a data URL only when the native `cleanflowPDF` handler exists; its native
implementation and behavior are not verified here.

## Files

Core changes: app.js, store.js, business.js, reports.js, i18n.js, index.html,
server.mjs, sw.js, package.json and lockfile. New modules: operations.js,
operations-i18n.js, operations.css, demo.js (development only), desktop/main.cjs.
Tests: operations.test.mjs, browser-smoke.cjs, browser-workflows.cjs.
Documentation: implementation checklist, development notes, Windows installation,
README and macOS README. Existing icon additionally converted to ICO for Windows.

Do not publish before completing validation and receiving explicit user approval.
