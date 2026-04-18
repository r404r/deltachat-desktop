# Task 7: Import Self Key UI

## Objective

Add UI for importing a private key file to replace the account's current key.
This is a sensitive operation requiring clear warnings and confirmation.

## Changes Required

### 1. Add import button to `AccountKeySection.tsx`

- "Import Key" button in the My Keys section
- Opens a file picker for key files (`.asc`, `.key`, `.pgp`)

### 2. Create `ImportKeyDialog.tsx`

`packages/frontend/src/components/dialogs/KeyManagement/ImportKeyDialog.tsx`

Multi-step flow:
1. **File selection** — use runtime file picker (`runtime.showOpenFileDialog`)
2. **Preview** — show key fingerprint and email from the file
3. **Warning** — explain consequences (replaces current key, affects all conversations)
4. **Confirm** — final confirmation button

### 3. Stub behavior

Until core provides `import_self_secret_key` RPC:
- File selection works (to validate the UI flow)
- After file selection, show "Import not yet supported by core" message
- No actual key import occurs

## Acceptance Criteria

- [ ] Import button visible in My Keys section
- [ ] File picker opens with key file extensions filter
- [ ] Warning about consequences is shown
- [ ] Stub returns appropriate message
- [ ] No key modification occurs in stub mode
