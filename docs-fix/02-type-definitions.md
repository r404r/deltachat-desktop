# Task 2: TypeScript Type Definitions for Key Management RPC

## Objective

Define TypeScript interfaces for the key management RPC methods that will be
provided by deltachat-core-rust. These types serve as the contract between
Desktop and Core.

## Changes Required

### 1. Create type definition file

`packages/frontend/src/types/key-management.ts`

```typescript
/** Key source indicating how the key was obtained */
export type KeySource = 'autocrypt' | 'gossip' | 'securejoin' | 'manual_import'

/** Trust level of a key */
export type KeyTrustLevel = 'verified' | 'trusted' | 'pinned' | 'opportunistic' | 'unknown'

/** Information about the account's own key */
export interface AccountKeyInfo {
  fingerprint: string
  created: number          // unix timestamp
  algorithm: string        // e.g. "Ed25519"
  addressMatchesAccount: boolean
}

/** A single observed key for a contact */
export interface ContactKeyObservation {
  fingerprint: string
  source: KeySource
  firstSeen: number        // unix timestamp
  lastSeen: number         // unix timestamp
  isPinned: boolean
  isActive: boolean        // currently used for encryption
  trustLevel: KeyTrustLevel
}

/** Full key info for a contact */
export interface ContactKeyInfo {
  contactId: number
  displayName: string
  address: string
  activeFingerprint: string | null
  keys: ContactKeyObservation[]
}

/** Key history entry */
export interface KeyHistoryEntry {
  fingerprint: string
  event: 'observed' | 'pinned' | 'unpinned' | 'replaced' | 'imported'
  timestamp: number
  source: KeySource
}

/** Result of a pin/unpin operation */
export interface KeyOperationResult {
  success: boolean
  error?: string
}
```

### 2. Create RPC adapter module

`packages/frontend/src/backend/key-management.ts`

This module wraps calls to BackendRemote. Initially uses existing APIs
(`getContactEncryptionInfo`) and stubs for future APIs.

```typescript
import { BackendRemote } from '../backend-com'
import type { AccountKeyInfo, ContactKeyInfo, KeyOperationResult } from '../types/key-management'

/** Get account key info - uses existing getContactEncryptionInfo for self */
export async function getAccountKeyInfo(accountId: number): Promise<AccountKeyInfo | null> {
  // Phase 1: parse from existing getContactEncryptionInfo(selfContactId)
  // Phase 3: call dedicated RPC method when available
}

/** Get key info for a contact */
export async function getContactKeyInfo(
  accountId: number,
  contactId: number
): Promise<ContactKeyInfo | null> {
  // Phase 1: parse from existing getContactEncryptionInfo
  // Phase 3: call dedicated RPC method
}

/** Pin a specific key for a contact (stub until core supports it) */
export async function pinContactKey(
  accountId: number,
  contactId: number,
  fingerprint: string
): Promise<KeyOperationResult> {
  // Phase 1: return { success: false, error: 'Not yet supported by core' }
  // Phase 3: call RPC pin_contact_key
}

/** Unpin key for a contact (stub until core supports it) */
export async function unpinContactKey(
  accountId: number,
  contactId: number
): Promise<KeyOperationResult> {
  // Phase 1: return { success: false, error: 'Not yet supported by core' }
  // Phase 3: call RPC unpin_contact_key
}
```

## Acceptance Criteria

- [ ] Type definitions compile without errors
- [ ] RPC adapter module exports all functions
- [ ] Existing APIs are used where possible
- [ ] Stubs clearly documented for future core API integration
