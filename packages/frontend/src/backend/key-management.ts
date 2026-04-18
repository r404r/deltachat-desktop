import { BackendRemote } from '../backend-com'

import { C } from '@deltachat/jsonrpc-client'

// -- Type definitions for key management --
// These types define the contract for future core RPC APIs.
// Phase 1 uses existing APIs; Phase 3 will switch to dedicated endpoints.

/** Key source indicating how the key was obtained */
export type KeySource =
  | 'autocrypt'
  | 'gossip'
  | 'securejoin'
  | 'manual_import'

/** Trust level of a key */
export type KeyTrustLevel =
  | 'verified'
  | 'trusted'
  | 'pinned'
  | 'opportunistic'
  | 'unknown'

/** Information about the account's own key */
export interface AccountKeyInfo {
  fingerprint: string
  encryptionInfo: string
}

/** Key info for a contact */
export interface ContactKeyInfo {
  contactId: number
  displayName: string
  address: string
  isVerified: boolean
  isEncrypted: boolean
  encryptionInfo: string
}

/** Result of a pin/unpin operation */
export interface KeyOperationResult {
  success: boolean
  error?: string
}

// -- RPC adapter functions --
// These wrap existing or future core APIs.

const DC_CONTACT_ID_SELF = C.DC_CONTACT_ID_SELF

/** Get account key info using existing getContactEncryptionInfo for self */
export async function getAccountKeyInfo(
  accountId: number
): Promise<AccountKeyInfo> {
  const encryptionInfo = await BackendRemote.rpc.getContactEncryptionInfo(
    accountId,
    DC_CONTACT_ID_SELF
  )
  const fingerprint = parseFingerprintFromInfo(encryptionInfo)
  return {
    fingerprint,
    encryptionInfo,
  }
}

/** Get key info for a contact */
export async function getContactKeyInfo(
  accountId: number,
  contactId: number
): Promise<ContactKeyInfo> {
  const [contact, encryptionInfo] = await Promise.all([
    BackendRemote.rpc.getContact(accountId, contactId),
    BackendRemote.rpc.getContactEncryptionInfo(accountId, contactId),
  ])
  return {
    contactId,
    displayName: contact.displayName,
    address: contact.address,
    isVerified: contact.isVerified,
    isEncrypted: contact.e2eeAvail,
    encryptionInfo,
  }
}

/** Pin a specific key for a contact (stub until core supports it) */
export async function pinContactKey(
  _accountId: number,
  _contactId: number,
  _fingerprint: string
): Promise<KeyOperationResult> {
  // TODO: Phase 3 — call RPC pin_contact_key when available in core
  return { success: false, error: 'Not yet supported by core' }
}

/** Unpin key for a contact (stub until core supports it) */
export async function unpinContactKey(
  _accountId: number,
  _contactId: number
): Promise<KeyOperationResult> {
  // TODO: Phase 3 — call RPC unpin_contact_key when available in core
  return { success: false, error: 'Not yet supported by core' }
}

/** Import a secret key (stub until core supports it) */
export async function importSelfSecretKey(
  _accountId: number,
  _keyData: string
): Promise<KeyOperationResult> {
  // TODO: Phase 3 — call RPC import_self_secret_key when available in core
  return { success: false, error: 'Not yet supported by core' }
}

// -- Helpers --

/** Parse fingerprint from the encryption info text returned by core */
function parseFingerprintFromInfo(info: string): string {
  // The encryption info text contains fingerprint lines like:
  // "Langfristiger Schlüssel-Fingerprint (RSA 2048):"
  // followed by hex fingerprint groups
  const lines = info.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Look for lines that are pure hex groups (fingerprint format)
    if (/^[A-Fa-f0-9]{4}(\s+[A-Fa-f0-9]{4}){4,}$/.test(line)) {
      // Collect consecutive fingerprint lines
      let fp = line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim()
        if (/^[A-Fa-f0-9]{4}(\s+[A-Fa-f0-9]{4}){4,}$/.test(nextLine)) {
          fp += ' ' + nextLine
        }
      }
      return fp
    }
  }
  return ''
}
