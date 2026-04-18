# Codex Proposal Review

## Summary

The Codex proposal for key management in Delta Chat Desktop is architecturally
sound in principle but has significant scope issues for implementation within
the `deltachat-desktop` repository alone.

## What's Good

1. **Correct architecture**: All key logic in core, Desktop is pure UI + RPC
2. **Pin mechanism design**: Override selection, not key replacement
3. **Clear PR split**: Separates read-only from write operations
4. **Safety constraints**: Only pin observed keys, don't modify protocol state

## Critical Issues

### 1. Core/Desktop scope conflation

The proposal treats core and desktop as a single project. Tasks 1-3 of the
proposed plan (key info API, override table + pin logic, resolve_encryption_key)
are core-side work requiring changes to `deltachat-core-rust`.

**Impact**: We cannot implement new RPC endpoints, database tables, or key
selection algorithms in this repo.

### 2. Missing RPC APIs

These APIs do not exist in the current core:
- `get_account_key_info`
- `get_contact_key_info`
- `list_contact_key_history`
- `pin_contact_key` / `unpin_contact_key`
- `import_self_secret_key`
- `set_contact_trust`

Events `ContactKeyChanged`, `KeyConflictDetected`, `AccountKeyChanged` also
do not exist.

### 3. Existing capabilities underutilized

The proposal ignores existing APIs:
- `getContactEncryptionInfo(accountId, contactId)` — returns encryption text
  with fingerprint info
- `getChatEncryptionInfo(accountId, chatId)` — returns chat encryption details
- Contact properties: `isVerified`, `verifierId`, `e2eeAvail`

These provide a foundation for read-only key inspection without any core changes.

### 4. "Phase 1 recommended" is actually Phase 3+

The proposed "Phase 1" (key inspect + pin/unpin + import) requires core API
changes. True Phase 1 should use existing APIs for read-only inspection.

## Revised Approach

### Desktop Phase 1 (no core changes needed)
- Feature flag
- Type definitions for future APIs
- Read-only key inspection using existing `getContactEncryptionInfo`
- Account key display
- Contact key list and detail views

### Desktop Phase 2 (needs core API stubs)
- Pin/unpin UI with stub implementations
- Import key UI with stub implementation
- Prepare for core API integration

### Core Phase (separate repo)
- Implement `manual_key_overrides` table
- Implement `resolve_encryption_key` algorithm
- Add new JSON-RPC endpoints
- Add new events

### Integration Phase
- Connect Desktop stubs to real core APIs
- End-to-end testing
