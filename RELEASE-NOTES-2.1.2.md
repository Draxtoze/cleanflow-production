# CleanFlow 2.1.2

- Separate planning, completion review and confirmed-correction workflows.
- Wide responsive panel with one content scroller and visible header, summary and actions.
- Selected apartments appear first. Default suggestions show pending current/older
  checkouts, including overdue priorities; other apartments remain searchable.
- Empty planned cleanings cancel through an integrated confirmation.
- Confirmed cleanings can now be cancelled through a separate explicit financial
  confirmation showing the amount deducted from earnings and real balance.
  Existing payments are preserved. Cancellation is atomic with history and safe undo.
- English and Polish translations. Database identity, schema 4 and backup format unchanged.
- Future 2.2.0 guest/media/report additions are not included.

The previously reviewed workflows passed 56 unit/filesystem checks plus EN/PL
browser and native Windows checks. Following the user's request to minimize
additional testing, the final confirmed-cancellation addition receives one targeted
browser check and build/package checks, not another full regression run.

The Windows installer is unsigned. macOS runtime testing and physical printing
were not performed. Export a safety backup before updating.
