# CleanFlow 2.1.1 — history validation and safety limits

## Behavior

- New Change history navigation, translated in English and Polish.
- Saved creations, edits, deletions, archives, cleaning confirmations, preferences
  and reorder operations have dated before/after records. No-op saves are omitted.
- Staff/apartment reorders and owner/category deletions with reassignment form
  one atomic operation, not a partly reversible sequence.
- Search, record/action filters, local-date ranges and progressive 40-entry display.
- Details compare readable fields and preserve user-entered names/notes verbatim.
- Undo requires a second confirmation. The current database is checked inside the
  same read/write transaction as the reversal, not just against the visible page.
- A reversal is blocked if the current record differs from the saved after-state,
  creates overlapping bookings/cleanings, introduces a broken reference, or fails
  existing business/backup validation. Unrelated later edits are retained.
- Undo is itself journaled. An event cannot be reversed twice. Reversal events
  are viewable, but do not offer a redo operation in this first version.
- Financial snapshots are restored exactly; balances derive from the restored
  assignments/payments rather than storing a separate balance adjustment.

## Data and backup safety

The journal uses reserved `__cleanflow_history__:` records in the existing settings
store. App identity, origin, IndexedDB name/version 4 and the nine-collection v4
backup format are unchanged. No existing business records are rewritten to add
history. Existing backups without a journal remain supported.

Each ordinary mutation and its journal entry commit in a single transaction. A
journal failure aborts the business mutation. The backup snapshot also reads all
nine collections in one transaction, so both manual and automatic files include
the journal consistently. Tests restore actual automatic files and full manual
exports. Existing daily-file immutability still applies: changes after today's
automatic snapshot need a new manual export to be backed up immediately.

Import restores the incoming journal, then records an import summary. Imports are
not undoable here: a safety backup is needed to restore the prior workspace. Reset
deliberately deletes all data including history. History is local, not an encrypted
or tamper-proof multi-user audit service. Deleted records may remain in snapshots.
No historical events are invented for changes made before this feature existed.
There is no automatic journal pruning in this version.

## Validation and release boundary

- 50 unit/filesystem tests pass, including exact nested snapshots, stale undo,
  dependency/date conflicts, financial recalculation and automatic backup restore.
- Isolated browser tests exercise real edit → detail → confirmation → undo,
  duplicate-undo prevention, manual export/import into a clean profile, failed
  journal-write rollback, concurrent writers, EN/PL and mobile layout.
- Existing A/B full-backup round trips explicitly check the added import event
  while still deeply comparing every original business/unknown field.
- Existing report/theme/view regression tests are rerun against the new source.
- Native Windows demo test also passes: real edit, confirmed undo, journal
  persistence after restart and complete backup round-trip in an isolated profile.

No production data is edited and no installed production app is replaced.
Production publication of 2.1.1 was authorized on 1 November 2026 after demo review
and the priority-suggestion fix. Installation is not performed by publication.

The priority regression test covers EN/PL immediate unselected checkout suggestions,
priority-first ordering, query/clear behavior, retained selected items and exclusion
of already-assigned or ignored apartments from default suggestions.
