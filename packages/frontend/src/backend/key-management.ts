import { BackendRemote } from '../backend-com'
import { unknownErrorToString } from '@deltachat-desktop/shared/unknownErrorToString'
import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('renderer/backend/key-management')

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
 * contact"). We obtain the fingerprint via a two-step flow:
 *
 * 1. Get the account's own Setup-Contact QR string using
 *    `getChatSecurejoinQrCode(accountId, null)`.
 * 2. Pass that string to `checkQr()` — core parses it and returns a structured
 *    `Qr` union whose `withdrawVerifyContact` / `reviveVerifyContact` variants
 *    (what core returns when you "scan" your own QR) carry a `fingerprint`
 *    field. Using core's parser instead of a regex avoids format drift.
 *
 * If `checkQr` does not yield a fingerprint (e.g. unexpected QR kind), fall
 * back to a regex parse of the QR URI as a best-effort.
 */
export async function getAccountKeyInfo(
  accountId: number
): Promise<AccountKeyInfo> {
  const [qr, address] = await Promise.all([
    BackendRemote.rpc.getChatSecurejoinQrCode(accountId, null),
    BackendRemote.rpc.getConfig(accountId, 'configured_addr'),
  ])

  let fingerprint = ''
  try {
    const parsed = await BackendRemote.rpc.checkQr(accountId, qr)
    if (parsed && typeof parsed === 'object' && 'fingerprint' in parsed) {
      const fp = (parsed as { fingerprint?: unknown }).fingerprint
      if (typeof fp === 'string') {
        fingerprint = fp
      }
    }
    if (!fingerprint) {
      log.warn(
        'checkQr returned no fingerprint for account self QR',
        'kind=',
        (parsed as { kind?: unknown })?.kind,
        'qr_prefix=',
        redactQrForLog(qr)
      )
    }
  } catch (err) {
    log.warn(
      'checkQr failed on account self QR',
      err,
      'qr_prefix=',
      redactQrForLog(qr)
    )
  }

  if (!fingerprint) {
    // Best-effort regex fallback against `OPENPGP4FPR:<hex>#...`.
    fingerprint = parseFingerprintFromQr(qr)
  }

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

/**
 * Import a secret key from an ASCII-armored PGP file.
 *
 * Wraps core's `import_self_keys` RPC. Constraints (must surface in UI):
 * - Only `.asc` (ASCII-armored) format is supported
 * - The key must not be passphrase-protected (core accepts `null` only today)
 * - Only RSA or Ed25519 keys work reliably
 * - Importing replaces the current account key
 * - Verified/SecureJoin groups will show "non-verified encryption" warnings
 *   after the swap
 *
 * Upstream removed the UI for this on 2025-03-18 (PR #4784) as a product
 * decision. The RPC itself is still present and functional in core v2.49.0.
 */
export async function importSelfSecretKey(
  accountId: number,
  path: string
): Promise<KeyOperationResult> {
  try {
    await BackendRemote.rpc.importSelfKeys(accountId, path, null)
    return { success: true }
  } catch (err) {
    return { success: false, error: unknownErrorToString(err) }
  }
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

/**
 * Redact a SecureJoin / account QR for safe logging. The QR URI contains
 * invitation material (invitenumber, authcode) and the account address, so
 * only the scheme prefix (before the first ':') is kept.
 */
function redactQrForLog(qr: string): string {
  if (!qr) return '<empty>'
  const schemeEnd = qr.indexOf(':')
  return schemeEnd >= 0 ? qr.slice(0, schemeEnd + 1) + '…' : '<unknown-scheme>'
}
