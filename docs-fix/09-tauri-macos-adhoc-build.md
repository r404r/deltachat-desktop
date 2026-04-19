# Tauri macOS ad-hoc Build Troubleshooting

This document covers every gotcha we hit while producing a working
local macOS Tauri DMG.

## Full working build recipe

Run from the repo root:

```bash
# 1. Force-refresh the frontend bundle into target-tauri/html-dist.
#    DO NOT skip this: `pnpm tauri build` may reuse a stale bundle if
#    the incremental-build cache decides nothing changed, which can
#    ship an out-of-date frontend inside the .app (see "Stale frontend
#    bundle" below).
cd packages/target-tauri
VERSION_INFO_GIT_REF="v2.49.0-dev" pnpm build4production

# 2. Link the Rust binary and bundle the .app. Uses ad-hoc signing
#    because we don't have an Apple Developer certificate.
VERSION_INFO_GIT_REF="v2.49.0-dev" APPLE_SIGNING_IDENTITY="-" pnpm tauri build

# 3. Re-sign with dev entitlements (see "Gatekeeper rejection" below).
cd ../..
codesign --force --deep --sign - \
  --entitlements packages/target-tauri/bundle_resources/Entitlements.dev.plist \
  --options runtime \
  target/release/bundle/macos/deltachat-tauri.app

# 4. Rebuild the DMG from the re-signed .app. Clean up leftovers first
#    so `bundle_dmg.sh` doesn't refuse to re-mount a stale volume.
cd target/release/bundle/dmg
# Detach any still-mounted DMG work volume from a previous failed run
hdiutil info | grep "/Volumes/dmg\." | awk '{print $3}' \
  | xargs -n1 -I{} hdiutil detach {} -force 2>/dev/null || true
rm -f deltachat-tauri_*.dmg rw.*.dmg
bash bundle_dmg.sh \
  --volname "deltachat-tauri" \
  --icon-size 128 \
  --icon "deltachat-tauri.app" 180 170 \
  --app-drop-link 480 170 \
  --window-size 660 400 \
  "deltachat-tauri_2.49.0_aarch64.dmg" \
  "../macos/deltachat-tauri.app"
```

Final artifact:
`target/release/bundle/dmg/deltachat-tauri_2.49.0_aarch64.dmg`

## Known issue #1 — Gatekeeper rejection

### Symptom

After running `pnpm tauri build`, the generated `deltachat-tauri.app`
(or the DMG installer) refuses to launch on macOS with:

> "The application 'deltachat-tauri' can't be opened."

### Root cause

The production entitlements file `bundle_resources/Entitlements.plist`
contains Apple-developer-team-specific entitlements:

- `com.apple.application-identifier` → `8Y86453UA8.chat.delta.desktop.tauri`
- `com.apple.developer.team-identifier` → `8Y86453UA8`
- `com.apple.developer.associated-domains` → `applinks:i.delta.chat`

These are only valid when signed with an Apple Developer certificate
belonging to team `8Y86453UA8` (merlinux). Local builds use **ad-hoc
signing** (`codesign --sign -`), which cannot satisfy these entitlements,
so macOS refuses to launch the app.

### Fix

Use `bundle_resources/Entitlements.dev.plist` (committed in this repo)
as a drop-in replacement. It has the same runtime / network / device /
file capabilities but without the developer-team keys. Re-sign the
`.app` after `pnpm tauri build` (step 3 in the recipe above).

## Known issue #2 — Stale frontend bundle

### Symptom

Features that shipped recently in the frontend (e.g. the Key Management
dialog reading fingerprints via `checkQr`) are missing or broken in the
Tauri build, even though `packages/frontend/html-dist/bundle.js` is up
to date on disk.

### Root cause

Tauri embeds the frontend it finds in `packages/target-tauri/html-dist`
at build time. That directory is populated by `pnpm build4production`
(via `build:compose-frontend` which copies from
`packages/frontend/html-dist`). If an earlier `pnpm tauri build` run
skipped `beforeBuildCommand` (for example because pnpm's incremental
scheduler saw no changed source files) the target-tauri copy stays
stale, and the final `.app` contains an old bundle.

We observed this happen between the fingerprint-regex fix
(commit `0deb0db5b`) and the `checkQr` fix (commit `2eb02922e`): the
Tauri DMG was built between the two and still contained the regex
version, which failed to parse chatmail-account QRs.

### Fix

Always run `pnpm build4production` explicitly from
`packages/target-tauri` BEFORE `pnpm tauri build` (step 1 in the recipe
above). This guarantees `target-tauri/html-dist/bundle.js` is freshly
generated from the latest frontend sources.

Sanity check: the modification time of
`packages/target-tauri/html-dist/bundle.js` should be more recent than
the last frontend commit you want shipped.

## Known issue #3 — `codesign` rejects `Entitlements.dev.plist`

### Symptom

```
Failed to parse entitlements: AMFIUnserializeXML: syntax error near line 16
```

### Root cause

Apple's `AMFIUnserializeXML` (used by `codesign --entitlements`) does
not tolerate backslash-line-continuation (`\`) inside XML comments, even
though standard XML does. The file must not contain backslashes in
comments.

### Fix

Already handled in-repo: `Entitlements.dev.plist` now has a single-line
comment pointing at this document. Don't reintroduce multi-line bash
examples inside the plist comment.

## Known issue #4 — Stale mount from a previous DMG run

### Symptom

```
hdiutil: couldn't unmount "disk4" - Resource busy
The volume can't be ejected because it's currently in use.
```

followed by `bundle_dmg.sh` leaving a `rw.<pid>.deltachat-tauri_*.dmg`
file around and no final DMG.

### Root cause

A previous `bundle_dmg.sh` run left a work volume mounted under
`/Volumes/dmg.XXXXXX`. When the next run tries to unmount its own work
volume it hits the stale one too.

### Fix

Before re-running `bundle_dmg.sh`, detach any stale work volumes and
remove leftover temp files:

```bash
hdiutil info | grep "/Volumes/dmg\." | awk '{print $3}' \
  | xargs -n1 -I{} hdiutil detach {} -force 2>/dev/null || true
rm -f rw.*.dmg deltachat-tauri_*.dmg
```

Step 4 of the recipe above already does this.

## After installation: Gatekeeper quarantine

After copying the app to `/Applications`, macOS adds a quarantine
attribute. The first launch must be triggered via **right-click → Open
→ Open Anyway** in Finder (not double-click).

If you need to clear the quarantine attribute manually (e.g. so you can
double-click later):

```bash
xattr -dr com.apple.quarantine /Applications/deltachat-tauri.app
```

## Production builds

For official releases, do NOT use `Entitlements.dev.plist`. Keep using
`Entitlements.plist` with a valid Apple Developer certificate via
`APPLE_SIGNING_IDENTITY=<cert-id> pnpm tauri build`. Skip steps 3 and 4
of the recipe above — the signed app and DMG produced by Tauri directly
are what you ship.
