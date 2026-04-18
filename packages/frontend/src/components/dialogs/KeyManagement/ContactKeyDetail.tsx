import React, { useEffect, useState } from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'
import { selectedAccountId } from '../../../ScreenController'
import { getContactKeyInfo } from '../../../backend/key-management'
import type { ContactKeyInfo } from '../../../backend/key-management'
import { unknownErrorToString } from '@deltachat-desktop/shared/unknownErrorToString'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { InlineVerifiedIcon } from '../../VerifiedIcon'
// Pin/unpin stubs are defined in backend/key-management.ts but not yet
// supported by core. Buttons are rendered disabled until core provides
// the pin_contact_key / unpin_contact_key RPC endpoints.

type Props = {
  contactId: number
}

export default function ContactKeyDetail({ contactId }: Props) {
  const tx = useTranslationFunction()
  const [keyInfo, setKeyInfo] = useState<ContactKeyInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getContactKeyInfo(selectedAccountId(), contactId)
      .then(setKeyInfo)
      .catch(err => setError(unknownErrorToString(err)))
  }, [contactId])

  const copyFingerprint = async () => {
    if (!keyInfo?.fingerprint) return
    await runtime.writeClipboardText(keyInfo.fingerprint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error) {
    return <p style={{ color: 'var(--colorDanger)' }}>{tx('error_x', error)}</p>
  }

  if (!keyInfo) {
    return <p style={{ color: 'var(--textSecondary)' }}>{tx('loading')}</p>
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, fontSize: '16px' }}>
            {keyInfo.displayName}
          </span>
          {keyInfo.isVerified && <InlineVerifiedIcon />}
        </div>
        <span
          style={{
            color: 'var(--textSecondary)',
            fontSize: '13px',
          }}
        >
          {keyInfo.address}
        </span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            background: keyInfo.isEncrypted
              ? 'var(--colorSuccess, #2e7d32)'
              : 'var(--colorDanger, #c62828)',
            color: '#fff',
          }}
        >
          {keyInfo.isEncrypted
            ? tx('messages_are_e2ee')
            : tx('unencrypted')}
        </span>
      </div>

      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: '13px',
          padding: '12px',
          border: '1px solid var(--borderColor)',
          borderRadius: '4px',
          fontFamily: 'monospace',
          marginBottom: '8px',
        }}
      >
        {keyInfo.encryptionInfo}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type='button'
          onClick={copyFingerprint}
          style={{
            padding: '4px 12px',
            cursor: 'pointer',
            border: '1px solid var(--borderColor)',
            borderRadius: '4px',
            background: 'var(--bgPrimary)',
            color: 'var(--textPrimary)',
          }}
        >
          {copied
            ? tx('copied_to_clipboard')
            : tx('key_management_copy_fingerprint')}
        </button>

        {keyInfo.fingerprint && <PinUnpinButtons />}
      </div>
    </div>
  )
}

function PinUnpinButtons() {
  const tx = useTranslationFunction()

  // Core does not yet provide pin_contact_key / unpin_contact_key RPCs.
  // Buttons are disabled until those endpoints are available.
  const coreSupportsPin = false

  return (
    <>
      <button
        type='button'
        disabled
        title={tx('key_management_pin_desc')}
        style={{
          padding: '4px 12px',
          cursor: coreSupportsPin ? 'pointer' : 'not-allowed',
          border: '1px solid var(--borderColor)',
          borderRadius: '4px',
          background: 'var(--bgPrimary)',
          color: 'var(--textPrimary)',
          opacity: 0.4,
        }}
      >
        {tx('key_management_pin_key')}
      </button>
      <button
        type='button'
        disabled
        title={tx('key_management_unpin_desc')}
        style={{
          padding: '4px 12px',
          cursor: coreSupportsPin ? 'pointer' : 'not-allowed',
          border: '1px solid var(--borderColor)',
          borderRadius: '4px',
          background: 'var(--bgPrimary)',
          color: 'var(--textPrimary)',
          opacity: 0.4,
        }}
      >
        {tx('key_management_unpin_key')}
      </button>
    </>
  )
}
