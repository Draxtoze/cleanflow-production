# CleanFlow production — 1.2.0

CleanFlow is a local-first desktop/PWA source package for planning apartment cleaning, staff assignments, balances and reservations. Production contains no demo data.

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