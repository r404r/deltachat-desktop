# Task 9: Export Self Key

## Decision Summary (user-approved)

| Decision | Choice |
|---|---|
| Plan | B — multi-step warnings matching import flow |
| Button position | Next to Import Key in `AccountKeySection` |
| Export content | Private + public key (core default, unencrypted) |
| Browser temp file | Warn user in UI (no auto-cleanup) |

## Background

`exportSelfKeys(accountId, path, passphrase)` is a functional core RPC.
Upstream removed the UI in Dec 2025 (PR #5801) as "dead code" after the
import UI was removed. We're re-enabling it as experimental, gated
behind `enableKeyManagement`.

## Constraints (must surface in UI)

1. **Exported keys are UNENCRYPTED** (`passphrase` always `null`)
2. **No revocation** — a leaked key can decrypt past and future messages
3. **File permissions** not enforced — store on encrypted disk / password manager
4. **Browser**: files kept on server temporarily after download

## Implementation

### 1. `exportSelfSecretKey` in `backend/key-management.ts`

```typescript
export async function exportSelfSecretKey(
  accountId: number,
  directoryPath: string
): Promise<KeyOperationResult> {
  try {
    await BackendRemote.rpc.exportSelfKeys(accountId, directoryPath, null)
    return { success: true }
  } catch (err) {
    return { success: false, error: unknownErrorToString(err) }
  }
}
```

### 2. `ExportKeyButton` component inside `AccountKeySection.tsx`

Multi-step flow:
1. Risk acknowledgement dialog (UNENCRYPTED warning + danger confirm)
2. Directory picker (`properties: ['openDirectory', 'createDirectory']`)
   - Browser: `destination = '<BROWSER>'` special placeholder
3. Final confirmation with target path
4. Execute `exportSelfSecretKey` + listen for `ImexFileWritten` events
5. Success feedback:
   - Electron/Tauri: show path, optional "Open folder"
   - Browser: show download links for each written file

### 3. Event handling

Listen on `BackendRemote.getContextEvents(accountId)` for:
- `ImexFileWritten` — collect each written file path
- Fire off emitter handler in finally

### 4. Translation strings

- `key_management_export_key` / `key_management_export_desc`
- `key_management_export_warning_header` / `key_management_export_warning_body`
- `key_management_export_confirm_header` / `key_management_export_confirm_body`
- `key_management_export_success_electron` / `key_management_export_success_browser`

## Acceptance Criteria

- [ ] Export Key button visible next to Import Key (when flag on)
- [ ] Warning dialog lists all 4 constraints
- [ ] Directory picker works on Electron/Tauri
- [ ] Browser runtime uses `<BROWSER>` placeholder and shows download link
- [ ] `ImexFileWritten` events collected and surfaced to user
- [ ] Emitter unsubscribed in `finally`
- [ ] Error feedback via `window.__userFeedback`
