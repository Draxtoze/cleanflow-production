# CleanFlow 2.1.1

## Change history with safe undo

- Review dated changes to staff, apartments, owners, categories, bookings, cleanings, payments and preferences.
- Search and filter by record type, action and local date; compare before/after values.
- Undo requires confirmation and rechecks the current database atomically. It refuses stale records, overlapping dates or newly broken links.
- Grouped reorder and owner/category reassignment operations are journaled atomically.
- Every reversal leaves a history entry. Import and reversal events are viewable but cannot themselves be undone.
- History is retained across restarts and included in full manual and automatic backups.
- English/Polish interface; user names, notes and business data are not translated.

## Cleaning priority fix

Opening a staff/day planning dialog immediately shows available departures to plan,
with same-day checkout/check-in priorities first. No apartment is automatically
selected. Search still works; apartments already assigned elsewhere or marked as
not requiring cleaning are excluded from default suggestions.

## Data safety and limits

Export a safety JSON backup before updating. App identity, storage origin,
IndexedDB version 4 and the existing nine-collection backup format are preserved.
Production starts blank; no user data, database, demo module or backup file is included.
Daily automatic files remain immutable: newer same-day changes require a manual export.

History begins with changes saved using this feature, not earlier edits. Deleted
records may remain in history snapshots. Reset clears history; import replaces it
with the incoming journal and adds an import summary. It is a local change log,
not a tamper-proof multi-user audit service.

50 unit/filesystem tests pass, with additional browser and native Windows demo tests
covering undo, rollback, backup restoration and the priority fix. macOS execution
and physical printing are not certified. The Windows installer is unsigned.
