# CleanFlow Production 1.1.5

Production source only: no demo data, no sample records, and no Windows-only launchers.

Open this folder in Codex on macOS or Windows. Build platform-specific installers from this source, use `assets/cleanflow-icon.png`, and do not include demo mode in the user-facing app. The app works locally and stores user data in the device browser/app container.

Before packaging, run `node --test tests/business.test.mjs`. For local browser development only, run `node server.mjs` and open `http://127.0.0.1:5173`.
