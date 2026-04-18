# Task 1: Feature Flag + Project Setup

## Objective

Add `enableKeyManagement` feature flag so the entire key management UI is gated
behind an experimental setting.

## Changes Required

### 1. Add to `DesktopSettingsType` (`packages/shared/shared-types.d.ts`)

```typescript
enableKeyManagement: boolean
```

### 2. Add default value (`packages/target-electron/src/ipc.ts` or equivalent defaults location)

```typescript
enableKeyManagement: false
```

### 3. Add toggle in `ExperimentalFeatures.tsx`

```tsx
<DesktopSettingsSwitch
  settingsKey='enableKeyManagement'
  label='Key Management'
  description='View and manage encryption keys for your account and contacts'
/>
```

### 4. Add translation string

In `_locales/_untranslated_en.json`:

```json
{
  "key_management": { "message": "Key Management" },
  "key_management_desc": { "message": "View and manage encryption keys for your account and contacts" }
}
```

## Acceptance Criteria

- [ ] Feature flag toggle appears in Settings > Advanced > Experimental Features
- [ ] Default value is `false`
- [ ] No UI appears when flag is off
- [ ] TypeScript compiles without errors
