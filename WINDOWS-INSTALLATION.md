# Windows installation — CleanFlow 1.5.0

Download `CleanFlow-Setup-1.5.0.exe` from GitHub Releases and run it. Launch CleanFlow
from the Start menu or desktop shortcut. No terminal or extra runtime is needed.
The installer is unsigned; Windows may show an unknown-publisher warning.

Electron retains the current local HTML/JavaScript application. It uses an internal
`cleanflow://app` protocol, not a running HTTP server. Closing the window ends the
application. Renderer Node access is disabled and isolation/sandbox are enabled.
The production installer excludes the demo fixture module.

The NSIS installer is per user, adds Start-menu and optional desktop shortcuts,
and does not delete the application's data. Keep the application ID, name and
origin stable in later versions. Installer builds must be validated before release.

Before changing installations, export a JSON backup from the existing app.
Browser and existing native macOS data are not automatically read or modified.
To transfer them, explicitly export from that application and import into the new
one, reviewing the replacement confirmation first.

Developer build: install dependencies, run `npm test`, then `npm run package:windows`.
Build with Node.js 22.12 or newer. The installer is produced in `dist`. Unsigned installers may trigger
Windows trust warnings; signing must be configured for a polished public release.

Native macOS launchers and their existing data origin are not replaced by this
Windows packaging change. Native macOS validation requires the actual Mac source
and a Mac.

References: https://www.electronjs.org/docs/latest/api/protocol and
https://www.electron.build/docs/nsis/
