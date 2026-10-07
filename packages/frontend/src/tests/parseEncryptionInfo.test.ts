import { expect } from 'chai'
import { describe, it } from 'mocha'

import { parseFingerprintFromInfo } from '../utils/parseEncryptionInfo.js'

const SELF_FP = 'AAAA 1111 AAAA 1111 AAAA\n1111 AAAA 1111 AAAA 1111'
const OTHER_FP = 'BBBB 2222 BBBB 2222 BBBB\n2222 BBBB 2222 BBBB 2222'
const OTHER_FP_FLAT = OTHER_FP.replace('\n', ' ')

// mirrors core's `Contact::get_encrinfo` output format
function encrInfo(
  blocks: { name: string; addr: string; fingerprint: string }[]
): string {
  let ret = 'Messages are end-to-end encrypted.\nFingerprints:'
  for (const { name, addr, fingerprint } of blocks) {
    ret += `\n\n${name} (${addr}):\n${fingerprint}`
  }
  return ret + '\n\nRelays:\nrelay.example.org'
}

const self = { name: 'Me', addr: 'me@example.org', fingerprint: SELF_FP }
const other = {
  name: 'Bob',
  addr: 'bob@example.org',
  fingerprint: OTHER_FP,
}

describe('parseFingerprintFromInfo', () => {
  it("returns the contact's fingerprint when it is listed second", () => {
    // core lists self first if the self address sorts first
    const info = encrInfo([self, other])
    expect(parseFingerprintFromInfo(info, other.addr)).to.eq(OTHER_FP_FLAT)
  })

  it("returns the contact's fingerprint when it is listed first", () => {
    const info = encrInfo([other, self])
    expect(parseFingerprintFromInfo(info, other.addr)).to.eq(OTHER_FP_FLAT)
  })

  it('matches the address case-insensitively', () => {
    const info = encrInfo([self, other])
    expect(parseFingerprintFromInfo(info, 'Bob@Example.org')).to.eq(
      OTHER_FP_FLAT
    )
  })

  it('returns empty string if there is no fingerprint for the address', () => {
    expect(parseFingerprintFromInfo('No encryption.', other.addr)).to.eq('')
    expect(parseFingerprintFromInfo(encrInfo([self]), other.addr)).to.eq('')
  })
})
