# CleanFlow 2.0.0 — local review, no GitHub publication

This checkout is a fresh clone of production 1.5.1 on `codex/v2-review`. Nothing
has been pushed, tagged or released. The old installation and its data are untouched.

## Try the demo

Run `npm run desktop:demo`. The local synthetic fixture is intentionally ignored by
Git and excluded from production packages. Electron uses a separate demo profile
and the `cleanflow-development-demo` database, never the production database.
The first demo session creates 32 dated synthetic automatic backups and retains
31. Browser preview is a simulation only; it explicitly does not claim file backups.

Suggested review: PDF reports → each of the four cards; settings gear beside Saved
automatically → six themes, three text sizes, backup status; Staff/Apartments →
Details/Cards/Compact, search, status/category/owner filters; About → real version,
schema and local storage. Switch EN/PL and try large text on a smaller window.

## Storage and migration

No schema upgrade: IndexedDB remains `cleanflow-db`, version 4, and the Electron
origin remains `cleanflow://app`. App ID and userData location are unchanged.
The only persisted addition is an additive `preferences` record in the existing
settings store. It holds theme, text size, independent staff/apartment views,
language, daily-backup switch and retention. Existing settings and business records
are not rewritten at startup. Old version 1–4 backups still validate.

Manual backups read all nine stores in one consistent read transaction. They
include staff, apartments, categories, owners, assignments/snapshots, payments,
reservations/customer payments/dog option, checkout states, all settings and nested
fields, plus app/schema/export metadata. Explicit restore confirmation is required.
Unknown nested fields are retained; no normalization rewrites the imported records.

## Daily Windows files

Installed Windows only (and the deliberately isolated Windows demo). The fixed
automatic-backups subdirectory is inside the app's existing userData profile.
No arbitrary destination/path is accepted from the renderer. The secure preload
exposes only narrow, sender-checked APIs; renderer Node access remains disabled.

After the database opens and additive preferences are committed, a startup task
checks the local day. A validated existing daily file is immutable. Otherwise a
full snapshot is written to an exclusive temporary file, flushed, reread/validated,
checksummed and atomically finalized by an exclusive hard link. Failure leaves no
successful-day marker and retries at the next startup. A foreign/corrupt file with
the same name is never overwritten. File-based automatic backups require a local
filesystem supporting this atomic operation (normal Windows NTFS); failures remain
non-blocking and visible. Files are JSON, not encrypted; keep the Windows profile safe.

Retention defaults to 31, configurable 1–365. Only files with the exact managed
filename, valid manager metadata, data checksum and importable backup are considered.
Manual/foreign files, directories and symlinks are excluded. Ownership is rechecked
before deleting older managed files. Manual backups and downloaded exports are never
counted or deleted. Each daily file is a point-in-time snapshot; later changes that
day are captured by manual export or the next day's backup, not by overwriting it.
Automatic files wrap the same complete importable backup; import verifies their
SHA-256 before restoration.

## Appearance, views and reports

Ocean (default), Forest, Night, Indigo, Amber and Plum; Small/Normal (default)/Large.
Changes apply immediately and are saved in backups. Semantic financial/status colors
remain distinct; PDFs retain their independent print design. Reduced motion disables
CSS effects and card reflow animations.

Staff and Apartments have independent view modes. Details include status, staff
expected/real/paid figures or apartment category/owner/price. All modes retain edit,
archive/reactivate and apartment details; search and filters operate on the same data.

Reports show four balanced cards with one configuration action each. Each modal has
required selectors, period, summary/status, privacy defaults and one preview action.
No activity → a visible explanation and disabled generation, not a silent empty PDF.
Weekly staff remains one combined management PDF with overview and employee sections.
Employee finances and owner charges default off. Owner PDFs do not add staff wages,
balances or personal payment fields. Category batch preview and ZIP are retained;
categories with no activity are omitted from the batch. The Windows Blob/iframe
preview still provides download/print. The existing optional macOS bridge is retained.

Legacy interface strings were moved into the existing i18n dictionaries using
semantic keys, alongside new English/Polish settings and report strings. UI text is
separate from business names/notes. Currency follows active language. Dates in manual
booking entry retain the required DD/MM/YYYY business format.

## Evidence and limits

See V2-VALIDATION.md and tests/v2-*. Unit tests cover atomic backup failure/retry,
same-day deduplication, 32→31 retention, manual/foreign-file safety, collision protection,
checksums, automatic restore and exhaustive nested-field round-trips.
Two different synthetic fixtures are independently exported through the actual UI,
restored into fresh isolated browser profiles, deeply compared by record ID, and
checked across pages, balances, appearance and views. IndexedDB collection enumeration
order is canonicalized for comparison; explicit sortOrder and nested arrays are not.

No physical printer, macOS device, real installed 2.0.0→2.0.1 update or real-user data
has been tested. Baseline 1.5.1 unit tests passed; three old browser checks needed
correction (stale 1.5.0 label and hard-coded booking dates colliding with generated
demo stays). Their updated assertions retain their original coverage.

## Publication gates

1. User explicitly approves this demo and authorizes publication of 2.0.0.
2. Only then finalize production docs/stage labels, build/tag/release installer,
   blockmap, latest.yml and checksums. Never ship the demo fixture/profile.
3. User actually installs 2.0.0 and separately agrees to the updater experiment.
4. Only then create dummy 2.0.1, publish its updater assets, and execute/record the
   real approval/download/install/restart/deep-data comparison.

No future-release update result is claimed before those steps happen.

## File inventory

Created: desktop/backups.cjs, desktop/preload.cjs; js/backup.js,
js/preferences.js, js/v2.js, js/v2.css, js/v2-i18n.js, js/legacy-i18n.js;
tests/v2-fixture.mjs, tests/v2-backups.test.mjs, tests/v2-browser.cjs,
tests/v2-accessibility.cjs, tests/v2-desktop.cjs, tests/v2-packaged.cjs;
V2-VALIDATION.md, V2-REVIEW-NOTES.md, V2-LOCAL-BUILD.txt.

Updated: desktop/main.cjs, desktop/updates.cjs; js/app.js, js/business.js,
js/i18n.js, js/store.js; index.html, sw.js, package.json/package-lock.json,
.gitignore, README.md, README-MACOS.md, WINDOWS-INSTALLATION.md; existing
browser-smoke, browser-workflows, booking-dog, desktop-smoke and
desktop-updates-smoke tests.

Local-only, ignored and excluded from production: js/demo.js, the one-click
Open CleanFlow 2 Demo.cmd launcher, screenshots, isolated profiles and dist assets.
There are no credentials or real user backups in the source changes.
