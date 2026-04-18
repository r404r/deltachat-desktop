# Task 8: Enable Real Import Self Key

## Background

Research revealed that `importSelfKeys(accountId, path, passphrase)` IS a
working core RPC method. It was not "unsupported by core" — Delta Chat upstream
removed the UI on 2025-03-18 (PR #4784) as a product decision, not a technical
limitation. See `docs-fix/08-import-key-research.md` for details.

This task enables the feature as an experimental capability, gated behind
`enableKeyManagement` with explicit multi-step warnings.

## Known Constraints (must surface in UI)

1. **Breaks verified groups** — imported key will cause verified groups to
   show "non-verified encryption" warnings
2. **No passphrase support** — only unencrypted `.asc` files
3. **Algorithm limits** — only RSA or Ed25519 (Delta Chat's supported types)
4. **Future migration risk** — may conflict with future v6 key format
5. **Replaces existing key** — operation is destructive

## Implementation

### 1. Replace `importSelfSecretKey` stub with real RPC call

In `packages/frontend/src/backend/key-management.ts`:

```typescript
export async function importSelfSecretKey(
  accountId: number,
  path: string
): Promise<KeyOperationResult> {
  try {
    await BackendRemote.rpc.importSelfKeys(accountId, path, null)
    return { success: true }
  } catch (err) {
    return { success: false, error: unknownErrorToString(err) }
  }
}
```

Signature changes from `keyData: string` to `path: string` (core takes file path).

### 2. Create `ImportKeyDialog` component

Multi-step flow:
1. **Warning screen** — lists all 5 constraints above, user must click "I understand"
2. **File selection** — native file picker with `.asc` filter
3. **Final confirmation** — shows selected file path, explains replacement is destructive
4. **Execution** — calls `importSelfSecretKey`, shows progress and result

### 3. Enable the button

In `AccountKeySection.tsx`:
- Remove the `disabled` attribute
- Set `coreSupportsImport = true`
- Wire up `onClick` to open `ImportKeyDialog`

### 4. Translation strings

Add clear warning strings in English.

## Acceptance Criteria

- [ ] `importSelfSecretKey` calls real RPC
- [ ] Warning dialog shows all 5 constraints
- [ ] File picker filters to `.asc` files
- [ ] Second confirmation before execution
- [ ] Success/error feedback shown
- [ ] On success, `AccountKeySection` refreshes to show new fingerprint
