# CleanFlow 2.0.0 — macOS guidance

2.0.0 includes production source approved after demo review. Themes, views and report configuration
are shared web code. Filesystem automatic backups and the updater remain Windows-only.
The optional existing macOS PDF bridge is preserved; no macOS build/test is claimed.

Automatic GitHub updates are Windows-only. The existing macOS-specific PDF preview path is preserved.

This release supplies shared application source and a Windows installer, not a macOS installer. Demo fixtures are excluded from production. Do not overwrite an existing native macOS application or change its storage origin without a backup and the actual launcher sources. Native macOS behavior has not been tested on this Windows machine.

Open this folder in Codex on macOS or Windows. Build platform-specific installers from this source, use `assets/cleanflow-icon.png`, and do not include demo mode in the user-facing app. The app works locally and stores user data in the device browser/app container.

Before packaging, run `node --test tests/business.test.mjs`. For local browser development only, run `node server.mjs` and open `http://127.0.0.1:5173`.
