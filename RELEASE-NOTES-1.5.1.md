# CleanFlow 1.5.1 — Windows updates

- Packaged Windows app checks the public GitHub Releases feed once at startup.
- Newer stable versions download in the background. No token or account required.
- English/Polish confirmation asks before installation and restart. Save open forms
  first. Later, dismissal and ordinary app exit never authorize installation.
- Failed/offline checks do not block app startup. macOS/web/demo are unchanged.
- App identity, local origin, IndexedDB name/schema and backup behavior are unchanged.
  Production remains blank; user data and demo fixtures are not distributed.

Install **CleanFlow-Setup-1.5.1.exe** manually once: 1.5.0 has no updater. Export a
JSON backup before installing; use the same installation directory. Do not uninstall
or delete the app's data folder. The installer remains unsigned; Windows may warn.

Future releases must include the installer, its `.blockmap` and `latest.yml` together.
The updater verifies the downloaded installer against the manifest SHA-512. No code
signing certificate is configured: this is not publisher-signature authentication.
Protect the GitHub publishing account accordingly.

Validation: automated updater lifecycle/consent/offline/platform/i18n tests and
business regressions, plus packaged Windows smoke test. A real upgrade to a future
release is not certified until a newer installer is available and exercised.
