# CleanFlow 2.2.0

Version 2.2.0 adds only per-apartment planned/earned amounts to the employee PDF
when financial details are enabled, including saved dog bonuses. It retains the
released 2.1.2 planning and cancellation fixes. No guest messaging, SMS, WhatsApp,
photo galleries or media storage changes are included. Database schema stays 4.
See RELEASE-NOTES-2.2.0.md.

## Previous production release

Version 2.1.2 improves planning, checkout suggestions, selection ordering and
safe cancellation of planned or confirmed cleanings. Confirmed cancellation
shows the real amount deducted, preserves payments and supports safe history undo.
See RELEASE-NOTES-2.1.2.md.

Publication of 2.1.2 was explicitly authorized after local review, including
confirmed-cleaning cancellation. See REVIEW-2.1.2.md and CHECKLIST-2.1.2.md
for the earlier review record. Future 2.2.0 features are not included.

## Previous production notes

Version 2.1.1 adds change history with safe undo and fixes immediate visibility
of checkout cleaning suggestions, with priorities first. Publication approved
after demo review. See RELEASE-NOTES-2.1.1.md and HISTORY-REVIEW.md.

Production release approved after local demo review. See RELEASE-NOTES-2.0.0.md
for appearance, report configuration, views and automatic backup improvements.
Production starts blank. No user database, automatic backup or demo module is included.
Version 2.0.1 was a version-only update test. Download/approval from installed
1.5.1 was observed; a completed user-driven upgrade was not independently certified.

Windows versions 1.5.1 and later check the public GitHub release feed at every startup and download newer stable versions in the background. Installation requires explicit approval and restarts the app. Later/closing never installs automatically. Offline use is unaffected. Install the current Windows release manually if your older installation does not support updates. See RELEASE-NOTES-1.5.1.md.

CleanFlow is a local-first desktop/PWA application for apartment cleaning, staff assignments, balances, bookings and owners. Download the Windows installer from GitHub Releases. Production starts blank; demo fixtures and user databases are not published. Export a backup before updating. See RELEASE-NOTES-1.5.0.md, IMPLEMENTATION-CHECKLIST.md and WINDOWS-INSTALLATION.md for installation, migration and validation details.

## Booking schedule

- Apartments remain organized by user-created categories; each category has its own monthly booking calendar.
- Click an apartment/day once for check-in, then click a later day on the same apartment for check-out. A stay uses the interval `[check-in, check-out)`: the check-out day is free for a new check-in.
- The same apartment cannot have overlapping stays. A same-day check-out and check-in is allowed and displayed as a yellow priority cleaning.
- Booking dates can be edited only with `DD/MM/YYYY`; all booking changes are saved to the local database automatically.
- Booking information keeps an apartment/category snapshot, so historical bookings remain understandable after later edits.

## Cleaning priorities

The weekly planning header shows each day’s checkout workload as `priority · bonus`:

- **Priority**: an apartment has a check-out and a check-in on that same date.
- **Bonus**: a normal check-out that still needs cleaning.

Priority apartments appear first when assigning cleaning. An apartment already assigned to another staff member on that date is unavailable, preventing duplicate cleaning plans. Ignored check-outs remain visible in booking details but are not counted as work to plan.

## Data safety

The IndexedDB schema is versioned. Existing staff, apartments, assignments, payments and backups are retained when the reservation stores are added. JSON export/import now includes `reservations` and `checkoutStates`; older supported backups remain valid.

## Local verification

Use the packaged Node runtime or a current Node.js installation:

```powershell
node --test tests/business.test.mjs
node server.mjs
```

Then open `http://127.0.0.1:5173`. The included production server is only for local preview/build verification. The installed Windows/macOS packages should use their native launcher.

## Languages

New reservation and checkout-cleaning interface strings are provided in English and Polish. English is the safe fallback for a missing key. User-entered apartment names, staff names, category names and notes are never translated.

## Release process

Each tested production release is committed and tagged in the production GitHub repository. Demo data and demo launchers must stay outside this production source package.
