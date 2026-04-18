# Task 6: Pin / Unpin UI

## Objective

Add pin/unpin key controls to the contact key detail view. These controls call
the RPC adapter which currently stubs the operation (until core supports it).

## Changes Required

### 1. Add pin/unpin buttons to `ContactKeyDetail.tsx`

- "Pin this key" button — calls `pinContactKey()` from the RPC adapter
- "Unpin" button — calls `unpinContactKey()`
- Show current pin status
- Confirmation dialog before pinning (warn about consequences)

### 2. Create `PinKeyConfirmDialog.tsx`

`packages/frontend/src/components/dialogs/KeyManagement/PinKeyConfirmDialog.tsx`

Confirmation dialog explaining:
- What pinning means (forces use of this specific key)
- That auto key selection will be overridden
- Confirm / Cancel buttons

### 3. Status display

In `ContactKeyDetail`, show key trust level:
- `Verified` — SecureJoin verified
- `Pinned` — manually pinned by user
- `Opportunistic` — auto-detected via Autocrypt

### 4. Stub behavior

Until core supports pin/unpin:
- Buttons are rendered but show "Not yet available" toast on click
- Or buttons are disabled with tooltip explaining core support needed

## Acceptance Criteria

- [ ] Pin/unpin buttons visible in contact key detail
- [ ] Confirmation dialog shown before pin action
- [ ] Stub returns appropriate error/message
- [ ] Trust level status clearly displayed
- [ ] UI distinguishes verified vs pinned vs opportunistic
