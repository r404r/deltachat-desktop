# Task 4: Account Key Info Display

## Objective

Show the current account's own key information (fingerprint, algorithm) in the
Key Management dialog's "My Keys" section.

## Changes Required

### 1. Create `AccountKeySection.tsx`

`packages/frontend/src/components/dialogs/KeyManagement/AccountKeySection.tsx`

Fetches and displays account key info:
- Uses `getContactEncryptionInfo(accountId, DC_CONTACT_ID_SELF)` (contact ID 1
  is self) to get encryption info text
- Parses fingerprint from the text response
- Displays fingerprint in grouped format (e.g. `ABCD 1234 5678 ...`)
- "Copy Fingerprint" button using `runtime.writeClipboardText()`

### 2. Integration

Import and render `AccountKeySection` in `KeyManagementDialog`.

## Data Source

Existing RPC method `getContactEncryptionInfo` returns a plain text string
containing the fingerprint. Parse it to extract the fingerprint value.

If a future `get_account_key_info` RPC becomes available, switch to that.

## Acceptance Criteria

- [ ] Account fingerprint is displayed in the My Keys section
- [ ] Fingerprint can be copied to clipboard
- [ ] Loading state shown while fetching
- [ ] Error state if info unavailable
