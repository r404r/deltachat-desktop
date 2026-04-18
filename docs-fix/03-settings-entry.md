# Task 3: Key Management Settings Entry Point

## Objective

Add a "Key Management" entry in Settings > Advanced that opens the key
management dialog. Only visible when `enableKeyManagement` feature flag is on.

## Changes Required

### 1. Create `KeyManagement.tsx` component

`packages/frontend/src/components/Settings/KeyManagement.tsx`

Top-level key management component with two sections:
- **My Keys** — shows account key fingerprint
- **Contact Keys** — button to open contact key list

Pattern: follow `Advanced.tsx` structure using `SettingsButton`, `SettingsHeading`,
`SettingsSeparator`.

### 2. Add entry in `Advanced.tsx`

Add a `SettingsButton` (conditionally rendered when `enableKeyManagement` is true)
that navigates to key management view or opens a dialog.

```tsx
{desktopSettings.enableKeyManagement && (
  <SettingsButton onClick={() => openDialog(KeyManagementDialog)}>
    {tx('key_management')}
  </SettingsButton>
)}
```

### 3. Create `KeyManagementDialog.tsx`

`packages/frontend/src/components/dialogs/KeyManagement/index.tsx`

Dialog wrapper using the standard Dialog components:
- `Dialog` + `DialogHeader` + `DialogBody` + `DialogContent`
- Contains the `KeyManagement` settings component

## UI Layout

```
┌─ Key Management ──────────────────────┐
│                                        │
│  My Keys                               │
│  ┌────────────────────────────────┐    │
│  │ Fingerprint: ABCD 1234 ...    │    │
│  │ Algorithm: Ed25519            │    │
│  │ [Copy Fingerprint] [Export]   │    │
│  └────────────────────────────────┘    │
│                                        │
│  Contact Keys                          │
│  ┌────────────────────────────────┐    │
│  │ [View Contact Keys →]         │    │
│  └────────────────────────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] "Key Management" button appears in Advanced settings when flag is on
- [ ] Button does not appear when flag is off
- [ ] Clicking opens a dialog with the layout above
- [ ] Dialog follows existing UI patterns (Dialog/DialogHeader/DialogBody)
