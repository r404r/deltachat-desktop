// core's `Fingerprint::human_readable()`: groups of 4 hex chars, 5 groups per line
const FINGERPRINT_LINE = /^[A-Fa-f0-9]{4}(\s+[A-Fa-f0-9]{4}){4,}$/

/**
 * Parse a contact's fingerprint from the encryption info text returned by
 * core's `getContactEncryptionInfo`.
 *
 * The text lists TWO fingerprints, the contact's and our own, each under a
 * `<name> (<addr>):` header. Core orders them by comparing the addresses,
 * so the contact's fingerprint is not necessarily the first one; we have to
 * pick the block under the header that ends with the contact's address.
 *
 * Returns an empty string if no fingerprint for `address` is found.
 */
export function parseFingerprintFromInfo(
  info: string,
  address: string
): string {
  const lines = info.split('\n').map(line => line.trim())
  const headerSuffix = `(${address.toLowerCase()}):`
  const headerIndex = lines.findIndex(line =>
    line.toLowerCase().endsWith(headerSuffix)
  )
  if (headerIndex === -1) return ''

  const fingerprintLines: string[] = []
  for (const line of lines.slice(headerIndex + 1)) {
    if (!FINGERPRINT_LINE.test(line)) break
    fingerprintLines.push(line)
  }
  return fingerprintLines.join(' ')
}
