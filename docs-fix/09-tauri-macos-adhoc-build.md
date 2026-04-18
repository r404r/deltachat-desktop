# Tauri macOS ad-hoc Build Troubleshooting

## Symptom

After running `pnpm tauri build`, the generated `deltachat-tauri.app`
(or the DMG installer) refuses to launch on macOS with:

> "The application 'deltachat-tauri' can't be opened."

## Root Cause

The production entitlements file `bundle_resources/Entitlements.plist`
contains Apple-developer-team-specific entitlements:

- `com.apple.application-identifier` → `8Y86453UA8.chat.delta.desktop.tauri`
- `com.apple.developer.team-identifier` → `8Y86453UA8`
- `com.apple.developer.associated-domains` → `applinks:i.delta.chat`

These are only valid when signed with an Apple Developer certificate
belonging to team `8Y86453UA8` (merlinux). Local builds use **ad-hoc
signing** (`codesign --sign -`), which cannot satisfy these entitlements,
so macOS refuses to launch the app.

## Fix for Local Builds

Use `bundle_resources/Entitlements.dev.plist` (added in this repo) as
a drop-in replacement. After building, re-sign the app:

```bash
codesign --force --deep --sign - \
  --entitlements packages/target-tauri/bundle_resources/Entitlements.dev.plist \
  --options runtime \
  target/release/bundle/macos/deltachat-tauri.app
```

Then rebuild the DMG from the re-signed `.app`:

```bash
cd target/release/bundle/dmg
rm -f deltachat-tauri_*.dmg
bash bundle_dmg.sh \
  --volname "deltachat-tauri" \
  --icon-size 128 \
  --icon "deltachat-tauri.app" 180 170 \
  --app-drop-link 480 170 \
  --window-size 660 400 \
  "deltachat-tauri_2.49.0_aarch64.dmg" \
  "../macos/deltachat-tauri.app"
```

## If You Still Get Gatekeeper Warnings

After copying the app to `/Applications`, macOS adds a quarantine
attribute. To clear it:

```bash
xattr -dr com.apple.quarantine /Applications/deltachat-tauri.app
```

Or right-click the app → Open → Open anyway.

## Production Builds

For official releases, do NOT use `Entitlements.dev.plist`. Keep using
`Entitlements.plist` with a valid Apple Developer certificate via
`APPLE_SIGNING_IDENTITY=<cert-id> pnpm tauri build`.
