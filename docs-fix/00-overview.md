# Key Management Feature - Overview

## Goal

Add key management capabilities (inspect / pin / unpin / import) to Delta Chat Desktop.

## Architecture Constraint

All key logic lives in `deltachat-core-rust`. Desktop is pure UI + RPC calls.

## Phasing

### Phase 1 - Desktop UI (this repo)

Build UI using existing and future core APIs. Where core APIs don't exist yet,
define TypeScript interfaces and use stub/mock implementations gated behind
the feature flag.

### Phase 2 - Core API (deltachat-core-rust repo)

Implement new RPC methods in core. This is out of scope for this repo.

### Phase 3 - Integration

Connect Desktop UI to real core APIs once available.

## Existing Capabilities (already in codebase)

| Capability | Location |
|---|---|
| `getContactEncryptionInfo` RPC | `EncryptionInfo.tsx:30` |
| `getChatEncryptionInfo` RPC | `EncryptionInfo.tsx:34` |
| Verified icon / badge | `VerifiedIcon.tsx` |
| Verification display in profile | `ViewProfile/index.tsx:183-224` |
| Feature flag mechanism | `ExperimentalFeatures.tsx` |
| Settings UI pattern | `Settings/Settings.tsx` |
| Dialog system | `DialogContext.tsx` + `useDialog.ts` |

## Task List

| # | Task | Spec File | Status |
|---|---|---|---|
| 1 | Feature flag + docs-fix setup | `01-feature-flag.md` | DONE |
| 2 | TypeScript type definitions for key management RPC | `02-type-definitions.md` | DONE |
| 3 | Key Management settings entry point | `03-settings-entry.md` | DONE |
| 4 | Account key info display | `04-account-key-info.md` | DONE |
| 5 | Contact key list + detail view | `05-contact-key-info.md` | DONE |
| 6 | Pin / unpin UI | `06-pin-unpin-ui.md` | DONE (disabled, awaiting core) |
| 7 | Import self key UI | `07-import-self-key.md` | SUPERSEDED by Task 8 |
| 8 | Enable real import self key | `08-enable-import-key.md` | DONE (experimental) |
| 9 | Export self key | `10-export-self-key.md` | DONE (experimental) |
| 10 | Import key preflight + add-account guidance | `11-import-key-preflight.md` | DONE |

## Related fork-infrastructure docs

Not part of the key management feature, but live here because they document
fork-specific practices:

| Doc | Topic |
|---|---|
| [`09-tauri-macos-adhoc-build.md`](./09-tauri-macos-adhoc-build.md) | Building macOS DMGs with ad-hoc signing (no Apple Developer cert); four known gotchas |
| [`12-ci-workflow-notes.md`](./12-ci-workflow-notes.md) | GitHub Actions audit for the fork — which workflows work out of the box, which need disabling, and the sync checklist |
