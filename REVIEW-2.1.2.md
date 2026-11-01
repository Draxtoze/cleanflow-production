# 2.1.2 corrective planning review (unpublished, based on 2.1.1)

Release update: the user subsequently authorized publication and requested safe
cancellation of confirmed cleanings. That action now has its own financial
confirmation, preserves payments and retains atomic history/undo. Version is
2.1.2. One targeted browser check passed for cancellation, payment preservation
and undo; the full suite was not repeated, at the user's request. Earlier review
descriptions below record the pre-approval behavior and are superseded where noted.

## Cause
The 2.1.1 editor already deleted a planned assignment when saving zero selected
apartments. However, it opened a native window.confirm, did not show a clear
zero-selection cancellation state and placed completion, save, close and full
cancellation together in a narrow dialog. The dialog and capped inner fieldset
could both scroll. Completion was performed directly from the same editor.
The datastore also did not compare an editor's original record or check
concurrent cleaning assignments inside its write transaction.

This is an isolated corrective branch from v2.1.1 / 75b5b74. No guest messages,
images, schema-5 stores or employee-report changes from 2.2.0 are included.
Package.json, package-lock, APP_VERSION and schema remain at production 2.1.1 / 4
until the user's explicit demo approval. No GitHub push/tag/release has occurred.

## New workflow
Planning opens a panel up to 1280 px wide, full-screen on narrow screens. Header,
summary and footer remain outside the single scrolling content region. Priority
turnovers, other checkouts and other apartments are separate groups. Whole rows
are clickable; selected apartments survive searches. Saved prices and dog
snapshots remain in use, even when today's apartment price differs.

For a saved planned cleaning, removing the final apartment shows a zero state and
changes the main action into cancellation. Both this action and the dedicated
cancel button open a CleanFlow confirmation showing employee, date, the original
apartment count and expected amount removed. Keep/Escape leave persisted data
unchanged. Accept deletes the assignment and writes its one history event in the
same transaction. Empty new plans cannot be saved.

Completion is a separate stage restricted to the saved plan's original apartments.
Unsaved additions in the planning editor are not silently included. Returning
preserves the editing draft. The stage allows removing uncleaned apartments and
adjusting dog bonuses, with confirmed amount and difference from plan visible.
Zero completed apartments routes to the same cancellation confirmation.

Already confirmed work opens correction mode, with a financial-impact warning,
an explicit second confirmation and no simple cancel action. Zero cleaned
apartments cannot be saved. Payments are untouched in every path.

## Data safety and backups
The default planning list now shows only selected apartments and pending checkouts
from the selected date or earlier dates. Confirmed cleaning on/after the latest
checkout resolves it; a planned cleaning alone does not. Ignored checkouts and
future departures are omitted. Unfinished older turnovers retain priority and
show their original checkout date. Search can still add an unrelated apartment.
tests/planning-suggestions.cjs verifies the filter, retained selections, delayed
dog bonuses and the original-only completion stage in both languages.

Assignment writes compare the originally opened record inside the transaction.
A stale cancellation cannot remove a task another window has confirmed. The
same transaction checks empty tasks, invalid snapshots and duplicate apartment
or employee/date assignments. Two simultaneous competing assignments have one
winner. A simulated journal write failure rolls deletion back completely.

The existing journal and safe undo are retained. Undo restores exact snapshots
and dog bonuses, and refuses empty historical tasks or conflicting reassignment.
There is no database rename, schema migration, new collection or backup-format
change. Manual/daily backup code is unchanged. Daily backups retain their
once-per-day immutability: later same-day edits still require manual export.

The cancellation test includes an employee with 50.00 PLN already confirmed,
30.00 PLN paid and 200.00 PLN planned (including a 25.00 PLN dog bonus).
Cancellation removes the 200.00 PLN expected amount while keeping confirmed
earnings at 50.00 PLN, payments at 30.00 PLN and real balance at 20.00 PLN.
Manual snapshots before and after deep-compare through export/import. A real
daily file written after cancellation restores both the deletion and its full
undo snapshot. Browser tests import a real exported JSON into a clean profile.

## Files
New application modules: js/planning-ui.js, js/planning.css,
js/planning-i18n.js and js/planning.js.
Existing application files: js/app.js (replace old assignment editor),
js/store.js (transaction safeguards), js/history.js (undo safeguards),
js/i18n.js, index.html and sw.js (new module loading/offline cache).
README.md identifies the local review.

New tests: tests/planning.test.mjs, planning-fixture.mjs,
planning-browser.cjs, planning-atomic.cjs and planning-desktop.cjs.
The ignored js/demo.js contains only synthetic scenario changes and is excluded
from production packaging as before. CHECKLIST-2.1.2.md records all 30 cases.

## Validation and captures
56 unit/filesystem tests pass (50 original plus 6 planning tests).
The planning browser suite covers creation, both cancellation actions, refusal,
zero/partial/all completion, protected correction, search, priorities, snapshots,
manual backups/clean import, safe undo, EN/PL, keyboard, reduced motion and
1440/768/390 px screens, including a 390 x 600 short viewport. It asserts exactly
one content scroller and that header, summary and footer stay inside the screen.

The separate atomic suite passes rollback, stale cancellation and concurrent
assignment checks. The Windows native suite passes cancellation, durable restart,
history UI undo, exact restored snapshots/payments and readable automatic files.
The existing full browser regression passes two A/B restores, owners/balances,
six themes/views, all four PDF types EN/PL and downloads/responsive behavior.

Before capture: test-output/planning-before.png.
After captures: test-output/planning-en-1440-1000.png,
planning-pl-390-600.png and planning-completion-pl.png.
These local synthetic captures are ignored and not release/user data.
macOS runtime and physical printing are not certified by this Windows review.

## Demo and release boundary
The demo uses a separate profile/database and synthetic people/apartments.
Anna's current-day example contains one priority turnover, one other checkout and
a dog bonus. Its planned total is 247.50 PLN. Cancellation reduces the overall
expected amount by that value; other future plans may still contribute.

The installed app and real user profile are untouched. The future 2.2.0 working
copy remains separate. Carry this corrective change forward when 2.2.0 resumes.
Only after explicit approval: bump all relevant version labels to 2.1.2,
build/check the Windows installer and publish its blockmap/latest.yml/checksums
and release notes without force-pushing or rewriting history.
