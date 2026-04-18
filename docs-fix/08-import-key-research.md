# Import Self Key — Research Findings

## Summary

`importSelfKeys` RPC exists in core (v2.49.0) and is functional. The UI was
removed upstream as a product decision, not a technical limitation.

## RPC Signature

```typescript
importSelfKeys(
  accountId: number,
  path: string,                // absolute path to .asc file
  passphrase: string | null    // likely only null works today
): Promise<null>
```

Core method: `import_self_keys`

## Upstream History

- **2025-03-18 (commit 8f881868b, PR #4784)**: Delta Chat removed the
  "Import keys" UI from settings.
- **Reason**: See [deltachat/interface#80](https://github.com/deltachat/interface/issues/80)

## Why It Was Removed

Per the upstream issue, four reasons:

1. **Breaks verified groups** — imported keys cause "green-checkmark" groups
   to show `The message was sent with non-verified encryption` errors
2. **No passphrase support** — cannot import password-protected keys
3. **Security audit coverage** — audits only cover RSA/Ed25519 keys Delta Chat
   generates; arbitrary keys are unsafe
4. **Future v6 migration** — migrating to v6 keys is harder if user-imported
   keys from arbitrary sources exist

## Upstream Recommendation

Use **Autocrypt Setup Message** instead — app-internal key transfer between
devices. Does NOT support importing externally-generated GPG keys.

## Historical UI (for reference)

From commit `8f881868b~1`:

```typescript
const opts: RuntimeOpenDialogOptions = {
  title: tx('pref_managekeys_import_secret_keys'),
  properties: ['openFile'],
  filters: [{ extensions: ['asc'], name: 'PGP Key' }],
}
const [filename] = await runtime.showOpenFileDialog(opts)
if (!filename) return
await BackendRemote.rpc.importSelfKeys(selectedAccountId(), filename, null)
```

## Use Case for Re-enabling

- Expert users who need shared-address E2EE interop
- Debugging / testing scenarios
- Specific integration with existing OpenPGP infrastructure
- The `enableKeyManagement` feature this project is building

## Constraints We Must Surface

- Only `.asc` (ASCII-armored) format
- No password-protected keys
- RSA or Ed25519 only
- Will break verified groups
- Destructive (replaces existing key)
- May break on future Delta Chat versions
