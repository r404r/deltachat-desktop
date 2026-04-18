# Task 5: Contact Key List + Detail View

## Objective

Show encryption key information for contacts. Two views:
1. Contact list — shows contacts with their encryption status
2. Contact detail — shows key details for a selected contact

## Changes Required

### 1. Create `ContactKeyList.tsx`

`packages/frontend/src/components/dialogs/KeyManagement/ContactKeyList.tsx`

- Fetches contact list via `BackendRemote.rpc.getContacts(accountId, ...)`
- Shows each contact with:
  - Name / email
  - Verified icon (if verified)
  - Encryption status indicator (e2ee available or not)
- Clicking a contact opens `ContactKeyDetail`

### 2. Create `ContactKeyDetail.tsx`

`packages/frontend/src/components/dialogs/KeyManagement/ContactKeyDetail.tsx`

- Takes `contactId` as prop
- Calls `getContactEncryptionInfo(accountId, contactId)` to get encryption text
- Displays:
  - Contact name and email
  - Encryption info text (from existing API)
  - Verification status with verifier info (reuse pattern from ViewProfile)
  - Fingerprint (parsed from encryption info text)
- Future: will show key history, pin/unpin buttons when core APIs available

### 3. Navigation

From `KeyManagementDialog`:
- "View Contact Keys" button opens `ContactKeyList` as a sub-view
- Contact list items open `ContactKeyDetail`
- Use dialog header back button for navigation between views

## UI Layout

### Contact List View
```
┌─ Contact Keys ─────────────────────────┐
│ ← Back                                 │
│                                         │
│  🔒 Alice (alice@example.com)  ✓       │
│  🔒 Bob (bob@example.com)              │
│  🔓 Charlie (charlie@example.com)      │
│                                         │
└─────────────────────────────────────────┘
```

### Contact Detail View
```
┌─ Alice ────────────────────────────────┐
│ ← Back                                 │
│                                         │
│  alice@example.com                      │
│  Status: Verified (by You)              │
│                                         │
│  Fingerprint:                           │
│  ABCD 1234 5678 9012 3456              │
│  7890 ABCD EF01 2345 6789              │
│  [Copy]                                │
│                                         │
│  Encryption Info:                       │
│  (text from getContactEncryptionInfo)   │
│                                         │
└─────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Contact list shows contacts with encryption indicators
- [ ] Clicking a contact shows key detail
- [ ] Encryption info text displayed from existing RPC
- [ ] Back navigation works
- [ ] Verified contacts show verification badge
