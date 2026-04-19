# Task 10: Import Key Preflight + Add-Account Guidance

## Background

Core v2.49.0 intentionally disallows replacing an existing account key.

- PR [chatmail/core#6574](https://github.com/chatmail/core/pull/6574)
  "fix: make it impossible to overwrite default key" (merged 2025-02-26).
- `src/key.rs::store_self_keypair` does a plain `INSERT INTO config
  (keyname, value) VALUES ('key_id', ?)` against a UNIQUE column. If the
  account already has `key_id`, SQLite aborts with
  `UNIQUE constraint failed: config.keyname` (error 2067).
- The whole operation runs in a transaction, so the previous key is
  preserved on failure (assertion in PR test:
  `load_self_secret_key == old_key`).

The underlying reasons (from PR description + interface#80):
- Replacing a key breaks verified/SecureJoin groups the user is already in
- Autocrypt/SecureJoin has no key rotation protocol; peers can't be told
- External keys use algorithms core hasn't audited

The **only** officially supported way to use a custom key is to import it
on a **brand-new, unconfigured** account (before core generates its own).

## Observed Symptom (before this fix)

User clicks Import Key → succeeds silently → a red toast appears on the
main screen: `UNIQUE constraint failed: config.keyname: Error code 2067`.
The account's key is unchanged (good), but the error is leaked from the
DB layer and the UI claimed success. Confusing.

## Implementation

### 1. Preflight inside `handleImport`

Before the existing multi-step flow, check if the account already has a
key. Use the existing `getAccountKeyInfo()` which returns a non-empty
`fingerprint` for any configured account.

```typescript
const existing = await getAccountKeyInfo(selectedAccountId())
if (existing.fingerprint) {
  // Show the "cannot replace" explanation dialog (see below)
  return
}
// ... continue existing flow
```

### 2. `CannotReplaceKeyDialog` component

A new dialog (not a ConfirmationDialog — we want 3 buttons + custom layout).

Content:
- Header: "Cannot Replace Existing Key"
- Body:
  - State the fact (account has a key, shows fingerprint)
  - Explain WHY (core design, breaks verified groups, no rotation protocol)
  - Describe the workaround (new account, import before first login)
- Buttons:
  - Cancel (primary close)
  - "Add New Account" — opens the add-account flow and closes dialog

### 3. Add-Account flow

The host app exposes `window.__changeScreen(Screens.Welcome)` or the
`selectedAccountId` store can switch. Need to find the right hook — likely
there's a "Add Account" button already in the UI we can reuse the handler
of.

### 4. Update import warning text

Since the preflight now blocks the bad path, the existing warning body
doesn't need to mention "replacing existing key breaks things" — that
case never reaches the warning dialog. But still keep the other
constraints (no passphrase, RSA/Ed25519 only, etc.).

Actually, simpler: keep the warning text as-is. It's still valid for the
new-account case (the key IS being set as default, still unencrypted, etc.).

### 5. Email match verification (deferred)

We considered validating that the imported key's UID email matches the
account's `configured_addr`. This requires parsing PGP ASCII-armored
format in JS (extra dependency). Deferred; the warning dialog instructs
the user to verify manually.

## Acceptance Criteria

- [ ] Clicking Import Key on a configured account shows the
  "Cannot Replace" dialog, never reaches the RPC call
- [ ] Dialog clearly explains WHY (not just "not allowed")
- [ ] "Add New Account" button navigates to the add-account flow
- [ ] On a newly-created unconfigured account, import flow still works
  end-to-end (existing behavior)
- [ ] No change to the UNIQUE constraint toast for accounts that DO
  somehow reach core (they shouldn't, but if they do the toast still
  fires as a safety net)
