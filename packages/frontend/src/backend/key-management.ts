import { BackendRemote } from '../backend-com'

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
  address: string
  encryptionInfo: string
}

/** Key info for a contact */
export interface ContactKeyInfo {
  contactId: number
  displayName: string
  address: string
  fingerprint: string
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

/**
 * Get account key info.
 *
 * Core refuses `getContactEncryptionInfo` for the self contact ("special
 * contact"), so we obtain the fingerprint from the Setup-Contact QR code
 * (`getChatSecurejoinQrCode(accountId, null)`) which is the account's own
 * OPENPGP4FPR URI. The fingerprint is the path component before `#`.
 */
export async function getAccountKeyInfo(
  accountId: number
): Promise<AccountKeyInfo> {
  const [qr, address] = await Promise.all([
    BackendRemote.rpc.getChatSecurejoinQrCode(accountId, null),
    BackendRemote.rpc.getConfig(accountId, 'configured_addr'),
  ])
  const fingerprint = parseFingerprintFromQr(qr)
  return {
    fingerprint: formatFingerprint(fingerprint),
    address: address ?? '',
    encryptionInfo: qr,
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
    fingerprint: parseFingerprintFromInfo(encryptionInfo),
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

/**
 * Parse fingerprint from an OPENPGP4FPR QR URI.
 * Format: `OPENPGP4FPR:<HEX_FINGERPRINT>#a=<email>&...`
 */
function parseFingerprintFromQr(qr: string): string {
  const match = qr.match(/^OPENPGP4FPR:([A-Fa-f0-9]+)/i)
  return match ? match[1].toUpperCase() : ''
}

/**
 * Parse fingerprint from the encryption info text returned by core.
 * The text contains fingerprint lines as groups of 4-hex-char blocks.
 */
function parseFingerprintFromInfo(info: string): string {
  const lines = info.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/^[A-Fa-f0-9]{4}(\s+[A-Fa-f0-9]{4}){4,}$/.test(line)) {
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

/**
 * Format a continuous hex fingerprint into groups of 4 chars separated by spaces,
 * e.g. "ABCD12345678..." → "ABCD 1234 5678 ..."
 */
function formatFingerprint(hex: string): string {
  if (!hex) return ''
  return hex.match(/.{1,4}/g)?.join(' ') ?? hex
}
