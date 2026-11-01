# CleanFlow 2.2.0

This release retains production 2.1.2 and adds only per-apartment amounts in
the individual employee PDF report when financial details are enabled.

- Separate planned and earned PLN columns on each apartment line.
- Saved cleaning prices and dog bonuses are included.
- Financial details remain off by default; without them the report shows no amounts.
- Natural English and Polish headings and currency formatting.
- Existing 2.1.2 planning, cancellation, history/undo and payment safeguards remain.
- No guest messages, SMS, WhatsApp, guest photos or media collections are included.
- Database name, schema 4, backup format and stored user data remain unchanged.

The same report change was previously rendered/text-checked in English and Polish.
Following the request to minimize testing, this release uses scope/source checks
and Windows packaging verification rather than a full regression rerun.
The installer is unsigned. macOS runtime was not tested here.
Export a safety backup before updating.
