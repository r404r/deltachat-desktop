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
| 1 | Feature flag + docs-fix setup | `01-feature-flag.md` | TODO |
| 2 | TypeScript type definitions for key management RPC | `02-type-definitions.md` | TODO |
| 3 | Key Management settings entry point | `03-settings-entry.md` | TODO |
| 4 | Account key info display | `04-account-key-info.md` | TODO |
| 5 | Contact key list + detail view | `05-contact-key-info.md` | TODO |
| 6 | Pin / unpin UI | `06-pin-unpin-ui.md` | TODO |
| 7 | Import self key UI | `07-import-self-key.md` | TODO |
