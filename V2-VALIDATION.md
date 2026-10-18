# CleanFlow 2.0.0 — validation and release authorization

## Baseline

- [x] Fresh GitHub clone; dedicated local branch `codex/v2-review`.
- [x] README, release notes, storage/schema, backups, updater, reports and i18n reviewed.
- [x] Baseline: 33 unit tests pass. Existing UI tests launched before changes.
- [x] Baseline UI defects recorded: stale 1.5.0 test label; fixed-day test bookings
  overlapped the date-dependent synthetic fixture. Tests corrected, not hidden.
- [x] All eight existing browser scripts rerun successfully after adapting report
  selectors/date setup; both existing packaged Windows smoke scripts also pass.
- [x] App ID, local origin, database name/schema 4 and updater policy preserved.
- [x] Production package checked: source matches, no demo module or database.
- [x] GitHub main still `54b4abf` (1.5.1); no v2.0.0/v2.0.1 tags or releases.

## Requested checks — actual scope, not blanket certification

1. [x] First daily automatic file: real packaged Windows isolated profile.
2. [x] Same-day restart: one file, byte-for-byte unchanged.
3. [x] Next local day: clock-injected filesystem test (not a physical overnight wait).
4. [x] 32 synthetic dates → 31 retained: filesystem unit test and real Electron demo.
5. [x] Only validated managed automatic files pruned.
6. [x] Manual/foreign files not counted or removed.
7. [x] Simulated write/finalization failure: no success marker; retry succeeds.
8. [x] JSON, SHA-256 and backup validation pass.
9. [x] Two complete manual-backup verifications: different fixtures A/B, real UI
   export → fresh isolated profile import → deep record/field comparison, page and
   balance checks. Source: tests/v2-fixture.mjs and tests/v2-browser.cjs.
10. [x] Automatic file checksum verified and complete data restored in tests.
11. [x] Text-size change and restart persistence (browser and Electron).
12. [x] All six themes apply immediately (EN/PL controls).
13. [x] Theme persists after reload/restart.
14. [x] Large text layout at 1440/1024/768/390px: no tested-page horizontal overflow.
    Final visual preference/contrast review remains with the user.
15. [x] Apartments Details/Cards/Compact, search and retained actions.
16. [x] Staff Details/Cards/Compact, search and retained actions.
17. [x] Independent Staff Details / Apartments Compact choices survive reload.
18. [x] Existing owner association/archive/reassignment, apartment edits, planning,
    dog snapshots, cancellation and cash workflows still pass. Searches and
    owner/status/category controls are present; not every filter/action combination
    in every theme has been individually certified.
19. [x] Four PDF types generated in EN/PL; employee/owner privacy checks pass;
    weekly and monthly Windows previews each opened twice.
20. [x] PDF configuration dialogs, required selectors and empty-period guard tested.
21. [x] Preview/download tested; Print button dispatch tested with a harmless spy.
    Physical printer output is NOT tested.
22. [x] About shows app version, schema, local storage and runtime capabilities;
    no personal paths are displayed.
23. [x] Demo uses separate database/profile; production starts blank and denies
    demo-seeding IPC. Real demo backup files are isolated.
24. [x] Reduced-motion CSS and actual apartment reflow animation suppression tested.
25. [x] English pages, main forms and new workflows exercised without page errors.
26. [x] Polish pages, main forms and new workflows exercised without page errors.
    Native OS date pickers/window chrome follow system/browser behavior.
27. [x] Local Windows 2.0.0 installer/blockmap/latest.yml built; SHA-512 manifest and
    package source verified. Unsigned; no GitHub upload.
28. [ ] Real 2.0.0 installation: requires demo approval and user consent first.
29. [ ] Dummy 2.0.1 publication: requires installed 2.0.0 and separate test approval.
30. [ ] Real 2.0.0 → 2.0.1 update: not performed.
31. [ ] Post-update complete data/preferences/backup comparison: not performed.
32. [x] Tested UI/browser/Electron workflows have no recorded renderer errors;
    regression suites pass. This is not a guarantee that no untested bug exists.

## Test evidence

- `node --test tests/*.test.mjs`: 41 passing tests after review R4.
- `tests/v2-review-feedback.cjs`: owner details/cards, compact essentials, footer
  placement and selected-navigation/booking-label contrast in all six replacement themes.
- `tests/backup-folder.test.mjs`: canonical Windows directory resolution, visible
  Explorer launch arguments and error paths. Real demo folder with 31 files also
  inspected through the Windows UI after clicking the corrected button.
- `tests/v2-browser.cjs`: A/B UI restore, appearance, all view modes, four PDFs
  EN/PL, downloads, responsive layout.
- `tests/v2-accessibility.cjs`: independent view persistence, keyboard settings,
  text scale, reduced-motion CSS/reflow, empty guard and Print button dispatch.
- `tests/v2-desktop.cjs`: real demo files/retention, database isolation, preferences.
- `tests/v2-packaged.cjs`: real production package, blank profile, daily-file
  deduplication on restart, appearance persistence and denied demo API.
- Existing browser smoke/workflow/dog/layout/date-hover/month-fit/translation
  audits pass after the documented stale-test fixes.
- Existing desktop PDF/updater smoke tests pass with version-independent assertions.
- Installer SHA-256 is recorded in V2-LOCAL-BUILD.txt.
- Installer rebuilt after R4; packaged source compared with current reviewed files.
  Fresh isolated production profile/restart and backup-folder UI test pass.
  Installer manifest SHA-512 and byte size verified. Still no real installation or upload.

## User review / publication gates

- [x] Detailed walkthrough and technical notes in V2-REVIEW-NOTES.md.
- [x] Real demo window opened and visually inspected on PDF Reports.
- [x] User validated the corrected demo and explicitly authorized 2.0.0 publication
  with the Windows installer on 19 October 2026.
- [x] Release-stage text/docs finalized; approved production publication workflow initiated.
- [ ] User installs 2.0.0 and separately authorizes the dummy 2.0.1 experiment.
- [ ] Execute and document the real update; never claim it succeeded beforehand.

No real-user data was loaded and no current installation replaced. Publication of
2.0.0 is authorized; check GitHub Releases for the completed upload. macOS and
physical printing remain untested. Installation and the dummy update test remain
separate user actions and are not authorized by publication approval.
