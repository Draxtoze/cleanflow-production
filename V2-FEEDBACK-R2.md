# Local review revision R2 — 2.0.0 (unpublished)

## R4 backup-folder repair (latest)

The desktop folder action now resolves the managed directory with `fs.realpathSync.native` before opening Explorer. In this review environment, Windows redirects logical AppData into the Codex package LocalCache; passing the logical path to Explorer produced an unavailable-location dialog even though the app could read its backups. No profile identity or stored data is moved or changed. Explorer receives only the canonical managed directory, never a renderer-supplied path. The UI disables the button during opening and shows the actual directory or a translated opening error. Unit tests cover canonical-path handling and launch failures; the isolated native test clicks the actual settings button and checks its returned path.

## R3 palette replacement (latest)

Ocean remains byte-for-byte unchanged. The other five visible choices are now Nordic, Polar night, Porcelain, Linen and Dusty rose, with corresponding Polish labels. Nordic/Polar night adapt Nord; Porcelain uses Catppuccin Latte; Linen and Dusty rose use subdued neutral adaptations. Previous Radix palette notes below describe the superseded R2 choices. Stored theme identifiers are retained to preserve existing preferences and imports. This remains an unpublished 2.0.0 review iteration; 2.0.1 is reserved for the separately authorized update test.

- Apartment details now include the associated owner. Classic cards show the owner on the right; compact cards omit category, owner, reference and status while retaining actions and cleaning price.
- Saved status and settings stay at the bottom of the desktop sidebar. On narrow screens they occupy a fixed bottom bar with reserved content space.
- Ocean is unchanged. Additional palettes use Radix Colors light grass/indigo/amber/plum and dark slate tokens: https://github.com/radix-ui/colors (MIT). Booking label surfaces now follow the theme; business status colors remain unchanged.
- Automatic backup feedback distinguishes a newly created file from an existing, verified immutable daily file. It explains how to export newer changes manually. Native demo retention information no longer incorrectly says no files were written.
- Verified all 31 existing demo backup files in read-only mode: checksums and import validation pass. No production data was inspected or changed.
- Validation: 39 unit tests pass; isolated native Electron backup/restart test passes; visual regression checks owner modal/card, compact essentials, footer positions at desktop/mobile sizes and >=4.5:1 contrast of booking labels/selected navigation in all six themes.

The user approved publication of production 2.0.0 with its Windows installer on 19 October 2026, after reviewing the corrected demo. The local installer includes R4 and the final production labels. See V2-LOCAL-BUILD.txt for its checksum. Real installation and the dummy 2.0.1 update experiment still require separate approval.
