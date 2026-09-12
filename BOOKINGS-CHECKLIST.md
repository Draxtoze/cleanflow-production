# Booking module checklist

- [x] Add a versioned reservations data store and safe migration.
- [x] Preserve old data and import backups without reservations.
- [x] Add reusable reservation date, interval, conflict, checkout and cleaning-suggestion business rules.
- [x] Add English/Polish booking translation keys with English fallback.
- [x] Add a category-scoped monthly reservations calendar.
- [x] Implement two-click booking selection, cancellation and validation.
- [x] Implement booking details, edit with DD/MM/YYYY validation, and confirmed deletion.
- [x] Show check-ins, check-outs, stay bars and today state accessibly.
- [x] Add booking/check-out data to cleaning planning without changing balances.
- [x] Prioritize checkout apartments in cleaning assignment and prevent duplicate cleanings.
- [x] Add backup/export/import validation for reservations and checkout states.
- [x] Add booking business tests, including date conflict edge cases.
- [x] Run syntax, tests, production smoke checks and publish a tagged production release.
