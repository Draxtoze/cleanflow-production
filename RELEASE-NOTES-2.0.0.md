# CleanFlow 2.0.0

## New and improved

- Settings at the bottom of the sidebar: text size, six themes, daily backups and application information.
- Original Ocean palette retained; Nordic, Polar night, Porcelain, Linen and Dusty rose alternatives, with corrected calendar contrast.
- Independent Details, Cards and Compact views for staff and apartments; search and status/category/owner filters.
- Apartment owners shown in details and classic cards; compact cards reduced to essentials without losing actions.
- Four report entry points with configuration dialogs, period summaries and empty-report validation. Existing Windows PDF preview/download/print behavior retained.
- Windows automatic daily JSON backups with checksums, adjustable 1–365-file retention and immutable daily files. Manual exports are never pruned.
- Backup-folder opening resolves the physical Windows directory, including redirected AppData environments. Opening status and errors are translated.
- English/Polish interface and preferences persist locally and are included in full manual backups.

## Installation and data

Download `CleanFlow-Setup-2.0.0.exe`. Export a JSON safety backup before updating.
The installer is unsigned. Existing app identity, storage origin, database schema
and user data are preserved. New production profiles start empty; demo data and
user databases/backups are excluded from the release.

Existing Windows installations with automatic updates enabled can discover this
release at startup. Installation always requires approval. No application was
installed on the developer/user machine as part of publishing this release.

## Validation and limits

41 unit tests pass, plus browser appearance/card/layout checks and an isolated
Windows production-package test covering blank startup, backup deduplication,
folder opening and preference persistence. Shared report workflows were tested
in English and Polish. See V2-VALIDATION.md for scope and limitations.

No macOS installer or macOS execution test is included. Filesystem backups and
automatic updates remain Windows-only. Physical printing and a real 2.0.0→2.0.1
update experiment have not been tested; no dummy 2.0.1 release was created.
